import axios from "axios";
import { cacheGet, cacheGetStale, cacheSet } from "../utils/cache.js";

const BASE_URL = "https://api.twelvedata.com";

const MARKET_PROVIDER = (
  process.env.MARKET_DATA_PROVIDER || "twelvedata"
).toLowerCase();

/*
 * Keep this list small because Twelve Data's free plan
 * has a limited number of API credits per minute.
 *
 * Five symbols = five quote credits for the dashboard.
 */
const popularSymbols = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
];

const inFlightHistoricalRequests = new Map();

function getApiKey() {
  const key = process.env.TWELVEDATA_API_KEY;

  if (!key) {
    throw new Error("Twelve Data API key is not configured");
  }

  return key;
}

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}/${path}`);

  url.searchParams.set("apikey", getApiKey());

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function fetchTwelveData(path, params = {}) {
  const url = buildUrl(path, params);

  try {
    const response = await axios.get(url, {
      timeout: 10000,
    });

    const data = response.data;

    if (data?.status === "error") {
      const message = data.message || "Market provider error";

      if (/rate limit|too many requests|credits/i.test(message)) {
        throw new Error(
          "Market data requests are temporarily rate limited. Please wait and try again.",
        );
      }

      if (/invalid api key|apikey/i.test(message)) {
        throw new Error("Twelve Data API key is invalid");
      }

      if (/invalid symbol/i.test(message)) {
        throw new Error("Invalid stock symbol");
      }

      throw new Error(message);
    }

    return data;
  } catch (error) {
    const providerMessage =
      error.response?.data?.message || error.response?.data?.code || "";

    if (
      error.response?.status === 429 ||
      /rate limit|too many requests|credits/i.test(
        providerMessage || error.message || "",
      )
    ) {
      throw new Error(
        "Market data requests are temporarily rate limited. Please wait and try again.",
      );
    }

    if (/invalid api key/i.test(providerMessage || error.message || "")) {
      throw new Error("Twelve Data API key is invalid");
    }

    if (/invalid symbol/i.test(providerMessage || error.message || "")) {
      throw new Error("Invalid stock symbol");
    }

    throw new Error(
      providerMessage || error.message || "Market data provider unavailable",
    );
  }
}

const providers = {
  twelvedata: {
    async getQuote(symbol) {
      return fetchTwelveData("quote", {
        symbol,
      });
    },

    async getMultipleQuotes(symbols) {
      if (!symbols.length) {
        return {};
      }

      return fetchTwelveData("quote", {
        symbol: symbols.join(","),
      });
    },

    async searchStocks(query) {
      return fetchTwelveData("symbol_search", {
        symbol: query,
        exchange: "NASDAQ,NYSE",
        outputsize: 20,
      });
    },

    async getHistoricalData(symbol, interval, outputsize) {
      return fetchTwelveData("time_series", {
        symbol,
        interval,
        outputsize,
        timezone: "America/New_York",
        format: "JSON",
      });
    },
  },
};

function quoteFromProvider(item) {
  const rawPrice =
    item?.price ??
    item?.close ??
    item?.last ??
    item?.previous_close ??
    item?.open ??
    null;

  return {
    symbol: item?.symbol,
    price: rawPrice != null ? Number(rawPrice) : null,
    change: Number(item?.change ?? 0),
    percent_change: Number(item?.percent_change ?? item?.change_percent ?? 0),
    timestamp: item?.timestamp ?? item?.datetime ?? item?.last_quote_at ?? null,
  };
}

function getProvider() {
  return providers[MARKET_PROVIDER] || providers.twelvedata;
}

/*
 * Get one stock quote.
 *
 * Cache: 5 minutes.
 */
async function getQuote(symbol) {
  if (!symbol) {
    throw new Error("Stock symbol is required");
  }

  const normalizedSymbol = symbol.toUpperCase();

  const cacheKey = `quote:${normalizedSymbol}`;
  const cached = cacheGet(cacheKey);

  if (cached) {
    return cached;
  }

  const data = await getProvider().getQuote(normalizedSymbol);

  const quote = quoteFromProvider(data);

  cacheSet(cacheKey, quote, 5 * 60);

  return quote;
}

/*
 * Get multiple stock quotes.
 *
 * First checks cache.
 * Only missing symbols are requested from Twelve Data.
 *
 * This is important for staying within API limits.
 */
async function getMultipleQuotes(symbols) {
  const uniqueSymbols = [
    ...new Set(symbols.filter(Boolean).map((symbol) => symbol.toUpperCase())),
  ];

  if (!uniqueSymbols.length) {
    return {};
  }

  const result = {};
  const missing = [];

  for (const symbol of uniqueSymbols) {
    const cacheKey = `quote:${symbol}`;
    const cached = cacheGet(cacheKey);

    if (cached) {
      result[symbol] = cached;
    } else {
      missing.push(symbol);
    }
  }

  /*
   * Only call Twelve Data for symbols that aren't cached.
   */
  if (missing.length) {
    const providerData = await getProvider().getMultipleQuotes(missing);

    /*
     * Twelve Data may return either:
     *
     * - an object for a single quote
     * - an array/object depending on endpoint response
     */
    let payload = [];

    if (Array.isArray(providerData)) {
      payload = providerData;
    } else if (providerData?.data && Array.isArray(providerData.data)) {
      payload = providerData.data;
    } else if (providerData?.symbol) {
      payload = [providerData];
    } else {
      /*
       * Some Twelve Data responses can contain symbols
       * as object keys when using batch-style responses.
       */
      payload = Object.values(providerData || {}).filter(
        (item) => item && typeof item === "object" && item.symbol,
      );
    }

    for (const item of payload) {
      if (!item?.symbol) {
        continue;
      }

      const quote = quoteFromProvider(item);
      const symbol = quote.symbol?.toUpperCase();

      if (!symbol) {
        continue;
      }

      cacheSet(`quote:${symbol}`, quote, 5 * 60);

      result[symbol] = quote;
    }
  }

  /*
   * Always return the requested symbols in the same structure.
   */
  return uniqueSymbols.reduce((acc, symbol) => {
    acc[symbol] = result[symbol] || null;
    return acc;
  }, {});
}

/*
 * Search stocks.
 *
 * Search results are cached for 15 minutes.
 */
async function searchStocks(query) {
  if (!query || !query.trim()) {
    return popularSymbols;
  }

  const normalizedQuery = query.trim().toLowerCase();

  const cacheKey = `search:${normalizedQuery}`;

  const cached = cacheGet(cacheKey);

  if (cached) {
    return cached;
  }

  const providerData = await getProvider().searchStocks(query.trim());

  const results = (providerData?.data || []).map((item) => ({
    symbol: item.symbol,
    name:
      item.instrument_name ||
      item.name ||
      item.description ||
      item.exchange ||
      item.symbol,
  }));

  const merged = results.slice(0, 20);

  cacheSet(cacheKey, merged, 15 * 60);

  return merged;
}

/*
 * Historical stock data.
 *
 * Cache: 30 minutes.
 */
async function getHistoricalData(symbol, range) {
  if (!symbol) {
    throw new Error("Stock symbol is required");
  }

  const normalizedSymbol = symbol.toUpperCase();

  const validRange = range || "1M";

  const intervalMap = {
    "1D": "15min",
    "1W": "30min",
    "1M": "1day",
    "3M": "1week",
    "1Y": "1month",
  };

  const outputMap = {
    "1D": 96,
    "1W": 50,
    "1M": 60,
    "3M": 90,
    "1Y": 52,
  };

  const interval = intervalMap[validRange] || "1day";
  const outputsize = outputMap[validRange] || 60;

  const cacheKey = `history:${normalizedSymbol}:${validRange}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Deduplicate concurrent in-flight requests for the same symbol & range
  if (inFlightHistoricalRequests.has(cacheKey)) {
    return inFlightHistoricalRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      let data;
      try {
        data = await getProvider().getHistoricalData(
          normalizedSymbol,
          interval,
          outputsize,
        );
      } catch (err) {
        // If rate-limited or transient provider error, wait 1.2s and retry once
        if (/rate limit|too many requests|credits|unavailable|timeout/i.test(err.message || "")) {
          const stale = cacheGetStale(cacheKey);
          if (stale && Array.isArray(stale) && stale.length >= 5) {
            return stale;
          }
          await new Promise((resolve) => setTimeout(resolve, 1200));
          data = await getProvider().getHistoricalData(
            normalizedSymbol,
            interval,
            outputsize,
          );
        } else {
          throw err;
        }
      }

      const history = (data?.values || [])
        .map((item) => ({
          datetime: item.datetime,
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close),
          volume: Number(item.volume),
        }))
        .reverse();

      if (history.length > 0) {
        cacheSet(cacheKey, history, 30 * 60);
      }

      return history;
    } catch (err) {
      // If external provider failed, serve stale cached data if available
      const stale = cacheGetStale(cacheKey);
      if (stale && Array.isArray(stale) && stale.length >= 5) {
        return stale;
      }
      throw err;
    } finally {
      inFlightHistoricalRequests.delete(cacheKey);
    }
  })();

  inFlightHistoricalRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/*
 * Dashboard popular stocks.
 *
 * Cached for 5 minutes.
 *
 * IMPORTANT:
 * We only request five stocks, which keeps the
 * dashboard within the free Twelve Data limit.
 */
async function getPopularStocks() {
  const cacheKey = "popular_stocks";

  const cached = cacheGet(cacheKey);

  if (cached) {
    return cached;
  }

  const symbols = popularSymbols.map((stock) => stock.symbol);

  const quotes = await getMultipleQuotes(symbols);

  const items = popularSymbols.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    quote: quotes[stock.symbol] || null,
  }));

  cacheSet(cacheKey, items, 5 * 60);

  return items;
}

export default {
  getQuote,
  getMultipleQuotes,
  searchStocks,
  getHistoricalData,
  getPopularStocks,
};

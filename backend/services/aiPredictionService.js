import marketDataService from "./marketDataService.js";
import { cacheGet, cacheGetStale, cacheSet, cacheDelete } from "../utils/cache.js";

export const AI_CACHE_TTL_SECONDS = 600; // 10 minutes

/**
 * Calculates Relative Strength Index (RSI) for period (default 14)
 */
function calculateRSI(closes, period = 14) {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculates Simple Moving Average (SMA)
 */
function calculateSMA(data, period) {
  if (data.length < period) return data[data.length - 1];
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
function calculateEMA(data, period) {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Calculates MACD (12, 26, 9)
 */
function calculateMACD(closes) {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.2;
  const histogram = macd - signal;
  return { macd, signal, histogram };
}

/**
 * Lightweight Decision Tree Node
 */
class DecisionNode {
  constructor({ featureIndex, threshold, left, right, prediction }) {
    this.featureIndex = featureIndex;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
    this.prediction = prediction;
  }

  predict(features) {
    if (this.prediction !== undefined) {
      return this.prediction;
    }
    if (features[this.featureIndex] <= this.threshold) {
      return this.left.predict(features);
    }
    return this.right.predict(features);
  }
}

/**
 * Generates a deterministic integer seed from the dataset features, labels, and stock symbol.
 * If market data changes (new prices, returns, or volumes), the seed changes accordingly.
 */
function createDatasetSeed(dataset, symbol = "") {
  let hash = 2166136261;
  const str = symbol + ":" + (dataset ? dataset.length : 0);
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  if (Array.isArray(dataset)) {
    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      const labelCode = item.label === "bullish" ? 1 : item.label === "bearish" ? 2 : 0;
      hash ^= labelCode;
      hash = Math.imul(hash, 16777619);
      if (Array.isArray(item.features)) {
        for (let j = 0; j < item.features.length; j++) {
          const val = Math.round((item.features[j] || 0) * 1000);
          hash ^= val;
          hash = Math.imul(hash, 16777619);
        }
      }
    }
  }
  return hash >>> 0;
}

/**
 * Mulberry32: A fast, high-quality 32-bit seeded pseudo-random number generator.
 * Returns a function that outputs numbers in [0, 1), identical to Math.random() interface.
 */
function createSeededRandom(seed) {
  let state = seed ? seed >>> 0 : 1337;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a single Decision Tree on a sample
 */
function buildTree(data, depth = 0, maxDepth = 3, rng = Math.random) {
  if (data.length === 0) return new DecisionNode({ prediction: "neutral" });

  const classes = data.map((d) => d.label);
  const allSame = classes.every((c) => c === classes[0]);
  if (allSame || depth >= maxDepth || data.length < 4) {
    const counts = { bullish: 0, bearish: 0, neutral: 0 };
    for (const c of classes) counts[c] = (counts[c] || 0) + 1;
    let maxClass = "neutral";
    let maxCount = -1;
    for (const [cls, cnt] of Object.entries(counts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxClass = cls;
      }
    }
    return new DecisionNode({ prediction: maxClass });
  }

  const numFeatures = data[0].features.length;
  const featureSubset = [];
  while (featureSubset.length < Math.max(2, Math.floor(Math.sqrt(numFeatures)))) {
    const idx = Math.floor(rng() * numFeatures);
    if (!featureSubset.includes(idx)) featureSubset.push(idx);
  }

  let bestGain = -Infinity;
  let bestSplit = null;

  for (const featureIndex of featureSubset) {
    const values = data.map((d) => d.features[featureIndex]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    if (minVal === maxVal) continue;

    const numTests = 4;
    for (let t = 1; t <= numTests; t++) {
      const threshold = minVal + (t * (maxVal - minVal)) / (numTests + 1);
      const left = data.filter((d) => d.features[featureIndex] <= threshold);
      const right = data.filter((d) => d.features[featureIndex] > threshold);

      if (left.length === 0 || right.length === 0) continue;

      const gain = calculateGiniGain(data, left, right);
      if (gain > bestGain) {
        bestGain = gain;
        bestSplit = { featureIndex, threshold, left, right };
      }
    }
  }

  if (!bestSplit || bestGain <= 0) {
    const counts = { bullish: 0, bearish: 0, neutral: 0 };
    for (const c of classes) counts[c] = (counts[c] || 0) + 1;
    const majority = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
    return new DecisionNode({ prediction: majority });
  }

  const leftNode = buildTree(bestSplit.left, depth + 1, maxDepth, rng);
  const rightNode = buildTree(bestSplit.right, depth + 1, maxDepth, rng);

  return new DecisionNode({
    featureIndex: bestSplit.featureIndex,
    threshold: bestSplit.threshold,
    left: leftNode,
    right: rightNode,
  });
}

function giniImpurity(items) {
  if (items.length === 0) return 0;
  const counts = {};
  for (const item of items) {
    counts[item.label] = (counts[item.label] || 0) + 1;
  }
  let impurity = 1;
  for (const count of Object.values(counts)) {
    const p = count / items.length;
    impurity -= p * p;
  }
  return impurity;
}

function calculateGiniGain(parent, left, right) {
  const pGini = giniImpurity(parent);
  const lWeight = left.length / parent.length;
  const rWeight = right.length / parent.length;
  return pGini - (lWeight * giniImpurity(left) + rWeight * giniImpurity(right));
}

/**
 * Random Forest Classifier
 */
class RandomForestClassifier {
  constructor(numTrees = 15, seed = null) {
    this.numTrees = numTrees;
    this.seed = seed;
    this.trees = [];
  }

  train(dataset) {
    this.trees = [];
    if (!dataset || dataset.length < 5) return;

    const rng = this.seed !== null ? createSeededRandom(this.seed) : Math.random;

    for (let i = 0; i < this.numTrees; i++) {
      const sample = [];
      for (let j = 0; j < dataset.length; j++) {
        const randIdx = Math.floor(rng() * dataset.length);
        sample.push(dataset[randIdx]);
      }
      const tree = buildTree(sample, 0, 3, rng);
      this.trees.push(tree);
    }
  }

  predict(features) {
    if (this.trees.length === 0) {
      return { trend: "neutral", confidence: 50, votes: { neutral: 1 } };
    }

    const votes = { bullish: 0, bearish: 0, neutral: 0 };
    for (const tree of this.trees) {
      const pred = tree.predict(features);
      votes[pred] = (votes[pred] || 0) + 1;
    }

    let winningClass = "neutral";
    let maxVotes = -1;
    for (const [cls, count] of Object.entries(votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        winningClass = cls;
      }
    }

    const confidence = Math.round((maxVotes / this.trees.length) * 100);
    return {
      trend: winningClass,
      confidence: Math.max(51, Math.min(95, confidence)),
      votes,
    };
  }
}

/**
 * Extracts historical training samples and current feature vector
 */
function extractFeatures(history) {
  if (!history || history.length < 15) {
    return { dataset: [], currentFeatures: null, indicators: null };
  }

  const closes = history.map((h) => Number(h.close));
  const volumes = history.map((h) => Number(h.volume) || 1);

  const dataset = [];

  for (let i = 15; i < closes.length - 4; i++) {
    const windowCloses = closes.slice(0, i + 1);
    const windowVolumes = volumes.slice(0, i + 1);

    const rsi = calculateRSI(windowCloses, 14);
    const sma20 = calculateSMA(windowCloses, Math.min(20, windowCloses.length));
    const smaDiff = ((windowCloses[windowCloses.length - 1] - sma20) / sma20) * 100;
    const macd = calculateMACD(windowCloses);
    const momentum5 = ((windowCloses[windowCloses.length - 1] - windowCloses[windowCloses.length - 5]) / windowCloses[windowCloses.length - 5]) * 100;
    const avgVol = calculateSMA(windowVolumes, Math.min(20, windowVolumes.length));
    const volRatio = avgVol > 0 ? windowVolumes[windowVolumes.length - 1] / avgVol : 1;

    const forwardClose = closes[i + 4];
    const currClose = windowCloses[windowCloses.length - 1];
    const returnPct = ((forwardClose - currClose) / currClose) * 100;

    let label = "neutral";
    if (returnPct > 1.2) label = "bullish";
    else if (returnPct < -1.2) label = "bearish";

    dataset.push({
      features: [rsi, smaDiff, macd.histogram, momentum5, volRatio],
      label,
    });
  }

  const currentRsi = calculateRSI(closes, 14);
  const currentSma20 = calculateSMA(closes, Math.min(20, closes.length));
  const currentPrice = closes[closes.length - 1];
  const currentSmaDiff = ((currentPrice - currentSma20) / currentSma20) * 100;
  const currentMacd = calculateMACD(closes);
  const currentMomentum5 = closes.length >= 5
    ? ((currentPrice - closes[closes.length - 5]) / closes[closes.length - 5]) * 100
    : 0;
  const currentAvgVol = calculateSMA(volumes, Math.min(20, volumes.length));
  const currentVolRatio = currentAvgVol > 0 ? volumes[volumes.length - 1] / currentAvgVol : 1;

  const currentFeatures = [
    currentRsi,
    currentSmaDiff,
    currentMacd.histogram,
    currentMomentum5,
    currentVolRatio,
  ];

  return {
    dataset,
    currentFeatures,
    indicators: {
      rsi: currentRsi,
      price: currentPrice,
      sma20: currentSma20,
      smaDiff: currentSmaDiff,
      macd: currentMacd,
      momentum5: currentMomentum5,
      volRatio: currentVolRatio,
    },
  };
}

/**
 * Builds clear human-readable technical signal explanations
 */
function buildTechnicalSignals(indicators) {
  if (!indicators) return [];

  const signals = [];

  // RSI Signal
  let rsiTitle = "RSI Momentum";
  let rsiDesc = `RSI is balanced at ${indicators.rsi.toFixed(1)}, showing stable price momentum.`;
  let rsiSignal = "neutral";
  if (indicators.rsi >= 70) {
    rsiTitle = "RSI Overbought";
    rsiDesc = `RSI is elevated at ${indicators.rsi.toFixed(1)}, indicating overbought conditions and potential near-term consolidation.`;
    rsiSignal = "bearish";
  } else if (indicators.rsi <= 30) {
    rsiTitle = "RSI Oversold";
    rsiDesc = `RSI is depressed at ${indicators.rsi.toFixed(1)}, indicating oversold territory and potential price stabilization.`;
    rsiSignal = "bullish";
  } else if (indicators.rsi > 55) {
    rsiTitle = "Positive RSI Momentum";
    rsiDesc = `Positive momentum: recent price movement is trending upward (RSI ${indicators.rsi.toFixed(1)}).`;
    rsiSignal = "bullish";
  } else if (indicators.rsi < 45) {
    rsiTitle = "Weakening Momentum";
    rsiDesc = `Declining momentum: recent price movement is trending downward (RSI ${indicators.rsi.toFixed(1)}).`;
    rsiSignal = "bearish";
  }
  signals.push({
    type: "technical",
    title: rsiTitle,
    description: rsiDesc,
    signal: rsiSignal,
    value: indicators.rsi.toFixed(1),
  });

  // Trend / SMA Signal
  const smaDiff = indicators.smaDiff;
  let smaTitle = "20-Day SMA Trend";
  let smaDesc = `Price is trading near its 20-day moving average ($${indicators.sma20.toFixed(2)}).`;
  let smaSignal = "neutral";
  if (smaDiff > 0.5) {
    smaTitle = "Price Above 20-Day SMA";
    smaDesc = `Price is trading above its 20-day moving average ($${indicators.sma20.toFixed(2)}), supporting an upward trend structure.`;
    smaSignal = "bullish";
  } else if (smaDiff < -0.5) {
    smaTitle = "Price Below 20-Day SMA";
    smaDesc = `Price is trading below its 20-day moving average ($${indicators.sma20.toFixed(2)}), indicating short-term downward pressure.`;
    smaSignal = "bearish";
  }
  signals.push({
    type: "technical",
    title: smaTitle,
    description: smaDesc,
    signal: smaSignal,
    value: `$${indicators.sma20.toFixed(2)}`,
  });

  // MACD Signal
  const macdHist = indicators.macd.histogram;
  let macdTitle = "MACD Momentum";
  let macdDesc = "MACD histogram is neutral, indicating balanced momentum.";
  let macdSignal = "neutral";
  if (macdHist > 0) {
    macdTitle = "Positive MACD Momentum";
    macdDesc = "MACD momentum is currently positive, pointing to bullish trend acceleration.";
    macdSignal = "bullish";
  } else if (macdHist < 0) {
    macdTitle = "Negative MACD Momentum";
    macdDesc = "MACD momentum is currently negative, indicating downward momentum pressure.";
    macdSignal = "bearish";
  }
  signals.push({
    type: "technical",
    title: macdTitle,
    description: macdDesc,
    signal: macdSignal,
    value: `${macdHist >= 0 ? "+" : ""}${macdHist.toFixed(2)}`,
  });

  // Volume Flow
  const volRatio = indicators.volRatio;
  let volTitle = "Trading Volume";
  let volDesc = "Trading volume is aligned with normal 20-day averages.";
  let volSignal = "neutral";
  if (volRatio > 1.15) {
    volTitle = "Elevated Trading Volume";
    volDesc = `Trading volume is above its recent average (${volRatio.toFixed(2)}x normal), indicating increased market activity.`;
    volSignal = "bullish";
  } else if (volRatio < 0.8) {
    volTitle = "Subdued Trading Volume";
    volDesc = `Trading volume is below average (${volRatio.toFixed(2)}x normal), reflecting lighter institutional participation.`;
    volSignal = "neutral";
  }
  signals.push({
    type: "technical",
    title: volTitle,
    description: volDesc,
    signal: volSignal,
    value: `${volRatio.toFixed(2)}x`,
  });

  return signals;
}

/**
 * Provides sector/market context without fabricating fake news
 */
function getSectorMarketContext(symbol) {
  const s = symbol.toUpperCase();
  if (["AAPL", "MSFT", "GOOGL", "META"].includes(s)) {
    return "Recent technology-sector sentiment and interest-rate expectations may be contributing factors to price movement.";
  }
  if (["NVDA", "AMD", "INTC", "TSM"].includes(s)) {
    return "Semiconductor demand cycles and broader tech sector momentum may be influencing current trading sentiment.";
  }
  if (["AMZN", "TSLA", "NFLX"].includes(s)) {
    return "Consumer discretionary trends and growth-stock valuation shifts may be contributing to current volatility.";
  }
  if (["XOM", "CVX", "COP", "SLB"].includes(s)) {
    return "Global crude oil price fluctuations and energy demand expectations may be influencing sector sentiment.";
  }
  if (["LMT", "RTX", "NOC", "GD", "BA"].includes(s)) {
    return "Geopolitical developments and defense expenditure expectations may be contributing to sector demand outlook.";
  }
  if (["JPM", "BAC", "WFC", "GS", "MS"].includes(s)) {
    return "Central bank interest-rate expectations and treasury yield movements may affect sector profitability expectations.";
  }
  return "Broad equity market sentiment and sector-wide macroeconomic factors may be contributing to current price dynamics.";
}

const inFlightAiRequests = new Map();

/**
 * Main service method: get AI Market Intelligence for a symbol
 */
export async function getStockInsights(symbol, refresh = false) {
  if (!symbol) throw new Error("Stock symbol is required");
  const normSymbol = symbol.toUpperCase();
  const cacheKey = `ai:insights:${normSymbol}`;

  if (!refresh) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  } else {
    cacheDelete(cacheKey);
  }

  // Deduplicate concurrent in-flight AI requests for the same symbol
  const inFlightKey = `${normSymbol}:${refresh}`;
  if (inFlightAiRequests.has(inFlightKey)) {
    return inFlightAiRequests.get(inFlightKey);
  }

  const aiPromise = (async () => {
    try {
      let history;
      try {
        history = await marketDataService.getHistoricalData(normSymbol, "3M");
      } catch (err) {
        // If external call failed due to rate limiting or timeout, check for stale insights
        const staleInsights = cacheGetStale(cacheKey);
        if (staleInsights) {
          return staleInsights;
        }
        throw err;
      }

      if (!history || !Array.isArray(history) || history.length < 5) {
        const staleInsights = cacheGetStale(cacheKey);
        if (staleInsights) {
          return staleInsights;
        }
        throw new Error("Insufficient historical market data to run prediction model");
      }

      const { dataset, currentFeatures, indicators } = extractFeatures(history);

      const seed = createDatasetSeed(dataset, normSymbol);
      const forest = new RandomForestClassifier(15, seed);
      forest.train(dataset);

      const { trend, confidence } = forest.predict(currentFeatures);
      const signals = buildTechnicalSignals(indicators);
      const sectorContext = getSectorMarketContext(normSymbol);

      const result = {
        symbol: normSymbol,
        trend, // "bullish" | "bearish" | "neutral"
        prediction: trend.charAt(0).toUpperCase() + trend.slice(1), // "Bullish" | "Bearish" | "Neutral"
        confidence, // e.g. 78
        horizon: "5–10 Trading Days",
        signals,
        events: [],
        events_summary: "No major external event was identified from the available data.",
        external_factors: [sectorContext],
        risks: [
          "Market volatility",
          "Prediction uncertainty",
          "Macroeconomic shifts",
        ],
        model: {
          name: "Random Forest",
          type: "Ensemble Classifier",
          updatedAt: new Date().toISOString(),
        },
        news_status: "ready_for_news_provider",
        disclaimer:
          "AI predictions are statistical estimates for simulated trading and are not guaranteed financial advice.",
      };

      cacheSet(cacheKey, result, AI_CACHE_TTL_SECONDS);
      return result;
    } catch (err) {
      const staleInsights = cacheGetStale(cacheKey);
      if (staleInsights) {
        return staleInsights;
      }
      throw err;
    } finally {
      inFlightAiRequests.delete(inFlightKey);
    }
  })();

  inFlightAiRequests.set(inFlightKey, aiPromise);
  return aiPromise;
}

export default {
  getStockInsights,
  AI_CACHE_TTL_SECONDS,
};

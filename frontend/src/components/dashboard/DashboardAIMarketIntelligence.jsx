import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Badge,
  Button,
  Skeleton,
  cx,
} from "../ui/primitives.jsx";
import {
  BrainIcon,
  RefreshIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../ui/icons.jsx";
import { fetchWithCache, invalidateCache, CACHE_TTLS } from "../../utils/api.js";

/**
 * Dashboard AI Market Intelligence Section
 * Displays Random Forest predictions, technical reasons, and market context
 * for stocks currently loaded in the dashboard market overview.
 */
export default function DashboardAIMarketIntelligence({ stocks = [] }) {
  // predictions: { [symbol]: { status: 'loading' | 'success' | 'error', data: object | null, error: string | null } }
  const [predictions, setPredictions] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Extract symbols string to stabilize dependency comparison
  const symbolsKey = useMemo(() => {
    if (!Array.isArray(stocks) || stocks.length === 0) return "";
    return stocks.slice(0, 4).map((s) => s.symbol).join(",");
  }, [stocks]);

  // Take up to 4 prominent stocks from the dashboard list, stabilized by symbolsKey
  const targetStocks = useMemo(() => {
    if (!Array.isArray(stocks) || stocks.length === 0) return [];
    return stocks.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  const fetchStockPrediction = useCallback(
    async (symbol, isManualRefresh = false) => {
      if (!symbol) return null;
      const normSymbol = symbol.toUpperCase();

      if (isManualRefresh) {
        invalidateCache(`/ai/insights/${normSymbol}`);
      }

      try {
        const res = await fetchWithCache(
          `/ai/insights/${normSymbol}`,
          {
            params: isManualRefresh ? { refresh: "true" } : {},
            bypassCache: isManualRefresh,
          },
          CACHE_TTLS.AI_PREDICTION,
        );

        const payload = res.data?.data?.insights || res.data?.insights || null;
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid prediction payload received");
        }

        return {
          status: "success",
          data: payload,
          error: null,
        };
      } catch (err) {
        const msg =
          err.response?.status === 404
            ? "AI insights temporarily unavailable."
            : "AI insights temporarily unavailable.";
        return {
          status: "error",
          data: null,
          error: msg,
        };
      }
    },
    [],
  );

  const loadAllPredictions = useCallback(
    async (isManualRefresh = false) => {
      if (targetStocks.length === 0) return;

      if (isManualRefresh) {
        setRefreshing(true);
      }

      // Initialize or keep loading state per stock
      setPredictions((prev) => {
        const next = { ...prev };
        for (const s of targetStocks) {
          if (!next[s.symbol] || isManualRefresh) {
            next[s.symbol] = {
              status: "loading",
              data: prev[s.symbol]?.data || null,
              error: null,
            };
          }
        }
        return next;
      });

      // Run independent AI requests in parallel
      const results = await Promise.allSettled(
        targetStocks.map((s) => fetchStockPrediction(s.symbol, isManualRefresh)),
      );

      setPredictions((prev) => {
        const next = { ...prev };
        targetStocks.forEach((s, idx) => {
          const res = results[idx];
          if (res.status === "fulfilled" && res.value) {
            next[s.symbol] = res.value;
          } else {
            next[s.symbol] = {
              status: "error",
              data: null,
              error: "AI insights temporarily unavailable.",
            };
          }
        });
        return next;
      });

      if (isManualRefresh) {
        setRefreshing(false);
      }
    },
    [targetStocks, fetchStockPrediction],
  );

  useEffect(() => {
    loadAllPredictions(false);
  }, [loadAllPredictions]);

  if (targetStocks.length === 0) {
    return null;
  }

  // Check if all predictions finished and all errored out
  const allStates = targetStocks.map((s) => predictions[s.symbol]?.status);
  const isAnyLoading = allStates.some((st) => st === "loading" || !st);
  const isAllErrors = !isAnyLoading && allStates.every((st) => st === "error");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-muted text-primary">
            <BrainIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                AI Market Intelligence
              </h2>
              <Badge tone="primary" className="text-[10px] tracking-wide uppercase">
                Random Forest
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered market trend estimates and possible contributing factors.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAllPredictions(true)}
          disabled={refreshing || isAnyLoading}
          className="gap-1.5 text-xs h-8 px-3"
          title="Invalidate AI cache and request fresh predictions"
        >
          <RefreshIcon
            className={cx("h-3.5 w-3.5", refreshing && "animate-spin text-primary")}
          />
          {refreshing ? "Refreshing…" : "Refresh AI"}
        </Button>
      </div>

      {/* When all endpoints are unavailable (e.g. 404 before backend deployment) */}
      {isAllErrors ? (
        <Card className="p-6 border-border/80 bg-muted/20 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BrainIcon className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            AI Market Intelligence is temporarily unavailable
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Market prediction services are currently synchronizing or unreachable.
            Your dashboard, portfolio, and trading operations remain fully functional.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAllPredictions(true)}
            className="mt-3 text-xs"
          >
            Retry AI
          </Button>
        </Card>
      ) : (
        /* Responsive Grid of Stock Prediction Cards */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {targetStocks.map((stock) => {
            const entry = predictions[stock.symbol];
            const status = entry?.status || "loading";
            const data = entry?.data || null;

            if (status === "loading") {
              return (
                <AICardSkeleton
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                />
              );
            }

            if (status === "error" || !data) {
              return (
                <AICardFallback
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  onRetry={async () => {
                      setPredictions((prev) => ({
                        ...prev,
                        [stock.symbol]: { status: "loading", data: null, error: null },
                      }));
                      const result = await fetchStockPrediction(stock.symbol, true);
                      setPredictions((prev) => ({
                        ...prev,
                        [stock.symbol]: result || {
                          status: "error",
                          data: null,
                          error: "AI insights temporarily unavailable.",
                        },
                      }));
                    }}
                />
              );
            }

            return (
              <StockPredictionCard
                key={stock.symbol}
                symbol={stock.symbol}
                name={stock.name}
                data={data}
              />
            );
          })}
        </div>
      )}

      {/* Educational Non-advisory Disclaimer */}
      <p className="text-[11px] text-muted-foreground/80 italic pt-1">
        AI predictions are statistical estimates for simulated trading and are not guaranteed financial advice.
      </p>
    </div>
  );
}

/**
 * Individual Stock AI Prediction Card
 */
function StockPredictionCard({ symbol, name, data }) {
  // Safe field extractions with bulletproof null guards
  const rawTrend = data?.trend || data?.prediction || "neutral";
  const trend = String(rawTrend).toLowerCase();
  const isBullish = trend === "bullish";
  const isBearish = trend === "bearish";
  const displayTrend = isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral";

  const confidence =
    typeof data?.confidence === "number" ? Math.round(data.confidence) : 65;
  const horizon = data?.horizon || "5–10 Trading Days";
  const signals = Array.isArray(data?.signals) ? data.signals : [];
  const externalFactors = Array.isArray(data?.external_factors) && data.external_factors.length > 0
    ? data.external_factors
    : [
        "Recent sector trends and macroeconomic sentiment may be contributing factors to price movement.",
      ];
  const eventsSummary =
    data?.events_summary ||
    "No major external event was identified from the available data.";
  const risks = Array.isArray(data?.risks) && data.risks.length > 0
    ? data.risks
    : ["Market volatility", "Prediction uncertainty"];

  return (
    <Card className="flex flex-col justify-between p-5 border-border/80 bg-card hover:border-primary/40 transition-colors shadow-sm">
      <div className="space-y-3.5">
        {/* Card Header: Symbol & Trend Pill */}
        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-foreground text-base tracking-tight truncate">
              {symbol}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{name}</p>
          </div>
          <Badge
            tone={isBullish ? "positive" : isBearish ? "negative" : "neutral"}
            className="px-2.5 py-0.5 text-xs font-bold shrink-0"
          >
            {isBullish ? (
              <ArrowUpIcon className="h-3 w-3" />
            ) : isBearish ? (
              <ArrowDownIcon className="h-3 w-3" />
            ) : null}
            {displayTrend}
          </Badge>
        </div>

        {/* Confidence & Horizon */}
        <div className="rounded-xl bg-muted/40 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Confidence</span>
            <span className="font-bold tabular text-foreground">
              {confidence}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cx(
                "h-full rounded-full transition-all duration-500",
                isBullish ? "bg-positive" : isBearish ? "bg-negative" : "bg-primary",
              )}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Horizon:</span>
            <span className="font-semibold text-foreground">{horizon}</span>
          </div>
        </div>

        {/* Why might it be moving? */}
        <div className="space-y-2.5 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Why might it be moving?
          </div>

          {/* Technical Signals */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground block">
              Technical Signals
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground leading-snug">
              {signals.slice(0, 3).map((sig, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{sig.title || sig.description}</span>
                </li>
              ))}
              {signals.length === 0 && (
                <li className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>Trend structure aligned with 20-day momentum.</span>
                </li>
              )}
            </ul>
          </div>

          {/* External / Market Factors */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-foreground block">
              External / Market Factors
            </span>
            <ul className="space-y-1 text-xs text-muted-foreground leading-snug">
              {externalFactors.map((fact, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-muted-foreground">•</span>
                  <span>{fact}</span>
                </li>
              ))}
              <li className="flex items-start gap-1.5 text-muted-foreground/80 italic text-[11px]">
                <span>{eventsSummary}</span>
              </li>
            </ul>
          </div>

          {/* Potential Risks */}
          <div className="space-y-1 pt-1 border-t border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Potential Risks
            </span>
            <div className="flex flex-wrap gap-1.5">
              {risks.map((risk, idx) => (
                <span
                  key={idx}
                  className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {risk}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading Skeleton Card
 */
function AICardSkeleton({ symbol, name }) {
  return (
    <Card className="p-5 border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-foreground">{symbol}</div>
          <div className="text-xs text-muted-foreground">{name}</div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
      </div>
      <div className="space-y-2 pt-2 border-t border-border/40">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-3 w-full rounded" />
      </div>
    </Card>
  );
}

/**
 * Fallback Card when a single stock's prediction fails
 */
function AICardFallback({ symbol, name, onRetry }) {
  return (
    <Card className="flex flex-col justify-between p-5 border-border bg-muted/20">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">{symbol}</div>
            <div className="text-xs text-muted-foreground">{name}</div>
          </div>
          <Badge tone="neutral" className="text-[10px]">
            Unavailable
          </Badge>
        </div>
        <div className="mt-4 rounded-xl bg-background/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            AI insights temporarily unavailable.
          </p>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="mt-2.5 text-xs h-7 px-2.5"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground italic mt-3">
        Regular market quote & trading remain available.
      </p>
    </Card>
  );
}

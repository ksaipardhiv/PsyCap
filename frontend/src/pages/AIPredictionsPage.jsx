import { useState, useCallback } from "react";
import PageLayout from "../components/layout/PageLayout.jsx";
import {
  Card,
  Badge,
  Button,
  Skeleton,
  cx,
} from "../components/ui/primitives.jsx";
import {
  BrainIcon,
  SearchIcon,
  RefreshIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../components/ui/icons.jsx";
import { fetchWithCache, invalidateCache, CACHE_TTLS } from "../utils/api.js";

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "MSFT", name: "Microsoft Corporation" },
];


export default function AIPredictionsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [customSymbol, setCustomSymbol] = useState("");
  const [prediction, setPrediction] = useState(null); // { status, data, error }
  const [loading, setLoading] = useState(false);

  const activeSymbol = selectedSymbol || customSymbol.trim().toUpperCase();

  const handleSelectStock = useCallback((symbol) => {
    setSelectedSymbol(symbol);
    setCustomSymbol("");
    // Clear previous prediction when changing stock
    setPrediction(null);
  }, []);

  const handleCustomInput = useCallback((e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
    setCustomSymbol(val);
    setSelectedSymbol("");
    setPrediction(null);
  }, []);

  const generatePrediction = useCallback(
    async (isRefresh = false) => {
      if (!activeSymbol) return;

      setLoading(true);
      setPrediction({ status: "loading", data: null, error: null });

      if (isRefresh) {
        invalidateCache(`/ai/insights/${activeSymbol}`);
      }

      try {
        const res = await fetchWithCache(
          `/ai/insights/${activeSymbol}`,
          {
            params: isRefresh ? { refresh: "true" } : {},
            bypassCache: isRefresh,
          },
          CACHE_TTLS.AI_PREDICTION,
        );

        const payload = res.data?.data?.insights || res.data?.insights || null;
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid prediction payload");
        }

        setPrediction({ status: "success", data: payload, error: null });
      } catch (err) {
        const status = err.response?.status;
        let msg = "AI prediction temporarily unavailable. Please try again.";
        if (status === 429) {
          msg = "Rate limited — please wait a moment and try again.";
        } else if (status === 401) {
          msg = "Authentication error — please log in again.";
        }
        setPrediction({ status: "error", data: null, error: msg });
      } finally {
        setLoading(false);
      }
    },
    [activeSymbol],
  );

  return (
    <PageLayout
      title="AI Predictions"
      subtitle="Generate AI-powered market trend predictions using Random Forest analysis"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stock Selection Card */}
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-muted text-primary">
              <BrainIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Select a Stock
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose a stock to generate an AI prediction for.
              </p>
            </div>
          </div>

          {/* Popular Stock Chips */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
              Popular Stocks
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_STOCKS.map((stock) => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => handleSelectStock(stock.symbol)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                    activeSymbol === stock.symbol
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                      : "bg-muted/60 text-foreground hover:bg-muted hover:shadow-sm border border-transparent hover:border-border",
                  )}
                >
                  <span className="font-bold">{stock.symbol}</span>
                  <span className="text-xs opacity-70 hidden sm:inline">
                    {stock.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Symbol Input */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={customSymbol}
                onChange={handleCustomInput}
                placeholder="Or type a symbol…"
                maxLength={5}
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => generatePrediction(false)}
              disabled={!activeSymbol || loading}
              className="gap-2 px-5 py-2.5 text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              {loading ? (
                <>
                  <RefreshIcon className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <BrainIcon className="h-4 w-4" />
                  Generate Prediction
                </>
              )}
            </Button>
          </div>

          {activeSymbol && !loading && !prediction && (
            <p className="mt-3 text-xs text-muted-foreground italic">
              Click "Generate Prediction" to run the Random Forest model on{" "}
              <strong>{activeSymbol}</strong>.
            </p>
          )}
        </Card>

        {/* Prediction Results */}
        {prediction?.status === "loading" && (
          <PredictionSkeleton symbol={activeSymbol} />
        )}

        {prediction?.status === "error" && (
          <Card className="p-6 border-negative/30 bg-negative-muted/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-negative-muted text-negative">
                <BrainIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">
                  Prediction Failed
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {prediction.error}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => generatePrediction(true)}
                  className="mt-3 gap-1.5 text-xs"
                >
                  <RefreshIcon className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {prediction?.status === "success" && prediction.data && (
          <PredictionResult
            symbol={activeSymbol}
            data={prediction.data}
            onRefresh={() => generatePrediction(true)}
            refreshing={loading}
          />
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground/80 italic">
          AI predictions are statistical estimates generated by a Random Forest
          classifier trained on historical technical indicators. They are for
          simulated trading only and are not guaranteed financial advice.
        </p>
      </div>
    </PageLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Prediction Result — full detail card                               */
/* ------------------------------------------------------------------ */
function PredictionResult({ symbol, data, onRefresh, refreshing }) {
  const rawTrend = data?.trend || data?.prediction || "neutral";
  const trend = String(rawTrend).toLowerCase();
  const isBullish = trend === "bullish";
  const isBearish = trend === "bearish";
  const displayTrend = isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral";

  const confidence =
    typeof data?.confidence === "number" ? Math.round(data.confidence) : 65;
  const horizon = data?.horizon || "5–10 Trading Days";
  const signals = Array.isArray(data?.signals) ? data.signals : [];
  const externalFactors =
    Array.isArray(data?.external_factors) && data.external_factors.length > 0
      ? data.external_factors
      : [
          "Broad market sentiment and sector-wide macroeconomic factors may be contributing to current price dynamics.",
        ];
  const eventsSummary =
    data?.events_summary ||
    "No major external event was identified from the available data.";
  const risks =
    Array.isArray(data?.risks) && data.risks.length > 0
      ? data.risks
      : ["Market volatility", "Prediction uncertainty"];
  const modelInfo = data?.model || {};

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Result Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              isBullish
                ? "bg-positive-muted text-positive"
                : isBearish
                  ? "bg-negative-muted text-negative"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {isBullish ? (
              <ArrowUpIcon className="h-6 w-6" />
            ) : isBearish ? (
              <ArrowDownIcon className="h-6 w-6" />
            ) : (
              <BrainIcon className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                {symbol}
              </h2>
              <Badge
                tone={
                  isBullish ? "positive" : isBearish ? "negative" : "neutral"
                }
                className="px-3 py-1 text-sm font-bold"
              >
                {displayTrend}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Prediction horizon: {horizon}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-1.5 text-xs h-8 px-3"
        >
          <RefreshIcon
            className={cx(
              "h-3.5 w-3.5",
              refreshing && "animate-spin text-primary",
            )}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Confidence & Model */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">
            Model Confidence
          </h3>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">
                Confidence Score
              </span>
              <span
                className={cx(
                  "text-2xl font-extrabold tabular",
                  isBullish
                    ? "text-positive"
                    : isBearish
                      ? "text-negative"
                      : "text-foreground",
                )}
              >
                {confidence}%
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cx(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isBullish
                    ? "bg-positive"
                    : isBearish
                      ? "bg-negative"
                      : "bg-primary",
                )}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Model Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span>
              Model:{" "}
              <strong className="text-foreground">
                {modelInfo.name || "Random Forest"}
              </strong>
            </span>
            <span>
              Type:{" "}
              <strong className="text-foreground">
                {modelInfo.type || "Ensemble Classifier"}
              </strong>
            </span>
          </div>
        </Card>

        {/* Technical Signals */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            Technical Signals
          </h3>
          {signals.length > 0 ? (
            <div className="space-y-2.5">
              {signals.map((sig, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl bg-muted/30 p-3"
                >
                  <span
                    className={cx(
                      "mt-0.5 h-2 w-2 rounded-full shrink-0",
                      sig.signal === "bullish"
                        ? "bg-positive"
                        : sig.signal === "bearish"
                          ? "bg-negative"
                          : "bg-muted-foreground",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {sig.title}
                      </span>
                      {sig.value && (
                        <Badge
                          tone={
                            sig.signal === "bullish"
                              ? "positive"
                              : sig.signal === "bearish"
                                ? "negative"
                                : "neutral"
                          }
                          className="text-[10px] px-1.5"
                        >
                          {sig.value}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {sig.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Trend structure aligned with 20-day momentum.
            </p>
          )}
        </Card>

        {/* External Factors */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            External / Market Factors
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {externalFactors.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{fact}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground/80 italic border-t border-border/40 pt-2">
            {eventsSummary}
          </p>
        </Card>

        {/* Risks */}
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            Potential Risks
          </h3>
          <div className="flex flex-wrap gap-2">
            {risks.map((risk, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-xl bg-negative-muted/30 border border-negative/10 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {risk}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */
function PredictionSkeleton({ symbol }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-foreground">
              {symbol}
            </span>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32 rounded mt-1" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout.jsx";
import api, { fetchWithCache, CACHE_TTLS } from "../utils/api.js";
import {
  Card,
  Badge,
  DeltaPill,
  Skeleton,
  EmptyState,
  cx,
} from "../components/ui/primitives.jsx";
import {
  WalletIcon,
  PortfolioIcon,
  TransactionsIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../components/ui/icons.jsx";
import {
  formatCurrency,
  formatSignedCurrency,
  formatPercent,
  formatDate,
  isPositive,
} from "../utils/format.js";

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [portfolioResult, stocksResult, watchlistResult, transactionsResult] =
          await Promise.allSettled([
            api.get("/portfolio"),
            fetchWithCache("/stocks", {}, CACHE_TTLS.QUOTE),
            api.get("/watchlist"),
            api.get("/transactions"),
          ]);

        if (portfolioResult.status === "fulfilled") {
          setPortfolio(portfolioResult.value?.data?.data?.portfolio || null);
        } else {
          console.warn("Failed to load portfolio:", portfolioResult.reason);
        }

        if (stocksResult.status === "fulfilled") {
          const rawStocks =
            stocksResult.value?.data?.data?.stocks ||
            stocksResult.value?.data?.stocks ||
            [];
          setStocks(rawStocks.slice(0, 6));
        } else {
          console.warn("Failed to load market stocks:", stocksResult.reason);
        }

        if (watchlistResult.status === "fulfilled") {
          void watchlistResult.value;
        }

        if (transactionsResult.status === "fulfilled") {
          const rawTxns =
            transactionsResult.value?.data?.data?.transactions || [];
          setTransactions(rawTxns.slice(0, 5));
        } else {
          console.warn("Failed to load transactions:", transactionsResult.reason);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const plPositive = isPositive(portfolio?.total_pl);

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Your virtual portfolio at a glance"
    >
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Hero — total account value */}
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-card via-card to-primary-muted/20 border-primary/30 shadow-pop">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Total account value
                </span>
                <Badge tone={plPositive ? "positive" : "negative"}>
                  {plPositive ? (
                    <ArrowUpIcon className="h-3 w-3" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3" />
                  )}
                  {formatPercent(portfolio?.return_percent, { withSign: true })}
                </Badge>
              </div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight text-foreground tabular sm:text-5xl">
                {formatCurrency(portfolio?.account_value)}
              </div>
              <div
                className={cx(
                  "mt-2 text-sm font-semibold tabular",
                  plPositive ? "text-positive" : "text-negative",
                )}
              >
                {formatSignedCurrency(portfolio?.total_pl)} all-time
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniStat
                  label="Available cash"
                  value={formatCurrency(portfolio?.cash_balance)}
                  icon={WalletIcon}
                />
                <MiniStat
                  label="Invested value"
                  value={formatCurrency(portfolio?.portfolio_value)}
                  icon={PortfolioIcon}
                />
              </div>
            </Card>

            {/* Quick actions */}
            <Card className="flex flex-col justify-between p-6">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Quick actions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jump back into the market.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <QuickLink to="/watchlist" label="View watchlist" />
                <QuickLink to="/stocks" label="Browse markets" />
                <QuickLink to="/portfolio" label="View holdings" />
                <QuickLink to="/leaderboard" label="See leaderboard" />
              </div>
            </Card>
          </div>

          {/* Market overview + recent activity */}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">
                  Market overview
                </h2>
                <Link
                  to="/stocks"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  All markets
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 divide-y divide-border">
                {stocks.map((stock) => (
                  <Link
                    key={stock.symbol}
                    to={`/stocks/${stock.symbol}`}
                    className="group flex items-center gap-4 py-3 transition"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-foreground">
                      {stock.symbol.slice(0, 4)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground group-hover:text-primary">
                        {stock.symbol}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground tabular">
                        {stock.quote?.price != null
                          ? formatCurrency(stock.quote.price)
                          : "$--"}
                      </div>
                      {stock.quote?.percent_change != null ? (
                        <DeltaPill
                          percent={stock.quote.percent_change}
                          size="sm"
                          className="mt-0.5"
                        />
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">
                  Recent activity
                </h2>
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  All
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4">
                {transactions.length ? (
                  <div className="divide-y divide-border">
                    {transactions.map((txn) => {
                      const isBuy =
                        String(txn.transaction_type).toLowerCase() === "buy";
                      return (
                        <div
                          key={txn.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <span
                            className={cx(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                              isBuy
                                ? "bg-positive-muted text-positive"
                                : "bg-negative-muted text-negative",
                            )}
                          >
                            {isBuy ? (
                              <ArrowDownIcon className="h-4 w-4" />
                            ) : (
                              <ArrowUpIcon className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {txn.symbol}
                              </span>
                              <span className="text-xs font-medium uppercase text-muted-foreground">
                                {txn.transaction_type}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {txn.quantity} shares · {formatDate(txn.created_at)}
                            </div>
                          </div>
                          <div className="text-right font-semibold text-foreground tabular">
                            {formatCurrency(txn.total_value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={TransactionsIcon}
                    title="No transactions yet"
                    description="Buy a stock to start trading and it will show up here."
                  />
                )}
              </div>
            </Card>
          </div>

          {/* AI Predictions Promo */}
          <div className="rounded-2xl border border-primary/20 bg-primary-muted/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Market Predictions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate Random Forest predictions for any stock on demand — no automatic loading.
              </p>
            </div>
            <Link
              to="/ai-predictions"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow hover:opacity-90 transition"
            >
              Go to AI Predictions
            </Link>
          </div>
        </div>

      )}
    </PageLayout>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 text-lg font-bold text-foreground tabular">
        {value}
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
    >
      {label}
      <ChevronRightIcon className="h-4 w-4" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

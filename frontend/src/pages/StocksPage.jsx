import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout.jsx";
import api, { fetchWithCache, CACHE_TTLS } from "../utils/api.js";
import {
  Card,
  DeltaPill,
  Skeleton,
  EmptyState,
  Button,
} from "../components/ui/primitives.jsx";
import { SearchIcon, StocksIcon, ChevronRightIcon } from "../components/ui/icons.jsx";
import { formatCurrency } from "../utils/format.js";

export default function StocksPage() {
  const [stocks, setStocks] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadStocks() {
      try {
        const response = await fetchWithCache("/stocks", {}, CACHE_TTLS.QUOTE);
        const data = response.data?.data?.stocks || response.data?.stocks || [];
        setStocks(data);
      } catch (error) {
        console.error("Failed to load stocks:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStocks();
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setSearching(true);
    setLoading(true);
    try {
      const response = await api.get("/stocks/search", {
        params: { q: query },
      });
      setStocks(response.data.data.stocks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  async function handleReset() {
    setQuery("");
    setLoading(true);
    try {
      const response = await api.get("/stocks");
      setStocks(response.data.data.stocks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
    inputRef.current?.focus();
  }

  return (
    <PageLayout
      title="Markets"
      subtitle="Browse US stocks and open one to trade"
    >
      <div className="space-y-6 animate-fade-in">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by symbol or company name"
              className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="md" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
            {query ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleReset}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </form>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : stocks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stocks.map((stock) => (
              <Link key={stock.symbol} to={`/stocks/${stock.symbol}`}>
                <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-xs font-bold text-foreground">
                        {stock.symbol.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground group-hover:text-primary">
                          {stock.symbol}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {stock.name}
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-xl font-bold text-foreground tabular">
                      {stock.quote?.price != null
                        ? formatCurrency(stock.quote.price)
                        : "$--"}
                    </div>
                    {stock.quote?.percent_change != null ? (
                      <DeltaPill percent={stock.quote.percent_change} />
                    ) : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={StocksIcon}
            title="No stocks found"
            description="Try a different symbol or company name."
            action={
              query ? (
                <Button variant="outline" onClick={handleReset}>
                  Clear search
                </Button>
              ) : null
            }
          />
        )}
      </div>
    </PageLayout>
  );
}

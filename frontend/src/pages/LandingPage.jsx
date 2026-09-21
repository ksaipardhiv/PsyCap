import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo, Button, Card, Badge } from "../components/ui/primitives.jsx";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";
import {
  StocksIcon,
  PortfolioIcon,
  LeaderboardIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  CheckIcon,
  SparkIcon,
  BrainIcon,
  ShieldIcon,
} from "../components/ui/icons.jsx";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: "Is PsyCap completely free to use?",
      a: "Yes! PsyCap is an educational virtual trading platform. You get $100,000 in virtual cash upon registration to practice trading US equities with zero real-money risk.",
    },
    {
      q: "Where does the stock data come from?",
      a: "PsyCap integrates with real market data providers (including Twelve Data) to deliver live stock quotes, price histories, and multi-timeframe OHLC candlestick charts.",
    },
    {
      q: "Can I compete with other traders?",
      a: "Absolutely. Our live Leaderboard ranks all traders by overall return percentage, allowing you to benchmark your performance against top paper traders.",
    },
    {
      q: "Do I need a credit card to sign up?",
      a: "No credit card or payment information is required. Simply create a username and password to start paper trading immediately.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors overflow-x-hidden">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-primary/5 to-transparent" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground transition">
              FAQ
            </a>
            <Link to="/stocks" className="hover:text-foreground transition">
              Markets
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:inline-block"
            >
              Sign In
            </Link>
            <Button as="link" to="/signup" variant="primary" size="md">
              Start Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Badge tone="primary" className="py-1 px-3 text-xs uppercase tracking-wider font-bold">
            <SparkIcon className="h-3.5 w-3.5 mr-1" />
            Educational Virtual Trading Platform
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Master the Stock Market with{" "}
            <span className="bg-gradient-to-r from-primary via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Zero Financial Risk
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-xl">
            Practice trading US equities with $100,000 in virtual capital. Real-time market data, interactive candlestick charts, and AI Market Intelligence powered by machine learning.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 py-2">
            <Badge tone="primary" className="flex items-center gap-1">
              <BrainIcon className="h-3 w-3" /> AI Market Intelligence
            </Badge>
            <Badge tone="secondary" className="flex items-center gap-1">Portfolio Insights</Badge>
            <Badge tone="secondary" className="flex items-center gap-1">Trading Behavior</Badge>
            <Badge tone="secondary" className="flex items-center gap-1">Risk & Diversification</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button as="link" to="/signup" variant="primary" size="lg" className="shadow-pop">
              Start Trading Free
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button as="link" to="/login" variant="outline" size="lg">
              Sign In to Account
            </Button>
          </div>
        </div>

        {/* Hero Product Preview Showcase */}
        <div className="relative mx-auto mt-14 max-w-5xl">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-sky-500/20 to-emerald-500/30 blur-xl opacity-50" />
          <Card className="relative overflow-hidden border-border/80 bg-card/90 shadow-pop p-4 sm:p-6 backdrop-blur-xl">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-semibold text-muted-foreground hidden sm:inline">
                  PsyCap Trading Terminal — Live Paper Account
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-positive animate-pulse" />
                <span className="text-xs font-semibold text-positive">Market Live</span>
              </div>
            </div>

            {/* Terminal Preview Content */}
            <div className="grid gap-4 md:grid-cols-3 text-left">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-xs font-semibold text-muted-foreground">Portfolio Value</div>
                <div className="mt-1 text-2xl font-extrabold text-foreground tabular">$108,450.00</div>
                <div className="mt-1 flex items-center gap-1 text-xs font-bold text-positive">
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                  +8.45% (+$8,450.00)
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-xs font-semibold text-muted-foreground">Available Cash</div>
                <div className="mt-1 text-2xl font-extrabold text-foreground tabular">$42,100.00</div>
                <div className="mt-1 text-xs text-muted-foreground">Ready to invest</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-xs font-semibold text-muted-foreground">Open Positions</div>
                <div className="mt-1 text-2xl font-extrabold text-foreground tabular">4 Stocks</div>
                <div className="mt-1 text-xs text-positive font-medium">AAPL, NVDA, MSFT, TSLA</div>
              </div>
            </div>

            {/* Mini Market Ticker Cards */}
            <div className="mt-4 grid gap-3 sm:grid-cols-4 text-left">
              {[
                { s: "AAPL", n: "Apple Inc.", p: "$224.23", c: "+1.85%" },
                { s: "NVDA", n: "NVIDIA Corp.", p: "$128.50", c: "+3.42%" },
                { s: "MSFT", n: "Microsoft Corp.", p: "$448.90", c: "+0.95%" },
                { s: "TSLA", n: "Tesla, Inc.", p: "$210.40", c: "+2.15%" },
              ].map((stock) => (
                <div key={stock.s} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-foreground">{stock.s}</div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[90px]">{stock.n}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-xs text-foreground tabular">{stock.p}</div>
                    <div className="text-[11px] font-bold text-positive">{stock.c}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Features Bento Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Built for Active Learning
          </h2>
          <p className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Everything you need to practice stock trading
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <StocksIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Real-Time Market Data</h3>
            <p className="text-sm text-muted-foreground">
              Fetch live stock quotes and historical prices powered by Twelve Data for popular US equities.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <PortfolioIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">$100,000 Virtual Capital</h3>
            <p className="text-sm text-muted-foreground">
              Every account starts with $100,000 virtual cash. Buy and sell shares without risking real money.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <SparkIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Interactive Candlestick Charts</h3>
            <p className="text-sm text-muted-foreground">
              Switch seamlessly between Line/Area charts and OHLC Candlestick charts across 1D to 1Y timeframes.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <LeaderboardIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Global Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              Compare performance with other traders ranked by return percentage and total account value.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <ShieldIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Risk-Free Environment</h3>
            <p className="text-sm text-muted-foreground">
              Test trading strategies, learn market dynamics, and build confidence before investing real funds.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-border hover:border-primary/40 transition">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
              <CheckIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Instant Execution Log</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive trade log tracking execution prices, quantities, total amounts, and realized P/L.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Simple 3-Step Process
          </h2>
          <p className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            How PsyCap Works
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            { step: "01", title: "Create Your Account", desc: "Sign up in seconds. You are automatically allocated $100,000 in virtual trading capital." },
            { step: "02", title: "Analyze US Markets", desc: "Search stocks, inspect live prices, and analyze price trends with interactive candlestick charts." },
            { step: "03", title: "Trade & Track Progress", desc: "Place buy and sell orders. Watch your portfolio value grow and climb the global leaderboard." },
          ].map((item) => (
            <Card key={item.step} className="p-8 relative space-y-4 border-border">
              <div className="text-4xl font-black text-primary/40">{item.step}</div>
              <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 border-t border-border">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Got questions? We have answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <Card key={idx} className="overflow-hidden border-border">
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left font-bold text-foreground hover:text-primary transition"
                >
                  <span>{faq.q}</span>
                  <span className={`text-xl transition-transform ${isOpen ? "rotate-45" : ""}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-muted-foreground border-t border-border/50 pt-4">
                    {faq.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="relative overflow-hidden p-8 sm:p-12 text-center bg-gradient-to-br from-card via-card to-primary-muted/30 border-primary/30 shadow-pop">
          <div className="mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Ready to Start Paper Trading?
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Join PsyCap today and receive your $100,000 virtual portfolio instantly.
            </p>
            <div className="pt-2">
              <Button as="link" to="/signup" variant="primary" size="lg" className="shadow-pop">
                Get Started Now — Free
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-xs text-muted-foreground border-l border-border pl-3">
              Virtual Stock Market Simulator
            </span>
          </div>

          <div className="text-xs text-muted-foreground text-center md:text-right">
            <p>© {new Date().getFullYear()} PsyCap. Educational platform only. No real money or investment advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

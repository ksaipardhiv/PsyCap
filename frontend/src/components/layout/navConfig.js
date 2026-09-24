import {
  DashboardIcon,
  StocksIcon,
  PortfolioIcon,
  BrainIcon,
  WatchlistIcon,
  TransactionsIcon,
  LeaderboardIcon,
  SettingsIcon,
} from "../ui/icons.jsx";

// Primary navigation. `primary: true` items appear in the mobile bottom bar.
export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon, primary: true },
  { to: "/stocks", label: "Markets", icon: StocksIcon, primary: true },
  { to: "/portfolio", label: "Portfolio", icon: PortfolioIcon, primary: true },
  { to: "/ai-predictions", label: "AI Predictions", icon: BrainIcon, primary: true },
  { to: "/watchlist", label: "Watchlist", icon: WatchlistIcon },
  { to: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { to: "/leaderboard", label: "Leaderboard", icon: LeaderboardIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];


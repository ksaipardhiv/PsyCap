import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import stockRoutes from "./routes/stockRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import holdingsRoutes from "./routes/holdingsRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
// Build an array of allowed origins. Include the env var if set and the local dev URL.
const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non‑browser requests like curl/postman which may have no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const msg = "The CORS policy for this site does not allow access from the specified Origin.";
    return callback(new Error(msg), false);
  },
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { message: "PsyCap API is running" } });
});

app.use("/api/stocks", authenticate, stockRoutes);
app.use("/api/portfolio", authenticate, portfolioRoutes);
app.use("/api/holdings", authenticate, holdingsRoutes);
app.use("/api/transactions", authenticate, transactionRoutes);
app.use("/api/profile", authenticate, profileRoutes);
app.use("/api/trades", authenticate, tradeRoutes);
app.use("/api/watchlist", authenticate, watchlistRoutes);
app.use("/api/leaderboard", authenticate, leaderboardRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`PsyCap backend listening on port ${PORT}`);
});

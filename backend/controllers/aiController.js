import aiPredictionService from "../services/aiPredictionService.js";

export async function getStockInsights(req, res, next) {
  try {
    const symbol = String(req.params.symbol).toUpperCase();
    const refresh = req.query.refresh === "true";
    const insights = await aiPredictionService.getStockInsights(symbol, refresh);
    res.json({ success: true, data: { insights } });
  } catch (error) {
    next(error);
  }
}

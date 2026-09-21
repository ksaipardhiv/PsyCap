import express from "express";
import { getStockInsights } from "../controllers/aiController.js";

const router = express.Router();

router.get("/insights/:symbol", getStockInsights);

export default router;

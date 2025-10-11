// @ts-nocheck
import express from "express";
import productRoutes from "./productRoutes.js";
import syncRoutes from "./syncRoutes.js";
import webhookRoutes from "./webhookRoutes.js";
import tokenRoutes from "./tokenRoutes.js";

const router = express.Router();

// Mount route modules
router.use("/products", productRoutes);
router.use("/shopify/sync", syncRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/tokens", tokenRoutes);

export default router;

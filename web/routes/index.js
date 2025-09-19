// @ts-nocheck
import express from "express";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import syncRoutes from "./syncRoutes.js";
import skuRoutes from "./skuRoutes.js";
import webhookRoutes from "./webhookRoutes.js";

const router = express.Router();

// Mount route modules
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/sync", syncRoutes);
router.use("/skus", skuRoutes);
router.use("/webhooks", webhookRoutes);

export default router;

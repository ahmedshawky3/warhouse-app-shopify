// @ts-nocheck
import express from "express";
import { 
  getSkuQuantities 
} from "../controllers/skuController.js";

const router = express.Router();

// SKU routes
router.get("/quantities", getSkuQuantities);

export default router;

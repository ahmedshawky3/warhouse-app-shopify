// @ts-nocheck
import express from "express";
import { 
  getOrders, 
  syncOrders 
} from "../controllers/orderController.js";

const router = express.Router();

// Order routes
router.get("/", getOrders);
router.post("/sync", syncOrders);

export default router;

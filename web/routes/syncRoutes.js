// @ts-nocheck
import express from "express";
import { 
  sendProducts, 
  externalSyncProducts 
} from "../controllers/syncController.js";

const router = express.Router();

// Sync routes
router.post("/send-products", sendProducts);
router.post("/external/sync-products", externalSyncProducts);

export default router;

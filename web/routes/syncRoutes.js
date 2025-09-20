// @ts-nocheck
import express from "express";
import { 
  sendProducts, 
  externalSyncProducts 
} from "../controllers/syncController.js";

const router = express.Router();

// Sync routes
router.post("/products", sendProducts);
router.post("/external/sync-products", externalSyncProducts);

// Test route to verify sync routes are accessible
router.get("/test", (req, res) => {
  res.json({ 
    message: 'Sync routes are working!', 
    timestamp: new Date().toISOString(),
    path: req.path 
  });
});

export default router;

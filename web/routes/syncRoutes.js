// @ts-nocheck
import express from "express";
import { 
  sendProducts
} from "../controllers/syncController.js";

const router = express.Router();

// Sync routes
router.post("/products", sendProducts);

export default router;

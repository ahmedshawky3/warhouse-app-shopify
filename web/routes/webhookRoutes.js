// @ts-nocheck
import express from "express";
import { 
  registerWebhooks, 
  testWebhook 
} from "../controllers/webhookController.js";

const router = express.Router();

// Webhook routes
router.post("/register", registerWebhooks);
router.get("/test", testWebhook);

export default router;

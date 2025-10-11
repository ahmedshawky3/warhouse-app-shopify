// @ts-nocheck
import { readFileSync } from "fs";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('EXTERNAL_API_BASE_URL:', process.env.EXTERNAL_API_BASE_URL);
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set (using default)');

import shopify from "./shopify.js";
import PrivacyWebhookHandlers from "./privacy.js";
import apiRoutes from "./routes/index.js";
import { connectDB } from "./config/database.js";

// Import configuration
import { PORT, STATIC_PATH } from "./config/constants.js";

// Import middleware
import { setSecurityHeaders, setCSPHeaders, webhookLogger, validateWebhookPayload, rateLimiter } from "./middleware/security.js";
import { configureStaticFiles } from "./middleware/static.js";
import { requestLogger, appLogger } from "./utils/logger.js";

const app = express();

// Connect to MongoDB
connectDB().catch((error) => {
  appLogger.error('Failed to connect to MongoDB:', error);
});

// Add request logging middleware
app.use(requestLogger);

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// Webhook handling with security middleware
app.post(
  shopify.config.webhooks.path,
  rateLimiter,
  validateWebhookPayload,
  webhookLogger,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// Test endpoint to verify webhook is working (before auth middleware)
app.get("/api/webhook-test", (req, res) => {
  console.log('🧪 Webhook test endpoint hit!');
  res.json({ 
    message: 'Webhook endpoint is working!', 
    timestamp: new Date().toISOString(),
    url: req.url 
  });
});

// Set security headers
app.use(setSecurityHeaders);

// Parse JSON bodies
app.use(express.json());

// Apply rate limiting to all API routes
app.use("/api/*", rateLimiter);

// Apply authentication middleware to all API routes EXCEPT /api/tokens
app.use("/api/*", (req, res, next) => {
  // Skip authentication for token routes
  if (req.path.startsWith('/tokens')) {
    return next();
  }
  return shopify.validateAuthenticatedSession()(req, res, next);
});

// Mount API routes (token routes will bypass auth due to middleware above)
app.use("/api", apiRoutes);

// Configure CSP headers for development
if (process.env.NODE_ENV === 'development') {
  app.use(setCSPHeaders);
} else {
  app.use(shopify.cspHeaders());
}

// Serve static files from the frontend directory
app.use(configureStaticFiles(STATIC_PATH));

// Catch-all handler: send back React's index.html file for any non-API routes
app.use("/*", shopify.ensureInstalledOnShop(), async (req, res, _next) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    res
      .status(200)
      .set("Content-Type", "text/html")
      .send(
        readFileSync(join(STATIC_PATH, "index.html"))
          .toString()
          .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
      );
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

app.listen(PORT, () => {
  appLogger.info('Server started successfully', {
    port: PORT,
    staticPath: STATIC_PATH,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

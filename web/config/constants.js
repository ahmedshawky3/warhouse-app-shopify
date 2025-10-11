// @ts-nocheck
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables if not already loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '..', '.env');

// Try to load .env file and log the result
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn('⚠️ Could not load .env file:', envResult.error.message);
} else {
  console.log('✅ .env file loaded successfully from:', envPath);
}

// Global configuration variables - get from environment
// EXTERNAL_API_BASE_URL should be your external system (e.g., database, ERP, etc.) - NOT your Shopify app URL
let EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

// Debug environment variable loading
console.log('🔍 Environment variable check:');
console.log('  process.env.EXTERNAL_API_BASE_URL:', process.env.EXTERNAL_API_BASE_URL);
console.log('  EXTERNAL_API_BASE_URL after assignment:', EXTERNAL_API_BASE_URL);

// Provide a default external API URL for development/testing
if (!EXTERNAL_API_BASE_URL) {
  console.warn('⚠️ EXTERNAL_API_BASE_URL not set - using default test URL');
  console.warn('⚠️ Set EXTERNAL_API_BASE_URL to your actual external system URL (e.g., database, ERP)');
  EXTERNAL_API_BASE_URL = 'https://your-external-system.com'; // Replace with your actual external system URL
}

export { EXTERNAL_API_BASE_URL };

export const ORDER_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/shopify/sync/receive/orders`;
export const PRODUCT_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/shopify/sync/products`;

// Log configuration for debugging
console.log('🔧 External API Configuration:');
console.log('  EXTERNAL_API_BASE_URL:', EXTERNAL_API_BASE_URL);
console.log('  PRODUCT_SYNC_ENDPOINT:', PRODUCT_SYNC_ENDPOINT);
console.log('  ORDER_SYNC_ENDPOINT:', ORDER_SYNC_ENDPOINT);

export const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

export const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

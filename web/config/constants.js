// @ts-nocheck
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables if not already loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Global configuration variables - get from environment
let EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

// Validate required environment variables
if (!EXTERNAL_API_BASE_URL) {
  console.error('❌ EXTERNAL_API_BASE_URL environment variable is required!');
  console.error('Please set EXTERNAL_API_BASE_URL in your environment variables.');
  throw new Error('EXTERNAL_API_BASE_URL environment variable is required');
}

export { EXTERNAL_API_BASE_URL };

export const ORDER_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/receive-orders`;
export const SKU_QUANTITIES_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/skus/quantities`;
export const PRODUCT_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/send-products`;

// Log configuration for debugging
console.log('🔧 External API Configuration:');
console.log('  EXTERNAL_API_BASE_URL:', EXTERNAL_API_BASE_URL);
console.log('  PRODUCT_SYNC_ENDPOINT:', PRODUCT_SYNC_ENDPOINT);
console.log('  ORDER_SYNC_ENDPOINT:', ORDER_SYNC_ENDPOINT);
console.log('  SKU_QUANTITIES_ENDPOINT:', SKU_QUANTITIES_ENDPOINT);

export const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

export const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

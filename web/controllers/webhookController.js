// @ts-nocheck
import shopify from "../shopify.js";
import { EXTERNAL_API_BASE_URL } from "../config/constants.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Function to get app URL from TOML config
function getAppUrlFromConfig() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const tomlPath = join(__dirname, '..', '..', 'shopify.app.warhouse-app-testing.toml');
    const tomlContent = readFileSync(tomlPath, 'utf8');
    
    // Parse application_url from TOML
    const match = tomlContent.match(/application_url\s*=\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
    
    throw new Error('application_url not found in TOML config');
  } catch (error) {
    console.error('❌ Could not read app URL from TOML config:', error.message);
    throw new Error(`Failed to get app URL from TOML config: ${error.message}`);
  }
}

// Export the function so it can be used elsewhere
export { getAppUrlFromConfig };

/**
 * Register webhooks manually
 */
export const registerWebhooks = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'No authenticated session found'
      });
    }

    // Get the current app URL from TOML config (dynamically changes with each dev server restart)
    let currentAppUrl;
    try {
      currentAppUrl = getAppUrlFromConfig();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to read app URL from TOML config',
        error: error.message
      });
    }
    
    console.log('🔧 Manually registering webhooks for shop:', session.shop);
    console.log('📍 App URL (for webhook callbacks):', currentAppUrl);
    console.log('📍 External API URL (for sending data):', EXTERNAL_API_BASE_URL);
    
     // Register order webhooks (using non-protected webhook topics that work without approval)
     const result = await shopify.api.webhooks.register({
       session,
       webhooks: [
         // Use webhook topics that don't require special approval
         {
           topic: 'ORDERS_CREATE',
           deliveryMethod: shopify.api.DeliveryMethod.Http,
           callbackUrl: `${currentAppUrl}/api/webhooks`,
         },
         {
           topic: 'ORDERS_UPDATED',
           deliveryMethod: shopify.api.DeliveryMethod.Http,
           callbackUrl: `${currentAppUrl}/api/webhooks`,
         }
       ]
     });
    
    console.log('✅ Webhooks registered successfully:', result);
    
    res.status(200).json({
      success: true,
      message: 'Webhooks registered successfully',
      result: result
    });
  } catch (error) {
    console.error('❌ Error registering webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register webhooks',
      error: error.message
    });
  }
};

/**
 * Test webhook endpoint
 */
export const testWebhook = (req, res) => {
  console.log('🧪 Webhook test endpoint hit!');
  res.json({ 
    message: 'Webhook endpoint is working!', 
    timestamp: new Date().toISOString(),
    url: req.url 
  });
};

/**
 * Get current configuration URLs
 */
export const getConfig = (req, res) => {
  try {
    const currentAppUrl = getAppUrlFromConfig();
    
    res.json({
      message: 'Current webhook configuration',
      timestamp: new Date().toISOString(),
      config: {
        appUrl: currentAppUrl,
        externalApiUrl: EXTERNAL_API_BASE_URL,
        webhookCallbackUrl: `${currentAppUrl}/api/webhooks`,
        externalOrderEndpoint: `${EXTERNAL_API_BASE_URL}/api/receive-orders`
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to get configuration',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

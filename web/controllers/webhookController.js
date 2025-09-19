// @ts-nocheck
import shopify from "../shopify.js";
import { EXTERNAL_API_BASE_URL } from "../config/constants.js";

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

    console.log('🔧 Manually registering webhooks for shop:', session.shop);
    
    // Register order webhooks
    const result = await shopify.api.webhooks.register({
      session,
      webhooks: [
        {
          topic: 'ORDERS_CREATE',
          deliveryMethod: shopify.api.DeliveryMethod.Http,
          callbackUrl: `${EXTERNAL_API_BASE_URL}/api/webhooks`,
        },
        {
          topic: 'ORDERS_UPDATED',
          deliveryMethod: shopify.api.DeliveryMethod.Http,
          callbackUrl: `${EXTERNAL_API_BASE_URL}/api/webhooks`,
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

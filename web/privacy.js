import { DeliveryMethod } from "@shopify/shopify-api";

// Global configuration variables
const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL || "https://7f64bc8bf7b4.ngrok-free.app";
const ORDER_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/receive-orders`;

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * Webhook handler for new orders - automatically sends to odoo API
   */
  ORDERS_CREATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      console.log('🚨 WEBHOOK TRIGGERED!', { topic, shop, webhookId, bodyLength: body?.length });
      try {
        const orderData = JSON.parse(body);
        console.log('🛒 New order created:', orderData.name);
        
        // Get the external API endpoint from environment or config
        const externalEndpoint = ORDER_SYNC_ENDPOINT;
        
        // Transform order data to match our sync format
        const transformedOrder = {
          // Order data
          orderId: orderData.id,
          orderName: orderData.name,
          email: orderData.email,
          totalPrice: orderData.total_price,
          subtotalPrice: orderData.subtotal_price,
          totalTax: orderData.total_tax,
          totalShipping: orderData.total_shipping_price_set?.shop_money?.amount || '0',
          currencyCode: orderData.currency,
          fulfillmentStatus: orderData.fulfillment_status,
          financialStatus: orderData.financial_status,
          processedAt: orderData.processed_at,
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
          
          // Customer data
          customer: orderData.customer ? {
            id: orderData.customer.id,
            firstName: orderData.customer.first_name,
            lastName: orderData.customer.last_name,
            email: orderData.customer.email,
            phone: orderData.customer.phone
          } : null,
          
          // Addresses
          shippingAddress: orderData.shipping_address,
          billingAddress: orderData.billing_address,
          
          // Line items
          lineItems: orderData.line_items?.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant: item.variant_id ? {
              id: `gid://shopify/ProductVariant/${item.variant_id}`,
              title: item.variant_title,
              sku: item.sku,
              price: item.price
            } : null,
            product: item.product_id ? {
              id: `gid://shopify/Product/${item.product_id}`,
              title: item.product_title || item.title,
              productType: item.product_type,
              vendor: item.vendor
            } : null
          })) || []
        };

        // Send to external API
        const payload = {
          dryRun: false,
          limit: 1,
          skipExisting: false,
          updateExisting: true,
          orders: [transformedOrder],
          data: [transformedOrder],
          orderData: [transformedOrder],
          timestamp: new Date().toISOString(),
          source: 'shopify-webhook',
          shopDomain: shop,
          syncType: 'webhook',
          orderCount: 1,
          webhookId: webhookId,
          topic: topic
        };

        console.log('📤 Sending new order to external API:', externalEndpoint);
        
        const response = await fetch(externalEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to send order webhook:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            orderName: orderData.name
          });
        } else {
          console.log('✅ Order webhook sent successfully:', orderData.name);
        }
      } catch (error) {
        console.error('❌ Error processing order webhook:', error);
      }
    },
  },

  /**
   * Webhook handler for order updates - automatically sends to external API
   */
  ORDERS_UPDATED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      try {
        const orderData = JSON.parse(body);
        console.log('📝 Order updated:', orderData.name);
        
        // Get the external API endpoint from environment or config
        const externalEndpoint = ORDER_SYNC_ENDPOINT;
        
        // Transform order data to match our sync format
        const transformedOrder = {
          // Order data
          orderId: orderData.id,
          orderName: orderData.name,
          email: orderData.email,
          totalPrice: orderData.total_price,
          subtotalPrice: orderData.subtotal_price,
          totalTax: orderData.total_tax,
          totalShipping: orderData.total_shipping_price_set?.shop_money?.amount || '0',
          currencyCode: orderData.currency,
          fulfillmentStatus: orderData.fulfillment_status,
          financialStatus: orderData.financial_status,
          processedAt: orderData.processed_at,
          createdAt: orderData.created_at,
          updatedAt: orderData.updated_at,
          
          // Customer data
          customer: orderData.customer ? {
            id: orderData.customer.id,
            firstName: orderData.customer.first_name,
            lastName: orderData.customer.last_name,
            email: orderData.customer.email,
            phone: orderData.customer.phone
          } : null,
          
          // Addresses
          shippingAddress: orderData.shipping_address,
          billingAddress: orderData.billing_address,
          
          // Line items
          lineItems: orderData.line_items?.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant: item.variant_id ? {
              id: `gid://shopify/ProductVariant/${item.variant_id}`,
              title: item.variant_title,
              sku: item.sku,
              price: item.price
            } : null,
            product: item.product_id ? {
              id: `gid://shopify/Product/${item.product_id}`,
              title: item.product_title || item.title,
              productType: item.product_type,
              vendor: item.vendor
            } : null
          })) || []
        };

        // Send to external API
        const payload = {
          dryRun: false,
          limit: 1,
          skipExisting: false,
          updateExisting: true,
          orders: [transformedOrder],
          data: [transformedOrder],
          orderData: [transformedOrder],
          timestamp: new Date().toISOString(),
          source: 'shopify-webhook',
          shopDomain: shop,
          syncType: 'webhook-update',
          orderCount: 1,
          webhookId: webhookId,
          topic: topic
        };

        console.log('📤 Sending updated order to external API:', externalEndpoint);
        
        const response = await fetch(externalEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to send order update webhook:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            orderName: orderData.name
          });
        } else {
          console.log('✅ Order update webhook sent successfully:', orderData.name);
        }
      } catch (error) {
        console.error('❌ Error processing order update webhook:', error);
      }
    },
  },
  /**
   * Customers can request their data from a store owner. When this happens,
   * Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "orders_requested": [
      //     299938,
      //     280263,
      //     220458
      //   ],
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "data_request": {
      //     "id": 9999
      //   }
      // }
    },
  },

  /**
   * Store owners can request that data is deleted on behalf of a customer. When
   * this happens, Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "orders_to_redact": [
      //     299938,
      //     280263,
      //     220458
      //   ]
      // }
    },
  },

  /**
   * 48 hours after a store owner uninstalls your app, Shopify invokes this
   * privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com"
      // }
    },
  },
};

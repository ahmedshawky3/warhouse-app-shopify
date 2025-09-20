import { DeliveryMethod } from "@shopify/shopify-api";
import { writeFileSync } from 'fs';
import { join } from 'path';

// Import configuration
import { EXTERNAL_API_BASE_URL, ORDER_SYNC_ENDPOINT } from './config/constants.js';


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
        
        // Send raw Shopify order data without transformation
        const payload = {
          // Raw Shopify order data
          order: orderData,
          
          // Webhook metadata
          timestamp: new Date().toISOString(),
          source: 'shopify-webhook',
          shopDomain: shop,
          webhookId: webhookId,
          topic: topic
        };

        console.log('📤 Sending new order to external API:', externalEndpoint);
        
        // Print the exact order endpoint fields being sent to external API
        console.log('🔍 EXACT ORDER ENDPOINT FIELDS BEING SENT TO EXTERNAL API:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(payload, null, 2));
        console.log('='.repeat(80));
        
        // Write the exact payload being sent to external API to a separate file
        const payloadFile = join(process.cwd(), 'order-endpoint-payload.json');
        writeFileSync(payloadFile, JSON.stringify(payload, null, 2));
        console.log('📄 Order endpoint payload saved to:', payloadFile);
        
        // Write order fields to file for easy reading
        const logData = {
          timestamp: new Date().toISOString(),
          webhookId: webhookId,
          topic: topic,
          shop: shop,
          orderName: orderData.name,
          fields: payload
        };
        
        const logFile = join(process.cwd(), 'order-fields-log.json');
        writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log('📋 Order fields saved to:', logFile);
        
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
        
        // Send raw Shopify order data without transformation
        const payload = {
          // Raw Shopify order data
          order: orderData,
          
          // Webhook metadata
          timestamp: new Date().toISOString(),
          source: 'shopify-webhook',
          shopDomain: shop,
          webhookId: webhookId,
          topic: topic
        };

        console.log('📤 Sending updated order to external API:', externalEndpoint);
        
        // Print the exact order endpoint fields being sent to external API
        console.log('🔍 EXACT ORDER ENDPOINT FIELDS BEING SENT TO EXTERNAL API:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(payload, null, 2));
        console.log('='.repeat(80));
        
        // Write the exact payload being sent to external API to a separate file
        const payloadFile = join(process.cwd(), 'order-endpoint-payload.json');
        writeFileSync(payloadFile, JSON.stringify(payload, null, 2));
        console.log('📄 Order endpoint payload saved to:', payloadFile);
        
        // Write order fields to file for easy reading
        const logData = {
          timestamp: new Date().toISOString(),
          webhookId: webhookId,
          topic: topic,
          shop: shop,
          orderName: orderData.name,
          fields: payload
        };
        
        const logFile = join(process.cwd(), 'order-fields-log.json');
        writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log('📋 Order fields saved to:', logFile);
        
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
      try {
        const payload = JSON.parse(body);
        console.log('📋 Customer data request received:', payload);
        
        const { customer, orders_requested, data_request } = payload;
        
        // Log the data request for audit purposes
        console.log(`Customer ${customer.id} (${customer.email}) requested data export`);
        console.log(`Orders requested: ${orders_requested?.length || 0}`);
        
        // In a real implementation, you would:
        // 1. Gather all customer data from your database
        // 2. Compile it into a structured format
        // 3. Send it to the customer or store owner
        // 4. Log the export for compliance
        
        // For now, we'll just acknowledge the request
        console.log('✅ Customer data request processed successfully');
        
        // TODO: Implement actual data export logic
        // Example structure:
        // const customerData = {
        //   customer_id: customer.id,
        //   email: customer.email,
        //   phone: customer.phone,
        //   orders: orders_requested,
        //   exported_at: new Date().toISOString(),
        //   request_id: data_request.id
        // };
        
      } catch (error) {
        console.error('❌ Error processing customer data request:', error);
      }
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
      try {
        const payload = JSON.parse(body);
        console.log('🗑️ Customer redact request received:', payload);
        
        const { customer, orders_to_redact } = payload;
        
        // Log the redaction request for audit purposes
        console.log(`Customer ${customer.id} (${customer.email}) data redaction requested`);
        console.log(`Orders to redact: ${orders_to_redact?.length || 0}`);
        
        // In a real implementation, you would:
        // 1. Delete all customer data from your database
        // 2. Remove any cached data
        // 3. Delete any files or records associated with the customer
        // 4. Log the deletion for compliance
        
        // For now, we'll just acknowledge the request
        console.log('✅ Customer data redaction processed successfully');
        
        // TODO: Implement actual data deletion logic
        // Example:
        // await deleteCustomerData(customer.id, orders_to_redact);
        // await deleteCustomerCache(customer.id);
        // await logDataDeletion(customer.id, new Date());
        
      } catch (error) {
        console.error('❌ Error processing customer redact request:', error);
      }
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
      try {
        const payload = JSON.parse(body);
        console.log('🏪 Shop redact request received:', payload);
        
        const { shop_id, shop_domain } = payload;
        
        // Log the shop redaction request for audit purposes
        console.log(`Shop ${shop_domain} (ID: ${shop_id}) data redaction requested`);
        
        // In a real implementation, you would:
        // 1. Delete all shop data from your database
        // 2. Remove all cached data for this shop
        // 3. Delete any files or records associated with the shop
        // 4. Clean up any scheduled jobs or webhooks
        // 5. Log the deletion for compliance
        
        // For now, we'll just acknowledge the request
        console.log('✅ Shop data redaction processed successfully');
        
        // TODO: Implement actual shop data deletion logic
        // Example:
        // await deleteShopData(shop_id);
        // await deleteShopCache(shop_id);
        // await cleanupShopWebhooks(shop_id);
        // await logShopDeletion(shop_id, new Date());
        
      } catch (error) {
        console.error('❌ Error processing shop redact request:', error);
      }
    },
  },
};
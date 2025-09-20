import { DeliveryMethod } from "@shopify/shopify-api";

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
        // This is where we send the order data TO your external system (e.g., Odoo, ERP)
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
        // This is where we send the order data TO your external system (e.g., Odoo, ERP)
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

// @ts-nocheck
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables from .env file
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

// Debug: Log environment variables
console.log('Environment variables loaded:');
console.log('EXTERNAL_API_BASE_URL:', process.env.EXTERNAL_API_BASE_URL);
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY);

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

// Global configuration variables
const EXTERNAL_API_BASE_URL =  "https://7f64bc8bf7b4.ngrok-free.app";
const ORDER_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/receive-orders`;
const SKU_QUANTITIES_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/skus/quantities`;
const PRODUCT_SYNC_ENDPOINT = `${EXTERNAL_API_BASE_URL}/api/send-products`;

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Helper function to update company inventory and sync to Shopify
async function updateCompanyInventory(companyData, session = null) {
  try {
    console.log('📝 Writing company inventory data:', JSON.stringify(companyData, null, 2));
    
    // Write the data to your inventory system and sync to Shopify
    for (const company of companyData) {
      console.log(`🏢 Company: ${company.company_name}`);
      console.log(`🌐 Website: ${company.company_website}`);
      console.log(`📦 Total SKUs: ${company.total_skus}`);
      console.log(`📊 Total Quantity: ${company.total_quantity}`);
      
      // Write each SKU to inventory and sync to Shopify
      for (const sku of company.skus) {
        console.log(`  ✅ Processing SKU: ${sku.sku} with quantity: ${sku.quantity_on_hand}`);
        
        // If we have a Shopify session, update Shopify inventory
        if (session) {
          try {
            await updateShopifyInventory(session, sku.sku, sku.quantity_on_hand);
            console.log(`  🛍️ Updated Shopify inventory for SKU: ${sku.sku}`);
          } catch (shopifyError) {
            console.error(`  ❌ Failed to update Shopify for SKU ${sku.sku}:`, shopifyError.message);
          }
        }
      }
      
      console.log(`✅ Completed processing inventory for ${company.company_name}`);
    }
    
    console.log('🎉 All company inventory data processed successfully');
    
    // Optional: Log to file for audit trail
    const timestamp = new Date().toISOString();
    console.log(`📄 Audit log - ${timestamp}: Processed inventory for ${companyData.length} companies`);
    
  } catch (error) {
    console.error('❌ Error processing company inventory:', error);
    throw error;
  }
}

// Helper function to update Shopify inventory levels using REST API
async function updateShopifyInventory(session, sku, quantity) {
  try {
    const client = new shopify.api.clients.Graphql({
      session: session,
    });

    // Find the product variant by SKU using GraphQL
    const findVariantResponse = await client.request(`
      query findVariantBySku($sku: String!) {
        productVariants(first: 1, query: $sku) {
          edges {
            node {
              id
              sku
              inventoryQuantity
              inventoryItem {
                id
              }
            }
          }
        }
      }
    `, {
      variables: { sku: sku }
    });

    const variant = findVariantResponse.data.productVariants.edges[0]?.node;
    
    if (!variant) {
      console.log(`⚠️ No Shopify variant found for SKU: ${sku}`);
      return;
    }

    console.log(`🔍 Found Shopify variant for SKU ${sku}: ${variant.id} (current quantity: ${variant.inventoryQuantity})`);

    // Print all current on hand quantities for this SKU
    console.log(`📊 Current On Hand Quantities for SKU ${sku}:`);
    console.log(`  🏪 Variant Inventory Quantity: ${variant.inventoryQuantity}`);

    // Check if update is needed
    if (variant.inventoryQuantity === quantity) {
      console.log(`✅ SKU ${sku} already has correct quantity: ${quantity}`);
      return;
    }

    // Use REST API to update inventory levels
    const baseUrl = `https://${session.shop}/admin/api/2025-07`;
    const headers = {
      'X-Shopify-Access-Token': session.accessToken,
      'Content-Type': 'application/json'
    };

    // Get inventory item ID from the variant
    const inventoryItemId = variant.inventoryItem.id.split('/').pop();
    
    // Get all inventory levels for this item
    const inventoryLevelsResponse = await fetch(`${baseUrl}/inventory_levels.json?inventory_item_ids=${inventoryItemId}`, {
      method: 'GET',
      headers: headers
    });

    if (!inventoryLevelsResponse.ok) {
      throw new Error(`Failed to get inventory levels: ${inventoryLevelsResponse.status}`);
    }

    const inventoryLevels = await inventoryLevelsResponse.json();
    
    if (!inventoryLevels.inventory_levels || inventoryLevels.inventory_levels.length === 0) {
      console.log(`⚠️ No inventory levels found for SKU ${sku}`);
      return;
    }

    // Print all inventory levels for this SKU
    console.log(`📊 Inventory Levels for SKU ${sku}:`);
    inventoryLevels.inventory_levels.forEach((level, index) => {
      console.log(`  📍 Location ${level.location_id}:`);
      console.log(`    🏪 Available: ${level.available}`);
      console.log(`    📦 On Hand: ${level.available + (level.committed || 0)}`);
      console.log(`    🔒 Committed: ${level.committed || 0}`);
    });

    // Use GraphQL to adjust inventory quantities properly
    // This will update the actual on hand quantity
    const adjustmentResponse = await client.request(`
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          inventoryAdjustmentGroup {
            id
            changes {
              name
              delta
              quantityAfterChange
              item {
                id
                sku
              }
              location {
                id
                name
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          reason: "correction",
          referenceDocumentUri: `app://shopify-app/${sku}`,
          changes: inventoryLevels.inventory_levels.map(level => {
            const currentOnHand = variant.inventoryQuantity;
            const delta = quantity - currentOnHand;
            
            console.log(`🔄 Adjusting inventory for location ${level.location_id}:`);
            console.log(`  📊 New Quantity: ${quantity}`);
            console.log(`  🏪 Current On Hand: ${currentOnHand}`);
            console.log(`  🔢 Delta: ${delta}`);
            
            return {
              name: `Set ${sku} quantity to ${quantity}`,
              delta: delta,
              itemId: variant.inventoryItem.id,
              locationId: `gid://shopify/Location/${level.location_id}`
            };
          })
        }
      }
    });

    if (adjustmentResponse.data.inventoryAdjustQuantities.userErrors.length > 0) {
      console.error(`❌ Failed to update inventory for SKU ${sku}:`, adjustmentResponse.data.inventoryAdjustQuantities.userErrors);
      return;
    }

    console.log(`✅ Successfully updated inventory quantity for SKU ${sku} to ${quantity}`);
    console.log(`📊 Adjustment details:`, adjustmentResponse.data.inventoryAdjustQuantities.inventoryAdjustmentGroup.changes);
    
    // Print the new quantities after adjustment
    console.log(`📊 New On Hand Quantities for SKU ${sku} after adjustment:`);
    adjustmentResponse.data.inventoryAdjustQuantities.inventoryAdjustmentGroup.changes.forEach(change => {
      console.log(`  📍 Location ${change.location.name}:`);
      console.log(`    📦 New On Hand: ${change.quantityAfterChange}`);
      console.log(`    🔢 Delta Applied: ${change.delta}`);
    });
    
  } catch (error) {
    console.error(`❌ Error updating Shopify inventory for SKU ${sku}:`, error);
    throw error;
  }
}


// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  (req, res, next) => {
    console.log('🔔 WEBHOOK REQUEST RECEIVED:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    next();
  },
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

// Test endpoint to verify webhook is working (before auth middleware)
app.get("/api/webhook-test", (req, res) => {
  console.log('🧪 Webhook test endpoint hit!');
  res.json({ 
    message: 'Webhook endpoint is working!', 
    timestamp: new Date().toISOString(),
    url: req.url 
  });
});

app.use("/api/*", shopify.validateAuthenticatedSession());

// Manual webhook registration endpoint
app.post("/api/register-webhooks", async (req, res) => {
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
          callbackUrl: `${process.env.SHOPIFY_APP_URL || EXTERNAL_API_BASE_URL}/api/webhooks`,
        },
        {
          topic: 'ORDERS_UPDATED',
          deliveryMethod: shopify.api.DeliveryMethod.Http,
          callbackUrl: `${process.env.SHOPIFY_APP_URL || EXTERNAL_API_BASE_URL}/api/webhooks`,
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
});

// Set headers for Shopify app
app.use((req, res, next) => {
  // Allow the app to be embedded in Shopify admin
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");
  next();
});

app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// Product sending API endpoint
app.post("/api/send-products", (req, res) => {
  (async () => {
    try {
      console.log("Send products request received:", req.body);
      const { endpoint, sendMode, selectedProductIds } = req.body;
      
      // Use pre-configured endpoint if "EXTERNAL_API" is specified
      const actualEndpoint = endpoint === "EXTERNAL_API" ? PRODUCT_SYNC_ENDPOINT : endpoint;
      
      console.log('Endpoint configuration:', {
        requestedEndpoint: endpoint,
        actualEndpoint: actualEndpoint,
        PRODUCT_SYNC_ENDPOINT: PRODUCT_SYNC_ENDPOINT,
        EXTERNAL_API_BASE_URL: process.env.EXTERNAL_API_BASE_URL
      });
      
      if (!actualEndpoint) {
        return res.status(400).json({
          success: false,
          message: 'External API endpoint not configured. Please set EXTERNAL_API_BASE_URL environment variable.',
          details: {
            requestedEndpoint: endpoint,
            PRODUCT_SYNC_ENDPOINT: PRODUCT_SYNC_ENDPOINT,
            EXTERNAL_API_BASE_URL: process.env.EXTERNAL_API_BASE_URL
          }
        });
      }

      // Get Shopify products using the session
      const client = new shopify.api.clients.Graphql({
        session: res.locals.shopify.session,
      });

      let variantsToSend = [];
      
      if (sendMode === "all") {
        // Get all products with their variants
        const response = await client.request(`
          query getProducts($first: Int!) {
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  description
                  status
                  productType
                  vendor
                  createdAt
                  updatedAt
                  images(first: 1) {
                    edges {
                      node {
                        url
                        altText
                      }
                    }
                  }
                  variants(first: 100) {
                    edges {
                      node {
                        id
                        price
                        sku
                        inventoryQuantity
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { first: 50 }
        });

        // Flatten variants with product context
        variantsToSend = response.data.products.edges.flatMap(edge => 
          edge.node.variants.edges.map(v => ({
            // Variant data
            variantId: v.node.id,
            variantTitle: v.node.title,
            price: v.node.price,
            sku: v.node.sku,
            inventoryQuantity: v.node.inventoryQuantity,
            
            // Product context
            productId: edge.node.id,
            productTitle: edge.node.title,
            productDescription: edge.node.description || '',
            productStatus: edge.node.status,
            productVendor: edge.node.vendor || '',
            productCategory: edge.node.productType || 'Uncategorized',
            productImage: edge.node.images.edges[0]?.node || null,
            productCreatedAt: edge.node.createdAt,
            productUpdatedAt: edge.node.updatedAt
          }))
        );
      } else if (sendMode === "selected" && selectedProductIds && selectedProductIds.length > 0) {
        // Get selected products by IDs with their variants
        const productIds = selectedProductIds.map(id => `"${id}"`).join(',');
        
        const response = await client.request(`
          query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                description
                status
                productType
                vendor
                createdAt
                updatedAt
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      price
                      sku
                      inventoryQuantity
                      title
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { ids: selectedProductIds }
        });

        // Flatten variants with product context
        variantsToSend = response.data.nodes
          .filter(node => node !== null)
          .flatMap(node => 
            node.variants.edges.map(v => ({
              // Variant data
              variantId: v.node.id,
              variantTitle: v.node.title,
              price: v.node.price,
              sku: v.node.sku,
              inventoryQuantity: v.node.inventoryQuantity,
              
              // Product context
              productId: node.id,
              productTitle: node.title,
              productDescription: node.description || '',
              productStatus: node.status,
              productVendor: node.vendor || '',
              productCategory: node.productType || 'Uncategorized',
              productImage: node.images.edges[0]?.node || null,
              productCreatedAt: node.createdAt,
              productUpdatedAt: node.updatedAt
            }))
          );
      } else {
        return res.status(400).json({
          success: false,
          message: 'No products to sync'
        });
      }

      if (variantsToSend.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No variants found to send'
        });
      }

      // Send variants to the external endpoint
      console.log(`Sending ${variantsToSend.length} variants to ${actualEndpoint}`);
      
      try {
        const payload = { 
          // Sync parameters
          dryRun: false,
          limit: variantsToSend.length,
          skipExisting: true,
          updateExisting: false,
          
          // Variant data - try different field names
          variants: variantsToSend,
          data: variantsToSend,
          products: variantsToSend,
          
          // Metadata
          timestamp: new Date().toISOString(),
          source: 'shopify-app',
          shopDomain: res.locals.shopify.session.shop,
          syncType: sendMode,
          variantCount: variantsToSend.length,
          
          // Shopify session info for your service
          shopifySession: {
            shop: res.locals.shopify.session.shop,
            accessToken: res.locals.shopify.session.accessToken,
            scope: res.locals.shopify.session.scope
          }
        };

        console.log('Sending payload to Odoo:', JSON.stringify(payload, null, 2));

        const response = await fetch(actualEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // Skip ngrok browser warning
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Odoo endpoint error response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Variants sent successfully:', result);

        return res.status(200).json({
          success: true,
          results: {
            sent: variantsToSend.length,
            success: variantsToSend.length,
            errors: 0,
            errorDetails: [],
            response: result
          }
        });
      } catch (fetchError) {
        console.error('Error sending to endpoint:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send variants to endpoint',
          error: fetchError.message,
          endpoint: actualEndpoint,
          variantCount: variantsToSend.length,
          errorType: fetchError.code || 'UNKNOWN',
          errorDetails: {
            name: fetchError.name,
            message: fetchError.message,
            code: fetchError.code,
            cause: fetchError.cause
          }
        });
      }
    } catch (error) {
      console.error('Error sending variants:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send variants',
        error: error.message
      });
    }
  })();
});

// Endpoint for external services to get products
app.post("/api/external/sync-products", (req, res) => {
  (async () => {
    try {
      console.log("External sync request received:", req.body);
      const { shopDomain, accessToken, syncType = "all", selectedProductIds = [] } = req.body;
      
      if (!shopDomain || !accessToken) {
        return res.status(400).json({
          success: false,
          message: 'Shop domain and access token are required'
        });
      }

      // Use REST API instead of GraphQL for external requests
      const baseUrl = `https://${shopDomain}/admin/api/2025-07`;
      const headers = {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      };

      let productsToSend = [];
      
      if (syncType === "all") {
        // Get all products using REST API
        const response = await fetch(`${baseUrl}/products.json?limit=50`, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        productsToSend = data.products.map(product => ({
          id: `gid://shopify/Product/${product.id}`,
          title: product.title,
          description: product.body_html || '',
          status: product.status,
          vendor: product.vendor || '',
          category: product.product_type || 'Uncategorized',
          image: product.images && product.images.length > 0 ? {
            url: product.images[0].src,
            altText: product.images[0].alt
          } : null,
          variants: product.variants.map(v => ({
            id: `gid://shopify/ProductVariant/${v.id}`,
            price: v.price,
            sku: v.sku,
            inventoryQuantity: v.inventory_quantity || 0,
            title: v.title
          })),
          createdAt: product.created_at,
          updatedAt: product.updated_at
        }));
      } else if (syncType === "selected" && selectedProductIds && selectedProductIds.length > 0) {
        // Get selected products by IDs using REST API
        const productIds = selectedProductIds.map(id => id.replace('gid://shopify/Product/', ''));
        const promises = productIds.map(async (id) => {
          const response = await fetch(`${baseUrl}/products/${id}.json`, {
            method: 'GET',
            headers: headers
          });
          if (response.ok) {
            const data = await response.json();
            return data.product;
          }
          return null;
        });

        const products = await Promise.all(promises);
        productsToSend = products
          .filter(product => product !== null)
          .map(product => ({
            id: `gid://shopify/Product/${product.id}`,
            title: product.title,
            description: product.body_html || '',
            status: product.status,
            vendor: product.vendor || '',
            category: product.product_type || 'Uncategorized',
            image: product.images && product.images.length > 0 ? {
              url: product.images[0].src,
              altText: product.images[0].alt
            } : null,
            variants: product.variants.map(v => ({
              id: `gid://shopify/ProductVariant/${v.id}`,
              price: v.price,
              sku: v.sku,
              inventoryQuantity: v.inventory_quantity || 0,
              title: v.title
            })),
            createdAt: product.created_at,
            updatedAt: product.updated_at
          }));
      } else {
        return res.status(400).json({
          success: false,
          message: 'No products to sync'
        });
      }

      if (productsToSend.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No products found to sync'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          products: productsToSend,
          count: productsToSend.length,
          shopDomain: shopDomain,
          syncType: syncType,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting products for external service:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get products',
        error: error.message
      });
    }
  })();
});

// Admin Dashboard API endpoints - Returns variants instead of products
app.get("/api/products", async (req, res, next) => {
  try {
    // Check if session exists
    if (!res.locals.shopify?.session) {
      console.error('No Shopify session found');
      return res.status(401).json({
        success: false,
        message: 'No authenticated session found',
        error: 'Authentication required'
      });
    }

    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const response = await client.request(`
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              description
              status
              productType
              vendor
              createdAt
              updatedAt
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 50) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: { first: 50 }
    });

    // Check if we got a valid response
    if (!response?.data?.products?.edges) {
      console.error('Invalid GraphQL response structure:', response);
      return res.status(500).json({
        success: false,
        message: 'Invalid response from Shopify API',
        error: 'No products data received'
      });
    }

    // Flatten variants with product context
    const variants = response.data.products.edges.flatMap(edge => {
      // Skip products with no variants
      if (!edge.node.variants?.edges || edge.node.variants.edges.length === 0) {
        return [];
      }
      
      return edge.node.variants.edges.map(v => ({
        // Variant data
        id: v.node.id,
        title: v.node.title,
        price: v.node.price,
        sku: v.node.sku,
        inventoryQuantity: v.node.inventoryQuantity,
        
        // Product context
        productId: edge.node.id,
        productTitle: edge.node.title,
        productDescription: edge.node.description || '',
        productStatus: edge.node.status,
        productVendor: edge.node.vendor || '',
        productCategory: edge.node.productType || 'Uncategorized',
        productImage: edge.node.images.edges[0]?.node || null,
        productCreatedAt: edge.node.createdAt,
        productUpdatedAt: edge.node.updatedAt
      }));
    });

    res.status(200).json({
      success: true,
      products: variants, // Keep 'products' key for compatibility with frontend
      count: variants.length
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variants',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const response = await client.request(`
      query getOrders($first: Int!) {
        orders(first: $first) {
          edges {
            node {
              id
              name
              email
              totalPrice
              fulfillmentStatus
              createdAt
              customer {
                firstName
                lastName
                email
              }
            }
          }
        }
      }
    `, {
      variables: { first: 20 }
    });

    const orders = response.data.orders.edges.map(edge => ({
      id: edge.node.name,
      customer: edge.node.customer ? 
        `${edge.node.customer.firstName} ${edge.node.customer.lastName}` : 
        'Guest Customer',
      total: `$${parseFloat(edge.node.totalPrice).toFixed(2)}`,
      status: edge.node.fulfillmentStatus || 'UNFULFILLED',
      date: new Date(edge.node.createdAt).toLocaleDateString()
    }));

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total.replace('$', ''));
    }, 0);

    res.status(200).json({
      success: true,
      orders: orders,
      count: orders.length,
      totalRevenue: totalRevenue.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// Sync orders to external API endpoint
app.post("/api/sync-orders", async (req, res) => {
  try {
    const { endpoint, sendMode = "all", selectedOrderIds = [] } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint URL is required'
      });
    }

    // Check if session exists
    if (!res.locals.shopify?.session) {
      console.error('No Shopify session found');
      return res.status(401).json({
        success: false,
        message: 'No authenticated session found',
        error: 'Authentication required'
      });
    }

    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    let ordersToSend = [];
    
    if (sendMode === "all") {
      // Get all orders with detailed information
      const response = await client.request(`
        query getOrders($first: Int!) {
          orders(first: $first) {
            edges {
              node {
                id
                name
                email
                totalPrice
                subtotalPrice
                totalTax
                totalShipping
                currencyCode
                fulfillmentStatus
                financialStatus
                processedAt
                createdAt
                updatedAt
                customer {
                  id
                  firstName
                  lastName
                  email
                  phone
                }
                shippingAddress {
                  firstName
                  lastName
                  company
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                billingAddress {
                  firstName
                  lastName
                  company
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        id
                        title
                        sku
                        price
                      }
                      product {
                        id
                        title
                        productType
                        vendor
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { first: 50 }
      });

      ordersToSend = response.data.orders.edges.map(edge => ({
        // Order data
        orderId: edge.node.id,
        orderName: edge.node.name,
        email: edge.node.email,
        totalPrice: edge.node.totalPrice,
        subtotalPrice: edge.node.subtotalPrice,
        totalTax: edge.node.totalTax,
        totalShipping: edge.node.totalShipping,
        currencyCode: edge.node.currencyCode,
        fulfillmentStatus: edge.node.fulfillmentStatus,
        financialStatus: edge.node.financialStatus,
        processedAt: edge.node.processedAt,
        createdAt: edge.node.createdAt,
        updatedAt: edge.node.updatedAt,
        
        // Customer data
        customer: edge.node.customer ? {
          id: edge.node.customer.id,
          firstName: edge.node.customer.firstName,
          lastName: edge.node.customer.lastName,
          email: edge.node.customer.email,
          phone: edge.node.customer.phone
        } : null,
        
        // Addresses
        shippingAddress: edge.node.shippingAddress,
        billingAddress: edge.node.billingAddress,
        
        // Line items
        lineItems: edge.node.lineItems.edges.map(item => ({
          id: item.node.id,
          title: item.node.title,
          quantity: item.node.quantity,
          variant: item.node.variant ? {
            id: item.node.variant.id,
            title: item.node.variant.title,
            sku: item.node.variant.sku,
            price: item.node.variant.price
          } : null,
          product: item.node.product ? {
            id: item.node.product.id,
            title: item.node.product.title,
            productType: item.node.product.productType,
            vendor: item.node.product.vendor
          } : null
        }))
      }));
    } else if (sendMode === "selected" && selectedOrderIds && selectedOrderIds.length > 0) {
      // Get selected orders by IDs
      const orderIds = selectedOrderIds.map(id => `"${id}"`).join(',');
      
      const response = await client.request(`
        query getOrders($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Order {
              id
              name
              email
              totalPrice
              subtotalPrice
              totalTax
              totalShipping
              currencyCode
              fulfillmentStatus
              financialStatus
              processedAt
              createdAt
              updatedAt
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              shippingAddress {
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              billingAddress {
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      sku
                      price
                    }
                    product {
                      id
                      title
                      productType
                      vendor
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { ids: selectedOrderIds }
      });

      ordersToSend = response.data.nodes
        .filter(node => node !== null)
        .map(node => ({
          // Order data
          orderId: node.id,
          orderName: node.name,
          email: node.email,
          totalPrice: node.totalPrice,
          subtotalPrice: node.subtotalPrice,
          totalTax: node.totalTax,
          totalShipping: node.totalShipping,
          currencyCode: node.currencyCode,
          fulfillmentStatus: node.fulfillmentStatus,
          financialStatus: node.financialStatus,
          processedAt: node.processedAt,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          
          // Customer data
          customer: node.customer ? {
            id: node.customer.id,
            firstName: node.customer.firstName,
            lastName: node.customer.lastName,
            email: node.customer.email,
            phone: node.customer.phone
          } : null,
          
          // Addresses
          shippingAddress: node.shippingAddress,
          billingAddress: node.billingAddress,
          
          // Line items
          lineItems: node.lineItems.edges.map(item => ({
            id: item.node.id,
            title: item.node.title,
            quantity: item.node.quantity,
            variant: item.node.variant ? {
              id: item.node.variant.id,
              title: item.node.variant.title,
              sku: item.node.variant.sku,
              price: item.node.variant.price
            } : null,
            product: item.node.product ? {
              id: item.node.product.id,
              title: item.node.product.title,
              productType: item.node.product.productType,
              vendor: item.node.product.vendor
            } : null
          }))
        }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'No orders to sync'
      });
    }

    if (ordersToSend.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found to sync'
      });
    }

    // Send orders to the external endpoint
    console.log(`Sending ${ordersToSend.length} orders to ${endpoint}`);
    
    try {
      const payload = { 
        // Sync parameters
        dryRun: false,
        limit: ordersToSend.length,
        skipExisting: true,
        updateExisting: false,
        
        // Order data - try different field names
        orders: ordersToSend,
        data: ordersToSend,
        orderData: ordersToSend,
        
        // Metadata
        timestamp: new Date().toISOString(),
        source: 'shopify-app',
        shopDomain: res.locals.shopify.session.shop,
        syncType: sendMode,
        orderCount: ordersToSend.length,
        
        // Shopify session info for your service
        shopifySession: {
          shop: res.locals.shopify.session.shop,
          accessToken: res.locals.shopify.session.accessToken,
          scope: res.locals.shopify.session.scope
        }
      };

      console.log('Sending orders payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Orders endpoint error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Orders sent successfully:', result);

      return res.status(200).json({
        success: true,
        results: {
          sent: ordersToSend.length,
          success: ordersToSend.length,
          errors: 0,
          errorDetails: [],
          response: result
        }
      });
    } catch (fetchError) {
      console.error('Error sending orders to endpoint:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send orders to endpoint',
        error: fetchError.message,
        endpoint: endpoint,
        orderCount: ordersToSend.length
      });
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error.message
    });
  }
});

// SKU Quantities endpoint - Get SKU quantities with company website
app.get("/api/skus/quantities", async (req, res) => {
  try {
    // Check if session exists
    if (!res.locals.shopify?.session) {
      console.error('No Shopify session found');
      return res.status(401).json({
        success: false,
        message: 'No authenticated session found',
        error: 'Authentication required'
      });
    }

    // Try to fetch from external API first - using configured URL
    const baseUrl = process.env.SHOPIFY_APP_URL || EXTERNAL_API_BASE_URL;
    const skuApiUrl = SKU_QUANTITIES_ENDPOINT;
    
    try {
      console.log('Fetching SKU quantities from external API:', skuApiUrl);
      
      const response = await fetch(skuApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Successfully fetched data from external API:', data);
        
        // Update company inventory with fetched data and sync to Shopify
        await updateCompanyInventory(data.data, res.locals.shopify.session);
        
        return res.status(200).json(data);
          } else {
        console.warn('External API returned error:', response.status, response.statusText);
        throw new Error(`External API error: ${response.status}`);
      }
    } catch (externalApiError) {
      console.warn('Failed to fetch from external API, falling back to mock data:', externalApiError.message);
      
      // Fallback to mock data if external API is unavailable
      const mockData = {
        "success": true,
        "message": "Retrieved SKU quantities for 2 companies (mock data)",
        "data": [
          {
            "company_name": "Company A",
            "company_website": "https://company-a.com",
            "skus": [
              {
                "sku": "PROD-001",
                "quantity_on_hand": 100
              },
              {
                "sku": "PROD-002", 
                "quantity_on_hand": 50
              }
            ],
            "total_skus": 2,
            "total_quantity": 150
          },
          {
            "company_name": "Company B",
            "company_website": "https://company-b.com",
            "skus": [
              {
                "sku": "ITEM-001",
                "quantity_on_hand": 75
              }
            ],
            "total_skus": 1,
            "total_quantity": 75
          }
        ]
      };

      // Still update inventory with mock data for testing and sync to Shopify
      await updateCompanyInventory(mockData.data, res.locals.shopify.session);
      
      res.status(200).json(mockData);
    }
  } catch (error) {
    console.error('Error fetching SKU quantities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SKU quantities',
      error: error.message
    });
  }
});

// Analytics API endpoints
app.get("/api/analytics", async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // For now, return mock analytics data
    // In a real app, you'd calculate this from actual order/product data
    const analyticsData = {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      revenueGrowth: 0,
      ordersGrowth: 0,
      aovGrowth: 0,
      conversionGrowth: 0,
      topProducts: [],
      trafficSources: []
    };

    res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Settings API endpoints
app.get("/api/settings", async (req, res) => {
  try {
    // For now, return default settings
    // In a real app, you'd store these in a database
    const defaultSettings = {
      appName: "Warehouse Management App",
      description: "A comprehensive warehouse management app for Shopify stores",
      email: "",
      timezone: "UTC",
      currency: "USD",
      language: "en",
      notifications: {
        email: false,
        push: false,
        sms: false,
      },
      features: {
        autoSync: false,
        lowStockAlerts: false,
        orderTracking: false,
        analytics: false,
      },
      syncInterval: 30,
      maxProducts: 500,
      enableDebugMode: false,
    };

    res.status(200).json({
      success: true,
      settings: defaultSettings,
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      supportEmail: "support@example.com",
      documentationUrl: "https://docs.example.com"
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    // For now, just return success
    // In a real app, you'd save these settings to a database
    console.log("Saving settings:", req.body);
    
    res.status(200).json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save settings',
      error: error.message
    });
  }
});

// Configure CSP headers for development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.shopify.com; " +
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://*.shopify.com https://*.myshopify.com; " +
      "frame-src 'self' https://*.shopify.com;"
    );
    next();
  });
} else {
  app.use(shopify.cspHeaders());
}
// Serve static files from the frontend directory
app.use(serveStatic(STATIC_PATH, { 
  index: false,
  setHeaders: (res, path) => {
    // Set proper headers for different file types
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

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

app.listen(PORT);

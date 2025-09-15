// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import fetch from "node-fetch";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

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
      
      if (!endpoint) {
        return res.status(400).json({
          success: false,
          message: 'Endpoint URL is required'
        });
      }

      // Get Shopify products using the session
      const client = new shopify.api.clients.Graphql({
        session: res.locals.shopify.session,
      });

      let productsToSend = [];
      
      if (sendMode === "all") {
        // Get all products
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
                  variants(first: 10) {
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

        productsToSend = response.data.products.edges.map(edge => ({
          id: edge.node.id,
          title: edge.node.title,
          description: edge.node.description || '',
          status: edge.node.status,
          vendor: edge.node.vendor || '',
          category: edge.node.productType || 'Uncategorized',
          image: edge.node.images.edges[0]?.node || null,
          variants: edge.node.variants.edges.map(v => ({
            id: v.node.id,
            price: v.node.price,
            sku: v.node.sku,
            inventoryQuantity: v.node.inventoryQuantity,
            title: v.node.title
          })),
          createdAt: edge.node.createdAt,
          updatedAt: edge.node.updatedAt
        }));
      } else if (sendMode === "selected" && selectedProductIds && selectedProductIds.length > 0) {
        // Get selected products by IDs
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
                variants(first: 10) {
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

        productsToSend = response.data.nodes
          .filter(node => node !== null)
          .map(node => ({
            id: node.id,
            title: node.title,
            description: node.description || '',
            status: node.status,
            vendor: node.vendor || '',
            category: node.productType || 'Uncategorized',
            image: node.images.edges[0]?.node || null,
            variants: node.variants.edges.map(v => ({
              id: v.node.id,
              price: v.node.price,
              sku: v.node.sku,
              inventoryQuantity: v.node.inventoryQuantity,
              title: v.node.title
            })),
            createdAt: node.createdAt,
            updatedAt: node.updatedAt
          }));
      } else {
        return res.status(400).json({
          success: false,
          message: 'No products to send'
        });
      }

      if (productsToSend.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No products found to send'
        });
      }

      // Send products to the external endpoint
      console.log(`Sending ${productsToSend.length} products to ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // Skip ngrok browser warning
          },
        body: JSON.stringify({ 
          // Odoo sync parameters
          dryRun: false,
          limit: productsToSend.length,
          skipExisting: true,
          updateExisting: false,
          
          // Product data
          products: productsToSend,
          
          // Metadata
          timestamp: new Date().toISOString(),
          source: 'shopify-app',
          shopDomain: res.locals.shopify.session.shop,
          syncType: sendMode,
          
          // Shopify session info for your service
          shopifySession: {
            shop: res.locals.shopify.session.shop,
            accessToken: res.locals.shopify.session.accessToken,
            scope: res.locals.shopify.session.scope
          }
        })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Products sent successfully:', result);

        return res.status(200).json({
          success: true,
          results: {
            sent: productsToSend.length,
            success: productsToSend.length,
            errors: 0,
            errorDetails: [],
            response: result
          }
        });
      } catch (fetchError) {
        console.error('Error sending to endpoint:', fetchError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send products to endpoint',
          error: fetchError.message
        });
      }
    } catch (error) {
      console.error('Error sending products:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send products',
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

// Admin Dashboard API endpoints
app.get("/api/products", async (req, res) => {
  try {
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
              variants(first: 1) {
                edges {
                  node {
                    price
                    sku
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

    const products = response.data.products.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title,
      description: edge.node.description || '',
      status: edge.node.status,
      vendor: edge.node.vendor || '',
      category: edge.node.productType || 'Uncategorized',
      price: edge.node.variants.edges[0]?.node.price || '0.00',
      image: edge.node.images.edges[0]?.node || null,
      variants: edge.node.variants.edges.map(v => ({
        price: v.node.price,
        sku: v.node.sku
      })),
      stock: 'N/A', // Shopify doesn't provide stock info directly
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt
    }));

    res.status(200).json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
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

// @ts-nocheck
import shopify from "../shopify.js";
import fetch from "node-fetch";
import { EXTERNAL_API_BASE_URL, PRODUCT_SYNC_ENDPOINT } from "../config/constants.js";

/**
 * Send products to external API - simplified version that just forwards the request
 */
export const sendProducts = async (req, res) => {
  try {
    console.log("Send products request received:", req.body);
    console.log("Environment check - EXTERNAL_API_BASE_URL:", process.env.EXTERNAL_API_BASE_URL);
    console.log("Environment check - PRODUCT_SYNC_ENDPOINT:", PRODUCT_SYNC_ENDPOINT);
    
    const { endpoint, sendMode, selectedProductIds } = req.body;
    
    // Debug session information
    console.log("Session debug:", {
      hasSession: !!res.locals.shopify?.session,
      sessionShop: res.locals.shopify?.session?.shop,
      queryShop: req.query.shop,
      headers: req.headers
    });
    
    // Get shop from session or query parameters
    let shop = res.locals.shopify?.session?.shop || req.query.shop;
    
    if (!shop) {
      console.error('No shop information found');
      return res.status(400).json({
        success: false,
        message: 'No shop provided',
        error: 'Shop information missing',
        debug: {
          hasSession: !!res.locals.shopify?.session,
          sessionShop: res.locals.shopify?.session?.shop,
          queryShop: req.query.shop
        }
      });
    }
    
    // Use external API base URL for syncing and sending
    const actualEndpoint = endpoint === "EXTERNAL_API" ? PRODUCT_SYNC_ENDPOINT : endpoint;
    
    console.log("Endpoint debug:", {
      requestedEndpoint: endpoint,
      actualEndpoint: actualEndpoint,
      productSyncEndpoint: PRODUCT_SYNC_ENDPOINT
    });
    
    if (!actualEndpoint) {
      return res.status(400).json({
        success: false,
        message: 'External API endpoint not configured',
        error: 'Endpoint not found',
        debug: {
          requestedEndpoint: endpoint,
          productSyncEndpoint: PRODUCT_SYNC_ENDPOINT,
          externalApiBaseUrl: process.env.EXTERNAL_API_BASE_URL
        }
      });
    }

    // Get Shopify products using the session
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    console.log('Shopify session:', res.locals.shopify.session);
    console.log('Send mode:', sendMode);
    console.log('Selected product IDs:', selectedProductIds);

    let productsToSend = [];
    
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

      console.log('GraphQL response for all products:', response);
      console.log('Products count:', response.data?.products?.edges?.length || 0);

      // Process products and flatten into individual variants
      const allVariants = [];
      
      response.data.products.edges
        .filter(edge => edge.node.variants?.edges && edge.node.variants.edges.length > 0)
        .forEach(edge => {
          const product = edge.node;
          
          // Create a variant entry for each variant
          product.variants.edges.forEach(variantEdge => {
            allVariants.push({
              variantId: variantEdge.node.id,
              productId: product.id,
              productTitle: product.title,
              variantTitle: variantEdge.node.title,
              sku: variantEdge.node.sku || '',
              price: variantEdge.node.price,
              inventoryQuantity: variantEdge.node.inventoryQuantity || 0,
              productCategory: product.productType || 'Uncategorized',
              productVendor: product.vendor || '',
              productStatus: product.status,
              productDescription: product.description || '',
              productImage: product.images?.edges?.[0]?.node?.url || '',
              productCreatedAt: product.createdAt,
              productUpdatedAt: product.updatedAt
            });
          });
        });
      
      productsToSend = allVariants;
      
      console.log('Products processed (all mode):', productsToSend.length);
    } else if (sendMode === "selected" && selectedProductIds && selectedProductIds.length > 0) {
      // Get selected products by IDs with their variants
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

      // Process selected products and flatten into individual variants
      const selectedVariants = [];
      
      response.data.nodes
        .filter(node => node !== null && node.variants?.edges && node.variants.edges.length > 0)
        .forEach(node => {
          // Create a variant entry for each variant
          node.variants.edges.forEach(variantEdge => {
            selectedVariants.push({
              variantId: variantEdge.node.id,
              productId: node.id,
              productTitle: node.title,
              variantTitle: variantEdge.node.title,
              sku: variantEdge.node.sku || '',
              price: variantEdge.node.price,
              inventoryQuantity: variantEdge.node.inventoryQuantity || 0,
              productCategory: node.productType || 'Uncategorized',
              productVendor: node.vendor || '',
              productStatus: node.status,
              productDescription: node.description || '',
              productImage: node.images?.edges?.[0]?.node?.url || '',
              productCreatedAt: node.createdAt,
              productUpdatedAt: node.updatedAt
            });
          });
        });
      
      productsToSend = selectedVariants;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No products to sync'
      });
    }

    if (productsToSend.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No products found to send'
      });
    }

    // Prepare payload for external API - send flattened variants
    const payload = {
      // Sync metadata
      sync: {
        shopDomain: shop,
        syncType: sendMode,
        dryRun: false,
        selectedProductIds: sendMode === "selected" ? selectedProductIds : [],
        timestamp: new Date().toISOString()
      },
      // Flattened variants data
      products: productsToSend, // Now a flat array of variants
      variants: productsToSend, // Alternative key for backward compatibility
      data: productsToSend
    };

    // Log payload structure for debugging
    console.log('Payload structure:', {
      variantsCount: productsToSend.length,
      sampleVariant: productsToSend[0] ? {
        variantId: productsToSend[0].variantId,
        productId: productsToSend[0].productId,
        productTitle: productsToSend[0].productTitle,
        variantTitle: productsToSend[0].variantTitle,
        sku: productsToSend[0].sku,
        price: productsToSend[0].price,
        inventoryQuantity: productsToSend[0].inventoryQuantity
      } : null
    });

    console.log(`Sending ${productsToSend.length} products to external API`);
    console.log('Complete payload being sent:', JSON.stringify(payload, null, 2));

    // Send to external API
    const response = await fetch(actualEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return res.status(response.status).json({
        success: false,
        message: 'External API error',
        error: errorText
      });
    }

    const result = await response.json();
    console.log('External API response:', result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in sendProducts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send products',
      error: error.message
    });
  }
};

/**
 * External sync products endpoint - simplified version
 */
export const externalSyncProducts = async (req, res) => {
  try {
    console.log("External sync request received:", req.body);
    const { shopDomain, accessToken, syncType = "all", selectedProductIds = [] } = req.body;
    
    if (!shopDomain || !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Shop domain and access token are required'
      });
    }

    // Forward to external API - send variant structure
    const payload = {
      // Sync metadata
      sync: {
        shopDomain,
        accessToken,
        syncType,
        selectedProductIds,
        timestamp: new Date().toISOString()
      },
      // Flattened variants data (empty for external sync)
      products: [],
      variants: [],
      data: []
    };

    const response = await fetch(PRODUCT_SYNC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('External API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return res.status(response.status).json({
        success: false,
        message: 'External API error',
        error: errorText
      });
    }

    const result = await response.json();
    console.log('External API response:', result);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in externalSyncProducts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error.message
    });
  }
};
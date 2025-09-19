// @ts-nocheck
import shopify from "../shopify.js";
import productCreator from "../product-creator.js";

/**
 * Get product count
 */
export const getProductCount = async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching product count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product count',
      error: error.message
    });
  }
};

/**
 * Create products
 */
export const createProducts = async (req, res) => {
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
};

/**
 * Get all products (variants) for the dashboard
 */
export const getProducts = async (req, res) => {
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
};

// Odoo Sync API endpoints for Shopify App
import OdooIntegration from './odoo-integration.js';

// Initialize Odoo integration
const odooIntegration = new OdooIntegration();

// Test Odoo connection
export async function testOdooConnection(req, res) {
  try {
    const result = await odooIntegration.testConnection();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test Odoo connection',
      error: error.message
    });
  }
}

// Get all products from Shopify
export async function getShopifyProducts(req, res) {
  try {
    const client = new req.locals.shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const products = await odooIntegration.getShopifyProducts(client);

    res.status(200).json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Shopify products',
      error: error.message
    });
  }
}

// Sync all products from Shopify to Odoo
export async function syncAllProductsToOdoo(req, res) {
  try {
    const client = new req.locals.shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    // Get all products from Shopify
    const shopifyProducts = await odooIntegration.getShopifyProducts(client);

    // Sync products to Odoo
    const syncResults = await odooIntegration.syncAllProductsFromShopify(shopifyProducts);

    res.status(200).json({
      success: true,
      message: 'Product sync completed',
      results: syncResults,
      totalProcessed: shopifyProducts.length
    });
  } catch (error) {
    console.error('Error syncing products to Odoo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products to Odoo',
      error: error.message
    });
  }
}

// Get sync status and history
export async function getSyncStatus(req, res) {
  try {
    const client = new req.locals.shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const status = await odooIntegration.getSyncStatus(client);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
}

// Sync specific product by ID
export async function syncProductById(req, res) {
  try {
    const { productId } = req.params;
    const client = new req.locals.shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const syncResults = await odooIntegration.syncProductById(client, productId);

    res.status(200).json({
      success: true,
      message: 'Product sync completed',
      results: syncResults
    });
  } catch (error) {
    console.error('Error syncing product to Odoo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync product to Odoo',
      error: error.message
    });
  }
}

// Get Odoo products
export async function getOdooProducts(req, res) {
  try {
    const products = await odooIntegration.getOdooProducts();
    res.status(200).json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching Odoo products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Odoo products',
      error: error.message
    });
  }
}
// Odoo Integration Module for Shopify App
// This module handles product synchronization between Shopify and Odoo

import OdooClient from './odoo-client.js';
import ProductMapper from './product-mapper.js';
import { ODOO_CONFIG } from './config.js';

class OdooIntegration {
  constructor() {
    this.client = new OdooClient();
    this.mapper = new ProductMapper();
    this.config = ODOO_CONFIG;
  }

  // Test connection to Odoo
  async testConnection() {
    return await this.client.testConnection();
  }

  // Get all products from Odoo
  async getOdooProducts() {
    return await this.client.getProducts();
  }

  // Get all products from Shopify (via GraphQL)
  async getShopifyProducts(shopifyClient) {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              bodyHtml
              status
              productType
              tags
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await shopifyClient.request(query, {
      variables: { first: 250 }
    });

    return response.data.products.edges.map(edge => ({
      ...edge.node,
      variants: edge.node.variants.edges.map(variantEdge => variantEdge.node)
    }));
  }

  // Sync all products from Shopify to Odoo
  async syncAllProductsFromShopify(shopifyProducts) {
    console.log(`Starting sync of ${shopifyProducts.length} products to Odoo...`);
    
    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: [],
      invalidProducts: []
    };

    try {
      // Prepare products for sync
      const preparedData = this.mapper.prepareBatchSync(shopifyProducts);
      
      // Add invalid products to results
      results.invalidProducts = preparedData.invalidProducts;
      results.errors += preparedData.invalidCount;

      if (preparedData.validProducts.length === 0) {
        console.log('No valid products to sync');
        return results;
      }

      // Get existing Odoo products to check for updates
      const existingOdooProducts = await this.client.getProducts(['id', 'name', 'x_shopify_id']);
      const odooProductMap = new Map();
      
      existingOdooProducts.forEach(product => {
        if (product.x_shopify_id) {
          odooProductMap.set(product.x_shopify_id, product);
        }
      });

      // Process products in batches
      const batchSize = this.config.sync.batchSize;
      const productsToCreate = [];
      const productsToUpdate = [];

      for (const odooProductData of preparedData.validProducts) {
        const existingProduct = odooProductMap.get(odooProductData.x_shopify_id);
        
        if (existingProduct) {
          productsToUpdate.push({
            id: existingProduct.id,
            data: odooProductData
          });
        } else {
          productsToCreate.push(odooProductData);
        }
      }

      // Create new products
      if (productsToCreate.length > 0) {
        console.log(`Creating ${productsToCreate.length} new products...`);
        const createResults = await this.client.batchCreateProducts(productsToCreate);
        
        createResults.forEach((result, index) => {
          if (result.error) {
            results.errors++;
            results.errorDetails.push({
              product: productsToCreate[index].name,
              error: result.error,
              action: 'create'
            });
          } else {
            results.created++;
          }
        });
      }

      // Update existing products
      if (productsToUpdate.length > 0) {
        console.log(`Updating ${productsToUpdate.length} existing products...`);
        const updateResults = await this.client.batchUpdateProducts(productsToUpdate);
        
        updateResults.forEach((result, index) => {
          if (result.error) {
            results.errors++;
            results.errorDetails.push({
              product: productsToUpdate[index].data.name,
              error: result.error,
              action: 'update'
            });
          } else {
            results.updated++;
          }
        });
      }

      console.log('Sync completed:', results);
      return results;

    } catch (error) {
      console.error('Error during sync:', error);
      results.errors++;
      results.errorDetails.push({
        product: 'Batch Operation',
        error: error.message,
        action: 'sync'
      });
      return results;
    }
  }

  // Sync single product by ID
  async syncProductById(shopifyClient, productId) {
    try {
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            description
            bodyHtml
            status
            productType
            tags
            createdAt
            updatedAt
            variants(first: 10) {
              edges {
                node {
                  id
                  sku
                  price
                  compareAtPrice
                  title
                }
              }
            }
          }
        }
      `;

      const response = await shopifyClient.request(query, {
        variables: { id: productId }
      });

      const shopifyProduct = {
        ...response.data.product,
        variants: response.data.product.variants.edges.map(edge => edge.node)
      };

      // Sync single product to Odoo
      const syncResults = await this.syncAllProductsFromShopify([shopifyProduct]);
      return syncResults;

    } catch (error) {
      console.error('Error syncing single product:', error);
      return {
        created: 0,
        updated: 0,
        errors: 1,
        errorDetails: [{
          product: 'Single Product Sync',
          error: error.message,
          action: 'sync'
        }]
      };
    }
  }

  // Get sync status
  async getSyncStatus(shopifyClient) {
    try {
      // Test Odoo connection
      const connectionTest = await this.client.testConnection();
      
      // Get product counts
      let shopifyCount = 0;
      let odooCount = 0;

      try {
        const countQuery = `
          query {
            productsCount {
              count
            }
          }
        `;

        const shopifyResponse = await shopifyClient.request(countQuery);
        shopifyCount = shopifyResponse.data.productsCount.count;
      } catch (error) {
        console.error('Error getting Shopify product count:', error);
      }

      try {
        const odooProducts = await this.client.getProducts(['id']);
        odooCount = odooProducts.length;
      } catch (error) {
        console.error('Error getting Odoo product count:', error);
      }

      return {
        success: true,
        odooConnection: connectionTest,
        productCounts: {
          shopify: shopifyCount,
          odoo: odooCount
        },
        lastSync: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        success: false,
        message: 'Failed to get sync status',
        error: error.message
      };
    }
  }
}

export default OdooIntegration;
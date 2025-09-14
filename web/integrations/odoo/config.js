// Odoo Integration Configuration
export const ODOO_CONFIG = {
  // Odoo instance configuration
  url: 'https://warehouse5.odoo.com',
  database: 'warehouse5',
  
  // Authentication credentials
  credentials: {
    email: 'ahmed.shawkiy123@gmail.com',
    password: 'Ahmed3304'
  },
  
  // API configuration
  api: {
    version: '2.0',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  
  // Product mapping configuration
  productMapping: {
    // Default category ID in Odoo (you may need to adjust this)
    defaultCategoryId: 1,
    
    // Field mappings from Shopify to Odoo
    fieldMappings: {
      name: 'title',
      default_code: 'sku',
      list_price: 'price',
      standard_price: 'compare_at_price',
      description: 'body_html',
      active: 'status',
      type: 'product' // Always 'product' for physical products
    },
    
    // Custom fields for Shopify integration
    customFields: {
      x_shopify_id: 'id',
      x_shopify_handle: 'handle',
      x_shopify_created_at: 'created_at',
      x_shopify_updated_at: 'updated_at'
    }
  },
  
  // Sync configuration
  sync: {
    batchSize: 50, // Number of products to sync in each batch
    delayBetweenBatches: 1000, // Delay between batches in milliseconds
    maxRetries: 3,
    enableLogging: true
  }
};

export default ODOO_CONFIG;

// Odoo API Client
import axios from 'axios';
import { ODOO_CONFIG } from './config.js';

class OdooClient {
  constructor() {
    this.config = ODOO_CONFIG;
    this.uid = null;
    this.sessionId = null;
    this.axiosInstance = axios.create({
      baseURL: this.config.url,
      timeout: this.config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  // Authenticate with Odoo
  async authenticate() {
    try {
      const response = await this.axiosInstance.post('/web/session/authenticate', {
        jsonrpc: this.config.api.version,
        method: 'call',
        params: {
          db: this.config.database,
          login: this.config.credentials.email,
          password: this.config.credentials.password
        },
        id: this.generateRequestId()
      });

      if (response.data.result && response.data.result.uid) {
        this.uid = response.data.result.uid;
        this.sessionId = response.headers['set-cookie'];
        
        // Set the session cookie for future requests
        this.axiosInstance.defaults.headers.Cookie = this.sessionId;
        
        console.log('Successfully authenticated with Odoo');
        return true;
      } else {
        throw new Error('Authentication failed: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Odoo authentication error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Generate unique request ID
  generateRequestId() {
    return Math.floor(Math.random() * 1000000000);
  }

  // Make authenticated API call
  async makeRequest(model, method, args = [], kwargs = {}) {
    if (!this.uid) {
      await this.authenticate();
    }

    try {
      const response = await this.axiosInstance.post('/web/dataset/call_kw', {
        jsonrpc: this.config.api.version,
        method: 'call',
        params: {
          model: model,
          method: method,
          args: args,
          kwargs: kwargs
        },
        id: this.generateRequestId()
      });

      if (response.data.error) {
        throw new Error(`API Error: ${JSON.stringify(response.data.error)}`);
      }

      return response.data.result;
    } catch (error) {
      console.error(`Odoo API error (${model}.${method}):`, error);
      throw error;
    }
  }

  // Get all products from Odoo
  async getProducts(fields = null, domain = []) {
    const defaultFields = [
      'id', 'name', 'default_code', 'list_price', 'standard_price', 
      'description', 'categ_id', 'active', 'x_shopify_id'
    ];
    
    return await this.makeRequest('product.product', 'search_read', [
      domain,
      fields || defaultFields
    ], {
      limit: 1000
    });
  }

  // Create product in Odoo
  async createProduct(productData) {
    return await this.makeRequest('product.product', 'create', [productData]);
  }

  // Update product in Odoo
  async updateProduct(productId, productData) {
    return await this.makeRequest('product.product', 'write', [[productId], productData]);
  }

  // Search product by Shopify ID
  async findProductByShopifyId(shopifyId) {
    const products = await this.makeRequest('product.product', 'search_read', [
      [['x_shopify_id', '=', shopifyId.toString()]],
      ['id', 'name', 'x_shopify_id']
    ]);
    
    return products.length > 0 ? products[0] : null;
  }

  // Get product categories
  async getCategories() {
    return await this.makeRequest('product.category', 'search_read', [
      [],
      ['id', 'name', 'parent_id']
    ]);
  }

  // Test connection
  async testConnection() {
    try {
      await this.authenticate();
      const products = await this.getProducts(['id', 'name']);
      
      return {
        success: true,
        message: `Successfully connected to Odoo. Found ${products.length} existing products.`,
        productCount: products.length,
        uid: this.uid
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  // Batch operations
  async batchCreateProducts(productsData) {
    const results = [];
    const batchSize = this.config.sync.batchSize;
    
    for (let i = 0; i < productsData.length; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.all(
          batch.map(productData => this.createProduct(productData))
        );
        results.push(...batchResults);
        
        // Delay between batches
        if (i + batchSize < productsData.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.sync.delayBetweenBatches));
        }
      } catch (error) {
        console.error(`Batch create error (batch ${Math.floor(i/batchSize) + 1}):`, error);
        results.push({ error: error.message });
      }
    }
    
    return results;
  }

  // Batch update products
  async batchUpdateProducts(updates) {
    const results = [];
    const batchSize = this.config.sync.batchSize;
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.all(
          batch.map(({ id, data }) => this.updateProduct(id, data))
        );
        results.push(...batchResults);
        
        // Delay between batches
        if (i + batchSize < updates.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.sync.delayBetweenBatches));
        }
      } catch (error) {
        console.error(`Batch update error (batch ${Math.floor(i/batchSize) + 1}):`, error);
        results.push({ error: error.message });
      }
    }
    
    return results;
  }
}

export default OdooClient;

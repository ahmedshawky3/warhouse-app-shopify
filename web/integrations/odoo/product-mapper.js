// Product Mapper - Converts between Shopify and Odoo product formats
import { ODOO_CONFIG } from './config.js';

class ProductMapper {
  constructor() {
    this.config = ODOO_CONFIG.productMapping;
  }

  // Convert Shopify product to Odoo format
  shopifyToOdoo(shopifyProduct) {
    const variant = shopifyProduct.variants?.[0] || {};
    
    const odooProduct = {
      // Basic product information
      name: shopifyProduct.title || '',
      default_code: variant.sku || shopifyProduct.handle || '',
      list_price: parseFloat(variant.price || 0),
      standard_price: parseFloat(variant.compare_at_price || variant.price || 0),
      description: this.cleanHtml(shopifyProduct.body_html || shopifyProduct.description || ''),
      type: 'product', // Always 'product' for physical products
      categ_id: this.config.defaultCategoryId,
      active: shopifyProduct.status === 'active',
      
      // Custom fields for Shopify integration
      x_shopify_id: shopifyProduct.id?.toString() || '',
      x_shopify_handle: shopifyProduct.handle || '',
      x_shopify_created_at: shopifyProduct.created_at || '',
      x_shopify_updated_at: shopifyProduct.updated_at || '',
      
      // Additional fields
      sale_ok: true,
      purchase_ok: true,
      track_service: false,
      invoice_policy: 'order',
      expense_policy: 'no',
      sale_delay: 0,
      weight: 0,
      volume: 0,
      sale_line_warn: 'no-message',
      purchase_line_warn: 'no-message',
    };

    // Handle multiple variants if they exist
    if (shopifyProduct.variants && shopifyProduct.variants.length > 1) {
      odooProduct.description += '\n\nVariants:\n';
      shopifyProduct.variants.forEach((variant, index) => {
        odooProduct.description += `${index + 1}. ${variant.title} - $${variant.price}`;
        if (variant.sku) {
          odooProduct.description += ` (SKU: ${variant.sku})`;
        }
        odooProduct.description += '\n';
      });
    }

    return odooProduct;
  }

  // Convert Odoo product to Shopify format (for reference)
  odooToShopify(odooProduct) {
    return {
      id: odooProduct.x_shopify_id,
      title: odooProduct.name,
      handle: odooProduct.x_shopify_handle,
      description: odooProduct.description,
      status: odooProduct.active ? 'active' : 'draft',
      variants: [{
        id: odooProduct.x_shopify_id,
        sku: odooProduct.default_code,
        price: odooProduct.list_price.toString(),
        compare_at_price: odooProduct.standard_price.toString(),
        title: odooProduct.name
      }],
      created_at: odooProduct.x_shopify_created_at,
      updated_at: odooProduct.x_shopify_updated_at
    };
  }

  // Clean HTML content for Odoo description
  cleanHtml(html) {
    if (!html) return '';
    
    // Remove HTML tags but preserve line breaks
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  // Map product categories
  mapCategory(shopifyProduct) {
    // This is a simple mapping - you might want to create a more sophisticated category mapping
    const categoryMap = {
      'electronics': 1,
      'clothing': 2,
      'books': 3,
      'home': 4,
      'sports': 5,
      'beauty': 6,
      'toys': 7,
      'automotive': 8
    };

    // Try to determine category from product type or tags
    const productType = shopifyProduct.product_type?.toLowerCase() || '';
    const tags = shopifyProduct.tags?.toLowerCase() || '';
    
    for (const [key, categoryId] of Object.entries(categoryMap)) {
      if (productType.includes(key) || tags.includes(key)) {
        return categoryId;
      }
    }

    return this.config.defaultCategoryId;
  }

  // Validate product data before sync
  validateProduct(shopifyProduct) {
    const errors = [];

    if (!shopifyProduct.title || shopifyProduct.title.trim() === '') {
      errors.push('Product title is required');
    }

    if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
      errors.push('Product must have at least one variant');
    }

    const variant = shopifyProduct.variants[0];
    if (!variant.price || isNaN(parseFloat(variant.price))) {
      errors.push('Product must have a valid price');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Prepare products for batch sync
  prepareBatchSync(shopifyProducts) {
    const validProducts = [];
    const invalidProducts = [];

    shopifyProducts.forEach(product => {
      const validation = this.validateProduct(product);
      
      if (validation.isValid) {
        const odooProduct = this.shopifyToOdoo(product);
        odooProduct.categ_id = this.mapCategory(product);
        validProducts.push(odooProduct);
      } else {
        invalidProducts.push({
          product: product.title,
          errors: validation.errors
        });
      }
    });

    return {
      validProducts,
      invalidProducts,
      totalProcessed: shopifyProducts.length,
      validCount: validProducts.length,
      invalidCount: invalidProducts.length
    };
  }
}

export default ProductMapper;

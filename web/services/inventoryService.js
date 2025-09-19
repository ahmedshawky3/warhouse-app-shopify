// @ts-nocheck
import shopify from "../shopify.js";
import fetch from "node-fetch";

/**
 * Update company inventory and sync to Shopify
 */
export async function updateCompanyInventory(companyData, session = null) {
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
            await updateShopifyInventory(session, sku.sku, sku.quantity_on_hand, company.company_name);
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

/**
 * Update Shopify inventory levels using REST API
 */
export async function updateShopifyInventory(session, sku, quantity, companyName = '') {
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

    console.log(`🔍 Found Shopify variant for SKU ${sku}: ${variant.id} (current available: ${variant.inventoryQuantity})`);

    // Get inventory item ID from the variant
    const inventoryItemId = variant.inventoryItem.id.split('/').pop();
    
    // Get all inventory levels for this item to check on-hand quantity
    const baseUrl = `https://${session.shop}/admin/api/2025-07`;
    const headers = {
      'X-Shopify-Access-Token': session.accessToken,
      'Content-Type': 'application/json'
    };
    
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

    // Get the current available quantity from REST API
    const currentAvailable = inventoryLevels.inventory_levels[0].available;
    
    // Set target available to the Odoo quantity directly
    const targetAvailable = quantity;
    
    // Print all current quantities for this SKU
    console.log(`📊 Current Quantities for SKU ${sku}:`);
    console.log(`  🏪 Current Available: ${currentAvailable}`);
    console.log(`  🎯 Target Available (from Odoo): ${targetAvailable}`);
    console.log(`  📋 Raw inventory level data:`, JSON.stringify(inventoryLevels.inventory_levels[0], null, 2));

    // Check if update is needed
    if (currentAvailable === targetAvailable) {
      console.log(`✅ SKU ${sku} already has correct available quantity: ${targetAvailable}`);
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

    // Use GraphQL to adjust available inventory quantities
    // This will update the available quantity
    const adjustmentResponse = await client.request(`
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          inventoryAdjustmentGroup {
            id
            reason
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
          name: "available",
          reason: "correction",
          referenceDocumentUri: `app://warehouse-app/${sku}-${Date.now()}`,
          changes: [{
            delta: targetAvailable - currentAvailable,
            inventoryItemId: variant.inventoryItem.id,
            locationId: `gid://shopify/Location/${inventoryLevels.inventory_levels[0].location_id}`
          }]
        }
      }
    });

    console.log(`🔄 Adjusting available inventory for location ${inventoryLevels.inventory_levels[0].location_id}:`);
    console.log(`  📊 Target Available: ${targetAvailable}`);
    console.log(`  🏪 Current Available: ${currentAvailable}`);
    console.log(`  🔢 Delta: ${targetAvailable - currentAvailable}`);
    console.log(`  🏢 Company: ${companyName}`);

    if (adjustmentResponse.data.inventoryAdjustQuantities.userErrors.length > 0) {
      console.error(`❌ Failed to update inventory for SKU ${sku}:`, adjustmentResponse.data.inventoryAdjustQuantities.userErrors);
      return;
    }

    console.log(`✅ Successfully updated available inventory quantity for SKU ${sku} to ${targetAvailable}`);
    console.log(`📊 Adjustment details:`, adjustmentResponse.data.inventoryAdjustQuantities.inventoryAdjustmentGroup.changes);
    
    // Print the new quantities after adjustment
    console.log(`📊 New Available Quantities for SKU ${sku} after adjustment:`);
    adjustmentResponse.data.inventoryAdjustQuantities.inventoryAdjustmentGroup.changes.forEach(change => {
      console.log(`  📍 Location ${change.location.name}:`);
      console.log(`    🏪 New Available: ${change.quantityAfterChange}`);
      console.log(`    🔢 Delta Applied: ${change.delta}`);
    });
    
  } catch (error) {
    console.error(`❌ Error updating Shopify inventory for SKU ${sku}:`, error);
    throw error;
  }
}

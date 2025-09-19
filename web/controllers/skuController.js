// @ts-nocheck
import fetch from "node-fetch";
import { updateCompanyInventory } from "../services/inventoryService.js";
import { EXTERNAL_API_BASE_URL, SKU_QUANTITIES_ENDPOINT } from "../config/constants.js";

/**
 * Get SKU quantities from external API
 */
export const getSkuQuantities = async (req, res) => {
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

    // Try to fetch from external API first - using external API base URL
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
      console.error('Failed to fetch from external API:', externalApiError.message);
      
      res.status(500).json({
        success: false,
        message: 'External API is unavailable',
        error: externalApiError.message
      });
    }
  } catch (error) {
    console.error('Error fetching SKU quantities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SKU quantities',
      error: error.message
    });
  }
};

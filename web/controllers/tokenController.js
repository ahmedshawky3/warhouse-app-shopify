import ShopAccess from '../models/ShopAccess.js';
import { appLogger } from '../utils/logger.js';

/**
 * Validate a token using the external token API and grant access to a shop
 */
export const validateToken = async (req, res) => {
  try {
    const { token, shopDomain } = req.body;

    if (!token || !shopDomain) {
      return res.status(400).json({
        success: false,
        message: 'Token and shop domain are required'
      });
    }

    // Call external token validation API
    const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;
    
    if (!EXTERNAL_API_BASE_URL) {
      appLogger.error('EXTERNAL_API_BASE_URL not configured');
      return res.status(500).json({
        success: false,
        message: 'Token validation service not configured'
      });
    }

    const validateResponse = await fetch(`${EXTERNAL_API_BASE_URL}/api/admin/tokens/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: token.trim() })
    });

    const validateData = await validateResponse.json();

    if (!validateResponse.ok || !validateData.success) {
      appLogger.warn('Token validation failed via external API', { 
        shopDomain,
        status: validateResponse.status,
        message: validateData.message
      });
      return res.status(400).json({
        success: false,
        message: validateData.message || 'Invalid or already used token'
      });
    }

    // Token is valid, grant access to this shop
    const shopAccess = await ShopAccess.findOneAndUpdate(
      { shopDomain: shopDomain.toLowerCase() },
      {
        isTokenValidated: true,
        validatedToken: token,
        validatedAt: new Date(),
        lastAccessAt: new Date()
      },
      { upsert: true, new: true }
    );

    appLogger.info('Token validated successfully', {
      shopDomain,
      validatedAt: shopAccess.validatedAt
    });

    return res.status(200).json({
      success: true,
      message: 'Token validated successfully. You now have access to the app!',
      data: {
        shopDomain: shopAccess.shopDomain,
        validatedAt: shopAccess.validatedAt
      }
    });

  } catch (error) {
    appLogger.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during token validation'
    });
  }
};

/**
 * Check if a shop has validated access
 */
export const checkAccess = async (req, res) => {
  try {
    const { shopDomain } = req.query;

    if (!shopDomain) {
      return res.status(400).json({
        success: false,
        message: 'Shop domain is required'
      });
    }

    const shopAccess = await ShopAccess.findOne({ 
      shopDomain: shopDomain.toLowerCase() 
    });

    if (!shopAccess || !shopAccess.isTokenValidated) {
      return res.status(200).json({
        success: true,
        hasAccess: false,
        message: 'Token validation required'
      });
    }

    // Update last access time
    shopAccess.lastAccessAt = new Date();
    await shopAccess.save();

    return res.status(200).json({
      success: true,
      hasAccess: true,
      data: {
        shopDomain: shopAccess.shopDomain,
        validatedAt: shopAccess.validatedAt
      }
    });

  } catch (error) {
    appLogger.error('Check access error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while checking access'
    });
  }
};

export default {
  validateToken,
  checkAccess
};


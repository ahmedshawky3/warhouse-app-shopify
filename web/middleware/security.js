// @ts-nocheck
import express from "express";

/**
 * Set security headers for Shopify app
 */
export const setSecurityHeaders = (req, res, next) => {
  // Allow the app to be embedded in Shopify admin
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com");
  next();
};

/**
 * Configure CSP headers for development and production
 */
export const setCSPHeaders = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Development CSP (more permissive)
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.shopify.com; " +
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://*.shopify.com https://*.myshopify.com; " +
      "frame-src 'self' https://*.shopify.com;"
    );
  } else {
    // Production CSP (more restrictive)
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' https://cdn.shopify.com; " +
      "style-src 'self' 'unsafe-inline' https://cdn.shopify.com; " +
      "img-src 'self' data: https://cdn.shopify.com; " +
      "connect-src 'self' https://*.shopify.com https://*.myshopify.com; " +
      "frame-src 'self' https://*.shopify.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }
  next();
};

/**
 * Input validation middleware
 */
export const validateWebhookPayload = (req, res, next) => {
  // Check content type
  if (req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({
      success: false,
      message: 'Invalid content type. Expected application/json'
    });
  }

  // Check payload size (limit to 1MB)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1024 * 1024) {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum size is 1MB'
    });
  }

  // Basic JSON validation
  if (req.body && typeof req.body === 'object') {
    try {
      JSON.stringify(req.body);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
    }
  }

  next();
};

/**
 * Rate limiting middleware (basic implementation)
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

export const rateLimiter = (req, res, next) => {
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const clientData = requestCounts.get(clientId);
  
  if (now > clientData.resetTime) {
    // Reset window
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (clientData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  clientData.count++;
  next();
};

/**
 * Webhook logging middleware (improved)
 */
export const webhookLogger = (req, res, next) => {
  // Don't log sensitive data in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const logData = {
    method: req.method,
    url: req.url,
    headers: isDevelopment ? req.headers : {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'x-shopify-hmac-sha256': req.headers['x-shopify-hmac-sha256'] ? '[REDACTED]' : undefined
    },
    bodySize: req.headers['content-length'],
    timestamp: new Date().toISOString()
  };

  if (isDevelopment && req.body) {
    logData.body = req.body;
  }

  console.log('🔔 WEBHOOK REQUEST RECEIVED:', logData);
  next();
};

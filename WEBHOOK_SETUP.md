# Webhook Setup Guide

## Architecture Overview

Your Shopify app has two different URLs that serve different purposes:

### 1. **App URL** (Shopify App URL)

- **Purpose**: Where Shopify sends webhooks TO your app
- **Source**: Dynamically read from `shopify.app.warhouse-app-testing.toml` as `application_url`
- **Usage**: Webhook registration (callbackUrl in webhook registration)
- **Auto-updates**: Changes automatically when your development server restarts (e.g., ngrok, cloudflare tunnels)

### 2. **External API URL** (Your External System)

- **Purpose**: Where your app sends data TO your external system (e.g., Odoo, ERP, etc.)
- **Example**: `https://your-odoo-system.com` or `https://your-erp-system.com`
- **Usage**: After receiving webhooks, your app processes the data and sends it to your external system
- **Source**: Environment variable `EXTERNAL_API_BASE_URL`

## Flow Diagram

```
Shopify Store → [Webhook] → Your Shopify App → [API Call] → Your External System
                (App URL)                    (External API URL)
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Your Shopify app credentials
SHOPIFY_API_KEY=2df1fafd21532086bcd358302ec7ea1f

# Your external system URL (e.g., Odoo, ERP, etc.) - NOT your Shopify app URL
EXTERNAL_API_BASE_URL=https://your-external-system.com
```

**Note**: The App URL is automatically read from `shopify.app.warhouse-app-testing.toml` and updates dynamically when your development server restarts (e.g., with ngrok or cloudflare tunnels).

### Webhook Registration

When you register webhooks, they will be registered with:

- **Callback URL**: `${APP_URL}/api/webhooks` (where Shopify sends webhooks - dynamically read from TOML)
- **Processing**: Your app receives webhooks and sends data to `${EXTERNAL_API_BASE_URL}/api/receive-orders`

### Product Sync Endpoints

- **Product Sync**: Your app sends product data to `${EXTERNAL_API_BASE_URL}/api/shopify/send/products`

## Testing

1. **Check current configuration**:

   ```bash
   curl -X GET https://your-app-url.com/api/webhooks/config
   ```

2. **Test webhook endpoint**:

   ```bash
   curl -X GET https://your-app-url.com/api/webhook-test
   ```

3. **Register webhooks**:

   ```bash
   curl -X POST https://your-app-url.com/api/webhooks/register \
        -H "Authorization: Bearer YOUR_SESSION_TOKEN"
   ```

4. **Test order webhook**:
   Create a test order in your Shopify store and check the logs.

## How It Works

1. **Dynamic App URL**: The webhook controller automatically reads the current `application_url` from the TOML config file
2. **Webhook Registration**: Uses the current app URL for webhook callbacks
3. **Data Processing**: After receiving webhooks, sends processed data to your external system
4. **No Hardcoding**: No hardcoded URLs or environment variable fallbacks - everything is dynamic

## Common Issues

1. **TOML config not found**: Ensure `shopify.app.warhouse-app-testing.toml` exists in your project root
2. **External system not accessible**: Ensure your External API URL is reachable from your app
3. **Missing environment variables**: Set EXTERNAL_API_BASE_URL to your actual external system URL

## URLs Summary

- **App URL**: Dynamically read from TOML config (for receiving webhooks)
- **External API URL**: Set via `EXTERNAL_API_BASE_URL` env var (for sending data to your system)
- **Order Webhook Endpoint**: `${EXTERNAL_API_BASE_URL}/api/receive-orders`
- **Product Sync Endpoint**: `${EXTERNAL_API_BASE_URL}/api/shopify/send/products`

## Development Workflow

1. Start your development server (e.g., `npm run dev`)
2. The TOML config gets updated with your current tunnel URL
3. Register webhooks using `/api/webhooks/register` (automatically uses current app URL)
4. Webhooks will be sent to your current app URL and data forwarded to your external system

# Token Validation Setup Guide

## Overview

This app now requires users to validate an access token on their first launch. After validation, users can access the app normally without needing to validate again.

## How It Works

### First-Time User Flow

1. **User installs the app** from Shopify App Store or by invitation
2. **App loads** and checks if the shop has validated a token
3. **Token validation screen appears** (if not validated)
4. **User enters token** provided by administrator
5. **Token is validated** against external API
6. **Access is granted** and user can use the app
7. **Subsequent visits** go directly to the app (no token required again)

## System Architecture

### Frontend

- `web/frontend/App.jsx` - Main app entry, checks access on load
- `web/frontend/pages/tokenValidation.jsx` - Token validation UI

### Backend

- `web/controllers/tokenController.js` - Token validation logic
- `web/routes/tokenRoutes.js` - Token API endpoints
- `web/models/ShopAccess.js` - MongoDB model for tracking shop access
- `web/config/database.js` - MongoDB connection

### Database

- **MongoDB** is used to track which shops have validated tokens
- **Collection**: `shopaccesses`
  - `shopDomain`: Shop's domain (unique)
  - `isTokenValidated`: Boolean flag
  - `validatedToken`: The token used (for reference)
  - `validatedAt`: Timestamp of validation
  - `lastAccessAt`: Last time shop accessed the app

## API Endpoints

### Public Endpoints (No Auth Required)

#### POST `/api/tokens/validate`

Validates a token and grants access to a shop.

**Request Body:**

```json
{
  "token": "64-character-hex-token",
  "shopDomain": "shop-name.myshopify.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token validated successfully. You now have access to the app!",
  "data": {
    "shopDomain": "shop-name.myshopify.com",
    "validatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid or already used token"
}
```

#### GET `/api/tokens/check-access`

Checks if a shop has validated access.

**Query Parameters:**

- `shopDomain` - The shop domain to check

**Success Response (200):**

```json
{
  "success": true,
  "hasAccess": true,
  "data": {
    "shopDomain": "shop-name.myshopify.com",
    "validatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Environment Variables

Add to your `.env` file:

```env
# External Token API (where tokens are managed)
EXTERNAL_API_BASE_URL=https://your-token-api.com

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/warehouse-app
```

### MongoDB Setup

**Local Development:**

```bash
# Install MongoDB (if not already installed)
# On macOS with Homebrew:
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Or run manually:
mongod --config /usr/local/etc/mongod.conf
```

**Windows:**

1. Download MongoDB from https://www.mongodb.com/try/download/community
2. Install and run as a service
3. MongoDB will be available at `mongodb://localhost:27017`

**Docker:**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Production:**
Use a managed MongoDB service like:

- MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
- AWS DocumentDB
- Azure Cosmos DB

Update `MONGODB_URI` with your connection string.

## Token Management

Tokens are managed by the external API specified in `EXTERNAL_API_BASE_URL`.

### External API Endpoints Used

**POST** `/api/admin/tokens/validate`

- Validates a token
- Marks it as used
- Returns success/failure

**Request:**

```json
{
  "token": "64-character-hex-token"
}
```

## Testing the Flow

### 1. Start MongoDB

```bash
# Make sure MongoDB is running
mongod
```

### 2. Start the App

```bash
npm run dev
```

### 3. Install App on a Test Shop

- The app will redirect to token validation page

### 4. Get a Test Token

From your external token API:

```bash
curl -X POST http://your-api.com/api/admin/tokens \
  -H "Authorization: Bearer ADMIN_JWT"
```

### 5. Validate Token

- Enter the token in the validation form
- Click "Validate Token"
- On success, you'll be redirected to the app

### 6. Verify Persistence

- Refresh the page
- You should go directly to the app (not token validation)

## Resetting Access (For Testing)

### Clear Shop Access

```javascript
// In MongoDB shell or MongoDB Compass
db.shopaccesses.deleteOne({ shopDomain: "test-shop.myshopify.com" });
```

### Clear localStorage

```javascript
// In browser console
localStorage.removeItem("tokenValidated");
localStorage.removeItem("validatedAt");
```

## Security Considerations

1. **Token Validation** - Tokens are validated against external API, not stored locally
2. **One-Time Use** - Each token can only be used once (enforced by external API)
3. **Shop Binding** - Validated access is tied to specific shop domain
4. **No Authentication Bypass** - Token routes are public, but Shopify auth still required for app routes
5. **MongoDB Security** - Ensure MongoDB is secured in production

## Troubleshooting

### "Token validation service not configured"

- Check that `EXTERNAL_API_BASE_URL` is set in `.env`
- Verify the URL is correct and accessible

### "MongoDB connection failed"

- Check MongoDB is running: `ps aux | grep mongod`
- Verify `MONGODB_URI` in `.env`
- Check MongoDB logs for errors

### Token validation fails

- Verify token is correct (64 characters, hex)
- Check token hasn't been used already
- Verify external API is reachable
- Check backend logs for detailed errors

### Access not persisting

- Check localStorage in browser dev tools
- Verify MongoDB record exists for shop
- Check browser console for errors

## Admin Tasks

### View All Shop Access Records

```javascript
// MongoDB shell
use warehouse-app
db.shopaccesses.find().pretty()
```

### Grant Manual Access (Emergency)

```javascript
// MongoDB shell
db.shopaccesses.updateOne(
  { shopDomain: "shop-name.myshopify.com" },
  {
    $set: {
      isTokenValidated: true,
      validatedAt: new Date(),
      validatedToken: "manual-override",
    },
  },
  { upsert: true }
);
```

### Revoke Access

```javascript
// MongoDB shell
db.shopaccesses.updateOne(
  { shopDomain: "shop-name.myshopify.com" },
  { $set: { isTokenValidated: false } }
);
```

## Future Enhancements

- [ ] Admin dashboard to view validated shops
- [ ] Token expiration and renewal
- [ ] Multi-token support per shop
- [ ] Access level/permissions system
- [ ] Email notifications on validation
- [ ] Audit log of validation attempts

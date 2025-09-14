# Shopify Admin App Setup Guide

This is a public Shopify app built with Express.js, React, and Polaris UI components. The app provides a comprehensive admin interface for managing your Shopify store.

## Features

### 🏠 Admin Dashboard

- **Product Management**: View, add, edit, and delete products
- **Order Tracking**: Monitor recent orders and their status
- **Quick Stats**: Overview of key metrics (products, orders, revenue)
- **Quick Actions**: Easy access to common tasks

### 📊 Analytics Dashboard

- **Sales Metrics**: Total revenue, orders, average order value, conversion rate
- **Top Products**: Best-selling products with performance indicators
- **Traffic Sources**: Visitor analytics and source breakdown
- **Sales Trends**: Visual representation of sales over time
- **Export Options**: Generate and schedule reports

### ⚙️ Settings Page

- **General Settings**: App name, description, admin email, timezone, currency, language
- **Notifications**: Email, push, and SMS notification preferences
- **Feature Toggles**: Enable/disable app features
- **Advanced Settings**: Sync intervals, product limits, debug mode
- **App Information**: Version details and support links

## Tech Stack

- **Backend**: Express.js with Shopify App Express
- **Frontend**: React 18 with Vite
- **UI Components**: Shopify Polaris Design System
- **State Management**: React Query for data fetching
- **Routing**: React Router DOM
- **Authentication**: Shopify App Bridge
- **Internationalization**: i18next

## Getting Started

### Prerequisites

- Node.js 16.13.0 or higher
- npm package manager
- Shopify Partner account
- Shopify CLI installed globally

### Installation

1. **Navigate to the app directory:**

   ```bash
   cd warhouse-app-testing
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **The app will be available at:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3000/api`

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run shopify app dev` - Start with Shopify CLI (recommended)
- `npm run shopify app deploy` - Deploy to Shopify

### Shopify CLI Commands

- `npm run shopify app generate extension` - Create new extensions
- `npm run shopify app info` - View app information
- `npm run shopify app -- --help` - View all available commands

## App Structure

```
warhouse-app-testing/
├── web/                          # Backend Express server
│   ├── index.js                  # Main server file
│   ├── shopify.js               # Shopify configuration
│   ├── product-creator.js       # Product creation logic
│   └── frontend/                # React frontend
│       ├── pages/               # Page components
│       │   ├── index.jsx        # Home page
│       │   ├── AdminDashboard.jsx
│       │   ├── Analytics.jsx
│       │   └── Settings.jsx
│       ├── components/          # Reusable components
│       ├── assets/              # Static assets
│       └── locales/             # Internationalization files
└── extensions/                  # Shopify extensions (if any)
```

## Navigation

The app includes a navigation menu with the following pages:

1. **Home** (`/`) - Welcome page with app overview
2. **Dashboard** (`/admin-dashboard`) - Main admin interface
3. **Analytics** (`/analytics`) - Analytics and reporting
4. **Settings** (`/settings`) - App configuration
5. **Page Name** (`/pagename`) - Additional page (customizable)

## API Endpoints

- `GET /api/products/count` - Get total product count
- `POST /api/products` - Create new products
- `GET /api/*` - Protected routes (require authentication)

## Customization

### Adding New Pages

1. Create a new `.jsx` file in `web/frontend/pages/`
2. Export a default React component
3. Add navigation link in `App.jsx`
4. The routing system will automatically pick up the new page

### Styling

- Uses Shopify Polaris design system
- Custom styles can be added using CSS modules or styled-components
- Follow Polaris design guidelines for consistency

### Internationalization

- Translation files are located in `web/frontend/locales/`
- Add new translations by updating the JSON files
- Use the `useTranslation` hook in components

## Deployment

1. **Build the app:**

   ```bash
   npm run build
   ```

2. **Deploy to Shopify:**

   ```bash
   npm run shopify app deploy
   ```

3. **Install in your store:**
   - Use the provided installation URL
   - Or install through the Shopify Partner Dashboard

## Support

For questions or issues:

- Check the [Shopify App Development documentation](https://shopify.dev/apps)
- Review the [Polaris Design System documentation](https://polaris.shopify.com/)
- Contact support at support@example.com

## License

This project is licensed under the UNLICENSED license.

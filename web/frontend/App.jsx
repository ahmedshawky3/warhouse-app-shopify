import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";
import { Spinner, Page, BlockStack, InlineStack, Text } from "@shopify/polaris";

import { QueryProvider, PolarisProvider } from "./components";
import { useState, useEffect } from "react";
import TokenValidation from "./pages/tokenValidation";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const getShopDomain = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let shopDomain = urlParams.get('shop') || urlParams.get('shop_domain');
    
    if (!shopDomain) {
      const hostname = window.location.hostname;
      if (hostname.includes('myshopify.com')) {
        shopDomain = hostname;
      } else {
        const referrer = document.referrer;
        if (referrer) {
          try {
            const referrerUrl = new URL(referrer);
            if (referrerUrl.hostname.includes('myshopify.com')) {
              shopDomain = referrerUrl.hostname;
            }
          } catch (e) {
            console.warn('Could not parse referrer URL:', referrer);
          }
        }
      }
    }
    
    return shopDomain || 'unknown-shop.myshopify.com';
  };

  const checkAccess = async () => {
    try {
      // Check localStorage first for quick access
      const localValidated = localStorage.getItem('tokenValidated');
      if (localValidated === 'true') {
        setHasAccess(true);
        setIsCheckingAccess(false);
        setIsLoading(false);
        return;
      }

      const shopDomain = getShopDomain();
      
      const response = await fetch(`/api/tokens/check-access?shopDomain=${encodeURIComponent(shopDomain)}`);
      const data = await response.json();

      if (data.success && data.hasAccess) {
        setHasAccess(true);
        localStorage.setItem('tokenValidated', 'true');
        localStorage.setItem('validatedAt', data.data?.validatedAt || new Date().toISOString());
      } else {
        setHasAccess(false);
        localStorage.removeItem('tokenValidated');
        localStorage.removeItem('validatedAt');
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
    } finally {
      setIsCheckingAccess(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAccess();
  }, []);

  const handleValidationSuccess = () => {
    setHasAccess(true);
  };

  // Show loading spinner while checking
  if (isLoading || isCheckingAccess) {
    return (
      <PolarisProvider>
        <Page>
          <BlockStack align="center" gap="400">
            <InlineStack align="center" gap="300">
              <Spinner accessibilityLabel="Loading" size="large" />
              <Text variant="headingMd">Loading app...</Text>
            </InlineStack>
          </BlockStack>
        </Page>
      </PolarisProvider>
    );
  }

  // If no access, show token validation page
  if (!hasAccess) {
    return (
      <PolarisProvider>
        <BrowserRouter>
          <QueryProvider>
            <TokenValidation onValidationSuccess={handleValidationSuccess} />
          </QueryProvider>
        </BrowserRouter>
      </PolarisProvider>
    );
  }

  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/*.jsx", {
    eager: true,
  });

  console.log("App: Pages loaded:", Object.keys(pages));
  console.log("App: Current URL:", window.location.pathname);

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <Routes pages={pages} />
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}

import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";
import { Spinner, Page, BlockStack, InlineStack, Text } from "@shopify/polaris";

import { QueryProvider, PolarisProvider } from "./components";
import { useState, useEffect } from "react";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple loading state - authentication is handled by backend middleware
    // If user reaches this component, they are already authenticated
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Brief loading state for smooth UX

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner briefly
  if (isLoading) {
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

import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";
import { Spinner, Page, BlockStack, InlineStack, Text, Banner } from "@shopify/polaris";

import { QueryProvider, PolarisProvider } from "./components";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Show loading spinner while checking authentication
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

  // Show error if authentication failed
  if (error) {
    return (
      <PolarisProvider>
        <Page>
          <BlockStack align="center" gap="400">
            <Banner status="critical" title="Authentication Error">
              <Text variant="bodyMd">{error}</Text>
            </Banner>
          </BlockStack>
        </Page>
      </PolarisProvider>
    );
  }

  // Show loading if not authenticated (OAuth redirect should happen)
  if (!isAuthenticated) {
    return (
      <PolarisProvider>
        <Page>
          <BlockStack align="center" gap="400">
            <InlineStack align="center" gap="300">
              <Spinner accessibilityLabel="Authenticating" size="large" />
              <Text variant="headingMd">Authenticating with Shopify...</Text>
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

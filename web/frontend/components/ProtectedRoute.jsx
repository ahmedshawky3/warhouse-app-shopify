import { useAuth } from '../hooks/useAuth';
import { Spinner, Page, BlockStack, InlineStack, Text, Banner } from '@shopify/polaris';

/**
 * Higher-order component that protects routes requiring authentication
 * Shows loading/error states and redirects to OAuth if not authenticated
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Page>
        <BlockStack align="center" gap="400">
          <InlineStack align="center" gap="300">
            <Spinner accessibilityLabel="Loading" size="large" />
            <Text variant="headingMd">Loading app...</Text>
          </InlineStack>
        </BlockStack>
      </Page>
    );
  }

  // Show error if authentication failed
  if (error) {
    return (
      <Page>
        <BlockStack align="center" gap="400">
          <Banner status="critical" title="Authentication Error">
            <Text variant="bodyMd">{error}</Text>
          </Banner>
        </BlockStack>
      </Page>
    );
  }

  // Show loading if not authenticated (OAuth redirect should happen)
  if (!isAuthenticated) {
    return (
      <Page>
        <BlockStack align="center" gap="400">
          <InlineStack align="center" gap="300">
            <Spinner accessibilityLabel="Authenticating" size="large" />
            <Text variant="headingMd">Authenticating with Shopify...</Text>
          </InlineStack>
        </BlockStack>
      </Page>
    );
  }

  // User is authenticated, render the protected content
  return children;
}

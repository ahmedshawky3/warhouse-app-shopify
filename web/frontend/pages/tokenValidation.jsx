import {
  Page,
  Card,
  TextField,
  Button,
  Banner,
  BlockStack,
  Text,
  InlineStack,
  Box,
  Spinner
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";

export default function TokenValidation({ onValidationSuccess }) {
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTokenChange = (value) => {
    setToken(value);
    setError("");
  };

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

  const handleSubmit = async () => {
    if (!token.trim()) {
      setError("Please enter a token");
      return;
    }

    setIsValidating(true);
    setError("");
    setSuccess("");

    try {
      const shopDomain = getShopDomain();
      
      const response = await fetch("/api/tokens/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: token.trim(),
          shopDomain: shopDomain
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || "Token validated successfully!");
        
        // Store validation status in localStorage
        localStorage.setItem('tokenValidated', 'true');
        localStorage.setItem('validatedAt', new Date().toISOString());
        
        // Notify parent component
        setTimeout(() => {
          if (onValidationSuccess) {
            onValidationSuccess();
          }
        }, 1500);
      } else {
        setError(data.message || "Invalid token. Please check and try again.");
      }
    } catch (err) {
      console.error("Token validation error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Page narrowWidth>
      <TitleBar title="Token Validation Required" />
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Box>
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">
                  Welcome to Warehouse App
                </Text>
                <Text variant="bodyMd" color="subdued">
                  To use this app, you need to validate your access token. 
                  Please enter the token provided to you by your administrator.
                </Text>
              </BlockStack>
            </Box>

            {error && (
              <Banner status="critical" onDismiss={() => setError("")}>
                <Text>{error}</Text>
              </Banner>
            )}

            {success && (
              <Banner status="success">
                <BlockStack gap="200">
                  <Text fontWeight="semibold">{success}</Text>
                  <Text>Redirecting to the app...</Text>
                </BlockStack>
              </Banner>
            )}

            <BlockStack gap="300">
              <TextField
                label="Access Token"
                value={token}
                onChange={handleTokenChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter your 64-character token"
                autoComplete="off"
                disabled={isValidating || !!success}
                helpText="Token is a 64-character hex string provided by your administrator"
                maxLength={64}
              />

              <InlineStack align="end">
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isValidating || !token.trim() || !!success}
                  loading={isValidating}
                >
                  {isValidating ? "Validating..." : "Validate Token"}
                </Button>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text variant="headingMd" as="h3">
              Need Help?
            </Text>
            <Text variant="bodyMd">
              If you don't have an access token, please contact your system administrator. 
              Each token can only be used once and is tied to your shop.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}


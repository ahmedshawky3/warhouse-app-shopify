import {
  Card,
  Page,
  Layout,
  Text,
  Button,
  Banner,
  DataTable,
  ProgressBar,
  Modal,
  ButtonGroup,
  Spinner,
  EmptyState,
  List,
  Badge,
  Checkbox,
  Select,
  Divider,
  SkeletonBodyText,
  SkeletonDisplayText,
  Grid,
  Box,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { ProtectedRoute } from "../components/ProtectedRoute";

function ProductSender() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const shopify = useAppBridge();
  const [sendModalActive, setSendModalActive] = useState(false);
  const [sendInProgress, setSendInProgress] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sendMode, setSendMode] = useState("all"); // "all" or "selected"
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get Shopify variants (API now returns variants directly)
  const { data: shopifyData, isLoading: productsLoading } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  // The API now returns variants directly under the 'products' key
  const shopifyVariants = shopifyData?.products || [];

  // Send products mutation
  const sendProductsMutation = useMutation({
    mutationFn: async ({ endpoint, sendMode, selectedProductIds }) => {
      try {
        // First, get the products data from our backend
        const productsResponse = await fetch("/api/products", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (!productsResponse.ok) {
          const errorText = await productsResponse.text();
          throw new Error(`Failed to fetch products: ${productsResponse.status} - ${errorText}`);
        }
        
        const productsData = await productsResponse.json();
        const allVariants = productsData.products || []; // These are actually variants with product context
        
        console.log('Fetched variants:', allVariants.length);
        console.log('Sample variant:', allVariants[0]);
        
        // Filter variants based on sendMode
        let variantsToSend = [];
        if (sendMode === "all") {
          variantsToSend = allVariants;
        } else if (sendMode === "selected" && selectedProductIds && selectedProductIds.length > 0) {
          variantsToSend = allVariants.filter(variant => selectedProductIds.includes(variant.id));
        }
        
        console.log('Variants to send:', variantsToSend.length);
        
        // Transform variants to match external API format (flat array of variants with product context)
        const transformedProducts = variantsToSend.map(variant => ({
          variantId: variant.id,
          productId: variant.productId,
          productTitle: variant.productTitle,
          variantTitle: variant.title,
          sku: variant.sku,
          price: variant.price,
          inventoryQuantity: variant.inventoryQuantity,
          productCategory: variant.productCategory,
          productVendor: variant.productVendor,
          productStatus: variant.productStatus,
          productDescription: variant.productDescription,
          productImage: variant.productImage,
          productCreatedAt: variant.productCreatedAt,
          productUpdatedAt: variant.productUpdatedAt
        }));
        
        console.log('Transformed products (variants):', transformedProducts.length);
        console.log('Sample variant:', transformedProducts[0]);
        
        // Get shop domain from URL parameters or current hostname
        const urlParams = new URLSearchParams(window.location.search);
        let shopDomain = urlParams.get('shop') || urlParams.get('shop_domain');
        
        // If not in URL params, try to extract from current hostname or referrer
        if (!shopDomain) {
          // Try to get from current URL hostname
          const hostname = window.location.hostname;
          if (hostname.includes('myshopify.com')) {
            shopDomain = hostname;
          } else {
            // Try to get from document referrer
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
        
        // Fallback to a default shop domain if still not found
        if (!shopDomain) {
          shopDomain = 'test-warehouse-app1.myshopify.com'; // Default fallback
          console.warn('No shop domain found, using fallback:', shopDomain);
        }
        
        console.log('Shop domain:', shopDomain);
        console.log('Current URL:', window.location.href);
        console.log('URL params:', Object.fromEntries(urlParams.entries()));
        
        // Now send to external API with complete data
        const response = await fetch(`/api/shopify/sync/products?shop=${encodeURIComponent(shopDomain)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: "EXTERNAL_API", // Use pre-configured external API
            sendMode: sendMode,
            selectedProductIds: sendMode === "selected" ? selectedProductIds : [],
            shopDomain: shopDomain,
            products: transformedProducts
          }),
        });
        
        // Handle response
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Send failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        // Handle JSON responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          return data;
        } else {
          const text = await response.text();
          return { 
            success: true, 
            message: text || "Products sent successfully",
            sent: variantsToSend.length,
            successCount: variantsToSend.length,
            errorCount: 0
          };
        }
      } catch (error) {
        console.error("Send mutation error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Send success:", data);
      setSendResults(data);
      setSendInProgress(false);
      setSendModalActive(false);
      setErrorMessage(null);
      
      // Show success toast
      const successCount = data.successCount || data.sent || 0;
      const errorCount = data.errorCount || 0;
      const totalSent = data.sent || 0;
      
      if (errorCount === 0) {
        setSuccessMessage(`Successfully sent ${successCount} product(s) to Flowline!`);
        shopify.toast.show(`Successfully sent ${successCount} product(s) to Flowline!`, {
          isError: false,
        });
      } else {
        setSuccessMessage(`Sent ${successCount} product(s) successfully, ${errorCount} failed.`);
        shopify.toast.show(`Sent ${successCount} product(s) successfully, ${errorCount} failed.`, {
          isError: false,
        });
      }
    },
    onError: (error) => {
      console.error("Send error:", error);
      setSendInProgress(false);
      setSuccessMessage(null);
      
      // Parse error message for better user feedback
      let errorMsg = "Failed to send products to Flowline.";
      if (error.message) {
        if (error.message.includes("Failed to fetch products")) {
          errorMsg = "Failed to load products from Shopify. Please try again.";
        } else if (error.message.includes("Send failed")) {
          errorMsg = "Failed to send products to Flowline. Please check your connection and try again.";
        } else {
          errorMsg = error.message;
        }
      }
      
      setErrorMessage(errorMsg);
      shopify.toast.show(errorMsg, {
        isError: true,
      });
    },
  });

  const handleSendAll = useCallback(() => {
    // Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);
    setSendResults(null);
    
    // Check if any variants have no SKU
    const variantsWithoutSku = shopifyVariants?.filter(variant => !variant.sku || variant.sku.trim() === '');
    
    if (variantsWithoutSku && variantsWithoutSku.length > 0) {
      const errorMsg = `Cannot send products without SKU. Please add SKUs to ${variantsWithoutSku.length} product(s) before sending.`;
      setErrorMessage(errorMsg);
      shopify.toast.show(errorMsg, { isError: true });
      return;
    }
    
    setSendMode("all");
    setSendModalActive(true);
  }, [shopifyVariants]);

  const handleSendSelected = useCallback(() => {
    // Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);
    setSendResults(null);
    
    if (selectedProducts.length === 0) {
      const errorMsg = "Please select at least one product to send.";
      setErrorMessage(errorMsg);
      shopify.toast.show(errorMsg, { isError: true });
      return;
    }
    
    // Check if any selected variants have no SKU
    const selectedVariants = shopifyVariants?.filter(variant => selectedProducts.includes(variant.id));
    const variantsWithoutSku = selectedVariants?.filter(variant => !variant.sku || variant.sku.trim() === '');
    
    if (variantsWithoutSku && variantsWithoutSku.length > 0) {
      const errorMsg = `Cannot send selected products without SKU. Please add SKUs to ${variantsWithoutSku.length} selected product(s) before sending.`;
      setErrorMessage(errorMsg);
      shopify.toast.show(errorMsg, { isError: true });
      return;
    }
    
    setSendMode("selected");
    setSendModalActive(true);
  }, [selectedProducts, shopifyVariants]);

  const handleConfirmSend = useCallback(() => {
    setSendInProgress(true);
    
    sendProductsMutation.mutate({ 
      endpoint: "EXTERNAL_API", // Use pre-configured endpoint
      sendMode: sendMode,
      selectedProductIds: sendMode === "selected" ? selectedProducts : []
    });
  }, [sendMode, selectedProducts, sendProductsMutation]);

  const handleCancelSend = useCallback(() => {
    setSendModalActive(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === shopifyVariants?.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(shopifyVariants?.map(v => v.id) || []);
    }
  }, [selectedProducts.length, shopifyVariants]);



  const allSelected = selectedProducts.length === shopifyVariants?.length && shopifyVariants?.length > 0;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < shopifyVariants?.length;
  
  // Check for variants without SKU
  const variantsWithoutSku = shopifyVariants?.filter(variant => !variant.sku || variant.sku.trim() === '') || [];
  const hasVariantsWithoutSku = variantsWithoutSku.length > 0;



  return (
    <ProtectedRoute>
      <Page fullWidth>
        <TitleBar title="Warehouse Management" />
        <Layout>
        {/* Header */}

        {/* Success/Error Messages */}
        {successMessage && (
          <Layout.Section>
            <Banner status="success" title="Success" onDismiss={() => setSuccessMessage(null)}>
              <Text variant="bodyMd">{successMessage}</Text>
            </Banner>
          </Layout.Section>
        )}

        {errorMessage && (
          <Layout.Section>
            <Banner status="critical" title="Error" onDismiss={() => setErrorMessage(null)}>
              <Text variant="bodyMd">{errorMessage}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Send Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Send Products to Flowline</Text>
                <Text variant="bodyMd">
                  Choose to send all products or select specific ones to send to Flowline.
                </Text>
              </BlockStack>
              
              <BlockStack gap="300">
                {hasVariantsWithoutSku && (
                  <Banner status="warning" title="SKU Required">
                    <Text variant="bodyMd">
                      {variantsWithoutSku.length} product(s) are missing SKUs and cannot be sent. 
                      Please add SKUs to these products before sending.
                    </Text>
                  </Banner>
                )}
                
                <InlineStack gap="300" wrap={false}>
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={handleSendAll}
                    disabled={sendInProgress || !shopifyVariants?.length || hasVariantsWithoutSku}
                    loading={sendInProgress && sendMode === "all"}
                  >
                    {sendInProgress && sendMode === "all" ? "Sending..." : "Send All Products"}
                  </Button>
                  <Button 
                    variant="secondary"
                    size="large"
                    onClick={handleSendSelected}
                    disabled={sendInProgress || selectedProducts.length === 0}
                    loading={sendInProgress && sendMode === "selected"}
                  >
                    Send Selected ({selectedProducts.length})
                  </Button>
                </InlineStack>

                {sendInProgress && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd">Sending products to Flowline...</Text>
                    <ProgressBar progress={75} />
                  </BlockStack>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Send Results */}
        {sendResults && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Send Results</Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Products Sent</Text>
                        <Text variant="heading2xl">{sendResults.sent || sendResults.successCount || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Successful</Text>
                        <Text variant="heading2xl" color="success">{sendResults.successCount || sendResults.sent || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Errors</Text>
                        <Text variant="heading2xl" color="critical">{sendResults.errorCount || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                </Grid>
                
                {sendResults.message && (
                  <Box padding="200" background="bg-surface-secondary">
                    <Text variant="bodyMd" fontWeight="semibold">
                      Message: {sendResults.message}
                    </Text>
                  </Box>
                )}
                
                {sendResults.errorDetails && sendResults.errorDetails.length > 0 && (
                  <Box>
                    <Text variant="bodyMd" color="critical" fontWeight="semibold">
                      Error Details:
                    </Text>
                    <List type="bullet">
                      {sendResults.errorDetails.map((error, index) => (
                        <List.Item key={index}>
                          {error.product}: {error.error}
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Product List */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Products</Text>
              
              {productsLoading ? (
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center">
                    <Spinner accessibilityLabel="Loading products" size="large" />
                    <Text variant="bodyMd">Loading products...</Text>
                  </InlineStack>
                </Box>
              ) : shopifyVariants?.length > 0 ? (
                <Box padding="0">
                  <DataTable
                    columnContentTypes={['text', 'text', 'text']}
                    headings={[
                      <InlineStack gap="200" blockAlign="center">
                        <Checkbox
                          checked={allSelected}
                          onChange={handleSelectAll}
                        />
                        <Text variant="bodyMd" fontWeight="semibold">Name</Text>
                      </InlineStack>,
                      <Text variant="bodyMd" fontWeight="semibold">SKU</Text>, 
                      <Text variant="bodyMd" fontWeight="semibold">Status</Text>
                    ]}
                    rows={shopifyVariants.map((variant, index) => [
                      <InlineStack gap="200" blockAlign="center">
                        <Checkbox
                          checked={selectedProducts.includes(variant.id)}
                          onChange={() => {
                            if (selectedProducts.includes(variant.id)) {
                              setSelectedProducts(selectedProducts.filter(id => id !== variant.id));
                            } else {
                              setSelectedProducts([...selectedProducts, variant.id]);
                            }
                          }}
                        />
                        <Text variant="bodyMd">{`${variant.productTitle} - ${variant.title}`}</Text>
                      </InlineStack>,
                      <Text variant="bodyMd" color={!variant.sku || variant.sku.trim() === '' ? 'critical' : 'base'}>
                        {variant.sku || 'No SKU'}
                      </Text>,
                      <Badge status={variant.productStatus === "active" ? "success" : "warning"}>
                        {variant.productStatus}
                      </Badge>
                    ])}
                    footerContent={
                      <Box padding="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyMd" color="subdued">
                            {selectedProducts.length} of {shopifyVariants.length} products selected
                          </Text>
                          <Button 
                            onClick={handleSelectAll} 
                            variant="tertiary" 
                            size="slim"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </Button>
                        </InlineStack>
                      </Box>
                    }
                    increasedTableDensity
                    hoverable
                    stickyHeader
                    verticalAlign="middle"
                  />
                </Box>
              ) : (
                <EmptyState
                  heading="No products found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>No products are available in your store.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        </Layout>

        {/* Send Confirmation Modal */}
        <Modal
          open={sendModalActive}
          onClose={handleCancelSend}
          title="Confirm Send to Flowline"
          primaryAction={{
            content: "Send to Flowline",
            onAction: handleConfirmSend,
            loading: sendInProgress,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: handleCancelSend,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Text variant="bodyMd">
                {sendMode === "all" 
                  ? `This will send all ${shopifyVariants?.length || 0} products to Flowline.`
                  : `This will send ${selectedProducts.length} selected products to Flowline.`
                }
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Page>
    </ProtectedRoute>
  );
}

export default ProductSender;

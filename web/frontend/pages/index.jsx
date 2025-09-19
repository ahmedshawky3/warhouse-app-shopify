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
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";

export default function ProductSender() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sendModalActive, setSendModalActive] = useState(false);
  const [sendInProgress, setSendInProgress] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sendMode, setSendMode] = useState("all"); // "all" or "selected"
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuData, setSkuData] = useState(null);

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
      // First, get the products data from our backend
      const productsResponse = await fetch("/api/products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
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
      
      // Get shop domain from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const shopDomain = urlParams.get('shop') || urlParams.get('shop_domain') || 'unknown-shop.myshopify.com';
      
      console.log('Shop domain:', shopDomain);
      console.log('Current URL:', window.location.href);
      
      // Now send to external API with complete data
      const response = await fetch("/api/sync/send-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "EXTERNAL_API", // Use pre-configured external API
          sendMode: sendMode,
          selectedProductIds: sendMode === "selected" ? selectedProductIds : []
        }),
      });
      
      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${text}`);
      }
    },
    onSuccess: (data) => {
      setSendResults(data);
      setSendInProgress(false);
      setSendModalActive(false);
    },
    onError: (error) => {
      console.error("Send error:", error);
      setSendInProgress(false);
      // Show error message to user
      alert(`Sync failed: ${error.message}`);
    },
  });

  const handleSendAll = useCallback(() => {
    setSendMode("all");
    setSendModalActive(true);
  }, []);

  const handleSendSelected = useCallback(() => {
    if (selectedProducts.length === 0) {
      alert("Please select at least one product to send.");
      return;
    }
    setSendMode("selected");
    setSendModalActive(true);
  }, [selectedProducts]);

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


  const handleFetchSkus = useCallback(async () => {
    setSkuLoading(true);
    try {
      const response = await fetch('/api/skus/quantities');
      const data = await response.json();
      
      if (data.success) {
        setSkuData(data);
        console.log('SKU data fetched:', data);
      } else {
        console.error('Failed to fetch SKU data:', data.message);
      }
    } catch (error) {
      console.error('Error fetching SKU data:', error);
    } finally {
      setSkuLoading(false);
    }
  }, []);

  const allSelected = selectedProducts.length === shopifyVariants?.length && shopifyVariants?.length > 0;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < shopifyVariants?.length;



  return (
    <Page fullWidth>
      <TitleBar title="Warehouse Management" />
      <Layout>
        {/* Header */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text variant="headingLg" as="h1">Warehouse Management Dashboard</Text>
                  <Text variant="bodyMd" color="subdued">
                    Sync your Shopify product variants to Odoo warehouse management system
                  </Text>
                </BlockStack>
                <Button 
                  onClick={handleFetchSkus} 
                  loading={skuLoading}
                  variant="primary"
                  size="large"
                >
                  {skuLoading ? 'Fetching SKUs...' : 'Fetch SKU Quantities'}
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* SKU Data Display */}
        {skuData && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">SKU Quantities Data</Text>
                <Banner status="success" title={skuData.message}>
                  <Text variant="bodyMd">
                    Retrieved data for {skuData.data.length} companies
                  </Text>
                </Banner>
                
                <Grid>
                  {skuData.data.map((company, index) => (
                    <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="100">
                              <Text variant="headingMd">
                                {company.company_name}
                              </Text>
                              <Text variant="bodyMd" color="subdued">
                                {company.company_website}
                              </Text>
                            </BlockStack>
                            <Badge status="info">
                              {company.total_skus} SKUs
                            </Badge>
                          </InlineStack>
                          
                          <InlineStack gap="400">
                            <Text variant="bodyMd" fontWeight="semibold">
                              Total Quantity: {company.total_quantity}
                            </Text>
                          </InlineStack>
                          
                          <Box>
                            <Text variant="bodySm" fontWeight="semibold">SKU Details:</Text>
                            <BlockStack gap="100">
                              {company.skus.slice(0, 3).map((sku, skuIndex) => (
                                <Text key={skuIndex} variant="bodySm">
                                  • {sku.sku}: {sku.quantity_on_hand} units
                                </Text>
                              ))}
                              {company.skus.length > 3 && (
                                <Text variant="bodySm" color="subdued">
                                  ... and {company.skus.length - 3} more
                                </Text>
                              )}
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      </Card>
                    </Grid.Cell>
                  ))}
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Variant Count */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    Total Variants
                  </Text>
                  {productsLoading ? (
                    <SkeletonDisplayText size="large" />
                  ) : (
                    <Text variant="heading2xl" as="p">
                      {shopifyVariants?.length || 0}
                    </Text>
                  )}
                  <Text variant="bodyMd" color="subdued">
                    Available in your store
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    Selected Variants
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {selectedProducts.length}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Ready to send
                  </Text>
                </BlockStack>
              </Card>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">
                    Send Status
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="heading2xl" as="p">
                      {sendInProgress ? "⏳" : sendResults ? "✅" : "📤"}
                    </Text>
                    <Badge status={sendInProgress ? "info" : sendResults ? "success" : "attention"}>
                      {sendInProgress ? "Sending..." : sendResults ? "Sent" : "Ready"}
                    </Badge>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Send Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Sync Variants to Odoo</Text>
                <Text variant="bodyMd">
                  Choose to sync all variants or select specific ones to sync to Odoo warehouse management.
                </Text>
              </BlockStack>
              
              <BlockStack gap="300">
                <InlineStack gap="300" wrap={false}>
                  <Button 
                    variant="primary" 
                    size="large"
                    onClick={handleSendAll}
                    disabled={sendInProgress || !shopifyVariants?.length}
                    loading={sendInProgress && sendMode === "all"}
                  >
                    {sendInProgress && sendMode === "all" ? "Syncing..." : "Sync All Variants"}
                  </Button>
                  <Button 
                    variant="secondary"
                    size="large"
                    onClick={handleSendSelected}
                    disabled={sendInProgress || selectedProducts.length === 0}
                    loading={sendInProgress && sendMode === "selected"}
                  >
                    Sync Selected ({selectedProducts.length})
                  </Button>
                </InlineStack>

                {sendInProgress && (
                  <BlockStack gap="200">
                    <Text variant="bodyMd">Syncing variants to Odoo...</Text>
                    <ProgressBar progress={75} />
                  </BlockStack>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Variant List */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Product Variants</Text>
              
              {productsLoading ? (
                <Box padding="400">
                  <InlineStack align="center" blockAlign="center">
                    <Spinner accessibilityLabel="Loading variants" size="large" />
                    <Text variant="bodyMd">Loading variants...</Text>
                  </InlineStack>
                </Box>
              ) : shopifyVariants?.length > 0 ? (
                <Box padding="0">
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
                    headings={[
                      <InlineStack gap="200" blockAlign="center">
                        <Checkbox
                          checked={allSelected}
                          onChange={handleSelectAll}
                        />
                        <Text variant="bodyMd" fontWeight="semibold">Name</Text>
                      </InlineStack>,
                      <Text variant="bodyMd" fontWeight="semibold">SKU</Text>, 
                      <Text variant="bodyMd" fontWeight="semibold">Stock</Text>, 
                      <Text variant="bodyMd" fontWeight="semibold">Price</Text>, 
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
                      <Text variant="bodyMd">{variant.sku || 'No SKU'}</Text>,
                      <Text variant="bodyMd" fontWeight="semibold">{variant.inventoryQuantity || 0}</Text>,
                      <Text variant="bodyMd" fontWeight="semibold">{`$${variant.price || "0.00"}`}</Text>,
                      <Badge status={variant.productStatus === "active" ? "success" : "warning"}>
                        {variant.productStatus}
                      </Badge>
                    ])}
                    footerContent={
                      <Box padding="400">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyMd" color="subdued">
                            {selectedProducts.length} of {shopifyVariants.length} variants selected
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
                  heading="No variants found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>No variants are available in your store.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Send Results */}
        {sendResults && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Sync Results</Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Variants Sent</Text>
                        <Text variant="heading2xl">{sendResults.results?.sent || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Successful</Text>
                        <Text variant="heading2xl" color="success">{sendResults.results?.success || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                    <Box padding="300">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="semibold">Errors</Text>
                        <Text variant="heading2xl" color="critical">{sendResults.results?.errors || 0}</Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                </Grid>
                
                {sendResults.results?.errorDetails?.length > 0 && (
                  <Box>
                    <Text variant="bodyMd" color="critical" fontWeight="semibold">
                      Error Details:
                    </Text>
                    <List type="bullet">
                      {sendResults.results.errorDetails.map((error, index) => (
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
        </Layout>

        {/* Send Confirmation Modal */}
        <Modal
          open={sendModalActive}
          onClose={handleCancelSend}
          title="Confirm Sync to Odoo"
          primaryAction={{
            content: "Sync to Odoo",
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
                  ? `This will sync all ${shopifyVariants?.length || 0} variants to Odoo.`
                  : `This will sync ${selectedProducts.length} selected variants to Odoo.`
                }
              </Text>
              <Box padding="200" background="bg-surface-secondary">
                <Text variant="bodyMd" fontWeight="semibold">
                  Odoo Sync Endpoint: Pre-configured External API
                </Text>
              </Box>
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Page>
  );
}

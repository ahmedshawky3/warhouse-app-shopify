import {
  LegacyCard,
  Page,
  Layout,
  TextContainer,
  Text,
  VerticalStack,
  Button,
  DisplayText,
  Subheading,
  Banner,
  DataTable,
  ProgressBar,
  Modal,
  FormLayout,
  TextField,
  ButtonGroup,
  Spinner,
  EmptyState,
  List,
  Badge,
  Checkbox,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Stack,
  Select,
  Divider,
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
  const [endpointUrl, setEndpointUrl] = useState("https://2a776cf42407.ngrok-free.app/api/send-products");
  const [showEndpointModal, setShowEndpointModal] = useState(false);
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
      const response = await fetch("/api/send-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint, sendMode, selectedProductIds }),
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
    if (!endpointUrl) {
      alert("Please enter an endpoint URL first.");
      setShowEndpointModal(true);
      return;
    }

    setSendInProgress(true);
    
    sendProductsMutation.mutate({ 
      endpoint: endpointUrl,
      sendMode: sendMode,
      selectedProductIds: sendMode === "selected" ? selectedProducts : []
    });
  }, [sendMode, selectedProducts, endpointUrl, sendProductsMutation]);

  const handleCancelSend = useCallback(() => {
    setSendModalActive(false);
  }, []);

  const handleProductSelection = useCallback((productId, isSelected) => {
    setSelectedProducts(prev => 
      isSelected 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === shopifyVariants?.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(shopifyVariants?.map(v => v.id) || []);
    }
  }, [selectedProducts.length, shopifyVariants]);

  const handleEndpointSubmit = useCallback(() => {
    if (endpointUrl.trim()) {
      setShowEndpointModal(false);
    }
  }, [endpointUrl]);

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

  const variantRows = shopifyVariants?.map((variant) => [
    <Checkbox
      checked={selectedProducts.includes(variant.id)}
      onChange={(checked) => handleProductSelection(variant.id, checked)}
    />,
    <ResourceItem
      id={variant.id}
      url="#"
      media={
        <Thumbnail
          source={variant.productImage?.url || "https://via.placeholder.com/50"}
          alt={variant.productTitle}
        />
      }
    >
      <Text variant="bodyMd" fontWeight="bold" as="h3">
        {variant.productTitle} - {variant.title}
      </Text>
      <Text variant="bodySm" color="subdued">
        SKU: {variant.sku || 'No SKU'} | Vendor: {variant.productVendor}
      </Text>
    </ResourceItem>,
    variant.inventoryQuantity || 0,
    `$${variant.price || "0.00"}`,
    <Badge status={variant.productStatus === "active" ? "success" : "warning"}>
      {variant.productStatus}
    </Badge>,
  ]) || [];

  return (
    <Page fullWidth>
      <TitleBar title="Send Products" />
      <Layout>
        {/* Header */}
        <Layout.Section>
          <LegacyCard sectioned>
            <VerticalStack gap="4" alignment="center">
              <div>
                <DisplayText size="medium">Shopify to Odoo Sync</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Sync your Shopify product variants to Odoo warehouse management
                </Text>
              </div>
              <ButtonGroup>
                <Button onClick={() => setShowEndpointModal(true)}>
                  Configure Endpoint
                </Button>
                <Button 
                  onClick={handleFetchSkus} 
                  loading={skuLoading}
                  primary
                >
                  {skuLoading ? 'Fetching SKUs...' : 'Fetch SKU Quantities'}
                </Button>
              </ButtonGroup>
            </VerticalStack>
          </LegacyCard>
        </Layout.Section>

        {/* Endpoint Status */}
        <Layout.Section>
          <Banner
            status={endpointUrl ? "success" : "warning"}
            title={endpointUrl ? "Endpoint Configured" : "No Endpoint Set"}
          >
            <Text variant="bodyMd">
              {endpointUrl 
                ? `Variants will be synced to Odoo via: ${endpointUrl}`
                : "Please configure an Odoo sync endpoint URL."
              }
            </Text>
          </Banner>
        </Layout.Section>

        {/* SKU Data Display */}
        {skuData && (
          <Layout.Section>
            <LegacyCard sectioned>
              <VerticalStack gap="4">
                <Text variant="headingMd">SKU Quantities Data</Text>
                <Banner status="success" title={skuData.message}>
                  <Text variant="bodyMd">
                    Retrieved data for {skuData.data.length} companies
                  </Text>
                </Banner>
                
                {skuData.data.map((company, index) => (
                  <LegacyCard key={index} sectioned>
                    <VerticalStack gap="2">
                      <Text variant="headingSm">
                        🏢 {company.company_name}
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        🌐 {company.company_website}
                      </Text>
                      <Text variant="bodyMd">
                        📦 Total SKUs: {company.total_skus} | 
                        📊 Total Quantity: {company.total_quantity}
                      </Text>
                      
                      <div style={{ marginTop: '8px' }}>
                        <Text variant="bodySm" fontWeight="bold">SKUs:</Text>
                        {company.skus.map((sku, skuIndex) => (
                          <Text key={skuIndex} variant="bodySm">
                            • {sku.sku}: {sku.quantity_on_hand} units
                          </Text>
                        ))}
                      </div>
                    </VerticalStack>
                  </LegacyCard>
                ))}
              </VerticalStack>
            </LegacyCard>
          </Layout.Section>
        )}

        {/* Variant Count */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <LegacyCard sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Variants
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {shopifyVariants?.length || 0}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Available in your store
                  </Text>
                </TextContainer>
              </LegacyCard>
            </Layout.Section>
            <Layout.Section oneThird>
              <LegacyCard sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Selected Variants
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {selectedProducts.length}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Ready to send
                  </Text>
                </TextContainer>
              </LegacyCard>
            </Layout.Section>
            <Layout.Section oneThird>
              <LegacyCard sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Send Status
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {sendInProgress ? "⏳" : sendResults ? "✅" : "📤"}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    {sendInProgress ? "Sending..." : sendResults ? "Sent" : "Ready"}
                  </Text>
                </TextContainer>
              </LegacyCard>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Send Actions */}
        <Layout.Section>
          <LegacyCard title="Send Variants" sectioned>
            <VerticalStack gap="4">
              <div>
                <Subheading>Choose what to sync</Subheading>
                <Text variant="bodyMd">
                  Sync all variants or select specific ones to sync to Odoo warehouse management.
                </Text>
              </div>
              
              <VerticalStack gap="4">
                <Button 
                  primary 
                  size="large"
                  onClick={handleSendAll}
                  disabled={!endpointUrl || sendInProgress || !shopifyVariants?.length}
                >
                  {sendInProgress ? "Syncing..." : "Sync All Variants to Odoo"}
                </Button>
                <Button 
                  size="large"
                  onClick={handleSendSelected}
                  disabled={!endpointUrl || sendInProgress || selectedProducts.length === 0}
                >
                  Sync Selected Variants to Odoo ({selectedProducts.length})
                </Button>
              </VerticalStack>

              {sendInProgress && (
                <div>
                  <Text variant="bodyMd">Syncing variants to Odoo...</Text>
                  <ProgressBar progress={75} />
                </div>
              )}
            </VerticalStack>
          </LegacyCard>
        </Layout.Section>

        {/* Variant List */}
        <Layout.Section>
          <LegacyCard title="Variants" sectioned>
            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner accessibilityLabel="Loading variants" size="large" />
                </div>
            ) : shopifyVariants?.length > 0 ? (
              <VerticalStack gap="4">
                <Stack distribution="equalSpacing" alignment="center">
                  <Text variant="headingMd">Select Variants</Text>
                  <Button onClick={handleSelectAll}>
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
            </Stack>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text"]}
                  headings={["Select", "Product/Variant", "Stock", "Price", "Status"]}
                  rows={variantRows}
                />
              </VerticalStack>
            ) : (
              <EmptyState
                heading="No variants found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>No variants are available in your store.</p>
              </EmptyState>
            )}
          </LegacyCard>
        </Layout.Section>

        {/* Send Results */}
        {sendResults && (
        <Layout.Section>
            <LegacyCard title="Send Results" sectioned>
              <VerticalStack gap="4">
                <div>
                  <Text variant="bodyMd">
                    <strong>Variants Sent:</strong> {sendResults.results?.sent || 0}
                  </Text>
                </div>
                <div>
                  <Text variant="bodyMd">
                    <strong>Success:</strong> {sendResults.results?.success || 0}
                  </Text>
                </div>
                <div>
                  <Text variant="bodyMd">
                    <strong>Errors:</strong> {sendResults.results?.errors || 0}
                  </Text>
                </div>
                {sendResults.results?.errorDetails?.length > 0 && (
                  <div>
                    <Text variant="bodyMd" color="critical">
                      <strong>Error Details:</strong>
                    </Text>
                    <List type="bullet">
                      {sendResults.results.errorDetails.map((error, index) => (
                        <List.Item key={index}>
                          {error.product}: {error.error}
                        </List.Item>
                      ))}
                    </List>
                  </div>
                )}
              </VerticalStack>
            </LegacyCard>
        </Layout.Section>
        )}
      </Layout>

      {/* Endpoint Configuration Modal */}
        <Modal
          open={showEndpointModal}
          onClose={() => setShowEndpointModal(false)}
          title="Configure Odoo Sync Endpoint"
          primaryAction={{
            content: "Save Endpoint",
            onAction: handleEndpointSubmit,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowEndpointModal(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Odoo Sync Endpoint URL"
                value={endpointUrl}
                onChange={setEndpointUrl}
                placeholder="https://your-domain.com/api/odoo/sync/shopify-to-odoo"
                helpText="Enter the Odoo sync endpoint URL for Shopify to Odoo synchronization"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

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
            <Text variant="bodyMd">
              {sendMode === "all" 
                ? `This will sync all ${shopifyVariants?.length || 0} variants to Odoo.`
                : `This will sync ${selectedProducts.length} selected variants to Odoo.`
              }
            </Text>
            <div style={{ marginTop: "16px" }}>
              <Text variant="bodyMd">
                <strong>Odoo Sync Endpoint:</strong> {endpointUrl}
              </Text>
            </div>
          </Modal.Section>
        </Modal>
    </Page>
  );
}

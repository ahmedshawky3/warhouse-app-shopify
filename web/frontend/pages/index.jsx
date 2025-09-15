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
  const [endpointUrl, setEndpointUrl] = useState("https://95330e7d4198.ngrok-free.app/api/send-products");
  const [showEndpointModal, setShowEndpointModal] = useState(false);

  // Get Shopify products
  const { data: shopifyProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

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
      return await response.json();
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
    if (selectedProducts.length === shopifyProducts?.products?.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(shopifyProducts?.products?.map(p => p.id) || []);
    }
  }, [selectedProducts.length, shopifyProducts?.products]);

  const handleEndpointSubmit = useCallback(() => {
    if (endpointUrl.trim()) {
      setShowEndpointModal(false);
    }
  }, [endpointUrl]);

  const allSelected = selectedProducts.length === shopifyProducts?.products?.length && shopifyProducts?.products?.length > 0;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < shopifyProducts?.products?.length;

  const productRows = shopifyProducts?.products?.map((product) => [
    <Checkbox
      checked={selectedProducts.includes(product.id)}
      onChange={(checked) => handleProductSelection(product.id, checked)}
    />,
    <ResourceItem
      id={product.id}
      url="#"
      media={
        <Thumbnail
          source={product.image?.src || "https://via.placeholder.com/50"}
          alt={product.title}
        />
      }
    >
      <Text variant="bodyMd" fontWeight="bold" as="h3">
        {product.title}
      </Text>
      <div>{product.vendor}</div>
    </ResourceItem>,
    product.variants?.length || 0,
    `$${product.variants?.[0]?.price || "0.00"}`,
    <Badge status={product.status === "active" ? "success" : "warning"}>
      {product.status}
    </Badge>,
  ]) || [];

  return (
    <Page narrowWidth>
      <TitleBar title="Send Products" />
      <Layout>
        {/* Header */}
        <Layout.Section>
          <LegacyCard sectioned>
            <VerticalStack gap="4" alignment="center">
              <div>
                <DisplayText size="medium">Shopify to Odoo Sync</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Sync your Shopify products to Odoo warehouse management
                </Text>
              </div>
              <ButtonGroup>
                <Button onClick={() => setShowEndpointModal(true)}>
                  Configure Endpoint
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
                ? `Products will be synced to Odoo via: ${endpointUrl}`
                : "Please configure an Odoo sync endpoint URL."
              }
            </Text>
          </Banner>
        </Layout.Section>

        {/* Product Count */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <LegacyCard sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Products
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {shopifyProducts?.products?.length || 0}
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
                    Selected Products
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
          <LegacyCard title="Send Products" sectioned>
            <VerticalStack gap="4">
              <div>
                <Subheading>Choose what to sync</Subheading>
                <Text variant="bodyMd">
                  Sync all products or select specific ones to sync to Odoo warehouse management.
                </Text>
              </div>
              
              <VerticalStack gap="4">
                <Button 
                  primary 
                  size="large"
                  onClick={handleSendAll}
                  disabled={!endpointUrl || sendInProgress || !shopifyProducts?.products?.length}
                >
                  {sendInProgress ? "Syncing..." : "Sync All Products to Odoo"}
                </Button>
                <Button 
                  size="large"
                  onClick={handleSendSelected}
                  disabled={!endpointUrl || sendInProgress || selectedProducts.length === 0}
                >
                  Sync Selected Products to Odoo ({selectedProducts.length})
                </Button>
              </VerticalStack>

              {sendInProgress && (
                <div>
                  <Text variant="bodyMd">Syncing products to Odoo...</Text>
                  <ProgressBar progress={75} />
                </div>
              )}
            </VerticalStack>
          </LegacyCard>
        </Layout.Section>

        {/* Product List */}
        <Layout.Section>
          <LegacyCard title="Products" sectioned>
            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
            ) : shopifyProducts?.products?.length > 0 ? (
              <VerticalStack gap="4">
                <Stack distribution="equalSpacing" alignment="center">
                  <Text variant="headingMd">Select Products</Text>
                  <Button onClick={handleSelectAll}>
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
            </Stack>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text"]}
                  headings={["Select", "Product", "Variants", "Price", "Status"]}
                  rows={productRows}
                />
              </VerticalStack>
            ) : (
              <EmptyState
                heading="No products found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>No products are available in your store.</p>
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
                    <strong>Products Sent:</strong> {sendResults.results?.sent || 0}
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
              ? `This will sync all ${shopifyProducts?.products?.length || 0} products to Odoo.`
              : `This will sync ${selectedProducts.length} selected products to Odoo.`
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

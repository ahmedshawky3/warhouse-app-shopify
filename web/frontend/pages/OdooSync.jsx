import {
  Card,
  Page,
  Layout,
  TextContainer,
  Text,
  Stack,
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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";

export default function OdooSync() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [syncModalActive, setSyncModalActive] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  // Test Odoo connection
  const { data: connectionTest, isLoading: connectionLoading, refetch: testConnection } = useQuery({
    queryKey: ["odoo-connection"],
    queryFn: async () => {
      const response = await fetch("/api/odoo/test-connection");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Get sync status
  const { data: syncStatus, isLoading: statusLoading, refetch: refreshStatus } = useQuery({
    queryKey: ["odoo-sync-status"],
    queryFn: async () => {
      const response = await fetch("/api/odoo/sync-status");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Get Shopify products
  const { data: shopifyProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["shopify-products"],
    queryFn: async () => {
      const response = await fetch("/api/odoo/shopify-products");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  // Sync all products mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/odoo/sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setSyncResults(data);
      setSyncInProgress(false);
      setSyncModalActive(false);
      queryClient.invalidateQueries(["odoo-sync-status"]);
    },
    onError: (error) => {
      console.error("Sync error:", error);
      setSyncInProgress(false);
    },
  });

  const handleSyncAll = useCallback(() => {
    setSyncModalActive(true);
  }, []);

  const handleConfirmSync = useCallback(() => {
    setSyncInProgress(true);
    syncAllMutation.mutate();
  }, [syncAllMutation]);

  const handleCancelSync = useCallback(() => {
    setSyncModalActive(false);
  }, []);

  const handleTestConnection = useCallback(() => {
    testConnection();
  }, [testConnection]);

  const handleRefreshStatus = useCallback(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Mock sync history data
  const syncHistory = [
    {
      id: "1",
      date: "2024-01-15 10:30:00",
      type: "Full Sync",
      status: "Success",
      productsCreated: 15,
      productsUpdated: 8,
      errors: 0,
    },
    {
      id: "2",
      date: "2024-01-14 14:20:00",
      type: "Full Sync",
      status: "Success",
      productsCreated: 3,
      productsUpdated: 12,
      errors: 1,
    },
    {
      id: "3",
      date: "2024-01-13 09:15:00",
      type: "Full Sync",
      status: "Failed",
      productsCreated: 0,
      productsUpdated: 0,
      errors: 5,
    },
  ];

  const historyRows = syncHistory.map((sync) => [
    sync.date,
    sync.type,
    <Badge status={sync.status === "Success" ? "success" : "critical"}>
      {sync.status}
    </Badge>,
    sync.productsCreated,
    sync.productsUpdated,
    sync.errors,
  ]);

  return (
    <Page narrowWidth>
      <TitleBar title="Odoo Sync" />
      <Layout>
        {/* Connection Status */}
        <Layout.Section>
          <Card sectioned>
            <Stack distribution="equalSpacing" alignment="center">
              <div>
                <DisplayText size="medium">Odoo Integration</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Sync your Shopify products with Odoo warehouse management
                </Text>
              </div>
              <ButtonGroup>
                <Button onClick={handleTestConnection} loading={connectionLoading}>
                  Test Connection
                </Button>
                <Button onClick={handleRefreshStatus} loading={statusLoading}>
                  Refresh Status
                </Button>
              </ButtonGroup>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Connection Status Banner */}
        {connectionTest && (
          <Layout.Section>
            <Banner
              status={connectionTest.success ? "success" : "critical"}
              title={connectionTest.success ? "Connected to Odoo" : "Connection Failed"}
            >
              <Text variant="bodyMd">{connectionTest.message}</Text>
            </Banner>
          </Layout.Section>
        )}

        {/* Sync Status Cards */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Shopify Products
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {syncStatus?.productCounts?.shopify || 0}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Total products in store
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Odoo Products
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {syncStatus?.productCounts?.odoo || 0}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    Synced products in Odoo
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Sync Status
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {syncStatus?.productCounts?.shopify === syncStatus?.productCounts?.odoo ? "✅" : "⚠️"}
                  </Text>
                  <Text variant="bodyMd" color="subdued">
                    {syncStatus?.productCounts?.shopify === syncStatus?.productCounts?.odoo ? "In Sync" : "Needs Sync"}
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Sync Actions */}
        <Layout.Section>
          <Card title="Sync Actions" sectioned>
            <Stack vertical spacing="loose">
              <div>
                <Subheading>Product Synchronization</Subheading>
                <Text variant="bodyMd">
                  Sync all products from your Shopify store to Odoo warehouse management system.
                </Text>
              </div>
              
              <Stack distribution="fillEvenly">
                <Button 
                  primary 
                  size="large"
                  onClick={handleSyncAll}
                  disabled={!connectionTest?.success || syncInProgress}
                >
                  {syncInProgress ? "Syncing..." : "Sync All Products"}
                </Button>
                <Button 
                  size="large"
                  disabled={!connectionTest?.success}
                >
                  Sync Selected Products
                </Button>
                <Button 
                  size="large"
                  disabled={!connectionTest?.success}
                >
                  Schedule Auto Sync
                </Button>
              </Stack>

              {syncInProgress && (
                <div>
                  <Text variant="bodyMd">Syncing products to Odoo...</Text>
                  <ProgressBar progress={75} />
                </div>
              )}
            </Stack>
          </Card>
        </Layout.Section>

        {/* Sync Results */}
        {syncResults && (
          <Layout.Section>
            <Card title="Last Sync Results" sectioned>
              <Stack vertical spacing="loose">
                <div>
                  <Text variant="bodyMd">
                    <strong>Products Created:</strong> {syncResults.results?.created || 0}
                  </Text>
                </div>
                <div>
                  <Text variant="bodyMd">
                    <strong>Products Updated:</strong> {syncResults.results?.updated || 0}
                  </Text>
                </div>
                <div>
                  <Text variant="bodyMd">
                    <strong>Errors:</strong> {syncResults.results?.errors || 0}
                  </Text>
                </div>
                {syncResults.results?.errorDetails?.length > 0 && (
                  <div>
                    <Text variant="bodyMd" color="critical">
                      <strong>Error Details:</strong>
                    </Text>
                    <List type="bullet">
                      {syncResults.results.errorDetails.map((error, index) => (
                        <List.Item key={index}>
                          {error.product}: {error.error}
                        </List.Item>
                      ))}
                    </List>
                  </div>
                )}
              </Stack>
            </Card>
          </Layout.Section>
        )}

        {/* Sync History */}
        <Layout.Section>
          <Card title="Sync History" sectioned>
            <DataTable
              columnContentTypes={["text", "text", "text", "numeric", "numeric", "numeric"]}
              headings={["Date", "Type", "Status", "Created", "Updated", "Errors"]}
              rows={historyRows}
            />
          </Card>
        </Layout.Section>

        {/* Odoo Configuration */}
        <Layout.Section>
          <Card title="Odoo Configuration" sectioned>
            <Stack vertical spacing="loose">
              <div>
                <Text variant="bodyMd">
                  <strong>Odoo URL:</strong> https://warehouse5.odoo.com
                </Text>
              </div>
              <div>
                <Text variant="bodyMd">
                  <strong>Database:</strong> warehouse5
                </Text>
              </div>
              <div>
                <Text variant="bodyMd">
                  <strong>Email:</strong> ahmed.shawkiy123@gmail.com
                </Text>
              </div>
              <div>
                <Text variant="bodyMd" color="subdued">
                  Configuration is managed automatically through the app settings.
                </Text>
              </div>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Sync Confirmation Modal */}
      <Modal
        open={syncModalActive}
        onClose={handleCancelSync}
        title="Confirm Product Sync"
        primaryAction={{
          content: "Start Sync",
          onAction: handleConfirmSync,
          loading: syncInProgress,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleCancelSync,
          },
        ]}
      >
        <Modal.Section>
          <Text variant="bodyMd">
            This will sync all products from your Shopify store to Odoo. 
            This process may take a few minutes depending on the number of products.
          </Text>
          <div style={{ marginTop: "16px" }}>
            <Text variant="bodyMd">
              <strong>Products to sync:</strong> {syncStatus?.productCounts?.shopify || 0}
            </Text>
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

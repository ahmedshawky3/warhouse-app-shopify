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
  List,
  Link,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function Admin() {
  const { t } = useTranslation();
  const shopify = useAppBridge();

  const handleOpenAdmin = () => {
    // This will open the Shopify admin in the same window
    window.location.href = "/admin";
  };

  const handleOpenProducts = () => {
    // This will open the products page in the admin
    window.location.href = "/admin/products";
  };

  const handleOpenOrders = () => {
    // This will open the orders page in the admin
    window.location.href = "/admin/orders";
  };

  return (
    <Page narrowWidth>
      <TitleBar title="Admin Interface" />
      <Layout>
        {/* Welcome Banner */}
        <Layout.Section>
          <Banner status="info">
            <Text variant="bodyMd">
              Welcome to your Shopify Admin App! This app provides enhanced functionality for managing your store.
            </Text>
          </Banner>
        </Layout.Section>

        {/* Main Content */}
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <div>
                <DisplayText size="medium">Admin Dashboard</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Access your store management tools and analytics
                </Text>
              </div>

              <Stack distribution="fillEvenly">
                <Button 
                  primary 
                  onClick={handleOpenAdmin}
                  size="large"
                >
                  Open Shopify Admin
                </Button>
                <Button 
                  onClick={handleOpenProducts}
                  size="large"
                >
                  Manage Products
                </Button>
                <Button 
                  onClick={handleOpenOrders}
                  size="large"
                >
                  View Orders
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card title="Quick Actions" sectioned>
            <Stack vertical spacing="loose">
              <div>
                <Subheading>Store Management</Subheading>
                <List type="bullet">
                  <List.Item>View and manage products</List.Item>
                  <List.Item>Process orders and fulfillments</List.Item>
                  <List.Item>Manage customer information</List.Item>
                  <List.Item>View analytics and reports</List.Item>
                </List>
              </div>

              <div>
                <Subheading>App Features</Subheading>
                <List type="bullet">
                  <List.Item>Enhanced product management</List.Item>
                  <List.Item>Advanced analytics dashboard</List.Item>
                  <List.Item>Custom settings and configuration</List.Item>
                  <List.Item>Automated workflows</List.Item>
                </List>
              </div>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Help Section */}
        <Layout.Section>
          <Card title="Need Help?" sectioned>
            <Stack vertical spacing="tight">
              <Text variant="bodyMd">
                If you're having trouble accessing the admin interface:
              </Text>
              <List type="bullet">
                <List.Item>Make sure you're logged into your Shopify store</List.Item>
                <List.Item>Check that the app has been properly installed</List.Item>
                <List.Item>Try refreshing the page</List.Item>
                <List.Item>Contact support if issues persist</List.Item>
              </List>
              <div style={{ marginTop: "16px" }}>
                <Link url="mailto:support@example.com" external>
                  Contact Support
                </Link>
              </div>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

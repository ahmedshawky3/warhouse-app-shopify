import {
  Card,
  Page,
  Layout,
  TextContainer,
  Text,
  Stack,
  Button,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  RangeSlider,
  Switch,
  Divider,
  Banner,
  List,
  Link,
  DisplayText,
  Subheading,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";

export default function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    appName: "Warehouse App Testing",
    description: "A comprehensive warehouse management app for Shopify stores",
    email: "admin@example.com",
    timezone: "America/New_York",
    currency: "USD",
    language: "en",
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    features: {
      autoSync: true,
      lowStockAlerts: true,
      orderTracking: true,
      analytics: true,
    },
    syncInterval: 15,
    maxProducts: 1000,
    enableDebugMode: false,
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        newSettings[parent] = { ...newSettings[parent], [child]: value };
      } else {
        newSettings[key] = value;
      }
      return newSettings;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    // Here you would typically make an API call to save settings
    console.log("Saving settings:", settings);
    setHasUnsavedChanges(false);
  }, [settings]);

  const handleReset = useCallback(() => {
    // Reset to default settings
    setSettings({
      appName: "Warehouse App Testing",
      description: "A comprehensive warehouse management app for Shopify stores",
      email: "admin@example.com",
      timezone: "America/New_York",
      currency: "USD",
      language: "en",
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
      features: {
        autoSync: true,
        lowStockAlerts: true,
        orderTracking: true,
        analytics: true,
      },
      syncInterval: 15,
      maxProducts: 1000,
      enableDebugMode: false,
    });
    setHasUnsavedChanges(false);
  }, []);

  return (
    <Page narrowWidth>
      <TitleBar title="Settings" />
      <Layout>
        {/* Header */}
        <Layout.Section>
          <Card sectioned>
            <Stack distribution="equalSpacing" alignment="center">
              <div>
                <DisplayText size="medium">App Settings</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Configure your app preferences and behavior
                </Text>
              </div>
              <Stack spacing="tight">
                <Button onClick={handleReset}>Reset to Defaults</Button>
                <Button 
                  primary 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  Save Changes
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Layout.Section>

        {hasUnsavedChanges && (
          <Layout.Section>
            <Banner status="info">
              You have unsaved changes. Don't forget to save your settings.
            </Banner>
          </Layout.Section>
        )}

        {/* General Settings */}
        <Layout.Section>
          <Card title="General Settings" sectioned>
            <FormLayout>
              <TextField
                label="App Name"
                value={settings.appName}
                onChange={(value) => handleSettingChange('appName', value)}
                placeholder="Enter app name"
              />
              <TextField
                label="Description"
                value={settings.description}
                onChange={(value) => handleSettingChange('description', value)}
                placeholder="Enter app description"
                multiline={3}
              />
              <TextField
                label="Admin Email"
                value={settings.email}
                onChange={(value) => handleSettingChange('email', value)}
                placeholder="Enter admin email"
                type="email"
              />
              <Select
                label="Timezone"
                options={[
                  { label: "Eastern Time (ET)", value: "America/New_York" },
                  { label: "Central Time (CT)", value: "America/Chicago" },
                  { label: "Mountain Time (MT)", value: "America/Denver" },
                  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
                  { label: "UTC", value: "UTC" },
                ]}
                value={settings.timezone}
                onChange={(value) => handleSettingChange('timezone', value)}
              />
              <Select
                label="Currency"
                options={[
                  { label: "US Dollar (USD)", value: "USD" },
                  { label: "Euro (EUR)", value: "EUR" },
                  { label: "British Pound (GBP)", value: "GBP" },
                  { label: "Canadian Dollar (CAD)", value: "CAD" },
                ]}
                value={settings.currency}
                onChange={(value) => handleSettingChange('currency', value)}
              />
              <Select
                label="Language"
                options={[
                  { label: "English", value: "en" },
                  { label: "Spanish", value: "es" },
                  { label: "French", value: "fr" },
                  { label: "German", value: "de" },
                ]}
                value={settings.language}
                onChange={(value) => handleSettingChange('language', value)}
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        {/* Notification Settings */}
        <Layout.Section>
          <Card title="Notification Preferences" sectioned>
            <FormLayout>
              <Checkbox
                label="Email Notifications"
                checked={settings.notifications.email}
                onChange={(checked) => handleSettingChange('notifications.email', checked)}
                helpText="Receive important updates via email"
              />
              <Checkbox
                label="Push Notifications"
                checked={settings.notifications.push}
                onChange={(checked) => handleSettingChange('notifications.push', checked)}
                helpText="Receive real-time notifications in your browser"
              />
              <Checkbox
                label="SMS Notifications"
                checked={settings.notifications.sms}
                onChange={(checked) => handleSettingChange('notifications.sms', checked)}
                helpText="Receive critical alerts via SMS"
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        {/* Feature Settings */}
        <Layout.Section>
          <Card title="Feature Settings" sectioned>
            <FormLayout>
              <Checkbox
                label="Auto Sync"
                checked={settings.features.autoSync}
                onChange={(checked) => handleSettingChange('features.autoSync', checked)}
                helpText="Automatically sync data with Shopify"
              />
              <Checkbox
                label="Low Stock Alerts"
                checked={settings.features.lowStockAlerts}
                onChange={(checked) => handleSettingChange('features.lowStockAlerts', checked)}
                helpText="Get notified when inventory is running low"
              />
              <Checkbox
                label="Order Tracking"
                checked={settings.features.orderTracking}
                onChange={(checked) => handleSettingChange('features.orderTracking', checked)}
                helpText="Track order status and fulfillment"
              />
              <Checkbox
                label="Analytics Dashboard"
                checked={settings.features.analytics}
                onChange={(checked) => handleSettingChange('features.analytics', checked)}
                helpText="Enable detailed analytics and reporting"
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        {/* Advanced Settings */}
        <Layout.Section>
          <Card title="Advanced Settings" sectioned>
            <FormLayout>
              <RangeSlider
                label={`Sync Interval: ${settings.syncInterval} minutes`}
                value={settings.syncInterval}
                onChange={(value) => handleSettingChange('syncInterval', value)}
                min={5}
                max={60}
                step={5}
                helpText="How often to sync data with Shopify"
              />
              <TextField
                label="Maximum Products"
                value={settings.maxProducts.toString()}
                onChange={(value) => handleSettingChange('maxProducts', parseInt(value) || 0)}
                placeholder="Enter maximum number of products"
                type="number"
                helpText="Maximum number of products to manage"
              />
              <Switch
                label="Debug Mode"
                checked={settings.enableDebugMode}
                onChange={(checked) => handleSettingChange('enableDebugMode', checked)}
                helpText="Enable detailed logging for troubleshooting"
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        {/* App Information */}
        <Layout.Section>
          <Card title="App Information" sectioned>
            <Stack vertical spacing="loose">
              <div>
                <Subheading>Version</Subheading>
                <Text variant="bodyMd">1.0.0</Text>
              </div>
              <div>
                <Subheading>Last Updated</Subheading>
                <Text variant="bodyMd">January 15, 2024</Text>
              </div>
              <div>
                <Subheading>Support</Subheading>
                <Text variant="bodyMd">
                  Need help? Contact our support team at{" "}
                  <Link url="mailto:support@example.com">support@example.com</Link>
                </Text>
              </div>
              <div>
                <Subheading>Documentation</Subheading>
                <Text variant="bodyMd">
                  <Link url="https://docs.example.com" external>
                    View our documentation
                  </Link>
                </Text>
              </div>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

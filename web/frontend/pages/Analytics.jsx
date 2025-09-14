import {
  Card,
  Page,
  Layout,
  TextContainer,
  Text,
  Stack,
  Button,
  DataTable,
  Badge,
  DisplayText,
  Subheading,
  ProgressBar,
  Icon,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Analytics() {
  const { t } = useTranslation();
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");

  // Mock analytics data
  const analyticsData = {
    totalRevenue: 15420.50,
    totalOrders: 234,
    averageOrderValue: 65.90,
    conversionRate: 3.2,
    topProducts: [
      { name: "Wireless Headphones", sales: 45, revenue: 8995.50 },
      { name: "Smart Watch", sales: 32, revenue: 9596.80 },
      { name: "Coffee Maker", sales: 28, revenue: 4199.72 },
      { name: "Bluetooth Speaker", sales: 22, revenue: 2199.78 },
      { name: "Phone Case", sales: 18, revenue: 359.82 },
    ],
    salesByDay: [
      { day: "Mon", sales: 1200 },
      { day: "Tue", sales: 1900 },
      { day: "Wed", sales: 3000 },
      { day: "Thu", sales: 5000 },
      { day: "Fri", sales: 3000 },
      { day: "Sat", sales: 2000 },
      { day: "Sun", sales: 1320 },
    ],
    trafficSources: [
      { source: "Direct", percentage: 45, visitors: 1053 },
      { source: "Google", percentage: 30, visitors: 702 },
      { source: "Facebook", percentage: 15, visitors: 351 },
      { source: "Instagram", percentage: 10, visitors: 234 },
    ],
  };

  const timeRangeOptions = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
    { label: "Last year", value: "1y" },
  ];

  const topProductsRows = analyticsData.topProducts.map((product) => [
    product.name,
    product.sales,
    `$${product.revenue.toFixed(2)}`,
    <ProgressBar 
      progress={Math.round((product.sales / analyticsData.topProducts[0].sales) * 100)} 
      size="small" 
    />,
  ]);

  const trafficSourcesRows = analyticsData.trafficSources.map((source) => [
    source.source,
    source.visitors,
    `${source.percentage}%`,
    <ProgressBar 
      progress={source.percentage} 
      size="small" 
    />,
  ]);

  return (
    <Page narrowWidth>
      <TitleBar title="Analytics Dashboard" />
      <Layout>
        {/* Header with Time Range Selector */}
        <Layout.Section>
          <Card sectioned>
            <Stack distribution="equalSpacing" alignment="center">
              <div>
                <DisplayText size="medium">Analytics Overview</DisplayText>
                <Text variant="bodyMd" color="subdued">
                  Track your store performance and customer insights
                </Text>
              </div>
              <ButtonGroup>
                {timeRangeOptions.map((option) => (
                  <Button
                    key={option.value}
                    pressed={selectedTimeRange === option.value}
                    onClick={() => setSelectedTimeRange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Stack>
          </Card>
        </Layout.Section>

        {/* Key Metrics */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Revenue
                  </Text>
                  <Text variant="heading2xl" as="p">
                    ${analyticsData.totalRevenue.toLocaleString()}
                  </Text>
                  <Text variant="bodyMd" color="success">
                    +12.5% from last period
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneHalf>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Orders
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {analyticsData.totalOrders.toLocaleString()}
                  </Text>
                  <Text variant="bodyMd" color="success">
                    +8.2% from last period
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        <Layout.Section>
          <Layout>
            <Layout.Section oneHalf>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Average Order Value
                  </Text>
                  <Text variant="heading2xl" as="p">
                    ${analyticsData.averageOrderValue}
                  </Text>
                  <Text variant="bodyMd" color="success">
                    +5.1% from last period
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneHalf>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Conversion Rate
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {analyticsData.conversionRate}%
                  </Text>
                  <Text variant="bodyMd" color="success">
                    +0.3% from last period
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Top Products */}
        <Layout.Section>
          <Card title="Top Selling Products">
            <DataTable
              columnContentTypes={["text", "numeric", "text", "text"]}
              headings={["Product", "Sales", "Revenue", "Performance"]}
              rows={topProductsRows}
            />
          </Card>
        </Layout.Section>

        {/* Traffic Sources */}
        <Layout.Section>
          <Card title="Traffic Sources">
            <DataTable
              columnContentTypes={["text", "numeric", "text", "text"]}
              headings={["Source", "Visitors", "Percentage", "Share"]}
              rows={trafficSourcesRows}
            />
          </Card>
        </Layout.Section>

        {/* Sales Chart Placeholder */}
        <Layout.Section>
          <Card title="Sales Trend">
            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f6f6f7", borderRadius: "8px" }}>
              <Stack vertical alignment="center" spacing="tight">
                <Icon source="chart" />
                <Text variant="bodyMd" color="subdued">
                  Sales chart visualization would go here
                </Text>
                <Text variant="bodySm" color="subdued">
                  Integration with charting library like Chart.js or Recharts
                </Text>
              </Stack>
            </div>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card title="Quick Actions">
            <Stack distribution="fillEvenly">
              <Button>Export Report</Button>
              <Button>Schedule Report</Button>
              <Button>Set Goals</Button>
              <Button>View Detailed Analytics</Button>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

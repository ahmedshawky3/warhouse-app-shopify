import { Page, Layout, LegacyCard, Text, EmptyState } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

function NotFound() {
  return (
    <Page narrowWidth>
      <TitleBar title="Page Not Found" />
      <Layout>
        <Layout.Section>
          <LegacyCard sectioned>
            <EmptyState
              heading="Page not found"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>The page you're looking for doesn't exist.</p>
            </EmptyState>
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default NotFound;

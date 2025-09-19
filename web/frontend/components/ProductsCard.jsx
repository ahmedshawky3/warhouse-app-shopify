import { useState } from "react";
import { Card, Text, Button, BlockStack, InlineStack, Badge, SkeletonDisplayText } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";

export function ProductsCard() {
  const shopify = useAppBridge();
  const { t } = useTranslation();
  const [isPopulating, setIsPopulating] = useState(false);
  const productsCount = 5;

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
  } = useQuery({
    queryKey: ["productCount"],
    queryFn: async () => {
      const response = await fetch("/api/products/count");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  const setPopulating = (flag) => {
    shopify.loading(flag);
    setIsPopulating(flag);
  };

  const handlePopulate = async () => {
    setPopulating(true);
    const response = await fetch("/api/products", { method: "POST" });

    if (response.ok) {
      await refetchProductCount();

      shopify.toast.show(
        t("ProductsCard.productsCreatedToast", { count: productsCount })
      );
    } else {
      shopify.toast.show(t("ProductsCard.errorCreatingProductsToast"), {
        isError: true,
      });
    }

    setPopulating(false);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">{t("ProductsCard.title")}</Text>
          <Badge status="info">Sample Component</Badge>
        </InlineStack>
        
        <Text variant="bodyMd">{t("ProductsCard.description")}</Text>
        
        <BlockStack gap="200">
          <Text variant="headingMd">
            {t("ProductsCard.totalProductsHeading")}
          </Text>
          {isLoadingCount ? (
            <SkeletonDisplayText size="large" />
          ) : (
            <Text variant="heading2xl" fontWeight="semibold">
              {data?.count || 0}
            </Text>
          )}
        </BlockStack>
        
        <Button
          variant="primary"
          onClick={handlePopulate}
          loading={isPopulating}
          size="large"
        >
          {t("ProductsCard.populateProductsButton", {
            count: productsCount,
          })}
        </Button>
      </BlockStack>
    </Card>
  );
}

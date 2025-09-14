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
  EmptyState,
  ResourceList,
  ResourceItem,
  Avatar,
  ButtonGroup,
  Icon,
  Modal,
  TextField,
  FormLayout,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { useQuery } from "react-query";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState([]);
  const [modalActive, setModalActive] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
  });

  // Mock data for demonstration
  const mockProducts = [
    {
      id: "1",
      title: "Wireless Headphones",
      description: "High-quality wireless headphones with noise cancellation",
      price: "$199.99",
      category: "Electronics",
      status: "Active",
      stock: 25,
    },
    {
      id: "2",
      title: "Smart Watch",
      description: "Fitness tracking smart watch with heart rate monitor",
      price: "$299.99",
      category: "Electronics",
      status: "Active",
      stock: 15,
    },
    {
      id: "3",
      title: "Coffee Maker",
      description: "Automatic coffee maker with programmable settings",
      price: "$149.99",
      category: "Appliances",
      status: "Draft",
      stock: 8,
    },
  ];

  const mockOrders = [
    {
      id: "1001",
      customer: "John Doe",
      total: "$299.99",
      status: "Fulfilled",
      date: "2024-01-15",
    },
    {
      id: "1002",
      customer: "Jane Smith",
      total: "$199.99",
      status: "Processing",
      date: "2024-01-14",
    },
    {
      id: "1003",
      customer: "Bob Johnson",
      total: "$149.99",
      status: "Pending",
      date: "2024-01-13",
    },
  ];

  const { data: productCount } = useQuery({
    queryKey: ["productCount"],
    queryFn: async () => {
      const response = await fetch("/api/products/count");
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  const handleSelectionChange = useCallback((selected) => {
    setSelectedItems(selected);
  }, []);

  const handleModalToggle = useCallback(() => {
    setModalActive(!modalActive);
  }, [modalActive]);

  const handleNewProductChange = useCallback((field) => (value) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateProduct = useCallback(() => {
    // Here you would typically make an API call to create the product
    console.log("Creating product:", newProduct);
    setNewProduct({ title: "", description: "", price: "", category: "" });
    setModalActive(false);
  }, [newProduct]);

  const productRows = mockProducts.map((product) => [
    product.title,
    product.description,
    product.price,
    product.category,
    <Badge status={product.status === "Active" ? "success" : "warning"}>
      {product.status}
    </Badge>,
    product.stock,
    <ButtonGroup>
      <Button size="slim">Edit</Button>
      <Button size="slim" destructive>
        Delete
      </Button>
    </ButtonGroup>,
  ]);

  const orderRows = mockOrders.map((order) => [
    order.id,
    order.customer,
    order.total,
    <Badge status={
      order.status === "Fulfilled" ? "success" : 
      order.status === "Processing" ? "info" : "warning"
    }>
      {order.status}
    </Badge>,
    order.date,
  ]);

  return (
    <Page narrowWidth>
      <TitleBar title="Admin Dashboard" />
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <Layout>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Products
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {productCount?.count || 0}
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Total Orders
                  </Text>
                  <Text variant="heading2xl" as="p">
                    {mockOrders.length}
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
            <Layout.Section oneThird>
              <Card sectioned>
                <TextContainer>
                  <Text variant="headingMd" as="h3">
                    Revenue
                  </Text>
                  <Text variant="heading2xl" as="p">
                    $649.97
                  </Text>
                </TextContainer>
              </Card>
            </Layout.Section>
          </Layout>
        </Layout.Section>

        {/* Products Section */}
        <Layout.Section>
          <Card
            title="Products Management"
            actions={[
              {
                content: "Add Product",
                onAction: handleModalToggle,
              },
            ]}
          >
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "text",
                "text",
                "text",
                "numeric",
                "text",
              ]}
              headings={[
                "Title",
                "Description",
                "Price",
                "Category",
                "Status",
                "Stock",
                "Actions",
              ]}
              rows={productRows}
              selectable
              onSelectionChange={handleSelectionChange}
            />
          </Card>
        </Layout.Section>

        {/* Orders Section */}
        <Layout.Section>
          <Card title="Recent Orders">
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text"]}
              headings={["Order ID", "Customer", "Total", "Status", "Date"]}
              rows={orderRows}
            />
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card title="Quick Actions">
            <Stack distribution="fillEvenly">
              <Button>View Analytics</Button>
              <Button>Export Data</Button>
              <Button>Settings</Button>
              <Button>Help & Support</Button>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Add Product Modal */}
      <Modal
        open={modalActive}
        onClose={handleModalToggle}
        title="Add New Product"
        primaryAction={{
          content: "Create Product",
          onAction: handleCreateProduct,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleModalToggle,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Product Title"
              value={newProduct.title}
              onChange={handleNewProductChange("title")}
              placeholder="Enter product title"
            />
            <TextField
              label="Description"
              value={newProduct.description}
              onChange={handleNewProductChange("description")}
              placeholder="Enter product description"
              multiline={3}
            />
            <TextField
              label="Price"
              value={newProduct.price}
              onChange={handleNewProductChange("price")}
              placeholder="Enter price"
              prefix="$"
            />
            <Select
              label="Category"
              options={[
                { label: "Electronics", value: "electronics" },
                { label: "Appliances", value: "appliances" },
                { label: "Clothing", value: "clothing" },
                { label: "Books", value: "books" },
              ]}
              value={newProduct.category}
              onChange={handleNewProductChange("category")}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

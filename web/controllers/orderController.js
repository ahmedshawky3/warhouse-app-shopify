// @ts-nocheck
import shopify from "../shopify.js";

/**
 * Get orders for the dashboard
 */
export const getOrders = async (req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const response = await client.request(`
      query getOrders($first: Int!) {
        orders(first: $first) {
          edges {
            node {
              id
              name
              email
              totalPrice
              fulfillmentStatus
              createdAt
              customer {
                firstName
                lastName
                email
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      sku
                      price
                    }
                    product {
                      id
                      title
                      productType
                      vendor
                    }
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: { first: 20 }
    });

    const orders = response.data.orders.edges.map(edge => {
      // Calculate total item count from line items
      const totalItems = edge.node.lineItems.edges.reduce((sum, item) => {
        return sum + item.node.quantity;
      }, 0);

      return {
        id: edge.node.name,
        customer: edge.node.customer ? 
          `${edge.node.customer.firstName} ${edge.node.customer.lastName}` : 
          'Guest Customer',
        total: `$${parseFloat(edge.node.totalPrice).toFixed(2)}`,
        status: edge.node.fulfillmentStatus || 'UNFULFILLED',
        date: new Date(edge.node.createdAt).toLocaleDateString(),
        itemCount: totalItems,
        lineItems: edge.node.lineItems.edges.map(item => ({
          id: item.node.id,
          title: item.node.title,
          quantity: item.node.quantity,
          variant: item.node.variant ? {
            id: item.node.variant.id,
            title: item.node.variant.title,
            sku: item.node.variant.sku,
            price: item.node.variant.price
          } : null,
          product: item.node.product ? {
            id: item.node.product.id,
            title: item.node.product.title,
            productType: item.node.product.productType,
            vendor: item.node.product.vendor
          } : null
        }))
      };
    });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.total.replace('$', ''));
    }, 0);

    res.status(200).json({
      success: true,
      orders: orders,
      count: orders.length,
      totalRevenue: totalRevenue.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Sync orders to external API
 */
export const syncOrders = async (req, res) => {
  try {
    const { endpoint, sendMode = "all", selectedOrderIds = [] } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint URL is required'
      });
    }

    // Check if session exists
    if (!res.locals.shopify?.session) {
      console.error('No Shopify session found');
      return res.status(401).json({
        success: false,
        message: 'No authenticated session found',
        error: 'Authentication required'
      });
    }

    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    let ordersToSend = [];
    
    if (sendMode === "all") {
      // Get all orders with detailed information
      const response = await client.request(`
        query getOrders($first: Int!) {
          orders(first: $first) {
            edges {
              node {
                id
                name
                email
                totalPrice
                subtotalPrice
                totalTax
                totalShipping
                currencyCode
                fulfillmentStatus
                financialStatus
                processedAt
                createdAt
                updatedAt
                customer {
                  id
                  firstName
                  lastName
                  email
                  phone
                }
                shippingAddress {
                  firstName
                  lastName
                  company
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                billingAddress {
                  firstName
                  lastName
                  company
                  address1
                  address2
                  city
                  province
                  country
                  zip
                  phone
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      variant {
                        id
                        title
                        sku
                        price
                      }
                      product {
                        id
                        title
                        productType
                        vendor
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { first: 50 }
      });

      ordersToSend = response.data.orders.edges.map(edge => edge.node);
    } else if (sendMode === "selected" && selectedOrderIds && selectedOrderIds.length > 0) {
      // Get selected orders by IDs
      const orderIds = selectedOrderIds.map(id => `"${id}"`).join(',');
      
      const response = await client.request(`
        query getOrders($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Order {
              id
              name
              email
              totalPrice
              subtotalPrice
              totalTax
              totalShipping
              currencyCode
              fulfillmentStatus
              financialStatus
              processedAt
              createdAt
              updatedAt
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              shippingAddress {
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              billingAddress {
                firstName
                lastName
                company
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              lineItems(first: 100) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      sku
                      price
                    }
                    product {
                      id
                      title
                      productType
                      vendor
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { ids: selectedOrderIds }
      });

      ordersToSend = response.data.nodes.filter(node => node !== null);
    } else {
      return res.status(400).json({
        success: false,
        message: 'No orders to sync'
      });
    }

    if (ordersToSend.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found to sync'
      });
    }

    // Send orders to the external endpoint
    console.log(`Sending ${ordersToSend.length} orders to ${endpoint}`);
    
    try {
      const payload = { 
        // Sync parameters
        dryRun: false,
        limit: ordersToSend.length,
        skipExisting: true,
        updateExisting: false,
        
        // Order data - try different field names
        orders: ordersToSend,
        data: ordersToSend,
        orderData: ordersToSend,
        
        // Metadata
        timestamp: new Date().toISOString(),
        source: 'shopify-app',
        shopDomain: res.locals.shopify.session.shop,
        syncType: sendMode,
        orderCount: ordersToSend.length,
        
        // Shopify session info for your service
        shopifySession: {
          shop: res.locals.shopify.session.shop,
          accessToken: res.locals.shopify.session.accessToken,
          scope: res.locals.shopify.session.scope
        }
      };

      console.log('Sending orders payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Orders endpoint error response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Orders sent successfully:', result);

      return res.status(200).json({
        success: true,
        results: {
          sent: ordersToSend.length,
          success: ordersToSend.length,
          errors: 0,
          errorDetails: [],
          response: result
        }
      });
    } catch (fetchError) {
      console.error('Error sending orders to endpoint:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send orders to endpoint',
        error: fetchError.message,
        endpoint: endpoint,
        orderCount: ordersToSend.length
      });
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error.message
    });
  }
};

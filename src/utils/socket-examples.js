/**
 * Socket.io Integration Examples for Ambika Empire Desktop App
 * 
 * This file demonstrates how to use Socket.io for real-time synchronization
 * between the Electron desktop app and web clients (Next.js).
 * 
 * Usage:
 * 1. Include this file in your HTML: <script src="../../utils/socket-examples.js"></script>
 * 2. Call socket methods from your page scripts
 * 3. Listen for updates via window API
 */

// ============================================
// EXAMPLE 1: Emit Order Events
// ============================================
class OrderSocketExample {
  static async createOrderWithSync(orderData) {
    console.log('Creating order with Socket.io sync...');
    
    try {
      // Create order in local database first
      const order = await window.api.createOrder(orderData);
      console.log('Order created locally:', order);
      
      // Emit to Socket.io for real-time sync to web clients
      const result = await window.api.socketEmit('order-created', {
        ...order,
        timestamp: new Date(),
        source: 'electron'
      });
      
      if (result.success) {
        console.log('Order synced to web clients');
        return { success: true, order };
      }
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateOrderWithSync(orderId, updates) {
    console.log('Updating order with Socket.io sync...');
    
    try {
      // Update in local database
      const order = await window.api.updateOrder(orderId, updates);
      console.log('Order updated locally:', order);
      
      // Emit update to Socket.io
      await window.api.socketEmit('order-updated', {
        ...order,
        timestamp: new Date(),
        source: 'electron'
      });
      
      console.log('Order update synced to web clients');
      return { success: true, order };
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }
  }

  static listenForOrderUpdates() {
    console.log('Listening for order updates from web clients...');
    
    // Listen for orders created from web
    window.api.onSocketOrderCreated((order) => {
      console.log('Order from web client:', order);
      // Update UI, refresh table, etc.
      const event = new CustomEvent('remoteOrderCreated', { detail: order });
      window.dispatchEvent(event);
    });
    
    // Listen for order updates from web
    window.api.onSocketOrderUpdated((order) => {
      console.log('Order updated from web client:', order);
      const event = new CustomEvent('remoteOrderUpdated', { detail: order });
      window.dispatchEvent(event);
    });
  }
}

// ============================================
// EXAMPLE 2: Emit Inventory Events
// ============================================
class InventorySocketExample {
  static async updateInventoryWithSync(productId, quantity) {
    console.log('Updating inventory with Socket.io sync...');
    
    try {
      const inventory = await window.api.updateInventory({
        productId,
        quantity,
        timestamp: new Date()
      });
      
      // Emit to all connected clients
      await window.api.socketEmit('inventory-updated', {
        productId,
        quantity,
        timestamp: new Date(),
        source: 'electron'
      });
      
      console.log('Inventory update synced');
      return { success: true, inventory };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return { success: false, error: error.message };
    }
  }

  static listenForInventoryUpdates() {
    console.log('Listening for inventory updates from web clients...');
    
    window.api.onSocketInventoryUpdated((data) => {
      console.log('Inventory updated from web:', data);
      // Refresh inventory display
      const event = new CustomEvent('inventoryUpdated', { detail: data });
      window.dispatchEvent(event);
    });
    
    // Listen for stock alerts
    window.api.onSocketStockAlert((alert) => {
      console.log('Stock alert from web:', alert);
      // Show notification
      showNotification(`Low stock alert: ${alert.productId}`);
    });
  }
}

// ============================================
// EXAMPLE 3: Emit Customer Events
// ============================================
class CustomerSocketExample {
  static async addCustomerWithSync(customerData) {
    console.log('Adding customer with Socket.io sync...');
    
    try {
      const customer = await window.api.addCustomer(customerData);
      console.log('Customer added locally:', customer);
      
      await window.api.socketEmit('customer-added', {
        ...customer,
        timestamp: new Date(),
        source: 'electron'
      });
      
      console.log('Customer synced to web clients');
      return { success: true, customer };
    } catch (error) {
      console.error('Error adding customer:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateCustomerWithSync(customerId, updates) {
    console.log('Updating customer with Socket.io sync...');
    
    try {
      const customer = await window.api.updateCustomer(customerId, updates);
      
      await window.api.socketEmit('customer-updated', {
        ...customer,
        timestamp: new Date(),
        source: 'electron'
      });
      
      console.log('Customer update synced');
      return { success: true, customer };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, error: error.message };
    }
  }

  static listenForCustomerUpdates() {
    window.api.onSocketCustomerAdded((customer) => {
      console.log('Customer added from web:', customer);
      const event = new CustomEvent('remoteCustomerAdded', { detail: customer });
      window.dispatchEvent(event);
    });
    
    window.api.onSocketCustomerUpdated((customer) => {
      console.log('Customer updated from web:', customer);
      const event = new CustomEvent('remoteCustomerUpdated', { detail: customer });
      window.dispatchEvent(event);
    });
  }
}

// ============================================
// EXAMPLE 4: Emit Vendor Events
// ============================================
class VendorSocketExample {
  static async addVendorWithSync(vendorData) {
    try {
      const vendor = await window.api.addVendor(vendorData);
      
      await window.api.socketEmit('vendor-added', {
        ...vendor,
        timestamp: new Date(),
        source: 'electron'
      });
      
      return { success: true, vendor };
    } catch (error) {
      console.error('Error adding vendor:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateVendorWithSync(vendorId, updates) {
    try {
      const vendor = await window.api.updateVendor(vendorId, updates);
      
      await window.api.socketEmit('vendor-updated', {
        ...vendor,
        timestamp: new Date(),
        source: 'electron'
      });
      
      return { success: true, vendor };
    } catch (error) {
      console.error('Error updating vendor:', error);
      return { success: false, error: error.message };
    }
  }

  static listenForVendorUpdates() {
    window.api.onSocketVendorAdded((vendor) => {
      console.log('Vendor added from web:', vendor);
      const event = new CustomEvent('remoteVendorAdded', { detail: vendor });
      window.dispatchEvent(event);
    });
    
    window.api.onSocketVendorUpdated((vendor) => {
      console.log('Vendor updated from web:', vendor);
      const event = new CustomEvent('remoteVendorUpdated', { detail: vendor });
      window.dispatchEvent(event);
    });
  }
}

// ============================================
// EXAMPLE 5: Emit Product Events
// ============================================
class ProductSocketExample {
  static async addProductWithSync(productData) {
    try {
      const product = await window.api.addProduct(productData);
      
      await window.api.socketEmit('product-added', {
        ...product,
        timestamp: new Date(),
        source: 'electron'
      });
      
      return { success: true, product };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, error: error.message };
    }
  }

  static listenForProductUpdates() {
    window.api.onSocketProductAdded((product) => {
      console.log('Product added from web:', product);
      const event = new CustomEvent('remoteProductAdded', { detail: product });
      window.dispatchEvent(event);
    });
    
    window.api.onSocketProductUpdated((product) => {
      console.log('Product updated from web:', product);
      const event = new CustomEvent('remoteProductUpdated', { detail: product });
      window.dispatchEvent(event);
    });
  }
}

// ============================================
// EXAMPLE 6: Check Socket.io Connection Status
// ============================================
class SocketConnectionExample {
  static async getStatus() {
    try {
      const status = await window.api.socketStatus();
      console.log('Socket.io Status:', status);
      return status;
    } catch (error) {
      console.error('Error getting socket status:', error);
      return null;
    }
  }

  static listenForConnectionChanges() {
    window.api.onSocketClientStatus((status) => {
      console.log('Socket.io client status changed:', status);
      
      // Update UI to show connection status
      const statusEl = document.getElementById('socket-status');
      if (statusEl) {
        if (status.electronConnected) {
          statusEl.textContent = '🟢 Connected';
          statusEl.className = 'status connected';
        } else {
          statusEl.textContent = '🔴 Disconnected';
          statusEl.className = 'status disconnected';
        }
        statusEl.title = `${status.totalClients} clients connected`;
      }
    });
  }
}

// ============================================
// EXAMPLE 7: HTML Integration
// ============================================
/*
HTML Example in your page:

<div id="socket-status">🔴 Disconnected</div>

<button onclick="handleCreateOrder()">Create Order with Sync</button>

<script>
  // Initialize Socket.io listeners when page loads
  window.addEventListener('DOMContentLoaded', () => {
    // Set up order listeners
    OrderSocketExample.listenForOrderUpdates();
    
    // Set up inventory listeners
    InventorySocketExample.listenForInventoryUpdates();
    
    // Set up customer listeners
    CustomerSocketExample.listenForCustomerUpdates();
    
    // Set up vendor listeners
    VendorSocketExample.listenForVendorUpdates();
    
    // Set up product listeners
    ProductSocketExample.listenForProductUpdates();
    
    // Set up connection status monitoring
    SocketConnectionExample.listenForConnectionChanges();
    SocketConnectionExample.getStatus();
  });
  
  // Listen for custom events from Socket.io updates
  window.addEventListener('remoteOrderCreated', (e) => {
    console.log('Remote order created, refreshing table...');
    // Refresh your orders table
    refreshOrdersTable();
  });
  
  async function handleCreateOrder() {
    const result = await OrderSocketExample.createOrderWithSync({
      customerId: 'CUST001',
      items: [/* ... /],
      total: 5000
    });
    
    if (result.success) {
      alert('Order created and synced!');
    } else {
      alert('Error: ' + result.error);
    }
  }
</script>
*/

// ============================================
// TROUBLESHOOTING TIPS
// ============================================
/*
1. SOCKET CONNECTION FAILS:
   - Ensure server is running: npm run server
   - Check if port 3000 is open
   - Verify localhost:3000 is accessible
   - Check browser console for CORS errors
   
2. EVENTS NOT RECEIVED:
   - Verify event name is spelled correctly (case-sensitive)
   - Check that listeners are registered before events are emitted
   - View console logs to see if events are being emitted
   
3. DEBUGGING:
   - Enable detailed logging in browser DevTools Console
   - Check main process console for Socket.io logs
   - Use window.api.socketStatus() to verify connection
   
4. COMMON ERRORS:
   - "Socket not connected" - Connection failed or dropped
   - "Cannot emit" - Listeners not yet registered
   - CORS errors - Check server-socket.js allowed origins
*/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OrderSocketExample,
    InventorySocketExample,
    CustomerSocketExample,
    VendorSocketExample,
    ProductSocketExample,
    SocketConnectionExample
  };
}

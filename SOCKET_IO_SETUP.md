# Socket.io Real-Time Synchronization Setup Guide

## Overview

Socket.io has been successfully integrated into your Ambika Empire Desktop App for real-time data synchronization between:
- **Electron Desktop App** (Primary)
- **Express Server** (Relay)
- **Web Clients** (Next.js or PWA)

## Installation Complete

✅ **Socket.io packages installed:**
- `socket.io` (Server) - v4.7.2
- `socket.io-client` (Client) - v4.7.2

✅ **Files created:**
- `server-socket.js` - Socket.io server configuration
- `src/utils/socket-client.js` - Electron client
- `src/utils/socket-emitter.js` - Renderer process helper
- `src/utils/socket-examples.js` - Integration examples
- `SOCKET_IO_SETUP.md` - This documentation

✅ **Files updated:**
- `server.js` - Added Socket.io initialization
- `src/main.js` - Added Socket.io client connection
- `src/preload.js` - Added IPC handlers for Socket.io
- `package.json` - Added Socket.io dependencies

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Server (Port 3000)               │
│                    (server-socket.js)                       │
│                          ▲ ▼                                │
│                    Socket.io Relay                          │
└─────────────────────────────────────────────────────────────┘
                  ▲                            ▲
                  │                            │
        ┌─────────▼──────────┐      ┌─────────▼──────────┐
        │  Electron App      │      │  Web Clients       │
        │  (socket-client.js)│      │  (Next.js/PWA)     │
        │  Port: 3001        │      │  Port: 3000        │
        └────────────────────┘      └────────────────────┘
```

### Data Flow

1. **Electron creates/updates data** → Emits Socket.io event
2. **Server receives event** → Broadcasts to all connected clients
3. **Web clients receive update** → Update their UI
4. **Web updates data** → Emits Socket.io event  
5. **Electron receives update** → Updates local database
6. **MongoDB sync** → Data persisted to MongoDB

---

## Quick Start for Developers

### 1. Start the Server with Socket.io

```bash
npm run server
# Output:
# ========================================
# Server running at http://localhost:3000/
# Socket.io ready for real-time connections
# ========================================
```

### 2. Start Electron App

```bash
npm run dev
# Or with live reload:
npm run dev:all
```

### 3. The Socket.io Connection is Automatic

When Electron starts:
1. Connects to Express server
2. Registers as "electron" client
3. Starts listening for events from web clients
4. All data changes are broadcast in real-time

---

## Using Socket.io in Your Code

### In Electron Pages (HTML/JS)

#### Example 1: Emit Order Event

```javascript
// In your order creation handler
async function handleCreateOrder() {
  const orderData = {
    customerId: 'CUST001',
    items: [...],
    total: 5000
  };
  
  // Create order locally
  const order = await window.api.createOrder(orderData);
  
  // Emit to Socket.io for web sync
  await window.api.socketEmit('order-created', {
    ...order,
    timestamp: new Date()
  });
  
  console.log('Order created and synced!');
}
```

#### Example 2: Listen for Web Updates

```javascript
// Listen for orders created from web clients
window.api.onSocketOrderCreated((order) => {
  console.log('Order from web:', order);
  // Update your UI
  refreshOrdersTable();
});

// Listen for inventory updates from web
window.api.onSocketInventoryUpdated((inventory) => {
  console.log('Inventory updated from web:', inventory);
  updateInventoryDisplay();
});

// Listen for customer updates from web
window.api.onSocketCustomerAdded((customer) => {
  console.log('New customer from web:', customer);
  refreshCustomersList();
});
```

#### Example 3: Check Connection Status

```javascript
// Get current Socket.io status
const status = await window.api.socketStatus();
console.log(status);
// Output:
// {
//   connected: true,
//   socketId: "abc123xyz",
//   serverUrl: "http://localhost:3000"
// }

// Listen for connection status changes
window.api.onSocketClientStatus((status) => {
  console.log('Clients connected:', status.totalClients);
  console.log('Electron connected:', status.electronConnected);
  console.log('Web clients:', status.webClientsCount);
});
```

### Using the Example Helpers

Include `socket-examples.js` in your HTML:

```html
<script src="../../utils/socket-examples.js"></script>

<script>
  // Set up all listeners on page load
  window.addEventListener('DOMContentLoaded', () => {
    OrderSocketExample.listenForOrderUpdates();
    InventorySocketExample.listenForInventoryUpdates();
    CustomerSocketExample.listenForCustomerUpdates();
    VendorSocketExample.listenForVendorUpdates();
    SocketConnectionExample.listenForConnectionChanges();
  });
  
  // Create order with automatic sync
  async function createOrder() {
    const result = await OrderSocketExample.createOrderWithSync({
      customerId: 'CUST001',
      items: [...],
      total: 5000
    });
    
    if (result.success) {
      showNotification('Order created and synced!');
    }
  }
  
  // Listen for custom events
  window.addEventListener('remoteOrderCreated', (e) => {
    const order = e.detail;
    console.log('Remote order:', order);
    refreshOrdersTable();
  });
</script>
```

---

## Available Socket.io Events

### Order Events
- `order-created` - New order created
- `order-updated` - Order updated
- `order-deleted` - Order deleted

### Inventory Events
- `inventory-updated` - Stock quantity changed
- `stock-alert` - Low stock warning

### Customer Events
- `customer-added` - New customer added
- `customer-updated` - Customer info updated

### Vendor Events
- `vendor-added` - New vendor added
- `vendor-updated` - Vendor info updated

### Product Events
- `product-added` - New product added
- `product-updated` - Product info updated

### System Events
- `client-status` - Connection status changed
- `data-updated` - Generic data sync
- `sync-requested` - Full sync request

---

## API Reference

### Electron/Renderer Process API

```javascript
// Emit events (from window.api)
window.api.socketEmit(event, data)
  // Returns: Promise<{success: true}>

window.api.socketStatus()
  // Returns: {connected, socketId, serverUrl}

// Listen for events
window.api.onSocketOrderCreated(callback)
window.api.onSocketOrderUpdated(callback)
window.api.onSocketInventoryUpdated(callback)
window.api.onSocketStockAlert(callback)
window.api.onSocketCustomerAdded(callback)
window.api.onSocketCustomerUpdated(callback)
window.api.onSocketVendorAdded(callback)
window.api.onSocketVendorUpdated(callback)
window.api.onSocketProductAdded(callback)
window.api.onSocketProductUpdated(callback)
window.api.onSocketClientStatus(callback)
window.api.onSocketDataUpdated(callback)
```

---

## Troubleshooting

### Problem: "Socket not connected" Error

**Causes:**
1. Server is not running
2. Wrong server URL
3. Port 3000 is not accessible
4. Firewall blocking connection

**Solutions:**
```bash
# Check if server is running
npm run server

# Verify port 3000 is open
lsof -i :3000

# Test connection from command line
curl http://localhost:3000/health

# Check if you can reach it from another terminal
node -e "fetch('http://localhost:3000').then(r => console.log(r.status))"
```

### Problem: Events Emitted but Not Received

**Causes:**
1. Event name spelling mismatch (case-sensitive)
2. Listener registered after event sent
3. Listener not set up correctly

**Solutions:**
```javascript
// ✅ CORRECT - Event names MUST match exactly
window.api.socketEmit('order-created', data);     // Sender
window.api.onSocketOrderCreated(callback);        // Receiver

// ❌ WRONG - Event names don't match
window.api.socketEmit('orderCreated', data);      // Different case!
window.api.onSocketOrderCreated(callback);        // Won't receive

// ✅ Set up listeners BEFORE events are emitted
window.addEventListener('DOMContentLoaded', () => {
  window.api.onSocketOrderCreated((order) => {
    console.log('Order from web:', order);
  });
  
  // NOW safe to receive events
});
```

### Problem: CORS Errors

**Message:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:** Already configured in `server-socket.js`. If adding new origins, update:

```javascript
// server-socket.js
cors: {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://your-production-domain.com'  // Add here
  ],
  methods: ['GET', 'POST'],
  credentials: true
}
```

### Problem: Frequent Disconnections

**Solutions:**

1. **Increase reconnection attempts:**
```javascript
// Already optimized in socket-client.js
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
reconnectionAttempts: 5
```

2. **Check network stability:**
```javascript
// Monitor connection changes
window.addEventListener('online', () => {
  console.log('Connection restored');
  window.api.socketStatus();
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
});
```

### Problem: High CPU/Memory Usage

**Solutions:**
1. Don't create listeners in loops
2. Remove listeners when components unmount
3. Limit event emission frequency

```javascript
// ❌ Bad - Creates listener every time
function updateData() {
  window.api.onSocketOrderCreated((order) => { /* ... */ });
}

// ✅ Good - Set up once
window.addEventListener('DOMContentLoaded', () => {
  window.api.onSocketOrderCreated((order) => { /* ... */ });
});
```

---

## Debugging

### Enable Detailed Logging

**In browser console:**
```javascript
// Check Socket.io status
await window.api.socketStatus()

// Manually emit an event
await window.api.socketEmit('test-event', {hello: 'world'})

// Check console logs in DevTools for responses
```

**In main process console:**
- Socket.io logs all connections and events
- Look for `[Socket.io]` prefix
- Check for `[Electron Socket]` prefix

### View Real-Time Logs

```bash
# Terminal 1: Start server with verbose logging
npm run server

# Terminal 2: Start Electron
npm run dev

# All Socket.io events will be logged with timestamps
```

---

## Best Practices

1. **Always check connection before emitting:**
```javascript
const status = await window.api.socketStatus();
if (status.connected) {
  await window.api.socketEmit('event', data);
} else {
  console.warn('Socket not connected, using fallback');
}
```

2. **Handle events in error handling:**
```javascript
try {
  await window.api.socketEmit('order-created', order);
} catch (error) {
  console.error('Socket emit failed:', error);
  // Fallback behavior
}
```

3. **Update UI gradually:**
```javascript
window.api.onSocketInventoryUpdated((inventory) => {
  // Don't refresh entire table, update one item
  updateInventoryItem(inventory.productId, inventory.quantity);
});
```

4. **Avoid duplicate events:**
```javascript
// Track which client made the change
socket.emit('order-updated', {
  ...order,
  source: 'electron',  // or 'web'
  timestamp: new Date()
});

// Prevent re-syncing your own changes
window.api.onSocketOrderUpdated((order) => {
  if (order.source === 'electron') return;  // Ignore own changes
  updateUI(order);
});
```

---

## Next Steps

### 1. Add Socket.io to Order Creation
Edit `src/pages/create-order.html`:
```javascript
// After creating order in database
const result = await OrderSocketExample.createOrderWithSync(orderData);
if (result.success) {
  showNotification('Order synced across devices!');
}
```

### 2. Add Socket.io to Inventory Updates
Edit `src/pages/inventory.html`:
```javascript
// When updating stock quantity
window.api.socketEmit('inventory-updated', {
  productId: productId,
  quantity: newQuantity,
  timestamp: new Date()
});
```

### 3. Monitor Connection Status
Edit `src/pages/dashboard.html`:
```javascript
// Show connection indicator
window.api.onSocketClientStatus((status) => {
  const indicator = document.getElementById('sync-status');
  indicator.textContent = status.electronConnected ? '🟢 Synced' : '🔴 Offline';
});
```

### 4. Create Next.js Web App Integration
When building web app, use:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: { clientType: 'nextjs' }
});

socket.on('connect', () => {
  console.log('Connected to Ambika Empire server');
});

socket.on('order-created', (order) => {
  // Handle order from Electron
  console.log('Order from desktop:', order);
});
```

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Verify server is running: `npm run server`
4. Check Socket.io status: `await window.api.socketStatus()`
5. Review example code in `src/utils/socket-examples.js`

## Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Electron IPC Guide](https://www.electronjs.org/docs/api/ipc-main)
- [Express.js Guide](https://expressjs.com/)

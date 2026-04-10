/**
 * Socket.io Client for Electron Desktop App
 * Handles real-time synchronization with the web app
 */

let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Initialize Socket.io client
function initializeSocket() {
  if (socket) {
    console.log('Socket already initialized');
    return;
  }

  try {
    // Import socket.io-client dynamically
    import('socket.io-client').then(({ io }) => {
      socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('Connected to Socket.io server');
        isConnected = true;
        reconnectAttempts = 0;

        // Notify renderer of connection status
        if (window.api && window.api.onSocketClientStatus) {
          window.api.onSocketClientStatus({
            electronConnected: true,
            totalClients: 0 // Will be updated by server
          });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.io server:', reason);
        isConnected = false;

        if (window.api && window.api.onSocketClientStatus) {
          window.api.onSocketClientStatus({
            electronConnected: false,
            totalClients: 0
          });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        isConnected = false;
        reconnectAttempts++;

        if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      });

      socket.on('client-status', (data) => {
        console.log('Client status update:', data);
        if (window.api) window.api.sendSocketEvent('client-status', {
          electronConnected: isConnected,
          totalClients: data.totalClients,
          clients: data.clients
        });
      });

      // Set up event listeners for data updates

      // Orders
      socket.on('order-created', (data) => {
        console.log('Remote order created:', data);
        // Send to main process
        if (window.electronAPI && window.electronAPI.sendSocketEvent) {
          window.electronAPI.sendSocketEvent('order-created', data);
        }
        // Also call local callback if available
        if (window.api && window.api.onSocketOrderCreated) {
          window.api.onSocketOrderCreated(data);
        }
      });

      socket.on('order-updated', (data) => {
        console.log('Remote order updated:', data);
        if (window.api) window.api.sendSocketEvent('order-updated', data);
      });

      // Inventory
      socket.on('inventory-updated', (data) => {
        console.log('Remote inventory updated:', data);
        if (window.api) window.api.sendSocketEvent('inventory-updated', data);
      });

      socket.on('stock-alert', (data) => {
        console.log('Remote stock alert:', data);
        if (window.api) window.api.sendSocketEvent('stock-alert', data);
      });

      // Customers
      socket.on('customer-added', (data) => {
        console.log('Remote customer added:', data);
        if (window.api) window.api.sendSocketEvent('customer-added', data);
      });

      socket.on('customer-updated', (data) => {
        console.log('Remote customer updated:', data);
        if (window.api) window.api.sendSocketEvent('customer-updated', data);
      });

      // Vendors/Suppliers
      socket.on('vendor-added', (data) => {
        console.log('Remote vendor added:', data);
        if (window.api) window.api.sendSocketEvent('vendor-added', data);
      });

      socket.on('vendor-updated', (data) => {
        console.log('Remote vendor updated:', data);
        if (window.api) window.api.sendSocketEvent('vendor-updated', data);
      });

      // Products
      socket.on('product-added', (data) => {
        console.log('Remote product added:', data);
        if (window.api) window.api.sendSocketEvent('product-added', data);
      });

      socket.on('product-updated', (data) => {
        console.log('Remote product updated:', data);
        if (window.api) window.api.sendSocketEvent('product-updated', data);
      });

      // Estimates
      socket.on('estimate-created', (data) => {
        console.log('Remote estimate created:', data);
        if (window.api) window.api.sendSocketEvent('estimate-created', data);
      });

      socket.on('estimate-updated', (data) => {
        console.log('Remote estimate updated:', data);
        if (window.api) window.api.sendSocketEvent('estimate-updated', data);
      });

      // Transactions
      socket.on('transaction-recorded', (data) => {
        console.log('Remote transaction recorded:', data);
        if (window.api) window.api.sendSocketEvent('transaction-recorded', data);
      });

      // Agents
      socket.on('agent-added', (data) => {
        console.log('Remote agent added:', data);
        if (window.api) window.api.sendSocketEvent('agent-added', data);
      });

      socket.on('agent-updated', (data) => {
        console.log('Remote agent updated:', data);
        if (window.api) window.api.sendSocketEvent('agent-updated', data);
      });

      // User activity
      socket.on('user-activity', (data) => {
        console.log('Remote user activity:', data);
        if (window.api) window.api.sendSocketEvent('user-activity', data);
      });

      // Sync status
      socket.on('sync-status-update', (data) => {
        console.log('Remote sync status update:', data);
        if (window.api) window.api.sendSocketEvent('sync-status-update', data);
      });

    }).catch(error => {
      console.error('Failed to load socket.io-client:', error);
    });

  } catch (error) {
    console.error('Error initializing Socket.io client:', error);
  }
}

// Emit event to server
function socketEmit(event, data) {
  return new Promise((resolve, reject) => {
    if (!socket || !isConnected) {
      reject(new Error('Socket not connected'));
      return;
    }

    try {
      socket.emit(event, data);
      resolve({ success: true });
    } catch (error) {
      reject(error);
    }
  });
}

// Get socket status
function getSocketStatus() {
  if (window.socketClient && window.socketClient.status) {
    return window.socketClient.status();
  }
  return {
    connected: isConnected,
    socketId: socket ? socket.id : null,
    reconnectAttempts,
    maxReconnectAttempts
  };
}

// Disconnect socket
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

// Export functions for global use
window.socketClient = {
  initialize: initializeSocket,
  emit: socketEmit,
  status: getSocketStatus,
  disconnect: disconnectSocket
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSocket);
} else {
  initializeSocket();
}
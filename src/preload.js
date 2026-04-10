const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  setActiveYear: (year) => ipcRenderer.invoke('set-active-year', year),
  getActiveYear: () => ipcRenderer.invoke('get-active-year'),
  
  // User Management
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (userData) => ipcRenderer.invoke('add-user', userData),
  updateUser: (userId, updates) => ipcRenderer.invoke('update-user', userId, updates),
  deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),
  
  // Product Management
  getProducts: () => ipcRenderer.invoke('get-products'),
  getProduct: (productId) => ipcRenderer.invoke('get-product', productId),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (productId, updates) => ipcRenderer.invoke('update-product', productId, updates),
  deleteProduct: (productId) => ipcRenderer.invoke('delete-product', productId),
  
  // Inventory Management
  getInventory: () => ipcRenderer.invoke('get-inventory'),
  updateInventory: (data) => ipcRenderer.invoke('update-inventory', data),
  
  // Order Management
  getTodayOrders: () => ipcRenderer.invoke('get-today-orders'),
  getAllOrders: () => ipcRenderer.invoke('get-all-orders'),
  getDetailedOrders: () => ipcRenderer.invoke('get-detailed-orders'),
  getPendingOrders: () => ipcRenderer.invoke('get-pending-orders'),
  createOrder: (orderData) => ipcRenderer.invoke('create-order', orderData),
  updateOrder: (orderId, updates) => ipcRenderer.invoke('update-order', orderId, updates),
  deleteOrder: (orderId) => ipcRenderer.invoke('delete-order', orderId),
  
  // Vendor Management
  getVendors: () => ipcRenderer.invoke('get-vendors'),
  getVendor: (vendorId) => ipcRenderer.invoke('get-vendor', vendorId),
  addVendor: (vendor) => ipcRenderer.invoke('add-vendor', vendor),
  updateVendor: (vendorId, updates) => ipcRenderer.invoke('update-vendor', vendorId, updates),
  deleteVendor: (vendorId) => ipcRenderer.invoke('delete-vendor', vendorId),
  
  // Customer Management
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getCustomer: (customerId) => ipcRenderer.invoke('get-customer', customerId),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  updateCustomer: (customerId, updates) => ipcRenderer.invoke('update-customer', customerId, updates),
  deleteCustomer: (customerId) => ipcRenderer.invoke('delete-customer', customerId),
  
  // Agent Management
  getAgents: () => ipcRenderer.invoke('get-agents'),
  getAgent: (agentId) => ipcRenderer.invoke('get-agent', agentId),
  addAgent: (agent) => ipcRenderer.invoke('add-agent', agent),
  updateAgent: (agentId, updates) => ipcRenderer.invoke('update-agent', agentId, updates),
  deleteAgent: (agentId) => ipcRenderer.invoke('delete-agent', agentId),
  
  // Transaction Management
  getTransactions: () => ipcRenderer.invoke('get-transactions'),
  
  // Estimate Management
  getEstimates: () => ipcRenderer.invoke('get-estimates'),
  getEstimateById: (estimateId) => ipcRenderer.invoke('get-estimate-by-id', estimateId),
  addEstimate: (estimateData) => ipcRenderer.invoke('add-estimate', estimateData),
  updateEstimate: (estimateId, updates) => ipcRenderer.invoke('update-estimate', estimateId, updates),
  updateEstimateStatus: (estimateId, status) => ipcRenderer.invoke('update-estimate-status', estimateId, status),
  deleteEstimate: (estimateId) => ipcRenderer.invoke('delete-estimate', estimateId),
  
  // Reports
  getSalesReport: (filters) => ipcRenderer.invoke('get-sales-report', filters),
  getInventoryReport: () => ipcRenderer.invoke('get-inventory-report'),

  // MongoDB Sync API
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  getDataSummary: () => ipcRenderer.invoke('get-data-summary'),
  compareDataSummaries: (local, remote) => ipcRenderer.invoke('compare-data-summaries', local, remote),
  setSyncEnabled: (enabled) => ipcRenderer.invoke('set-sync-enabled', enabled),
  testMongoDBConnection: () => ipcRenderer.invoke('test-mongodb-connection'),
  syncToMongoDB: () => ipcRenderer.invoke('sync-to-mongodb'),
  syncFromMongoDB: () => ipcRenderer.invoke('sync-from-mongodb'),

  // Real-time data sync listener - uses MongoDB change streams
  onDataSync: (callback) => ipcRenderer.on('data-sync', callback),

  // Socket.io API
  socketEmit: (event, data) => ipcRenderer.invoke('socket-emit', event, data),
  socketStatus: () => ipcRenderer.invoke('socket-status'),

  // Socket event listeners - register callbacks
  onSocketOrderCreated: (callback) => ipcRenderer.on('socket-order-created', (event, data) => callback(data)),
  onSocketOrderUpdated: (callback) => ipcRenderer.on('socket-order-updated', (event, data) => callback(data)),
  onSocketInventoryUpdated: (callback) => ipcRenderer.on('socket-inventory-updated', (event, data) => callback(data)),
  onSocketStockAlert: (callback) => ipcRenderer.on('socket-stock-alert', (event, data) => callback(data)),
  onSocketCustomerAdded: (callback) => ipcRenderer.on('socket-customer-added', (event, data) => callback(data)),
  onSocketCustomerUpdated: (callback) => ipcRenderer.on('socket-customer-updated', (event, data) => callback(data)),
  onSocketVendorAdded: (callback) => ipcRenderer.on('socket-vendor-added', (event, data) => callback(data)),
  onSocketVendorUpdated: (callback) => ipcRenderer.on('socket-vendor-updated', (event, data) => callback(data)),
  onSocketProductAdded: (callback) => ipcRenderer.on('socket-product-added', (event, data) => callback(data)),
  onSocketProductUpdated: (callback) => ipcRenderer.on('socket-product-updated', (event, data) => callback(data)),
  onSocketEstimateCreated: (callback) => ipcRenderer.on('socket-estimate-created', (event, data) => callback(data)),
  onSocketEstimateUpdated: (callback) => ipcRenderer.on('socket-estimate-updated', (event, data) => callback(data)),
  onSocketTransactionRecorded: (callback) => ipcRenderer.on('socket-transaction-recorded', (event, data) => callback(data)),
  onSocketAgentAdded: (callback) => ipcRenderer.on('socket-agent-added', (event, data) => callback(data)),
  onSocketAgentUpdated: (callback) => ipcRenderer.on('socket-agent-updated', (event, data) => callback(data)),
  onSocketUserActivity: (callback) => ipcRenderer.on('socket-user-activity', (event, data) => callback(data)),
  onSocketSyncStatusUpdate: (callback) => ipcRenderer.on('socket-sync-status-update', (event, data) => callback(data)),
  onSocketClientStatus: (callback) => ipcRenderer.on('socket-client-status', (event, data) => callback(data)),

  // Send socket events to main process
  sendSocketEvent: (eventName, data) => ipcRenderer.send('socket-event-from-renderer', { eventName, data })
}); 
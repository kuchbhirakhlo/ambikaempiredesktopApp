const { Server } = require('socket.io');

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3001", "http://localhost:3000", "https://your-production-pwa-domain.com"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Track connected clients
  const connectedClients = new Map();

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Store client info
    connectedClients.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      userAgent: socket.handshake.headers['user-agent']
    });

    // Send current client count to all clients
    io.emit('client-status', {
      totalClients: connectedClients.size,
      clients: Array.from(connectedClients.values())
    });

    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);

      // Update all clients with new count
      io.emit('client-status', {
        totalClients: connectedClients.size,
        clients: Array.from(connectedClients.values())
      });
    });

    // Listen for various events from clients

    // Orders
    socket.on('order-created', (data) => {
      console.log('Order created:', data);
      socket.broadcast.emit('order-created', data);
    });

    socket.on('order-updated', (data) => {
      console.log('Order updated:', data);
      socket.broadcast.emit('order-updated', data);
    });

    // Inventory
    socket.on('inventory-updated', (data) => {
      console.log('Inventory updated:', data);
      socket.broadcast.emit('inventory-updated', data);
    });

    socket.on('stock-alert', (data) => {
      console.log('Stock alert:', data);
      socket.broadcast.emit('stock-alert', data);
    });

    // Customers
    socket.on('customer-added', (data) => {
      console.log('Customer added:', data);
      socket.broadcast.emit('customer-added', data);
    });

    socket.on('customer-updated', (data) => {
      console.log('Customer updated:', data);
      socket.broadcast.emit('customer-updated', data);
    });

    // Vendors/Suppliers
    socket.on('vendor-added', (data) => {
      console.log('Vendor added:', data);
      socket.broadcast.emit('vendor-added', data);
    });

    socket.on('vendor-updated', (data) => {
      console.log('Vendor updated:', data);
      socket.broadcast.emit('vendor-updated', data);
    });

    // Products
    socket.on('product-added', (data) => {
      console.log('Product added:', data);
      socket.broadcast.emit('product-added', data);
    });

    socket.on('product-updated', (data) => {
      console.log('Product updated:', data);
      socket.broadcast.emit('product-updated', data);
    });

    // Estimates
    socket.on('estimate-created', (data) => {
      console.log('Estimate created:', data);
      socket.broadcast.emit('estimate-created', data);
    });

    socket.on('estimate-updated', (data) => {
      console.log('Estimate updated:', data);
      socket.broadcast.emit('estimate-updated', data);
    });

    // Transactions
    socket.on('transaction-recorded', (data) => {
      console.log('Transaction recorded:', data);
      socket.broadcast.emit('transaction-recorded', data);
    });

    // Agents
    socket.on('agent-added', (data) => {
      console.log('Agent added:', data);
      socket.broadcast.emit('agent-added', data);
    });

    socket.on('agent-updated', (data) => {
      console.log('Agent updated:', data);
      socket.broadcast.emit('agent-updated', data);
    });

    // User activity
    socket.on('user-activity', (data) => {
      console.log('User activity:', data);
      socket.broadcast.emit('user-activity', data);
    });

    // Real-time sync status
    socket.on('sync-status-update', (data) => {
      console.log('Sync status update:', data);
      socket.broadcast.emit('sync-status-update', data);
    });
  });

  return io;
}

module.exports = initializeSocket;
// Check if we're running in Electron
if (typeof require !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.electron) {
  // Running in Electron main process
  var electron = require('electron');
  var app = electron.app;
  var BrowserWindow = electron.BrowserWindow;
  var ipcMain = electron.ipcMain;
  console.log('Electron app loaded:', typeof app);
} else {
  console.error('Not running in Electron environment');
  process.exit(1);
}
const path = require('path');
const getDatabase = require('./utils/database');
const mongoSync = require('./utils/mongodb-sync');

let mainWindow;
let db;

/**
 * Suppress EGL errors - common on macOS with certain GPU configurations
 * This doesn't affect functionality
 */
try {
  app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');
} catch (error) {
  console.log('Could not set GPU workaround switch:', error.message);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));
}

// Wait for app to be ready
if (app.isReady()) {
  initializeApp();
} else {
  app.on('ready', initializeApp);
}

async function initializeApp() {
  db = getDatabase();
  
  // Enable auto-sync for real-time updates across all apps
  mongoSync.setSyncEnabled(true);
  console.log('✓ MongoDB real-time synchronization enabled for multi-app data sharing');
  
  // Test connection on startup - MongoDB is required
  const connTest = await mongoSync.testConnection();
  if (connTest.success) {
    console.log('✓ MongoDB connection successful');

    // Start persistent connection and real-time sync
    await mongoSync.startRealtimeSync();

    // Share the connection with database utility
    db.setConnection(mongoSync.client, mongoSync.db);

    // Do initial data sync after connection is set
    setTimeout(async () => {
      try {
        const syncResult = await mongoSync.syncFromMongoDB();
        if (syncResult.success) {
          console.log('✓ Initial data sync complete');
        } else {
          console.error('✗ Initial data sync failed:', syncResult.message);
        }
      } catch (error) {
        console.error('✗ Error during initial data sync:', error.message);
      }
    }, 2000); // Increased delay to ensure connection is ready
  } else {
    console.error('✗ MongoDB connection failed - showing error page to user');
    console.error('Error:', connTest.message);

    // Instead of quitting, show an error page
    mainWindow.loadFile(path.join(__dirname, 'pages', 'db-error.html'));
    return;
  }
  
  // No Socket.io connection needed - app connects directly to MongoDB
  
  // Set up real-time data change listeners
  mongoSync.on('data-change', (changeEvent) => {
    // Broadcast data changes to all renderer processes
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('data-sync', changeEvent);
    }
  });
  
  // Periodic sync check to ensure watchers are active and data is synchronized
  setInterval(async () => {
    if (mongoSync.syncEnabled) {
      try {
        const status = mongoSync.getSyncStatus();
        if (status.activeWatchers === 0) {
          console.log('🔄 Watchers stopped, restarting real-time sync for multi-app synchronization');
          await mongoSync.startRealtimeSync();
        } else {
          console.log(`✓ Multi-app sync active: ${status.activeWatchers} collections watched`);
        }
      } catch (error) {
        console.error('Error in periodic sync check:', error.message);
      }
    }
  }, 30000); // Check every 30 seconds

  // Log synchronization status on startup
  setTimeout(async () => {
    try {
      const status = mongoSync.getSyncStatus();
      const summary = await mongoSync.getDataSummary();
      console.log('🚀 Multi-App Synchronization Status:');
      console.log('- Sync Enabled:', status.syncEnabled);
      console.log('- Active Watchers:', status.activeWatchers);
      console.log('- Watched Collections:', status.watchedCollections);
      console.log('- Data Summary:', summary);
    } catch (error) {
      console.error('Error getting synchronization status:', error);
    }
  }, 5000);
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

// Graceful shutdown
app.on('window-all-closed', async function () {
  // Stop all watchers and close connection properly
  await mongoSync.stopAllWatchers();
  await mongoSync.disconnect();

  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  // Ensure clean shutdown
  await mongoSync.disconnect();
});

// IPC handlers

// Handle login
ipcMain.handle('login', async (event, credentials) => {
  try {
    const selectedYear = Number.parseInt(credentials.year, 10) || new Date().getFullYear();
    db.setActiveYear(selectedYear);
    const user = await db.getUserByCredentials(credentials.username, credentials.password);
  
    if (!user) {
      return { success: false, message: 'Invalid username or password' };
    }
    
    // Check if user is blocked
    if (user.blocked) {
      return { success: false, message: user.message || 'Your account has been blocked' };
    }
    
    return { success: true, user: { ...user, selectedYear } };
  } catch (error) {
    console.error('Login error:', error.message);
    return { success: false, message: 'An error occurred during login' };
  }
});

ipcMain.handle('set-active-year', async (event, year) => {
  const selectedYear = Number.parseInt(year, 10) || new Date().getFullYear();
  db.setActiveYear(selectedYear);
  return { success: true, selectedYear };
});

ipcMain.handle('get-active-year', async () => {
  return { success: true, selectedYear: db.getActiveYear() };
});

// User management
ipcMain.handle('get-users', async () => {
  try {
    return await db.getAll('users');
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
});

ipcMain.handle('add-user', async (event, userData) => {
  try {
    return await db.add('users', userData);
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
});

ipcMain.handle('update-user', async (event, userId, updates) => {
  try {
    return await db.update('users', userId, updates);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
});

ipcMain.handle('delete-user', async (event, userId) => {
  try {
    return await db.delete('users', userId);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
});

// Product management
ipcMain.handle('get-products', async () => {
  try {
    return await db.getProductsWithInventory();
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
});

ipcMain.handle('get-product', async (event, productId) => {
  try {
    return await db.getById('products', productId);
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
});

ipcMain.handle('add-product', async (event, product) => {
  try {
    return await db.add('products', product);
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
});

ipcMain.handle('update-product', async (event, productId, updates) => {
  try {
    return await db.update('products', productId, updates);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, productId) => {
  try {
    return await db.delete('products', productId);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

// Inventory management
ipcMain.handle('get-inventory', async () => {
  try {
    return await db.getProductsWithInventory();
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw error;
  }
});

ipcMain.handle('update-inventory', async (event, data) => {
  try {
    return await db.updateInventory(data.productId, data.quantity, data.location, data.userId);
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
});

// Order management
ipcMain.handle('get-today-orders', async () => {
  try {
    return await db.getTodayOrders();
  } catch (error) {
    console.error('Error getting today orders:', error);
    throw error;
  }
});

ipcMain.handle('get-all-orders', async () => {
  try {
    return await db.getAll('orders');
  } catch (error) {
    console.error('Error getting all orders:', error);
    throw error;
  }
});

ipcMain.handle('get-detailed-orders', async () => {
  try {
    return await db.getDetailedOrders();
  } catch (error) {
    console.error('Error getting detailed orders:', error);
    throw error;
  }
});

ipcMain.handle('get-pending-orders', async () => {
  try {
    return await db.getOrdersByStatus('pending');
  } catch (error) {
    console.error('Error getting pending orders:', error);
    throw error;
  }
});

ipcMain.handle('create-order', async (event, orderData) => {
  try {
    return await db.createOrder(orderData);
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
});

ipcMain.handle('update-order', async (event, orderId, updates) => {
  try {
    return await db.update('orders', orderId, updates);
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
});

ipcMain.handle('delete-order', async (event, orderId) => {
  try {
    return await db.delete('orders', orderId);
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
});

// Vendor management
ipcMain.handle('get-vendors', async () => {
  try {
    return await db.getAll('vendors');
  } catch (error) {
    console.error('Error getting vendors:', error);
    throw error;
  }
});

ipcMain.handle('get-vendor', async (event, vendorId) => {
  try {
    return await db.getById('vendors', vendorId);
  } catch (error) {
    console.error('Error getting vendor:', error);
    throw error;
  }
});

ipcMain.handle('add-vendor', async (event, vendorData) => {
  try {
    // Convert camelCase to snake_case for database
    const dbData = {
      name: vendorData.name,
      contact_person: vendorData.contactPerson,
      email: vendorData.email,
      phone: vendorData.phone,
      address: vendorData.address,
      notes: vendorData.notes
    };
    return await db.add('vendors', dbData);
  } catch (error) {
    console.error('Error adding vendor:', error);
    throw error;
  }
});

ipcMain.handle('update-vendor', async (event, vendorId, vendorData) => {
  try {
    // Convert camelCase to snake_case for database
    const dbData = {
      name: vendorData.name,
      contact_person: vendorData.contactPerson,
      email: vendorData.email,
      phone: vendorData.phone,
      address: vendorData.address,
      notes: vendorData.notes
    };
    return await db.update('vendors', vendorId, dbData);
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }
});

ipcMain.handle('delete-vendor', async (event, vendorId) => {
  try {
    return await db.delete('vendors', vendorId);
  } catch (error) {
    console.error('Error deleting vendor:', error);
    throw error;
  }
});

// Customer management
ipcMain.handle('get-customers', async () => {
  try {
    return await db.getAll('customers');
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
});

ipcMain.handle('get-customer', async (event, customerId) => {
  try {
    return await db.getById('customers', customerId);
  } catch (error) {
    console.error('Error getting customer:', error);
    throw error;
  }
});

ipcMain.handle('add-customer', async (event, customerData) => {
  try {
    // Auto-generate customer_ref_id if not provided
    if (!customerData.customer_ref_id) {
      const lastCustomer = await db.db.collection('customers').findOne(
        {},
        { sort: { _id: -1 } }
      );
      
      let lastId = 1000;
      if (lastCustomer && lastCustomer.customer_ref_id) {
        const numId = parseInt(lastCustomer.customer_ref_id);
        if (!isNaN(numId)) {
          lastId = numId;
        }
      }
      
      customerData.customer_ref_id = (lastId + 1).toString();
    }
    
    return await db.add('customers', customerData);
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
});

ipcMain.handle('update-customer', async (event, customerId, customerData) => {
  try {
    return await db.update('customers', customerId, customerData);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
});

ipcMain.handle('delete-customer', async (event, customerId) => {
  try {
    return await db.delete('customers', customerId);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
});

// Agent management
ipcMain.handle('get-agents', async () => {
  try {
    return await db.getAll('agents');
  } catch (error) {
    console.error('Error getting agents:', error);
    throw error;
  }
});

ipcMain.handle('get-agent', async (event, agentId) => {
  try {
    return await db.getById('agents', agentId);
  } catch (error) {
    console.error('Error getting agent:', error);
    throw error;
  }
});

ipcMain.handle('add-agent', async (event, agentData) => {
  try {
    return await db.add('agents', agentData);
  } catch (error) {
    console.error('Error adding agent:', error);
    throw error;
  }
});

ipcMain.handle('update-agent', async (event, agentId, agentData) => {
  try {
    return await db.update('agents', agentId, agentData);
  } catch (error) {
    console.error('Error updating agent:', error);
    throw error;
  }
});

ipcMain.handle('delete-agent', async (event, agentId) => {
  try {
    return await db.delete('agents', agentId);
  } catch (error) {
    console.error('Error deleting agent:', error);
    throw error;
  }
});

// Transaction management
ipcMain.handle('get-transactions', async () => {
  try {
    return await db.getAll('transactions');
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
});

// Reports
ipcMain.handle('get-sales-report', async (event, filters) => {
  try {
    return await db.getSalesReport(filters);
  } catch (error) {
    console.error('Error getting sales report:', error);
    throw error;
  }
});

ipcMain.handle('get-inventory-report', async () => {
  try {
    return await db.getInventoryReport();
  } catch (error) {
    console.error('Error getting inventory report:', error);
    throw error;
  }
});

// Estimate management
ipcMain.handle('get-estimates', async () => {
  try {
    return await db.getEstimates();
  } catch (error) {
    console.error('Error getting estimates:', error);
    throw error;
  }
});

ipcMain.handle('get-estimate-by-id', async (event, estimateId) => {
  try {
    return await db.getEstimateById(estimateId);
  } catch (error) {
    console.error('Error getting estimate:', error);
    throw error;
  }
});

ipcMain.handle('add-estimate', async (event, estimateData) => {
  try {
    return await db.addEstimate(estimateData);
  } catch (error) {
    console.error('Error adding estimate:', error);
    throw error;
  }
});

ipcMain.handle('update-estimate', async (event, estimateId, updates) => {
  try {
    return await db.updateEstimate(estimateId, updates);
  } catch (error) {
    console.error('Error updating estimate:', error);
    throw error;
  }
});

ipcMain.handle('update-estimate-status', async (event, estimateId, status) => {
  try {
    return await db.updateEstimate(estimateId, { status });
  } catch (error) {
    console.error('Error updating estimate status:', error);
    throw error;
  }
});

ipcMain.handle('delete-estimate', async (event, estimateId) => {
  try {
    return await db.deleteEstimate(estimateId);
  } catch (error) {
    console.error('Error deleting estimate:', error);
    throw error;
  }
});

// MongoDB Sync Handlers
ipcMain.handle('get-sync-status', async () => {
  try {
    return mongoSync.getSyncStatus();
  } catch (error) {
    console.error('Error getting sync status:', error);
    throw error;
  }
});

ipcMain.handle('get-data-summary', async () => {
  try {
    return await mongoSync.getDataSummary();
  } catch (error) {
    console.error('Error getting data summary:', error);
    throw error;
  }
});

ipcMain.handle('compare-data-summaries', async (event, localSummary, remoteSummary) => {
  try {
    return mongoSync.compareDataSummaries(localSummary, remoteSummary);
  } catch (error) {
    console.error('Error comparing data summaries:', error);
    throw error;
  }
});

ipcMain.handle('set-sync-enabled', async (event, enabled) => {
  try {
    return mongoSync.setSyncEnabled(enabled);
  } catch (error) {
    console.error('Error setting sync enabled:', error);
    throw error;
  }
});

ipcMain.handle('test-mongodb-connection', async () => {
  try {
    // Use the enhanced test connection method that gracefully handles errors
    const result = await mongoSync.testConnection();
    return result; // Already includes success and error information
  } catch (error) {
    console.error('MongoDB connection test failed in IPC handler:', error);
    return { 
      success: false, 
      message: `Connection failed: ${error.message}`,
      error: error
    };
  }
});

ipcMain.handle('sync-to-mongodb', async () => {
  try {
    const result = await mongoSync.syncToMongoDB();
    return result;
  } catch (error) {
    console.error('Error during sync to MongoDB:', error);
    return { 
      success: false, 
      message: `Sync failed: ${error.message}`,
      error: error
    };
  }
});

ipcMain.handle('sync-from-mongodb', async () => {
  try {
    const result = await mongoSync.syncFromMongoDB();
    return result;
  } catch (error) {
    console.error('Error during sync from MongoDB:', error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      error: error
    };
  }
});
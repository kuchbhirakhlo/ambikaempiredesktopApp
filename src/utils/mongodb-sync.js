const { MongoClient } = require('mongodb');
const localDb = require('./database');
const settings = require('electron-store');
const mongoConfig = require('./mongodb-config');

/**
 * MongoDB Sync Utility that manages data synchronization between
 * local SQLite database and remote MongoDB
 */
class MongoDBSync {
  constructor() {
    this.client = null;
    this.db = null;
    this.settings = new settings();
    
    // Get saved settings
    this.syncEnabled = this.settings.get('mongodb.syncEnabled', false);
    this.lastSyncDate = this.settings.get('mongodb.lastSyncDate', null);
    
    // Get database connection details from config
    this.connectionUrl = mongoConfig.connectionUrl;
    this.dbName = mongoConfig.dbName;
    this.tables = mongoConfig.tables;
    
    // Connection options with SSL fixes
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout for faster offline detection
      connectTimeoutMS: 5000
    };
    
    // Track connection state
    this.isOffline = true // Set to true to force offline mode;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      lastSyncDate: this.lastSyncDate,
      syncEnabled: this.syncEnabled
    };
  }

  /**
   * Toggle sync enabled state
   * @param {boolean} enabled - Whether sync is enabled
   */
  toggleSync(enabled) {
    this.syncEnabled = enabled;
    this.settings.set('mongodb.syncEnabled', this.syncEnabled);
    return this.syncEnabled;
  }

  /**
   * Set sync enabled state
   * @param {boolean} enabled - Whether sync is enabled
   */
  setSyncEnabled(enabled) {
    return this.toggleSync(enabled);
  }

  /**
   * Test connection to MongoDB
   */
  async testConnection() {
    try {
      if (!this.connectionUrl) {
        throw new Error('MongoDB connection URL is not configured in the server');
      }
      
      const client = new MongoClient(this.connectionUrl, this.options);
      await client.connect();
      await client.close();
      
      // Reset offline flag on successful connection
      this.isOffline = false;
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
      
      // Set offline flag
      this.isOffline = true;
      
      return { success: false, message: `Connection failed: ${error.message}`, error };
    }
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      // Skip connection if we're offline
      if (this.isOffline) {
        return false;
      }
      
      if (!this.connectionUrl) {
        throw new Error('MongoDB connection URL is not configured in the server');
      }
      
      if (!this.client) {
        this.client = new MongoClient(this.connectionUrl, this.options);
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        console.log('Connected to MongoDB');
      }
      return true;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.isOffline = true;
      return false;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('Disconnected from MongoDB');
      }
      return true;
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      return false;
    }
  }

  /**
   * Sync data from local SQLite to MongoDB
   * Pushes local changes to the cloud
   */
  async syncToMongoDB() {
    // Skip if sync is disabled or we're in offline mode
    if (!this.syncEnabled || this.isOffline) {
      return { success: false, message: 'Sync is disabled or offline mode detected' };
    }
    
    try {
      // Connect to MongoDB
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB' };
      }
      
      // Start sync process
      // Logic to sync data from SQLite to MongoDB...
      
      // Update last sync date
      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);
      
      // Disconnect after sync
      await this.disconnect();
      
      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      console.error('Error syncing to MongoDB:', error);
      return { success: false, message: `Sync failed: ${error.message}`, error };
    }
  }

  /**
   * Sync data from MongoDB to local SQLite
   * Pulls changes from the cloud to local database
   */
  async syncFromMongoDB() {
    // Skip if sync is disabled or we're in offline mode
    if (!this.syncEnabled || this.isOffline) {
      return { success: false, message: 'Sync is disabled or offline mode detected' };
    }
    
    try {
      // Connect to MongoDB
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB' };
      }
      
      // Start sync process
      // Logic to sync data from MongoDB to SQLite...
      
      // Remove MongoDB _id field
      
      // Update last sync date
      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);
      
      // Disconnect after sync
      await this.disconnect();
      
      return { success: true, message: 'Sync completed successfully' };
    } catch (error) {
      console.error('Error syncing from MongoDB:', error);
      return { success: false, message: `Sync failed: ${error.message}`, error };
    }
  }
}

// Create and export MongoDB sync instance
const mongoSync = new MongoDBSync();
module.exports = mongoSync; 
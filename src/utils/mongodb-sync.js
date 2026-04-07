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
    this.isOffline = false;
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
    if (!this.syncEnabled || this.isOffline) {
      return { success: false, message: 'Sync is disabled or offline mode detected' };
    }
    
    try {
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB' };
      }
      
      const results = {};
      const localDb = require('./database');
      
      for (const table of this.tables) {
        try {
          const records = await localDb.getAll(table);
          
          if (records.length > 0) {
            const collection = this.db.collection(table);
            
            await collection.deleteMany({});
            
            const recordsToInsert = records.map(record => {
              const { year, ...recordWithoutYear } = record;
              return recordWithoutYear;
            });
            
            await collection.insertMany(recordsToInsert);
          }
          
          results[table] = { count: records.length, success: true };
        } catch (err) {
          console.error(`Error syncing table ${table}:`, err);
          results[table] = { count: 0, success: false, error: err.message };
        }
      }
      
      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);
      
      await this.disconnect();
      
      return { 
        success: true, 
        message: 'Data uploaded to cloud successfully',
        results,
        timestamp: this.lastSyncDate
      };
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
    if (!this.syncEnabled || this.isOffline) {
      return { success: false, message: 'Sync is disabled or offline mode detected' };
    }
    
    try {
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB' };
      }
      
      const results = {};
      const localDb = require('./database');
      
      await localDb.exec('PRAGMA foreign_keys = OFF');
      
      const deleteOrder = ['order_items', 'estimate_products', 'orders', 'estimates', 'transactions', 'inventory', 'products', 'vendors', 'customers', 'agents', 'users'];
      for (const table of deleteOrder) {
        try {
          await localDb.exec(`DELETE FROM ${table}`);
        } catch (err) {}
      }
      
      const insertOrder = ['users', 'vendors', 'customers', 'agents', 'products', 'orders', 'estimates'];
      
      for (const table of insertOrder) {
        try {
          const collection = this.db.collection(table);
          const mongoRecords = await collection.find({}).toArray();
          
          for (const record of mongoRecords) {
            const { _id, ...recordData } = record;
            try {
              await localDb.add(table, recordData);
            } catch (addErr) {}
          }
          results[table] = { count: mongoRecords.length, success: true };
        } catch (err) {
          results[table] = { count: 0, success: false };
        }
      }
      
      try {
        const collection = this.db.collection('inventory');
        const mongoRecords = await collection.find({}).toArray();
        for (const record of mongoRecords) {
          const { _id, ...recordData } = record;
          try { await localDb.add('inventory', recordData); } catch (e) {}
        }
        results['inventory'] = { count: mongoRecords.length, success: true };
      } catch (e) { results['inventory'] = { count: 0 }; }
      
      try {
        const collection = this.db.collection('order_items');
        const mongoRecords = await collection.find({}).toArray();
        for (const record of mongoRecords) {
          const { _id, ...recordData } = record;
          try { await localDb.add('order_items', recordData); } catch (e) {}
        }
        results['order_items'] = { count: mongoRecords.length, success: true };
      } catch (e) { results['order_items'] = { count: 0 }; }
      
      try {
        const collection = this.db.collection('estimate_products');
        const mongoRecords = await collection.find({}).toArray();
        for (const record of mongoRecords) {
          const { _id, ...recordData } = record;
          try { await localDb.add('estimate_products', recordData); } catch (e) {}
        }
        results['estimate_products'] = { count: mongoRecords.length, success: true };
      } catch (e) { results['estimate_products'] = { count: 0 }; }
      
      try {
        const collection = this.db.collection('transactions');
        const mongoRecords = await collection.find({}).toArray();
        for (const record of mongoRecords) {
          const { _id, ...recordData } = record;
          try { await localDb.add('transactions', recordData); } catch (e) {}
        }
        results['transactions'] = { count: mongoRecords.length, success: true };
      } catch (e) { results['transactions'] = { count: 0 }; }
      
      await localDb.exec('PRAGMA foreign_keys = ON');
      
      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);
      
      await this.disconnect();
      
      return { 
        success: true, 
        message: 'Data downloaded from cloud successfully',
        results,
        timestamp: this.lastSyncDate
      };
    } catch (error) {
      console.error('Error syncing from MongoDB:', error);
      return { success: false, message: `Sync failed: ${error.message}`, error };
    }
  }
}

// Create and export MongoDB sync instance
const mongoSync = new MongoDBSync();
module.exports = mongoSync; 
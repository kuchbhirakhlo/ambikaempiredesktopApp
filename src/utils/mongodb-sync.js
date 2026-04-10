const { MongoClient } = require('mongodb');
const settings = require('electron-store');
const mongoConfig = require('./mongodb-config');
const EventEmitter = require('events');

/**
 * MongoDB Sync Utility that manages real-time data synchronization
 * using MongoDB Change Streams and persistent connections
 */
class MongoDBSync extends EventEmitter {
  constructor() {
    super();
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
    
    // Connection options with SSL fixes and connection pooling
    this.options = {
      ssl: true,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true
    };
    
    // Track connection state and watchers
    this.changeStreams = new Map(); // Map of collection name to change stream
    this.isConnecting = false;
  }
  
  async testConnection() {
    try {
      if (!this.connectionUrl) {
        throw new Error('MongoDB connection URL is not configured');
      }
      
      // Use a temporary client for testing
      const testClient = new MongoClient(this.connectionUrl, this.options);
      await testClient.connect();
      
      // Test by checking server status
      const adminDb = testClient.db('admin');
      await adminDb.command({ ping: 1 });
      
      await testClient.close();
      
      this.isOffline = false;
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      console.error('MongoDB connection test failed:', error.message);
      return { success: false, message: `Connection failed: ${error.message}`, error };
    }
  }

  /**
   * Connect to MongoDB and keep connection persistent
   * Implements connection pooling for better performance
   */
  async connect() {
    try {
      if (!this.connectionUrl) {
        throw new Error('MongoDB connection URL is not configured');
      }
      
      // Prevent multiple simultaneous connection attempts
      if (this.isConnecting) {
        console.log('Connection attempt already in progress...');
        return this.client ? true : false;
      }
      
      if (this.client) {
        console.log('Already connected, reusing connection');
        return true;
      }
      
      console.log('🔌 Connecting to MongoDB...');
      this.isConnecting = true;
      this.client = new MongoClient(this.connectionUrl, this.options);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log(`📍 Database set to: ${this.dbName}`);
      
      // Verify connection
      const adminDb = this.client.db('admin');
      await adminDb.command({ ping: 1 });
      
      this.isOffline = false;
      this.isConnecting = false;
      console.log('✓ Connected to MongoDB (persistent connection established)');
      return true;
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to connect to MongoDB:', error.message);
      this.client = null;
      this.db = null;
      return false;
    }
  }

  /**
   * Gracefully disconnect from MongoDB
   * Should only be called on app shutdown
   */
  async disconnect() {
    try {
      // Stop all change stream watchers
      for (const [collectionName, stream] of this.changeStreams.entries()) {
        try {
          await stream.close();
          this.changeStreams.delete(collectionName);
          console.log(`Change stream closed for ${collectionName}`);
        } catch (err) {
          console.error(`Error closing change stream for ${collectionName}:`, err.message);
        }
      }
      
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('Disconnected from MongoDB');
      }
      return true;
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error.message);
      return false;
    }
  }

  /**
   * Watch for real-time changes in a MongoDB collection using Change Streams
   * Allows instant notification when data is updated from desktop or web app
   */
  async watchCollection(collectionName) {
    if (!this.syncEnabled || !this.db) {
      return false;
    }
    
    try {
      // Don't create duplicate watchers
      if (this.changeStreams.has(collectionName)) {
        return true;
      }
      
      const collection = this.db.collection(collectionName);
      const changeStream = collection.watch([], {
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable',
        resumeAfter: null,
        // Additional options for multi-app synchronization
        showExpandedEvents: true,
        startAtOperationTime: null,
        maxAwaitTimeMS: 10000, // Wait up to 10 seconds for changes
        batchSize: 1 // Process one change at a time for consistency
      });
      
      changeStream.on('change', (change) => {
        console.log(`📤 [MULTI-APP SYNC] Change detected in ${collectionName}:`, change.operationType);

        // Prepare change data based on operation type
        let changeData = {
          collection: collectionName,
          operation: change.operationType,
          timestamp: new Date().toISOString(),
          documentKey: change.documentKey
        };

        // Add full document for operations that have it
        if (change.fullDocument) {
          changeData.fullDocument = change.fullDocument;
          console.log(`📤 [MULTI-APP SYNC] Document ID:`, change.fullDocument._id || change.fullDocument.id);
        }

        // Add previous document for updates
        if (change.fullDocumentBeforeChange) {
          changeData.fullDocumentBeforeChange = change.fullDocumentBeforeChange;
        }

        // Emit general data-change event
        this.emit('data-change', changeData);

        // Emit specific event for this collection
        this.emit(`${collectionName}-change`, changeData);

        // Emit operation-specific events for broader handling
        this.emit(`${collectionName}-${change.operationType}`, changeData);

        console.log(`📤 [MULTI-APP SYNC] Event emitted - all connected apps will receive this update`);
      });
      
      changeStream.on('error', (error) => {
        console.error(`❌ [MULTI-APP SYNC] Change stream error for ${collectionName}:`, error.message);
        this.changeStreams.delete(collectionName);

        // Attempt to restart the watcher after a delay
        setTimeout(async () => {
          console.log(`🔄 [MULTI-APP SYNC] Attempting to restart watcher for ${collectionName}`);
          await this.watchCollection(collectionName);
        }, 5000); // Wait 5 seconds before retrying
      });

      changeStream.on('close', () => {
        console.log(`🔌 [MULTI-APP SYNC] Change stream closed for ${collectionName}`);
        this.changeStreams.delete(collectionName);

        // Auto-restart if sync is still enabled
        if (this.syncEnabled && this.db) {
          setTimeout(async () => {
            console.log(`🔄 [MULTI-APP SYNC] Auto-restarting watcher for ${collectionName}`);
            await this.watchCollection(collectionName);
          }, 2000);
        }
      });

      changeStream.on('end', () => {
        console.log(`🏁 [MULTI-APP SYNC] Change stream ended for ${collectionName}`);
        this.changeStreams.delete(collectionName);
      });
      
      this.changeStreams.set(collectionName, changeStream);
      console.log(`📡 Real-time watcher started for ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Error watching collection ${collectionName}:`, error.message);
      return false;
    }
  }

  /**
   * Start watching all configured collections for real-time updates
   */
  async startRealtimeSync() {
    if (!this.syncEnabled) {
      console.log('Real-time sync is disabled');
      return false;
    }
    
    try {
      const connected = await this.connect();
      if (!connected) {
        return false;
      }
      
      // Start watching all configured collections
      let succeededCount = 0;
      for (const table of this.tables) {
        const result = await this.watchCollection(table);
        if (result) {
          succeededCount++;
        }
      }
      
      console.log(`✓ Real-time sync started: ${succeededCount}/${this.tables.length} collections watched`);
      return true;
    } catch (error) {
      console.error('Error starting real-time sync:', error.message);
      return false;
    }
  }

  /**
   * Verify data consistency between app and MongoDB
   * Since we're MongoDB-only, this ensures all data is properly synced
   */
  async syncToMongoDB() {
    if (!this.syncEnabled) {
      return { success: false, message: 'Sync is disabled' };
    }

    try {
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB.' };
      }

      const results = {};

      // Since we're MongoDB-only, syncToMongoDB verifies that all collections
      // are accessible and counts documents to ensure data integrity
      for (const table of this.tables) {
        try {
          const collection = this.db.collection(table);
          const count = await collection.countDocuments();
          results[table] = { count, success: true, synced: true };
          console.log(`✓ ${table}: ${count} documents verified in MongoDB`);
        } catch (err) {
          results[table] = { count: 0, success: false, synced: false, error: err.message };
          console.error(`✗ Error verifying ${table}:`, err.message);
        }
      }

      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);

      return {
        success: true,
        message: 'Data synchronization with MongoDB verified',
        results,
        timestamp: this.lastSyncDate
      };
    } catch (error) {
      console.error('Error during MongoDB sync verification:', error.message);
      return { success: false, message: `Sync verification failed: ${error.message}`, error };
    }
  }

  /**
   * Pull latest data from MongoDB and ensure real-time sync is active
   * In MongoDB-only mode, this refreshes the connection and verifies all data is accessible
   */
  async syncFromMongoDB() {
    if (!this.syncEnabled) {
      return { success: false, message: 'Sync is disabled' };
    }

    try {
      console.log('🔄 Starting MongoDB sync...');
      const connected = await this.connect();
      if (!connected) {
        return { success: false, message: 'Failed to connect to MongoDB.' };
      }

      // Ensure db is available
      if (!this.db) {
        console.error('❌ Database connection is null after connect()');
        return { success: false, message: 'Database connection is null' };
      }

      console.log('📊 Verifying collections...');
      const results = {};

      // Verify all collections are accessible and count documents
      for (const table of this.tables) {
        try {
          const collection = this.db.collection(table);
          const count = await collection.countDocuments();
          results[table] = { count, success: true, synced: true };
          console.log(`📊 ${table}: ${count} documents available`);
        } catch (err) {
          results[table] = { count: 0, success: false, synced: false, error: err.message };
          console.error(`❌ ${table}: ${err.message}`);
        }
      }

      this.lastSyncDate = new Date().toISOString();
      this.settings.set('mongodb.lastSyncDate', this.lastSyncDate);

      // Ensure real-time watchers are active
      const watcherStatus = await this.startRealtimeSync();

      return {
        success: true,
        message: 'MongoDB data verified and real-time sync activated',
        results,
        timestamp: this.lastSyncDate,
        watchersActive: watcherStatus
      };
    } catch (error) {
      console.error('Error syncing from MongoDB:', error.message);
      return { success: false, message: `Sync failed: ${error.message}`, error };
    }
  }

  /**
   * Set sync enabled status and save to storage
   */
  setSyncEnabled(enabled) {
    try {
      this.syncEnabled = enabled;
      this.settings.set('mongodb.syncEnabled', enabled);
      console.log(`📡 Sync ${enabled ? 'enabled' : 'disabled'}`);
      return {
        success: true,
        message: enabled ? 'Sync enabled' : 'Sync disabled',
        syncEnabled: this.syncEnabled
      };
    } catch (error) {
      console.error('Error setting sync enabled:', error.message);
      return { success: false, message: `Error: ${error.message}`, error };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    const status = {
      syncEnabled: this.syncEnabled,
      lastSyncDate: this.lastSyncDate,
      connectionUrl: this.connectionUrl ? 'Configured' : 'Not configured',
      dbName: this.dbName,
      activeWatchers: this.changeStreams.size,
      watchedCollections: Array.from(this.changeStreams.keys()),
      // Multi-app sync specific info
      multiAppReady: this.syncEnabled && this.changeStreams.size === this.tables.length,
      connectionState: this.db ? 'Connected' : 'Disconnected',
      serverInfo: null
    };

    // Add server info if available
    if (this.db) {
      try {
        // This is async but we'll return what we can
        this.db.admin().serverInfo().then(info => {
          status.serverInfo = {
            version: info.version,
            uptime: info.uptime
          };
        }).catch(() => {});
      } catch (e) {
        // Ignore errors
      }
    }

    return status;
  }

  /**
   * Get current data summary for synchronization verification
   */
  async getDataSummary() {
    if (!this.db) {
      return { error: 'Database not connected' };
    }

    const summary = {
      timestamp: new Date().toISOString(),
      app: 'electron-desktop', // Identify which app this is from
      collections: {}
    };

    for (const table of this.tables) {
      try {
        const collection = this.db.collection(table);
        const count = await collection.countDocuments();
        const lastModified = await collection.findOne({}, { sort: { updated_at: -1 } });

        // Calculate a simple hash of the data for comparison
        const documents = await collection.find({}).sort({ _id: 1 }).toArray();
        const dataHash = this.generateSimpleHash(JSON.stringify(documents));

        summary.collections[table] = {
          documentCount: count,
          lastModified: lastModified?.updated_at || null,
          dataHash: dataHash,
          lastDocumentId: lastModified?._id || null
        };
      } catch (error) {
        summary.collections[table] = { error: error.message };
      }
    }
    return summary;
  }

  /**
   * Generate a simple hash for data comparison across apps
   */
  generateSimpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Compare data summaries between different apps for synchronization verification
   */
  compareDataSummaries(localSummary, remoteSummary) {
    const comparison = {
      timestamp: new Date().toISOString(),
      localApp: localSummary.app,
      remoteApp: remoteSummary.app,
      collectionsMatch: true,
      details: {}
    };

    for (const table of this.tables) {
      const local = localSummary.collections[table];
      const remote = remoteSummary.collections[table];

      if (!local || !remote) {
        comparison.collectionsMatch = false;
        comparison.details[table] = {
          match: false,
          reason: 'Missing data in one app'
        };
        continue;
      }

      const match = local.documentCount === remote.documentCount &&
                   local.dataHash === remote.dataHash;

      comparison.details[table] = {
        match: match,
        documentCount: {
          local: local.documentCount,
          remote: remote.documentCount,
          match: local.documentCount === remote.documentCount
        },
        dataHash: {
          local: local.dataHash,
          remote: remote.dataHash,
          match: local.dataHash === remote.dataHash
        },
        lastModified: {
          local: local.lastModified,
          remote: remote.lastModified
        }
      };

      if (!match) {
        comparison.collectionsMatch = false;
      }
    }

    return comparison;
  }

  /**
   * Stop all change streams
   */
  async stopAllWatchers() {
    for (const [collectionName, stream] of this.changeStreams.entries()) {
      try {
        await stream.close();
        this.changeStreams.delete(collectionName);
        console.log(`Watcher stopped for ${collectionName}`);
      } catch (err) {
        console.error(`Error stopping watcher for ${collectionName}:`, err.message);
      }
    }
  }
}

// Create and export MongoDB sync instance
const mongoSync = new MongoDBSync();
module.exports = mongoSync; 
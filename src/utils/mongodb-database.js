const { MongoClient, ObjectId } = require('mongodb');
const mongoConfig = require('./mongodb-config');

/**
 * MongoDB Database utility that manages all data storage and retrieval
 * Uses shared connection from mongodb-sync for real-time updates
 */
class MongoDBDatabase {
  constructor() {
    this.client = null;
    this.db = null;
    this.activeYear = new Date().getFullYear();
    this.yearScopedCollections = new Set([
      'products',
      'inventory',
      'orders',
      'transactions',
      'estimates'
    ]);

    // Connection options
    this.connectionOptions = {
      ssl: true,
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true
    };

    // Don't create connection here - wait for shared connection from mongoSync
    this.initialized = false;
  }

  /**
   * Set the database connection from mongoSync (shared connection)
   * This prevents duplicate connections
   */
  setConnection(client, db) {
    this.client = client;
    this.db = db;
    if (!this.initialized && this.db) {
      this.initialized = true;
      // Initialize database schema if needed (non-blocking)
      this.initializeDatabase().catch(err => {
        console.error('Error initializing database:', err.message);
        // Don't close connection on error - keep it alive
      });
    }
  }

  normalizeYear(year) {
    const parsed = Number.parseInt(year, 10);
    return Number.isNaN(parsed) ? new Date().getFullYear() : parsed;
  }

  setActiveYear(year) {
    this.activeYear = this.normalizeYear(year);
  }

  getActiveYear() {
    return this.activeYear;
  }

  /**
   * Ensure connection is ready before operations
   * MongoDB connection is required - no fallbacks
   */
  async ensureConnection() {
    if (!this.db) {
      throw new Error('MongoDB connection not available. Please check your database connection.');
    }
  }

  /**
   * Initialize the database schema and sample data if needed
   */
  async initializeDatabase() {
    try {
      // Check if the database is already initialized
      const settingsCollection = this.db.collection('settings');
      const result = await settingsCollection.findOne({ key: 'initialized' });

      if (!result) {
        console.log('Initializing MongoDB database...');

        // Insert default admin account only
        await this.db.collection('users').insertMany([
          {
            username: 'admin',
            password: 'admin123',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString()
          }
        ]);

        // Mark database as initialized
        await settingsCollection.insertOne({
          key: 'initialized',
          value: 'true',
          created_at: new Date().toISOString()
        });

        console.log('MongoDB database initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing MongoDB database:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   * NOTE: If connection is shared with mongoSync, don't close it here
   */
  async close(force = false) {
    try {
      // Only close if explicitly forced or if we created the connection ourselves
      if (force && this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('MongoDB connection closed (forced)');
      } else if (this.client && !this.db) {
        // Connection exists but db not set (shouldn't happen, but safe check)
        await this.client.close();
        console.log('MongoDB connection cleaned up');
      }
      // If db is set, connection is shared - don't close it
    } catch (error) {
      console.error('Error closing MongoDB connection:', error.message);
    }
  }

  /*
   * Generic CRUD operations
   */

  /**
   * Helper function to transform database record fields from snake_case to camelCase
   * @param {Object} record - The database record
   * @returns {Object} - Transformed record with camelCase fields
   */
  transformRecord(record) {
    const transformed = { ...record };
    
    // Convert MongoDB _id to id
    if (transformed._id) {
      transformed.id = transformed._id.toString();
      delete transformed._id;
    }
    
    // Convert snake_case field names to camelCase for frontend consistency
    const snakeToCamelFields = {
      contact_person: 'contactPerson',
      vendor_id: 'vendorId',
      customer_id: 'customerId',
      product_id: 'productId',
      order_id: 'orderId',
      estimate_id: 'estimateId',
      created_at: 'createdAt',
      updated_at: 'updatedAt'
    };
    
    Object.keys(snakeToCamelFields).forEach(snakeKey => {
      if (snakeKey in transformed) {
        const camelKey = snakeToCamelFields[snakeKey];
        transformed[camelKey] = transformed[snakeKey];
        delete transformed[snakeKey];
      }
    });
    
    return transformed;
  }

  /**
   * Get all records from a collection
   * @param {string} collection - The collection name
   * @returns {Promise<Array>} - Promise resolving to array of records
   */
  async getAll(collection) {
    try {
      await this.ensureConnection();
      let query = {};
      if (this.yearScopedCollections.has(collection)) {
        query.year = this.getActiveYear();
      }

      const records = await this.db.collection(collection).find(query).toArray();
      
      // Transform records: convert MongoDB _id to id and snake_case to camelCase
      return records.map(record => this.transformRecord(record));
    } catch (error) {
      console.error(`Error getting all records from ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Get a record by ID
   * @param {string} collection - The collection name
   * @param {string|number} id - The ID of the record
   * @returns {Promise<Object|null>} - Promise resolving to the record if found, null otherwise
   */
  async getById(collection, id) {
    try {
      await this.ensureConnection();
      let query = {};
      
      // Try MongoDB ObjectId format first
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        query._id = new ObjectId(id);
      } else if (typeof id === 'number' || (typeof id === 'string' && !isNaN(id))) {
        // Try numeric id
        query.id = parseInt(id);
      } else {
        // Fallback: try as MongoDB ObjectId
        try {
          query._id = new ObjectId(id);
        } catch (e) {
          return null;
        }
      }

      if (this.yearScopedCollections.has(collection)) {
        query.year = this.getActiveYear();
      }

      const record = await this.db.collection(collection).findOne(query);
      
      if (record) {
        // Transform: convert MongoDB _id to id and snake_case to camelCase
        return this.transformRecord(record);
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting record by ID from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Add a new record to a collection
   * @param {string} collection - The collection name
   * @param {Object} data - The data to insert
   * @returns {Promise<Object>} - Promise resolving to the inserted record with its new ID
   */
  async add(collection, data) {
    try {
      await this.ensureConnection();
      // Add year for year-scoped collections
      if (this.yearScopedCollections.has(collection)) {
        data.year = this.getActiveYear();
      }

      // Add timestamps
      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }

      const result = await this.db.collection(collection).insertOne(data);

      // Get the inserted record
      const insertedRecord = await this.db.collection(collection).findOne({ _id: result.insertedId });

      // Transform: convert MongoDB _id to id and snake_case to camelCase
      return this.transformRecord(insertedRecord);
    } catch (error) {
      console.error(`Error adding record to ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing record
   * @param {string} collection - The collection name
   * @param {string|number} id - The ID of the record to update
   * @param {Object} data - The updates to apply
   * @returns {Promise<Object|null>} - Promise resolving to the updated record if found, null otherwise
   */
  async update(collection, id, data) {
    try {
      await this.ensureConnection();
      let query = {};
      
      // Try MongoDB ObjectId format first
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        query._id = new ObjectId(id);
      } else if (typeof id === 'number' || (typeof id === 'string' && !isNaN(id))) {
        // Try numeric id
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          query.id = numId;
        } else {
          // Fallback: try as MongoDB ObjectId
          try {
            query._id = new ObjectId(id);
          } catch (e) {
            return null;
          }
        }
      } else {
        // Fallback: try as MongoDB ObjectId
        try {
          query._id = new ObjectId(id);
        } catch (e) {
          return null;
        }
      }

      if (this.yearScopedCollections.has(collection)) {
        query.year = this.getActiveYear();
      }

      // Add updated_at timestamp
      data.updated_at = new Date().toISOString();

      const result = await this.db.collection(collection).updateOne(query, { $set: data });

      if (result.matchedCount > 0) {
        // Get the updated record
        const updatedRecord = await this.db.collection(collection).findOne(query);
        // Transform: convert MongoDB _id to id and snake_case to camelCase
        return this.transformRecord(updatedRecord);
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error updating record in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   * @param {string} collection - The collection name
   * @param {string|number} id - The ID of the record to delete
   * @returns {Promise<boolean>} - Promise resolving to whether the deletion was successful
   */
  async delete(collection, id) {
    try {
      await this.ensureConnection();
      let query = {};
      
      // Try MongoDB ObjectId format first
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        query._id = new ObjectId(id);
      } else if (typeof id === 'number' || (typeof id === 'string' && !isNaN(id))) {
        // Try numeric id
        const numId = parseInt(id);
        if (!isNaN(numId)) {
          query.id = numId;
        } else {
          // Fallback: try as MongoDB ObjectId
          try {
            query._id = new ObjectId(id);
          } catch (e) {
            return false;
          }
        }
      } else {
        // Fallback: try as MongoDB ObjectId
        try {
          query._id = new ObjectId(id);
        } catch (e) {
          return false;
        }
      }

      if (this.yearScopedCollections.has(collection)) {
        query.year = this.getActiveYear();
      }

      const result = await this.db.collection(collection).deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting record from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Query records based on a filter
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter object
   * @returns {Promise<Array>} - Promise resolving to array of matching records
   */
  async query(collection, filter = {}) {
    try {
      if (this.yearScopedCollections.has(collection) && !filter.year) {
        filter.year = this.getActiveYear();
      }

      const records = await this.db.collection(collection).find(filter).toArray();
      
      // Transform records: convert MongoDB _id to id and snake_case to camelCase
      return records.map(record => this.transformRecord(record));
    } catch (error) {
      console.error(`Error querying ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get a single record based on a filter
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter object
   * @returns {Promise<Object|null>} - Promise resolving to the record if found, null otherwise
   */
  async queryOne(collection, filter = {}) {
    try {
      if (this.yearScopedCollections.has(collection) && !filter.year) {
        filter.year = this.getActiveYear();
      }

      const record = await this.db.collection(collection).findOne(filter);
      
      if (record) {
        // Transform: convert MongoDB _id to id and snake_case to camelCase
        return this.transformRecord(record);
      }
      
      return null;
    } catch (error) {
      console.error(`Error querying one from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Execute raw operations (placeholder for compatibility)
   * @param {string} operation - The operation description
   * @param {Object} params - The parameters
   * @returns {Promise<Object>} - Promise resolving to the result
   */
  async exec(operation, params = {}) {
    // For MongoDB, this is a placeholder to maintain API compatibility
    // Most operations are handled through specific methods
    console.log(`MongoDB exec operation: ${operation}`);
    return { success: true };
  }

  /*
   * Application-specific methods
   */

  /**
   * Get user by credentials for login
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<Object|null>} - Promise resolving to the user if found, null otherwise
   */
  async getUserByCredentials(username, password) {
    try {
      await this.ensureConnection();
      const user = await this.db.collection('users').findOne({
        username: username,
        password: password
      });

      if (!user) {
        return null;
      }

      // Check if user is blocked
      if (user.status === 'blocked') {
        return { blocked: true, message: 'Your account has been blocked. Please contact an administrator.' };
      }

      // If status is missing, set default
      if (!user.status) {
        user.status = 'active';
      }

      return user;
    } catch (error) {
      console.error('Error in getUserByCredentials:', error);
      throw error;
    }
  }

  /**
   * Get all products with their current inventory
   * @returns {Promise<Array>} - Promise resolving to products with inventory data
   */
  async getProductsWithInventory() {
    try {
      const pipeline = [
        {
          $match: { year: this.getActiveYear() }
        },
        {
          $lookup: {
            from: 'inventory',
            localField: 'id',
            foreignField: 'product_id',
            as: 'inventory'
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: 'supplierId',
            foreignField: 'id',
            as: 'supplier'
          }
        },
        {
          $project: {
            id: 1,
            code: 1,
            name: 1,
            size: 1,
            category: 1,
            price: 1,
            cost: 1,
            description: 1,
            created_at: 1,
            updated_at: 1,
            supplierId: 1,
            year: 1,
            quantity: { $arrayElemAt: ['$inventory.quantity', 0] },
            location: { $arrayElemAt: ['$inventory.location', 0] },
            supplierName: { $arrayElemAt: ['$supplier.name', 0] }
          }
        }
      ];

      const products = await this.db.collection('products').aggregate(pipeline).toArray();
      return products;
    } catch (error) {
      console.error('Error getting products with inventory:', error);
      throw error;
    }
  }

  /**
   * Get today's orders
   * @returns {Promise<Array>} - Promise resolving to orders created today
   */
  async getTodayOrders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orders = await this.db.collection('orders').find({
        date: {
          $gte: today.toISOString(),
          $lt: tomorrow.toISOString()
        },
        year: this.getActiveYear()
      }).toArray();

      return orders;
    } catch (error) {
      console.error('Error getting today orders:', error);
      throw error;
    }
  }

  /**
   * Get orders by status
   * @param {string} status - The status to filter by
   * @returns {Promise<Array>} - Promise resolving to orders with the specified status
   */
  async getOrdersByStatus(status) {
    try {
      const orders = await this.db.collection('orders').find({
        status: status,
        year: this.getActiveYear()
      }).toArray();

      return orders;
    } catch (error) {
      console.error('Error getting orders by status:', error);
      throw error;
    }
  }

  /**
   * Get orders with detailed information
   * @returns {Promise<Array>} - Promise resolving to orders with vendor and item details
   */
  async getDetailedOrders() {
    try {
      const pipeline = [
        {
          $match: { year: this.getActiveYear() }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendor_id',
            foreignField: 'id',
            as: 'vendor'
          }
        },
        {
          $lookup: {
            from: 'order_items',
            localField: 'id',
            foreignField: 'order_id',
            as: 'items',
            pipeline: [
              {
                $lookup: {
                  from: 'products',
                  localField: 'product_id',
                  foreignField: 'id',
                  as: 'product'
                }
              },
              {
                $project: {
                  order_id: 1,
                  product_id: 1,
                  quantity: 1,
                  price: 1,
                  total: 1,
                  product_name: { $arrayElemAt: ['$product.name', 0] },
                  product_code: { $arrayElemAt: ['$product.code', 0] }
                }
              }
            ]
          }
        },
        {
          $project: {
            id: 1,
            order_number: 1,
            date: 1,
            vendor_id: 1,
            total: 1,
            status: 1,
            payment_status: 1,
            payment_method: 1,
            created_by: 1,
            created_at: 1,
            updated_at: 1,
            vendor_name: { $arrayElemAt: ['$vendor.name', 0] },
            vendor_contact: { $arrayElemAt: ['$vendor.contact_person', 0] },
            items: 1
          }
        },
        {
          $sort: { date: -1 }
        }
      ];

      const detailedOrders = await this.db.collection('orders').aggregate(pipeline).toArray();
      return detailedOrders;
    } catch (error) {
      console.error('Error getting detailed orders:', error);
      throw error;
    }
  }

  /**
   * Create a new order with its items
   * @param {Object} orderData - The order data
   * @returns {Promise<Object>} - Promise resolving to the created order
   */
  async createOrder(orderData) {
    const session = this.client.startSession();

    try {
      let result = await session.withTransaction(async () => {
        const { items, ...orderInfo } = orderData;

        // Add year and timestamps
        orderInfo.year = this.getActiveYear();
        orderInfo.created_at = new Date().toISOString();

        // Insert the order
        const orderResult = await this.db.collection('orders').insertOne(orderInfo, { session });
        const orderId = orderResult.insertedId;

        // Insert order items if provided
        if (items && items.length > 0) {
          const orderItems = items.map(item => ({
            ...item,
            order_id: orderId.toString()
          }));
          await this.db.collection('order_items').insertMany(orderItems, { session });
        }

        // Record transaction for purchase
        await this.db.collection('transactions').insertOne({
          transaction_type: 'purchase',
          date: new Date().toISOString(),
          amount: orderInfo.total,
          related_id: orderId.toString(),
          description: `Purchase from Vendor ID: ${orderInfo.vendor_id}`,
          created_by: orderInfo.created_by,
          year: this.getActiveYear(),
          created_at: new Date().toISOString()
        }, { session });

        return orderId;
      });

      // Get the created order with details
      const order = await this.getById('orders', result.toString());
      return order;

    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Update product inventory
   * @param {number} productId - The ID of the product
   * @param {number} quantity - The quantity to add
   * @param {string} location - The location of the inventory
   * @param {number} userId - The ID of the user making the update
   * @returns {Promise<Object>} - Promise resolving to the updated inventory item
   */
  async updateInventory(productId, quantity, location, userId) {
    const session = this.client.startSession();

    try {
      let result = await session.withTransaction(async () => {
        // Check if inventory entry exists
        const existingInventory = await this.db.collection('inventory').findOne({
          product_id: productId,
          year: this.getActiveYear()
        }, { session });

        let inventoryId;
        let oldQuantity = 0;
        let newQuantity = 0;

        if (existingInventory) {
          // Update existing inventory
          oldQuantity = existingInventory.quantity;
          newQuantity = oldQuantity + quantity;

          await this.db.collection('inventory').updateOne(
            { _id: existingInventory._id },
            {
              $set: {
                quantity: newQuantity,
                location: location,
                last_updated: new Date().toISOString()
              }
            },
            { session }
          );
          inventoryId = existingInventory._id;
        } else {
          // Create new inventory entry
          newQuantity = quantity;
          const inventoryResult = await this.db.collection('inventory').insertOne({
            product_id: productId,
            quantity: newQuantity,
            location: location,
            year: this.getActiveYear(),
            last_updated: new Date().toISOString()
          }, { session });
          inventoryId = inventoryResult.insertedId;
        }

        // Record transaction for inventory change
        await this.db.collection('transactions').insertOne({
          transaction_type: 'inventory',
          date: new Date().toISOString(),
          amount: 0,
          related_id: productId.toString(),
          description: `Product quantity updated from ${oldQuantity} to ${newQuantity}`,
          created_by: userId,
          year: this.getActiveYear(),
          created_at: new Date().toISOString()
        }, { session });

        return inventoryId;
      });

      // Get the updated inventory
      const inventory = await this.db.collection('inventory').findOne({ _id: result });
      const inventoryRecord = { ...inventory, id: inventory._id.toString() };
      delete inventoryRecord._id;
      return inventoryRecord;

    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get sales report data
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Promise resolving to sales report data
   */
  async getSalesReport(filters = {}) {
    try {
      let matchStage = { year: this.getActiveYear() };

      // Apply filters
      if (filters.startDate) {
        matchStage.date = { ...matchStage.date, $gte: filters.startDate };
      }
      if (filters.endDate) {
        matchStage.date = { ...matchStage.date, $lt: filters.endDate };
      }
      if (filters.vendorId) {
        matchStage.vendor_id = filters.vendorId;
      }
      if (filters.status) {
        matchStage.status = filters.status;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$date' } } }
            },
            count: { $sum: 1 },
            total: { $sum: '$total' }
          }
        },
        {
          $project: {
            date: '$_id',
            count: 1,
            total: 1,
            _id: 0
          }
        },
        { $sort: { date: 1 } }
      ];

      const report = await this.db.collection('orders').aggregate(pipeline).toArray();
      return report;
    } catch (error) {
      console.error('Error getting sales report:', error);
      throw error;
    }
  }

  /**
   * Get inventory report data
   * @returns {Promise<Array>} - Promise resolving to inventory report data
   */
  async getInventoryReport() {
    try {
      const pipeline = [
        {
          $match: { year: this.getActiveYear() }
        },
        {
          $lookup: {
            from: 'inventory',
            localField: 'id',
            foreignField: 'product_id',
            as: 'inventory'
          }
        },
        {
          $match: { 'inventory.0': { $exists: true } }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            value: { $sum: { $multiply: ['$price', { $arrayElemAt: ['$inventory.quantity', 0] }] } },
            items: {
              $push: {
                id: '$id',
                code: '$code',
                name: '$name',
                size: '$size',
                category: '$category',
                price: '$price',
                quantity: { $arrayElemAt: ['$inventory.quantity', 0] },
                location: { $arrayElemAt: ['$inventory.location', 0] }
              }
            }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            value: 1,
            items: 1,
            _id: 0
          }
        }
      ];

      const report = await this.db.collection('products').aggregate(pipeline).toArray();
      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      throw error;
    }
  }

  /*
   * Estimate specific methods
   */

  /**
   * Get all estimates with their products
   * @returns {Promise<Array>} - Promise resolving to array of estimates with products
   */
  async getEstimates() {
    try {
      const estimates = await this.db.collection('estimates')
        .find({ year: this.getActiveYear() })
        .sort({ date: -1 })
        .toArray();

      // Get products for each estimate
      const estimatesWithProducts = await Promise.all(
        estimates.map(async (estimate) => {
          try {
            const products = await this.getEstimateProducts(estimate.id || estimate._id.toString());
            return { ...estimate, products };
          } catch (error) {
            console.error(`Error getting products for estimate ${estimate.id}:`, error);
            return { ...estimate, products: [] };
          }
        })
      );

      return estimatesWithProducts;
    } catch (error) {
      console.error('Error getting estimates:', error);
      throw error;
    }
  }

  /**
   * Get estimate by ID with its products
   * @param {string|number} id - The estimate ID
   * @returns {Promise<Object>} - Promise resolving to the estimate with its products
   */
  async getEstimateById(id) {
    try {
      const estimate = await this.getById('estimates', id);

      if (!estimate) {
        return null;
      }

      const products = await this.getEstimateProducts(estimate.id);
      estimate.products = products;

      return estimate;
    } catch (error) {
      console.error('Error getting estimate by ID:', error);
      throw error;
    }
  }

  /**
   * Get products for an estimate
   * @param {string|number} estimateId - The estimate ID
   * @returns {Promise<Array>} - Promise resolving to array of products
   */
  async getEstimateProducts(estimateId) {
    try {
      const pipeline = [
        {
          $match: {
            $or: [
              { estimate_id: estimateId },
              { estimate_id: parseInt(estimateId) }
            ]
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'product_id',
            foreignField: 'id',
            as: 'product'
          }
        },
        {
          $project: {
            id: 1,
            estimate_id: 1,
            product_id: 1,
            quantity: 1,
            rate: 1,
            amount: 1,
            productCode: { $arrayElemAt: ['$product.code', 0] },
            name: { $arrayElemAt: ['$product.name', 0] },
            size: { $arrayElemAt: ['$product.size', 0] },
            category: { $arrayElemAt: ['$product.category', 0] }
          }
        }
      ];

      const products = await this.db.collection('estimate_products').aggregate(pipeline).toArray();
      return products;
    } catch (error) {
      console.error('Error getting estimate products:', error);
      throw error;
    }
  }

  /**
   * Add a new estimate with its products
   * @param {Object} estimateData - The estimate data
   * @returns {Promise<Object>} - Promise resolving to the newly added estimate
   */
  async addEstimate(estimateData) {
    const session = this.client.startSession();

    try {
      let result = await session.withTransaction(async () => {
        const { products, ...estimate } = estimateData;

        // Add created_by if not provided
        if (!estimate.created_by) {
          estimate.created_by = 1;
        }

        // Add current timestamp and year
        estimate.created_at = new Date().toISOString();
        estimate.year = this.getActiveYear();

        // Insert estimate
        const estimateResult = await this.db.collection('estimates').insertOne(estimate, { session });
        const estimateId = estimateResult.insertedId;

        // Insert estimate products if provided
        if (products && products.length > 0) {
          const estimateProducts = products.map(product => ({
            ...product,
            estimate_id: estimateId.toString()
          }));
          await this.db.collection('estimate_products').insertMany(estimateProducts, { session });
        }

        return estimateId;
      });

      // Get the created estimate with products
      const createdEstimate = await this.getById('estimates', result.toString());
      return createdEstimate;

    } catch (error) {
      console.error('Error adding estimate:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

module.exports = MongoDBDatabase;
/**
 * MongoDB Configuration
 * 
 * This file contains your MongoDB connection details.
 * These values are hidden from the UI to prevent unauthorized changes.
 */

require('dotenv').config();

const mongoConfig = {
  connectionUrl: process.env.MONGODB_URI || "mongodb+srv://avisr00:dRwTaC0WtyksZ8xb@cluster0.hlywxqi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  
  dbName: "test",
  
  tables: [
    'users', 'vendors', 'products', 'inventory', 'orders', 
    'order_items', 'estimates', 'estimate_products', 'customers', 'agents'
  ]
};

module.exports = mongoConfig; 
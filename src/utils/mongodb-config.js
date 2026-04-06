/**
 * MongoDB Configuration
 * 
 * This file contains your MongoDB connection details.
 * These values are hidden from the UI to prevent unauthorized changes.
 */

require('dotenv').config();

const mongoConfig = {
  connectionUrl: process.env.MONGODB_URI || "mongodb+srv://db_user_am:B5nJHgHyJLu9PefT@cluster0.whlm3pv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&ssl=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=5000",
  
  dbName: "vendor_management",
  
  tables: [
    'users', 'vendors', 'products', 'inventory', 'orders', 
    'order_items', 'estimates', 'estimate_products', 'customers', 'agents'
  ]
};

module.exports = mongoConfig; 
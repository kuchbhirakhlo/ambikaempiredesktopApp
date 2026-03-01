/**
 * MongoDB Configuration
 * 
 * This file contains your MongoDB connection details.
 * These values are hidden from the UI to prevent unauthorized changes.
 */

const mongoConfig = {
  // MongoDB Connection String
  // Replace YOUR_PASSWORD with your actual MongoDB Atlas password
  connectionUrl: "mongodb+srv://db_user_am:B5nJHgHyJLu9PefT@cluster0.whlm3pv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&ssl=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=5000",
  
  // Database Name
  dbName: "vendor_management",
  
  // Tables to sync
  tables: [
    'users', 'vendors', 'products', 'inventory', 'orders', 
    'order_items', 'estimates', 'estimate_products', 'customers', 'agents'
  ]
};

module.exports = mongoConfig; 
// Import MongoDB database instead of SQLite
const MongoDBDatabase = require('./mongodb-database');

// Export a function that creates the database instance
// This prevents immediate initialization during module loading
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new MongoDBDatabase();
  }
  return dbInstance;
}

// Export the getter function
module.exports = getDatabase;
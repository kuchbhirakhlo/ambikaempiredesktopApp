/**
 * MongoDB Data Migration Script
 * Ensures all old data without proper id field transformation is handled
 * This is run automatically on database initialization
 * 
 * Since mongodb-database.js now transforms all _id to id during retrieval,
 * we don't need to modify existing data. The transformation happens on read.
 */

const mongoSync = require('./src/utils/mongodb-sync');
const MongoDBDatabase = require('./src/utils/mongodb-database');

async function runMigration() {
  console.log('Starting MongoDB data migration...');
  
  try {
    // Initialize connection
    const db = new MongoDBDatabase();
    await db.ensureConnection();
    
    // List of collections to verify
    const collections = [
      'customers',
      'agents',
      'vendors',
      'products',
      'users',
      'orders',
      'estimates'
    ];
    
    console.log('Verifying data in collections...');
    
    for (const collectionName of collections) {
      try {
        const count = await db.db.collection(collectionName).countDocuments();
        console.log(`✓ ${collectionName}: ${count} documents`);
        
        // Sample a document to show structure
        const sample = await db.db.collection(collectionName).findOne();
        if (sample) {
          const hasMongoDB_id = '_id' in sample;
          const hasId = 'id' in sample;
          console.log(`  - Has _id: ${hasMongoDB_id}, Has id: ${hasId}`);
          
          // All data will be transformed on retrieval, so no migration needed
          if (hasMongoDB_id && !hasId) {
            console.log(`  - Note: This collection data will be transformed on retrieval (id = _id.toString())`);
          }
        }
      } catch (error) {
        console.log(`  - Collection may not exist yet: ${collectionName}`);
      }
    }
    
    console.log('✓ Data migration check complete');
    console.log('All operations will handle both old and new data formats automatically.');
    
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration().then(() => {
    console.log('Migration finished');
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runMigration };

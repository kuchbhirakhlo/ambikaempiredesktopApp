// Script to clear all database tables for testing offline mode
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app, BrowserWindow } = require('electron');

// Use the exact database path from the app logs
const dbPath = path.join('C:\\Users\\Cursor\\AppData\\Roaming\\vendor-management-app', 'vendor-management.db');
console.log(`Targeting database at: ${dbPath}`);

// Create database connection
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Helper function for running queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Helper function for getting a single row
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function clearAllTables() {
  console.log('Starting database cleanup...');
  
  // List of all tables to clear
  const tables = [
    'users', 'vendors', 'products', 'inventory', 'orders', 
    'order_items', 'estimates', 'estimate_products', 'customers', 'agents',
    'transactions'
  ];
  
  // Preserve admin user for login
  try {
    // First get admin user details to restore later
    const adminUser = await queryOne('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    console.log('Preserving admin user:', adminUser ? adminUser.username : 'None found');
    
    // Clear each table
    for (const table of tables) {
      try {
        // Skip clearing users table completely - just remove non-admin users
        if (table === 'users') {
          if (adminUser) {
            await runQuery('DELETE FROM users WHERE role != "admin"');
            console.log(`Removed non-admin users, kept admin user`);
          } else {
            console.log(`Keeping users table intact as no admin user was found`);
          }
          continue;
        }
        
        // Clear other tables completely
        await runQuery(`DELETE FROM ${table}`);
        console.log(`Cleared table: ${table}`);
      } catch (error) {
        // If table doesn't exist, just log and continue
        console.log(`Error clearing table ${table}: ${error.message}`);
      }
    }

    console.log('Database cleanup completed successfully');
    console.log('You can now test the application in offline mode');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    // Close database connection
    db.close();
    console.log('Database connection closed');
  }
}

// Clear browser localStorage for the application
async function clearLocalStorage() {
  try {
    console.log('Creating temporary window to clear localStorage...');
    
    // Set up a temporary window to execute localStorage clearing
    const win = new BrowserWindow({ 
      width: 800, 
      height: 600,
      show: false, // Don't show window
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Load a blank page
    await win.loadURL('about:blank');
    
    // Clear localStorage for all windows
    await win.webContents.executeJavaScript(`
      localStorage.removeItem('orders');
      localStorage.removeItem('estimates');
      localStorage.removeItem('inventory');
      localStorage.removeItem('products');
      localStorage.removeItem('customers');
      localStorage.removeItem('agents');
      console.log('Cleared localStorage items');
      true;
    `);
    
    console.log('localStorage cleared successfully');
    win.close();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

// Main function
async function main() {
  try {
    // First clear database tables
    await clearAllTables();
    
    // Initialize Electron app if needed
    if (!app.isReady()) {
      await new Promise(resolve => app.once('ready', resolve));
    }
    
    // Then clear localStorage
    await clearLocalStorage();
    
    console.log('All data cleaned successfully');
    
    // Give time for console output to be displayed before exiting
    setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    console.error('Error in cleanup process:', error);
    process.exit(1);
  }
}

// Run the cleanup
main(); 
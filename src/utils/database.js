const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Determine user data path for database storage
const getUserDataPath = () => {
  // In production, use the app's user data folder
  if (app) {
    return app.getPath('userData');
  }
  // In development, use a local folder
  return path.join(__dirname, '..', '..', 'data');
};

// Ensure the data directory exists
const dataDir = getUserDataPath();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vendor-management.db');
console.log(`Database path: ${dbPath}`);

/**
 * SQLite Database utility that manages all data storage and retrieval
 */
class SqliteDatabase {
  constructor() {
    this.activeYear = new Date().getFullYear();
    this.yearScopedTables = new Set([
      'customers',
      'agents',
      'products',
      'inventory',
      'orders',
      'transactions',
      'estimates'
    ]);

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Could not connect to database', err);
      } else {
        console.log('Connected to SQLite database');
        
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
        
        // Initialize database schema and sample data, then ensure tables exist
        this.initializeDatabase(() => {
          this.ensureTablesExist();
        });
      }
    });
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
   * Initialize the database schema and sample data if needed
   */
  initializeDatabase(callback) {
    // Check if the database is already initialized
    this.db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="settings"', (err, result) => {
      if (err) {
        console.error('Error checking database initialization:', err);
        if (callback) callback();
        return;
      }
      
      // If settings table doesn't exist, initialize the database
      if (!result) {
        console.log('Initializing database...');
        this.db.serialize(() => {
          // Settings table for application settings
          this.db.run(`
            CREATE TABLE settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              key TEXT UNIQUE NOT NULL,
              value TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT
            )
          `);
          
          // Users table
          this.db.run(`
            CREATE TABLE users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              role TEXT NOT NULL,
              name TEXT,
              email TEXT,
              phone TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT
            )
          `);
          
          // Vendors table
          this.db.run(`
            CREATE TABLE vendors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              contact_person TEXT,
              email TEXT,
              phone TEXT,
              address TEXT,
              notes TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT
            )
          `);
          
          // Products table
          this.db.run(`
            CREATE TABLE products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              code TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              size TEXT,
              category TEXT,
              price REAL NOT NULL,
              cost REAL,
              description TEXT,
              supplierId INTEGER,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT,
              FOREIGN KEY (supplierId) REFERENCES vendors(id)
            )
          `);
          
          // Inventory table
          this.db.run(`
            CREATE TABLE inventory (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 0,
              location TEXT,
              last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
          `);
          
          // Orders table
          this.db.run(`
            CREATE TABLE orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_number TEXT UNIQUE NOT NULL,
              date TEXT NOT NULL,
              vendor_id INTEGER NOT NULL,
              total REAL NOT NULL,
              status TEXT NOT NULL,
              payment_status TEXT,
              payment_method TEXT,
              created_by INTEGER NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT,
              FOREIGN KEY (vendor_id) REFERENCES vendors(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `);
          
          // Estimates table
          this.db.run(`
            CREATE TABLE estimates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              estimate_no TEXT UNIQUE NOT NULL,
              date TEXT NOT NULL,
              order_no TEXT,
              customer_name TEXT NOT NULL,
              assigned_agent TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              total_amount REAL NOT NULL DEFAULT 0,
              created_by INTEGER NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `);
          
          // Estimate products table
          this.db.run(`
            CREATE TABLE estimate_products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              estimate_id INTEGER NOT NULL,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL DEFAULT 1,
              rate REAL NOT NULL,
              amount REAL NOT NULL,
              FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
              FOREIGN KEY (product_id) REFERENCES products(id)
            )
          `);
          
          // Order items table
          this.db.run(`
            CREATE TABLE order_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_id INTEGER NOT NULL,
              product_id INTEGER NOT NULL,
              quantity INTEGER NOT NULL,
              price REAL NOT NULL,
              total REAL NOT NULL,
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
              FOREIGN KEY (product_id) REFERENCES products(id)
            )
          `);
          
          // Transactions table
          this.db.run(`
            CREATE TABLE transactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              transaction_type TEXT NOT NULL,
              date TEXT NOT NULL,
              amount REAL,
              related_id INTEGER,
              description TEXT,
              created_by INTEGER NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (created_by) REFERENCES users(id)
            )
          `);
          
          // Customers table
          this.db.run(`
            CREATE TABLE customers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              contact TEXT,
              email TEXT,
              agent TEXT,
              address TEXT,
              customer_ref_id TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT
            )
          `);
          
          // Agents table
          this.db.run(`
            CREATE TABLE agents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              contact TEXT,
              email TEXT,
              city TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT
            )
          `);
          
          // Insert default admin and employee accounts
          this.db.run(`
            INSERT INTO users (username, password, name, email, role)
            VALUES 
              ('admin', 'admin123', 'Admin User', 'admin@example.com', 'admin'),
              ('employee', 'employee123', 'Sample Employee', 'employee@example.com', 'employee')
          `);
          
          // Insert sample vendors
          this.db.run(`
            INSERT INTO vendors (name, contact_person, email, phone, address)
            VALUES 
              ('ABC Supplies', 'John Doe', 'john@abcsupplies.com', '555-1234', '123 Supplier St'),
              ('XYZ Products', 'Jane Smith', 'jane@xyzproducts.com', '555-5678', '456 Vendor Ave'),
              ('LMN Goods', 'Bob Johnson', 'bob@lmngoods.com', '555-9012', '789 Distributor Rd')
          `);
          
          // Insert sample products
          this.db.run(`
            INSERT INTO products (code, name, size, category, price, cost, description)
            VALUES 
              ('P001', 'Product A', 'Medium', 'Electronics', 25, 15, 'Sample product A'),
              ('P002', 'Product B', 'Large', 'Clothing', 45, 30, 'Sample product B'),
              ('P003', 'Product C', 'Small', 'Food', 60, 40, 'Sample product C')
          `);
          
          // Insert sample inventory
          this.db.run(`
            INSERT INTO inventory (product_id, quantity, location)
            VALUES 
              (1, 50, 'Warehouse A'),
              (2, 30, 'Warehouse A'),
              (3, 20, 'Warehouse B')
          `);
          
          // Insert sample agents
          this.db.run(`
            INSERT INTO agents (name, contact, email, city)
            VALUES 
              ('Michael Johnson', '+1 234 567 890', 'michael@example.com', 'New York'),
              ('David Brown', '+1 345 678 901', 'david@example.com', 'Los Angeles'),
              ('Emily Wilson', '+1 456 789 012', 'emily@example.com', 'Chicago')
          `);
          
          // Insert sample customers
          this.db.run(`
            INSERT INTO customers (name, contact, email, agent, address)
            VALUES 
              ('John Smith', '+1 234 567 890', 'john.smith@example.com', 'Michael Johnson', '123 Main St, New York'),
              ('Sarah Williams', '+1 345 678 901', 'sarah.williams@example.com', 'David Brown', '456 Oak Ave, Los Angeles'),
              ('Robert Davis', '+1 456 789 012', 'robert.davis@example.com', 'Emily Wilson', '789 Pine St, Chicago')
          `);
          
          // Insert sample orders and capture the IDs for order items
          this.db.run(`
            INSERT INTO orders (order_number, date, vendor_id, total, status, payment_status, payment_method, created_by)
            VALUES ('ORD-001', datetime('now'), 1, 215, 'completed', 'paid', 'credit', 1)
          `, function(err) {
            if (err) {
              console.error('Error creating sample order:', err);
              return;
            }
            
            const order1Id = this.lastID;
            
            // Insert sample order items for first order
            const stmt = this.db.prepare(`
              INSERT INTO order_items (order_id, product_id, quantity, price, total)
              VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run(order1Id, 1, 5, 25, 125);
            stmt.run(order1Id, 2, 2, 45, 90);
            stmt.finalize();
            
            // Insert sample transaction for first order
            this.db.run(`
              INSERT INTO transactions (transaction_type, date, amount, related_id, description, created_by)
              VALUES ('purchase', datetime('now'), 215, ?, 'Purchase from ABC Supplies', 1)
            `, [order1Id]);
          });
          
          // Insert second sample order
          this.db.run(`
            INSERT INTO orders (order_number, date, vendor_id, total, status, payment_status, payment_method, created_by)
            VALUES ('ORD-002', datetime('now'), 2, 600, 'pending', 'unpaid', 'cash', 1)
          `, function(err) {
            if (err) {
              console.error('Error creating second sample order:', err);
              return;
            }
            
            const order2Id = this.lastID;
            
            // Insert sample order items for second order
            this.db.run(`
              INSERT INTO order_items (order_id, product_id, quantity, price, total)
              VALUES (?, 3, 10, 60, 600)
            `, [order2Id]);
          });
          
          // Insert sample inventory transaction
          this.db.run(`
            INSERT INTO transactions (transaction_type, date, amount, related_id, description, created_by)
            VALUES ('inventory', datetime('now'), 0, 1, 'Product A quantity updated from 45 to 50', 1)
          `);
          
          // Insert sample estimates
          this.db.run(`
            INSERT INTO estimates (estimate_no, date, order_no, customer_name, assigned_agent, status, total_amount, created_by)
            VALUES 
              ('EST-001', datetime('now', '-5 days'), 'ORD-001', 'John Doe', 'Agent Smith', 'packed', 1250, 1),
              ('EST-002', datetime('now', '-2 days'), '', 'Jane Smith', 'Agent Johnson', 'pending', 2000, 1),
              ('EST-003', datetime('now', '-1 days'), 'ORD-002', 'Robert Brown', 'Agent Davis', 'pending', 900, 1)
          `);
          
          // Mark database as initialized
          this.db.run(`
            INSERT INTO settings (key, value)
            VALUES ('initialized', 'true')
          `);
          
          // Call callback after all setup is complete
          if (callback) {
            setTimeout(callback, 100);
          }
        });
      } else {
        // Database already initialized
        if (callback) {
          callback();
        }
      }
    });
  }
  
  /**
   * Ensure all required tables exist, even for existing databases
   */
  ensureTablesExist(callback) {
    const tablesToCheck = [
      'estimates', 'customers', 'agents', 'products', 'inventory', 
      'orders', 'transactions', 'users', 'vendors'
    ];
    
    let completed = 0;
    const existingTables = new Set();

    // First, check which tables actually exist
    tablesToCheck.forEach((table) => {
      this.db.get(`SELECT name FROM sqlite_master WHERE type="table" AND name="${table}"`, (err, result) => {
        if (result) {
          existingTables.add(table);
        }
        completed++;
        
        if (completed === tablesToCheck.length) {
          // All checks done, now call ensureYearColumns
          this.ensureYearColumns(() => {
            // Process estimates table
            if (existingTables.has('estimates')) {
              this.db.run(`CREATE TABLE IF NOT EXISTS estimates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                estimate_no TEXT UNIQUE NOT NULL,
                date TEXT NOT NULL,
                order_no TEXT,
                customer_name TEXT NOT NULL,
                assigned_agent TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                total_amount REAL NOT NULL DEFAULT 0,
                created_by INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT,
                FOREIGN KEY (created_by) REFERENCES users(id)
              )`);

              this.db.run(`CREATE TABLE IF NOT EXISTS estimate_products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                estimate_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                rate REAL NOT NULL,
                amount REAL NOT NULL,
                FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
              )`);
            }
            
            // Process customers table
            if (existingTables.has('customers')) {
              this.db.run(`CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT,
                email TEXT,
                agent TEXT,
                address TEXT,
                customer_ref_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
              )`, (err) => {
                if (err) {
                  console.error('Error with customers table:', err);
                  return;
                }
                
                this.db.all('PRAGMA table_info(customers)', (err, columns) => {
                  if (err) return;
                  const hasCustomerRefId = columns ? columns.some(col => col.name === 'customer_ref_id') : false;
                  if (!hasCustomerRefId) {
                    this.db.run('ALTER TABLE customers ADD COLUMN customer_ref_id TEXT;', (err) => {
                      if (err) {
                        console.error('Error adding customer_ref_id column:', err);
                      } else {
                        console.log('Successfully added customer_ref_id column to customers table');
                      }
                    });
                  }
                });
              });
            } else {
              // Create customers table if it doesn't exist
              this.db.run(`CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT,
                email TEXT,
                agent TEXT,
                address TEXT,
                customer_ref_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
              )`);
              
              this.db.run(`INSERT INTO customers (name, contact, email, agent, address)
                VALUES 
                  ('John Smith', '+1 234 567 890', 'john.smith@example.com', 'Michael Johnson', '123 Main St, New York'),
                  ('Sarah Williams', '+1 345 678 901', 'sarah.williams@example.com', 'David Brown', '456 Oak Ave, Los Angeles'),
                  ('Robert Davis', '+1 456 789 012', 'robert.davis@example.com', 'Emily Wilson', '789 Pine St, Chicago')`);
            }
            
            // Process agents table
            if (existingTables.has('agents')) {
              // Agents table exists, nothing to do
            } else {
              this.db.run(`CREATE TABLE agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT,
                email TEXT,
                city TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
              )`);
              
              this.db.run(`INSERT INTO agents (name, contact, email, city)
                VALUES 
                  ('Michael Johnson', '+1 234 567 890', 'michael@example.com', 'New York'),
                  ('David Brown', '+1 345 678 901', 'david@example.com', 'Los Angeles'),
                  ('Emily Wilson', '+1 456 789 012', 'emily@example.com', 'Chicago')`);
            }

            // Process users table
            if (existingTables.has('users')) {
              this.db.all("PRAGMA table_info(users)", (err, columns) => {
                if (err) {
                  console.error('Error checking users table schema:', err);
                  return;
                }

                const hasStatusColumn = columns.some(column => column.name === 'status');
                
                if (!hasStatusColumn) {
                  console.log('Adding status column to users table');
                  this.db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'", (err) => {
                    if (err) {
                      console.error('Error adding status column to users table:', err);
                    } else {
                      console.log('Successfully added status column to users table');
                      this.db.run("UPDATE users SET status = 'active' WHERE status IS NULL");
                    }
                  });
                } else {
                  this.db.run("UPDATE users SET status = 'active' WHERE status IS NULL");
                }
              });
            }

            // Process products table
            if (existingTables.has('products')) {
              this.db.all("PRAGMA table_info(products)", (err, columns) => {
                if (err) return;
                const hasSupplierId = columns.some(column => column.name === 'supplierId');
                if (!hasSupplierId) {
                  this.db.run(`ALTER TABLE products ADD COLUMN supplierId INTEGER REFERENCES vendors(id)`);
                }
              });
            }

            // If callback provided, call it after a short delay to allow async operations
            if (callback) {
              setTimeout(callback, 100);
            }
          });
        }
      });
    });
  }

  ensureYearColumns(callback) {
    const tableYearConfig = {
      customers: 'created_at',
      agents: 'created_at',
      products: 'created_at',
      inventory: 'last_updated',
      orders: 'date',
      transactions: 'date',
      estimates: 'date'
    };

    const tables = Object.keys(tableYearConfig);
    let completed = 0;

    tables.forEach((table) => {
      // First check if table exists
      this.db.get(`SELECT name FROM sqlite_master WHERE type="table" AND name="${table}"`, (err, result) => {
        if (err || !result) {
          console.log(`Table ${table} does not exist, skipping year column addition`);
          completed++;
          if (callback && completed === tables.length) {
            callback();
          }
          return;
        }

        // Table exists, now check if year column exists
        this.db.all(`PRAGMA table_info(${table})`, (err, columns) => {
          if (err || !columns) {
            console.error(`Error checking ${table} schema:`, err);
            completed++;
            if (callback && completed === tables.length) {
              callback();
            }
            return;
          }

          const hasYearColumn = columns.some(col => col.name === 'year');
          if (hasYearColumn) {
            console.log(`Year column already exists in ${table}`);
            completed++;
            if (callback && completed === tables.length) {
              callback();
            }
            return;
          }

          console.log(`Adding year column to ${table} table`);
          this.db.run(`ALTER TABLE ${table} ADD COLUMN year INTEGER`, (alterErr) => {
            if (alterErr) {
              console.error(`Error adding year column to ${table}:`, alterErr);
              completed++;
              if (callback && completed === tables.length) {
                callback();
              }
              return;
            }

            const fallbackYear = new Date().getFullYear();
            this.db.run(
              `UPDATE ${table}
               SET year = COALESCE(CAST(strftime('%Y', ${tableYearConfig[table]}) AS INTEGER), ?)
               WHERE year IS NULL`,
              [fallbackYear],
              (updateErr) => {
                if (updateErr) {
                  console.error(`Error backfilling year values for ${table}:`, updateErr);
                } else {
                  console.log(`Successfully added year column to ${table}`);
                }
                completed++;
                if (callback && completed === tables.length) {
                  callback();
                }
              }
            );
          });
        });
      });
    });
  }
  
  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
  
  /*
   * Generic CRUD operations 
   */
  
  /**
   * Get all records from a table
   * @param {string} table - The table name
   * @returns {Promise<Array>} - Promise resolving to array of records
   */
  getAll(table) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      if (this.yearScopedTables.has(table)) {
        sql += ' WHERE year = ?';
        params.push(this.getActiveYear());
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
  
  /**
   * Get a record by ID
   * @param {string} table - The table name
   * @param {number} id - The ID of the record
   * @returns {Promise<Object|null>} - Promise resolving to the record if found, null otherwise
   */
  getById(table, id) {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM ${table} WHERE id = ?`;
      const params = [id];
      if (this.yearScopedTables.has(table)) {
        sql += ' AND year = ?';
        params.push(this.getActiveYear());
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }
  
  /**
   * Add a new record to a table
   * @param {string} table - The table name
   * @param {Object} data - The data to insert
   * @returns {Promise<Object>} - Promise resolving to the inserted record with its new ID
   */
  add(table, data) {
    return new Promise((resolve, reject) => {
      // First check if all columns exist in the table
      this.db.all(`PRAGMA table_info(${table})`, (err, columnsInfo) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Get column names from table schema
        const tableColumns = columnsInfo.map(col => col.name);
        
        // Filter data to only include valid columns
        const validData = {};
        let missingColumns = [];
        
        for (const key in data) {
          if (tableColumns.includes(key)) {
            validData[key] = data[key];
          } else {
            missingColumns.push(key);
          }
        }
        
        // Log warning if columns were filtered out
        if (missingColumns.length > 0) {
          console.warn(`Columns not found in ${table}: ${missingColumns.join(', ')}`);
        }
        
        // Add default values for status if needed and table has the column
        if (table === 'users' && tableColumns.includes('status') && !validData.status) {
          validData.status = 'active';
        }

        if (this.yearScopedTables.has(table) && tableColumns.includes('year')) {
          validData.year = this.getActiveYear();
        }
        
        // Create arrays for column names and placeholders
        const columnNames = Object.keys(validData);
        const placeholders = columnNames.map(() => '?').join(', ');
        const values = columnNames.map(col => validData[col]);
        
        // Create SQL query
        const sql = `INSERT INTO ${table} (${columnNames.join(', ')}) 
                    VALUES (${placeholders})`;
                    
        // Execute insert and get the last insert ID
        this.db.run(sql, values, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // Get the inserted record
          this.db.get(`SELECT * FROM ${table} WHERE id = ?`, [this.lastID], (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(row);
          });
        }.bind(this));
      });
    });
  }
  
  /**
   * Update an existing record
   * @param {string} table - The table name
   * @param {number} id - The ID of the record to update
   * @param {Object} data - The updates to apply
   * @returns {Promise<Object|null>} - Promise resolving to the updated record if found, null otherwise
   */
  update(table, id, data) {
    return new Promise((resolve, reject) => {
      // Create array for column=? pairs and values
      const updates = Object.keys(data).map(col => `${col} = ?`);
      const values = Object.values(data);
      
      // Add updated_at timestamp if the column exists in this table
      this.db.all(`PRAGMA table_info(${table})`, (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
        
        if (hasUpdatedAt) {
          updates.push('updated_at = datetime("now")');
        }
        
        // Create SQL query
        let sql = `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`;
        const queryParams = [...values, id];
        if (this.yearScopedTables.has(table)) {
          sql += ' AND year = ?';
          queryParams.push(this.getActiveYear());
        }
        
        // Execute update
        this.db.run(sql, queryParams, function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes > 0) {
            // Get the updated record
            this.db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(row);
            });
          } else {
            resolve(null);
          }
        }.bind(this));
      });
    });
  }
  
  /**
   * Delete a record by ID
   * @param {string} table - The table name
   * @param {number} id - The ID of the record to delete
   * @returns {Promise<boolean>} - Promise resolving to whether the deletion was successful
   */
  delete(table, id) {
    return new Promise((resolve, reject) => {
      let sql = `DELETE FROM ${table} WHERE id = ?`;
      const params = [id];
      if (this.yearScopedTables.has(table)) {
        sql += ' AND year = ?';
        params.push(this.getActiveYear());
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes > 0);
      });
    });
  }
  
  /**
   * Query records based on a SQL query and parameters
   * @param {string} sql - The SQL query
   * @param {Array} params - The parameters for the query
   * @returns {Promise<Array>} - Promise resolving to array of matching records
   */
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
  
  /**
   * Get a single record based on a SQL query and parameters
   * @param {string} sql - The SQL query
   * @param {Array} params - The parameters for the query
   * @returns {Promise<Object|null>} - Promise resolving to the record if found, null otherwise
   */
  queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }
  
  /**
   * Execute raw SQL with parameters
   * @param {string} sql - The SQL query
   * @param {Array} params - The parameters for the query
   * @returns {Promise<Object>} - Promise resolving to the result of the execution
   */
  exec(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      });
    });
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
  getUserByCredentials(username, password) {
    const sql = `
      SELECT id, username, name, email, role, status, created_at 
      FROM users 
      WHERE username = ? AND password = ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [username, password], (err, user) => {
        if (err) {
          console.error('Error in getUserByCredentials:', err);
          reject(err);
          return;
        }
        
        if (!user) {
          resolve(null);
          return;
        }
        
        // Check if user is blocked
        if (user.status === 'blocked') {
          resolve({ blocked: true, message: 'Your account has been blocked. Please contact an administrator.' });
          return;
        }
        
        // If status is missing, set default
        if (!user.status) {
          user.status = 'active';
        }
        
        resolve(user);
      });
    });
  }
  
  /**
   * Get all products with their current inventory
   * @returns {Promise<Array>} - Promise resolving to products with inventory data
   */
  getProductsWithInventory() {
    const sql = `
      SELECT 
        p.id, p.code, p.name, p.size, p.category, p.price, p.cost, p.description, 
        p.created_at, p.updated_at, p.supplierId, p.year,
        i.quantity, i.location,
        v.name as supplierName
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id AND i.year = p.year
      LEFT JOIN vendors v ON p.supplierId = v.id
      WHERE p.year = ?
    `;
    
    return this.query(sql, [this.getActiveYear()]);
  }
  
  /**
   * Get today's orders
   * @returns {Promise<Array>} - Promise resolving to orders created today
   */
  getTodayOrders() {
    const sql = `
      SELECT * FROM orders 
      WHERE date(date) = date('now')
      AND year = ?
    `;
    
    return this.query(sql, [this.getActiveYear()]);
  }
  
  /**
   * Get orders by status
   * @param {string} status - The status to filter by
   * @returns {Promise<Array>} - Promise resolving to orders with the specified status
   */
  getOrdersByStatus(status) {
    const sql = `
      SELECT * FROM orders 
      WHERE status = ?
      AND year = ?
    `;
    
    return this.query(sql, [status, this.getActiveYear()]);
  }
  
  /**
   * Get orders with detailed information
   * @returns {Promise<Array>} - Promise resolving to orders with vendor and item details
   */
  async getDetailedOrders() {
    try {
      // First get all orders
      const orders = await this.getAll('orders');
      
      // For each order, fetch vendor and items details
      const detailedOrders = [];
      
      for (const order of orders) {
        // Get vendor information
        const vendor = await this.getById('vendors', order.vendor_id);
        
        // Get order items
        const itemsSql = `
          SELECT oi.*, p.name as product_name, p.code as product_code 
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `;
        const items = await this.query(itemsSql, [order.id]);
        
        // Add details to the order
        detailedOrders.push({
          ...order,
          vendor_name: vendor ? vendor.name : null,
          vendor_contact: vendor ? vendor.contact_person : null,
          items
        });
      }
      
      return detailedOrders;
    } catch (err) {
      console.error('Error getting detailed orders:', err);
      throw err;
    }
  }
  
  /**
   * Create a new order with its items
   * @param {Object} orderData - The order data
   * @returns {Promise<Object>} - Promise resolving to the created order
   */
  async createOrder(orderData) {
    return new Promise((resolve, reject) => {
      // Extract order items from the order data
      const { items, ...orderInfo } = orderData;
      
      // Begin transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          // Insert the order
          this.db.run(
            `INSERT INTO orders (
              order_number, date, vendor_id, total, status, year,
              payment_status, payment_method, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              orderInfo.order_number,
              orderInfo.date,
              orderInfo.vendor_id,
              orderInfo.total,
              orderInfo.status,
              this.getActiveYear(),
              orderInfo.payment_status,
              orderInfo.payment_method,
              orderInfo.created_by
            ],
            function(err) {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              const orderId = this.lastID;
              
              // Insert order items if provided
              if (items && items.length > 0) {
                const insertItemStmt = this.db.prepare(`
                  INSERT INTO order_items (order_id, product_id, quantity, price, total)
                  VALUES (?, ?, ?, ?, ?)
                `);
                
                for (const item of items) {
                  insertItemStmt.run(
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price,
                    item.total,
                    (err) => {
                      if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                      }
                    }
                  );
                }
                
                insertItemStmt.finalize();
              }
              
              // Record transaction for purchase
              this.db.run(`
                INSERT INTO transactions (
                  transaction_type, date, amount, related_id, description, created_by, year
                ) VALUES ('purchase', datetime('now'), ?, ?, ?, ?, ?)
              `, [
                orderInfo.total,
                orderId,
                `Purchase from Vendor ID: ${orderInfo.vendor_id}`,
                orderInfo.created_by,
                this.getActiveYear()
              ], (err) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // Commit the transaction
                this.db.run('COMMIT', (err) => {
                  if (err) {
                    this.db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  // Get the created order with details
                  this.getById('orders', orderId)
                    .then(order => resolve(order))
                    .catch(err => {
                      this.db.run('ROLLBACK');
                      reject(err);
                    });
                });
              });
            }.bind(this)
          );
        } catch (err) {
          this.db.run('ROLLBACK');
          reject(err);
        }
      });
    });
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
    return new Promise((resolve, reject) => {
      // Begin transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          // Check if inventory entry exists
          this.db.get(
            'SELECT * FROM inventory WHERE product_id = ? AND year = ?', 
            [productId, this.getActiveYear()],
            (err, existingInventory) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              let inventoryId;
              let oldQuantity = 0;
              let newQuantity = 0;
              
              if (existingInventory) {
                // Update existing inventory - ADD the new quantity to the existing one
                oldQuantity = existingInventory.quantity;
                newQuantity = oldQuantity + quantity;
                
                this.db.run(
                  `UPDATE inventory 
                   SET quantity = ?, location = ?, last_updated = datetime('now')
                   WHERE id = ?`,
                  [newQuantity, location, existingInventory.id],
                  (err) => {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    inventoryId = existingInventory.id;
                    recordTransaction();
                  }
                );
              } else {
                // Create new inventory entry
                newQuantity = quantity;
                this.db.run(
                  `INSERT INTO inventory (product_id, quantity, location, last_updated, year)
                   VALUES (?, ?, ?, datetime('now'), ?)`,
                  [productId, newQuantity, location, this.getActiveYear()],
                  function(err) {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    inventoryId = this.lastID;
                    recordTransaction();
                  }
                );
              }
              
              // Record transaction for inventory change
              const recordTransaction = () => {
                this.db.run(
                  `INSERT INTO transactions (
                    transaction_type, date, amount, related_id,
                    description, created_by, year
                  ) VALUES ('inventory', datetime('now'), 0, ?,
                    ?, ?, ?)`,
                  [
                    productId,
                    `Product quantity updated from ${oldQuantity} to ${newQuantity}`,
                    userId,
                    this.getActiveYear()
                  ],
                  (err) => {
                    if (err) {
                      this.db.run('ROLLBACK');
                      reject(err);
                      return;
                    }
                    
                    // Commit the transaction
                    this.db.run('COMMIT', (err) => {
                      if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                      }
                      
                      // Get the updated inventory
                      this.db.get(
                        'SELECT * FROM inventory WHERE id = ?',
                        [inventoryId],
                        (err, inventory) => {
                          if (err) {
                            reject(err);
                            return;
                          }
                          resolve(inventory);
                        }
                      );
                    });
                  }
                );
              };
            }
          );
        } catch (err) {
          this.db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  }
  
  /**
   * Get sales report data
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Promise resolving to sales report data
   */
  getSalesReport(filters = {}) {
    let sql = `
      SELECT 
        date(date) as date,
        COUNT(*) as count,
        SUM(total) as total
      FROM orders
      WHERE year = ?
    `;
    
    const params = [this.getActiveYear()];
    
    // Apply filters if provided
    if (filters.startDate) {
      sql += ' AND date(date) >= date(?)';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND date(date) <= date(?)';
      params.push(filters.endDate);
    }
    
    if (filters.vendorId) {
      sql += ' AND vendor_id = ?';
      params.push(filters.vendorId);
    }
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    // Group by date
    sql += ' GROUP BY date(date)';
    
    return this.query(sql, params);
  }
  
  /**
   * Get inventory report data
   * @returns {Promise<Array>} - Promise resolving to inventory report data
   */
  async getInventoryReport() {
    try {
      // Get products with inventory data grouped by category
      const sql = `
        SELECT 
          p.category,
          COUNT(*) as count,
          SUM(p.price * i.quantity) as value
        FROM products p
        JOIN inventory i ON p.id = i.product_id
        WHERE p.year = ? AND i.year = ?
        GROUP BY p.category
      `;
      
      const categorySummary = await this.query(sql, [this.getActiveYear(), this.getActiveYear()]);
      
      // For each category, get detailed items
      const report = [];
      
      for (const category of categorySummary) {
        const itemsSql = `
          SELECT 
            p.id, p.code, p.name, p.size, p.category, p.price,
            i.quantity, i.location
          FROM products p
          JOIN inventory i ON p.id = i.product_id
          WHERE p.category = ? AND p.year = ? AND i.year = ?
        `;
        
        const items = await this.query(itemsSql, [category.category, this.getActiveYear(), this.getActiveYear()]);
        
        report.push({
          ...category,
          items
        });
      }
      
      return report;
    } catch (err) {
      console.error('Error generating inventory report:', err);
      throw err;
    }
  }
  
  /*
   * Estimate specific methods
   */
  
  /**
   * Get all estimates with their products
   * @returns {Promise<Array>} - Promise resolving to array of estimates with products
   */
  getEstimates() {
    return new Promise((resolve, reject) => {
      // Get all estimates
      this.db.all(`SELECT * FROM estimates WHERE year = ? ORDER BY date DESC`, [this.getActiveYear()], (err, estimates) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (estimates.length === 0) {
          resolve([]);
          return;
        }
        
        // Get products for each estimate
        const promises = estimates.map(estimate => {
          return new Promise((resolve) => {
            this.getEstimateProducts(estimate.id)
              .then(products => resolve(products))
              .catch(() => resolve([])); // If there's an error, just return empty array
          });
        });
        
        Promise.all(promises)
          .then(productsResults => {
            estimates.forEach((estimate, index) => {
              estimate.products = productsResults[index];
            });
            
            resolve(estimates);
          })
          .catch(err => {
            console.error('Error getting estimate products:', err);
            // Still return the estimates even if there was an error with the products
            estimates.forEach(estimate => {
              estimate.products = [];
            });
            resolve(estimates);
          });
      });
    });
  }
  
  /**
   * Get estimate by ID with its products
   * @param {number} id - The estimate ID
   * @returns {Promise<Object>} - Promise resolving to the estimate with its products
   */
  getEstimateById(id) {
    return new Promise((resolve, reject) => {
      // Get the estimate
      this.db.get(`SELECT * FROM estimates WHERE id = ? AND year = ?`, [id, this.getActiveYear()], (err, estimate) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!estimate) {
          resolve(null);
          return;
        }
        
        // Get products for the estimate
        this.getEstimateProducts(id)
          .then(products => {
            estimate.products = products;
            resolve(estimate);
          })
          .catch(err => {
            console.error('Error getting estimate products:', err);
            estimate.products = [];
            resolve(estimate);
          });
      });
    });
  }
  
  /**
   * Get products for an estimate
   * @param {number} estimateId - The estimate ID
   * @returns {Promise<Array>} - Promise resolving to array of products
   */
  getEstimateProducts(estimateId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ep.*,
          p.code as productCode,
          p.name,
          p.size,
          p.category
        FROM 
          estimate_products ep
        JOIN 
          products p ON ep.product_id = p.id
        WHERE 
          ep.estimate_id = ?
      `;
      
      this.db.all(sql, [estimateId], (err, products) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(products);
      });
    });
  }
  
  /**
   * Add a new estimate with its products
   * @param {Object} estimateData - The estimate data
   * @returns {Promise<Object>} - Promise resolving to the newly added estimate
   */
  addEstimate(estimateData) {
    return new Promise((resolve, reject) => {
      const { products, ...estimate } = estimateData;
      
      // Add created_by if not provided
      if (!estimate.created_by) {
        estimate.created_by = 1; // Default to admin for now
      }
      
      // Add current timestamp for created_at
      estimate.created_at = new Date().toISOString();
      estimate.year = this.getActiveYear();
      
      // Create arrays for column names and placeholders
      const columns = Object.keys(estimate);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => estimate[col]);
      
      // Create SQL query
      const sql = `INSERT INTO estimates (${columns.join(', ')}) 
                   VALUES (${placeholders})`;
      
      // Start transaction
      this.db.run('BEGIN TRANSACTION', err => {
        if (err) {
          return reject(err);
        }
        
        // Insert estimate
        this.db.run(sql, values, function(err) {
          if (err) {
            return this.db.run('ROLLBACK', () => reject(err));
          }
          
          const estimateId = this.lastID;
          
          // If no products, commit and return
          if (!products || products.length === 0) {
            return this.db.run('COMMIT', err => {
              if (err) {
                return this.db.run('ROLLBACK', () => reject(err));
              }
              this.getEstimateById(estimateId).then(resolve).catch(reject);
            });
          }
          
          // Insert products
          const stmt = this.db.prepare(`
            INSERT INTO estimate_products (
              estimate_id, product_id, quantity, rate, amount
            ) VALUES (?, ?, ?, ?, ?)
          `);
          
          let hasError = false;
          
          for (const product of products) {
            stmt.run(
              estimateId,
              product.product_id,
              product.quantity,
              product.rate,
              product.amount,
              err => {
                if (err) {
                  hasError = true;
                  console.error('Error adding estimate product:', err);
                }
              }
            );
          }
          
          stmt.finalize();
          
          if (hasError) {
            return this.db.run('ROLLBACK', () => reject(new Error('Error adding estimate products')));
          }
          
          // Commit transaction
          this.db.run('COMMIT', err => {
            if (err) {
              return this.db.run('ROLLBACK', () => reject(err));
            }
            this.getEstimateById(estimateId).then(resolve).catch(reject);
          });
        }.bind(this));
      });
    });
  }
  
  /**
   * Update an estimate
   * @param {number} id - The estimate ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} - Promise resolving to the updated estimate
   */
  updateEstimate(id, updates) {
    return new Promise((resolve, reject) => {
      // Check if products are included in the updates
      const { products, ...estimateUpdates } = updates;
      
      // Add updated_at timestamp
      estimateUpdates.updated_at = new Date().toISOString();
      
      // Start a transaction if products are included
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Update the estimate
        if (Object.keys(estimateUpdates).length > 0) {
          const setClauses = Object.keys(estimateUpdates).map(key => `${key} = ?`).join(', ');
          const values = [...Object.values(estimateUpdates), id];
          
          this.db.run(`UPDATE estimates SET ${setClauses} WHERE id = ? AND year = ?`, [...values, this.getActiveYear()], err => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
          });
        }
        
        // Update products if included
        if (products && products.length > 0) {
          // Delete existing products
          this.db.run(`DELETE FROM estimate_products WHERE estimate_id = ?`, [id], err => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // Insert new products
            const stmt = this.db.prepare(`
              INSERT INTO estimate_products (
                estimate_id, product_id, quantity, rate, amount
              ) VALUES (?, ?, ?, ?, ?)
            `);
            
            let hasError = false;
            
            products.forEach(product => {
              stmt.run(
                id,
                product.id || product.product_id,
                product.quantity,
                product.rate,
                product.amount,
                err => {
                  if (err) {
                    hasError = true;
                    console.error('Error updating estimate product:', err);
                  }
                }
              );
            });
            
            stmt.finalize();
            
            if (hasError) {
              this.db.run('ROLLBACK');
              reject(new Error('Error updating estimate products'));
              return;
            }
          });
        }
        
        // Commit the transaction
        this.db.run('COMMIT', err => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Get the updated estimate
          this.getEstimateById(id)
            .then(estimate => resolve(estimate))
            .catch(err => reject(err));
        });
      });
    });
  }
  
  /**
   * Delete an estimate
   * @param {number} id - The estimate ID
   * @returns {Promise<boolean>} - Promise resolving to true if successful
   */
  deleteEstimate(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM estimates WHERE id = ? AND year = ?`, [id, this.getActiveYear()], err => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(true);
      });
    });
  }
  
  /**
   * Get estimates by status
   * @param {string} status - The status to filter by
   * @returns {Promise<Array>} - Promise resolving to array of estimates
   */
  getEstimatesByStatus(status) {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM estimates WHERE status = ? AND year = ? ORDER BY date DESC`, [status, this.getActiveYear()], (err, estimates) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Get products for each estimate
        const promises = estimates.map(estimate => this.getEstimateProducts(estimate.id));
        
        Promise.all(promises)
          .then(productsResults => {
            estimates.forEach((estimate, index) => {
              estimate.products = productsResults[index];
            });
            
            resolve(estimates);
          })
          .catch(err => reject(err));
      });
    });
  }
}

// Export a singleton instance of the database
const db = new SqliteDatabase();
module.exports = db; 
const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const db = require('./src/utils/database');
const initializeSocket = require('./server-socket');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Initialize Socket.io
const io = initializeSocket(server);

// Enable CORS with specific options for PWA
app.use(cors({
  origin: ['http://localhost:3001', 'https://your-production-pwa-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Serve static files from src directory
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.json());

// Make io available to all routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

// Authentication endpoint for PWA
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await db.getUserByCredentials(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Don't send password back to client
    delete user.password;
    
    res.json({ 
      success: true, 
      user,
      message: 'Login successful' 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// API Routes
app.get('/api/estimates', async (req, res) => {
  try {
    const estimates = await db.getEstimates();
    res.json(estimates);
  } catch (error) {
    console.error('Error getting estimates:', error);
    res.status(500).json({ error: 'Failed to get estimates' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAll('products');
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

app.post('/api/estimates', async (req, res) => {
  try {
    const newEstimate = await db.add('estimates', req.body);
    res.status(201).json(newEstimate);
  } catch (error) {
    console.error('Error adding estimate:', error);
    res.status(500).json({ error: 'Failed to add estimate' });
  }
});

app.get('/api/estimates/:id', async (req, res) => {
  try {
    const estimate = await db.getEstimateById(req.params.id);
    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }
    res.json(estimate);
  } catch (error) {
    console.error('Error getting estimate:', error);
    res.status(500).json({ error: 'Failed to get estimate' });
  }
});

app.put('/api/estimates/:id', async (req, res) => {
  try {
    const updatedEstimate = await db.update('estimates', req.params.id, req.body);
    res.json(updatedEstimate);
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

app.patch('/api/estimates/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedEstimate = await db.update('estimates', req.params.id, { status });
    res.json(updatedEstimate);
  } catch (error) {
    console.error('Error updating estimate status:', error);
    res.status(500).json({ error: 'Failed to update estimate status' });
  }
});

// Add additional API routes for vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await db.getAll('vendors');
    res.json(vendors);
  } catch (error) {
    console.error('Error getting vendors:', error);
    res.status(500).json({ error: 'Failed to get vendors' });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const newVendor = await db.add('vendors', req.body);
    res.status(201).json(newVendor);
  } catch (error) {
    console.error('Error adding vendor:', error);
    res.status(500).json({ error: 'Failed to add vendor' });
  }
});

app.put('/api/vendors/:id', async (req, res) => {
  try {
    const updatedVendor = await db.update('vendors', req.params.id, req.body);
    res.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    await db.delete('vendors', req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Add API routes for inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await db.getAll('inventory');
    res.json(inventory);
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Add API routes for customers
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.getAll('customers');
    res.json(customers);
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const customerData = req.body;
    
    // Auto-generate customer_ref_id if not provided
    if (!customerData.customer_ref_id) {
      const lastCustomer = await db.db.collection('customers').findOne(
        {},
        { sort: { _id: -1 } }
      );
      
      let lastId = 1000;
      if (lastCustomer && lastCustomer.customer_ref_id) {
        const numId = parseInt(lastCustomer.customer_ref_id);
        if (!isNaN(numId)) {
          lastId = numId;
        }
      }
      
      customerData.customer_ref_id = (lastId + 1).toString();
    }
    
    const newCustomer = await db.add('customers', customerData);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const updatedCustomer = await db.update('customers', req.params.id, req.body);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.delete('customers', req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getAll('orders');
    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Only start the server if this file is run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Socket.io ready for real-time connections`);
    console.log(`========================================\n`);
  });
}

module.exports = { app, server, io }; 
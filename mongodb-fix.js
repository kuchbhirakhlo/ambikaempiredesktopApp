// MongoDB SSL Fix Script
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Get the MongoDB connection string from configuration
const mongoConfigFile = path.join(__dirname, 'src', 'utils', 'mongodb-config.js');
const mongoConfig = require(mongoConfigFile);

// Update the connection string to disable SSL verification
function updateConnectionString() {
  try {
    // Read the current configuration file
    const configContent = fs.readFileSync(mongoConfigFile, 'utf8');
    
    // Extract the connection string
    const originalConnectionString = mongoConfig.connectionUrl;
    
    // Create a new connection string with SSL parameters
    // Parse the base URL without existing query parameters
    const baseUrl = originalConnectionString.split('?')[0];
    
    // Create a new connection string with the SSL parameters
    const newConnectionString = `${baseUrl}?retryWrites=true&w=majority&appName=Cluster0&ssl=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=5000`;
    
    // Replace the connection string in the file
    const updatedContent = configContent.replace(
      /connectionUrl:.*/,
      `connectionUrl: "${newConnectionString}",`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(mongoConfigFile, updatedContent, 'utf8');
    
    console.log('✅ MongoDB connection string updated successfully with SSL parameters');
    console.log('Original: ' + originalConnectionString);
    console.log('Updated: ' + newConnectionString);
    
    // Test the updated connection
    testConnection(newConnectionString);
  } catch (error) {
    console.error('Error updating MongoDB configuration:', error);
  }
}

// Test the connection with the updated string
async function testConnection(connectionString) {
  console.log('\nTesting MongoDB connection...');
  
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 5000
  };
  
  try {
    const client = new MongoClient(connectionString, options);
    await client.connect();
    console.log('✅ MongoDB connection successful!');
    await client.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('\nSuggested solutions:');
    console.log('1. Check if your MongoDB Atlas cluster is running and accessible');
    console.log('2. Verify your IP address is whitelisted in MongoDB Atlas Network Access settings');
    console.log('3. Ensure your username and password are correct');
    console.log('4. To run the application in offline mode, edit src/utils/mongodb-sync.js and set isOffline = true');
  }
}

// Run the update
updateConnectionString(); 
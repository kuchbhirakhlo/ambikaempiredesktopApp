// Script to enable offline mode by setting isOffline flag to true
const path = require('path');
const fs = require('fs');

// Get the MongoDB sync module file path
const mongoSyncFile = path.join(__dirname, 'src', 'utils', 'mongodb-sync.js');

// Update the file to enable offline mode
function enableOfflineMode() {
  try {
    // Read the current file content
    const fileContent = fs.readFileSync(mongoSyncFile, 'utf8');
    
    // Replace the isOffline = false with isOffline = true
    const updatedContent = fileContent.replace(
      /this.isOffline = false/,
      'this.isOffline = true // Set to true to force offline mode'
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(mongoSyncFile, updatedContent, 'utf8');
    
    console.log('✅ Offline mode enabled successfully');
    console.log('The application will now run in offline mode and will not attempt to connect to MongoDB.');
    console.log('To disable offline mode, edit src/utils/mongodb-sync.js and set isOffline back to false.');
  } catch (error) {
    console.error('Error enabling offline mode:', error);
  }
}

// Run the update
enableOfflineMode(); 
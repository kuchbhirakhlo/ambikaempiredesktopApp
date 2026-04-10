# Multi-App MongoDB Synchronization

This setup supports real-time data synchronization between **Electron Desktop App** and **Next.js Web App** using MongoDB Change Streams. Both applications connect to the same MongoDB database and maintain identical data in real-time.

## How It Works

### 1. MongoDB Change Streams
- All applications connect to the same MongoDB database
- Change streams monitor all collections for insert, update, and delete operations
- When data changes in any collection, all connected applications receive notifications

### 2. Real-Time Updates
- Applications automatically refresh their data when changes are detected
- No manual refresh required - data stays synchronized across all apps
- Changes appear immediately in all connected applications

### 3. Supported Operations
- **Insert**: New records are immediately visible in all apps
- **Update**: Modified records are updated in real-time across all apps
- **Delete**: Deleted records are removed from all app interfaces

### 4. Collections Monitored
The following collections are monitored for changes:
- `users` - User management
- `products` - Product catalog
- `inventory` - Stock levels
- `orders` - Purchase orders
- `order_items` - Order line items
- `estimates` - Customer estimates
- `estimate_products` - Estimate line items
- `customers` - Customer information
- `agents` - Sales agents
- `vendors` - Supplier information
- `transactions` - Financial transactions

### 5. Synchronization Features

#### Cross-Application Synchronization
- **Electron Desktop App** ↔ **Next.js Web App** real-time sync
- Changes made in one app appear instantly in the other
- Both apps share the exact same MongoDB database
- No data duplication or inconsistency issues

#### Automatic Connection
- Both apps automatically connect to the same MongoDB instance
- Change streams are established for all monitored collections
- Connection health is monitored and automatically recovered
- Apps can run simultaneously on different devices/networks

#### Data Consistency
- Both apps see identical data at all times
- No local caching that could cause inconsistencies
- Changes from either app are immediately reflected in both
- Perfect synchronization across desktop and web platforms

#### Error Handling
- Connection failures are handled gracefully
- Apps continue to function even if synchronization is temporarily unavailable
- Automatic reconnection when MongoDB becomes available

### 6. Testing Synchronization

To verify synchronization is working:

1. Open multiple instances of the application
2. Make changes in one instance (add/edit/delete records)
3. Observe that changes appear immediately in other instances
4. Check browser console for synchronization logs

### 7. Troubleshooting

#### General Synchronization Issues:
1. **Check MongoDB Connection**: Ensure both apps can connect to the same MongoDB instance
2. **Verify Change Streams**: MongoDB must support change streams (version 3.6+)
3. **Check Network**: Both apps must have network access to MongoDB
4. **Review Logs**: Check console logs for synchronization events

#### Cross-App Synchronization Issues:
1. **Same Database**: Ensure both Electron and Next.js apps use identical MongoDB connection strings
2. **Simultaneous Connections**: Verify both apps can connect to MongoDB at the same time
3. **Change Stream Conflicts**: MongoDB handles multiple change stream connections automatically
4. **Data Verification**: Use the `verifySync()` function in both apps to compare data states

#### Testing Synchronization Between Apps:
```javascript
// In Electron app console:
const electronData = await verifySync();

// In Next.js app console:
// (You'll need similar verification function)
const nextjsData = await verifySync();

// Compare the data
await compareWithOtherApp(nextjsData);
```

### 8. Technical Details

- **Change Stream Configuration**: Uses `fullDocument: 'updateLookup'` to get complete document data
- **Resume After**: Configured to resume from last seen change on reconnection
- **Connection Pooling**: Maintains persistent connections for optimal performance
- **Event Emission**: Emits both general and collection-specific change events

This ensures that when data is inserted or updated in MongoDB from any application, all other connected applications will immediately see and reflect those changes.</content>
<parameter name="filePath">MULTI_APP_SYNC.md
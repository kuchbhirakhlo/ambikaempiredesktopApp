// Script to only clear browser localStorage, to be run from Developer Tools console in the app

// Clear all application data from localStorage
localStorage.removeItem('orders');
localStorage.removeItem('estimates');
localStorage.removeItem('inventory');
localStorage.removeItem('products');
localStorage.removeItem('customers');
localStorage.removeItem('agents');
localStorage.removeItem('transactions');

// Clear any cache timestamps
localStorage.removeItem('product-update-timestamp');
localStorage.removeItem('order-update-timestamp');
localStorage.removeItem('estimate-update-timestamp');
localStorage.removeItem('estimate-update-action');
localStorage.removeItem('estimate-update-data');

console.log('✓ All localStorage data has been cleared.');
console.log('✓ Please reload the application to see the changes.'); 
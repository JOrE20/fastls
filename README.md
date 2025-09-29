# FastLS 🚀

A fast, feature-rich localStorage wrapper with nested object support, serialization, and advanced querying capabilities.

## Features

- 🔧 **Nested Object Support** - Access properties using dot notation
- 🚀 **Batch Operations** - Multiple get/set/remove operations
- 🔍 **Advanced Querying** - Search by value, key pattern, or custom predicates
- 💾 **Smart Serialization** - Automatic JSON serialization with safety options
- 🗃️ **Multiple Databases** - Isolated storage namespaces
- 📊 **Export/Import** - Backup and restore functionality
- 🛡️ **Error Handling** - Comprehensive error handling and validation
- 📏 **Size Tracking** - Monitor storage usage

## Installation

```bash
npm install fastls
```

## Quick Start
```javascript
import FastLS from 'fastls';

// Create instance
const storage = new FastLS('myApp');

// Basic operations
storage.set('user', { name: 'John', age: 30 });
const user = storage.get('user');
console.log(user); // { name: 'John', age: 30 }

// Nested properties
storage.set('user', 'Jane', 'name');
storage.set('user', 25, 'settings.theme');

// Batch operations
storage.setMultiple([
  ['key1', 'value1'],
  ['key2', { nested: 'value' }]
]);
```

## API Documentation
### Constructor
```javascript
const storage = new FastLS(databaseName, allowUnserializable = false);
```
#### Parameters:

* **databaseName** (string): Unique name for your database
* **allowUnserializable** (boolean): Allow functions/Promises in storage (default: false)

## Core Methods
### Get Values
```javascript
// Get entire value
storage.get('key');

// Get nested property
storage.get('user', 'profile.name');
storage.get('data', 'items[0].title');
```
## Set Values
```javascript
// Set entire value
storage.set('key', { any: 'value' });

// Set nested property
storage.set('user', 'Jane', 'profile.name');
storage.set('data', 'New Title', 'items[0].title');
```

## Remove Data
```javascript
// Remove entire key
storage.removeKey('user');

// Remove nested property
storage.removePath('user', 'profile.name');

// Remove database
storage.removeDB();

// Clear all data in current database
storage.clear();
```

## Batch Operations
```javascript
// Set multiple values
storage.setMultiple([
  ['key1', 'value1'],
  ['key2', 'value2'],
  ['user', { name: 'John' }]
]);

// Get multiple values
const results = storage.getMultiple(['key1', 'key2', 'user']);

// Remove multiple keys
storage.removeMultiple(['key1', 'key2']);
```
## Advanced Querying
``` javascript
// Search with custom predicate
const results = storage.search(entry => 
  entry.value?.age > 25
);

// Find by value
const users = storage.findByValue({ role: 'admin' });

// Find by key pattern
const tempData = storage.findByKeyPattern(/^temp_/);

// Find by value pattern
const emails = storage.findByValuePattern(/@gmail\.com$/);
```
## Utility Methods
```javascript
// Check if key exists
storage.has('user');

// Get all keys
const allKeys = storage.keys();

// Get all values
const allValues = storage.values();

// Get all entries
const allEntries = storage.entries();

// Get item count
const itemCount = storage.count();

// Get storage size in bytes
const storageSize = storage.size();
```
## Database Management
```javascript
// List all databases
const databases = FastLS.listDatabases();

// Remove all databases (static method)
FastLS.removeAllDatabases();

// Export/Import data
const backup = storage.export();
storage.import(backupData);
```
# Advanced Examples
## Complex Nested Structures
```javascript
const storage = new FastLS('complexApp');

// Store complex nested data
storage.set('appState', {
  user: {
    profile: {
      name: 'John',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    }
  },
  session: {
    tokens: {
      access: 'abc123',
      refresh: 'def456'
    }
  }
});

// Access deeply nested values
const theme = storage.get('appState', 'user.profile.preferences.theme');
const accessToken = storage.get('appState', 'session.tokens.access');

// Update nested values
storage.set('appState', 'light', 'user.profile.preferences.theme');
Search and Filter
javascript
// Find all users with admin role
const admins = storage.search(entry => 
  entry.value?.role === 'admin'
);

// Find large data entries
const largeEntries = storage.search(entry =>
  JSON.stringify(entry.value).length > 1000
);

// Find by complex conditions
const recentUsers = storage.search(entry =>
  entry.value?.lastLogin && 
  new Date(entry.value.lastLogin) > new Date('2024-01-01')
);
```
## Batch Processing
```javascript
// Initialize with multiple values
storage.setMultiple([
  ['config', { theme: 'dark', language: 'en' }],
  ['userData', { name: 'Alice', visits: 0 }],
  ['cache', { timestamp: Date.now(), data: [] }]
]);

// Bulk update
const updates = storage.entries()
  .filter(([key, value]) => value.timestamp)
  .map(([key, value]) => [key, { ...value, updated: true }]);

storage.setMultiple(updates);
```
## Error Handling
```javascript
try {
  const storage = new FastLS('myApp');
  storage.set('data', { complex: 'object' });
} catch (error) {
  console.error('Storage error:', error);
}

// Methods return error messages on failure
const error = storage.set('key', circularReference);
if (error) {
  console.error('Failed to set value:', error);
}
```
## Browser Support
FastLS works in all modern browsers that support: localStorage, JSON.parse/JSON.stringify and ES6+ features

## Performance Tips
* Use batch operations for multiple reads/writes
* Avoid circular references in stored objects
* Use specific paths instead of getting entire objects
* Regularly clean up unused data with removeMultiple()

## License
MIT License

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

**Made with ❤️ for the JavaScript community**

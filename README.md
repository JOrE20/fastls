# FastLS 🚀

[![npm version](https://img.shields.io/npm/v/fastls.svg)](https://www.npmjs.com/package/fastls)
[![npm downloads](https://img.shields.io/npm/dm/fastls.svg)](https://www.npmjs.com/package/fastls)
[![bundle size](https://img.shields.io/bundlephobia/min/fastls)](https://bundlephobia.com/package/fastls)
[![license](https://img.shields.io/npm/l/fastls.svg)](https://github.com/JOrE20/fastls/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**FastLS** is a revolutionary JavaScript library that provides a unified, high-performance interface for client-side storage with advanced features like folder structures, cross-database access, shortcuts, and multiple storage backends.

## 🌟 Features

- **Multiple Storage Backends**: localStorage, IndexedDB, and custom storage
- **Advanced Folder System**: Nested folder structures with intuitive path navigation
- **Cross-Database Access**: Access data across different databases seamlessly
- **Smart Shortcuts**: Create aliases for complex paths
- **Powerful Search**: Advanced search and path finding capabilities
- **Flexible Data Types**: Support for functions, objects, arrays, and more
- **Compression**: Optional GZIP compression for storage efficiency
- **Case Sensitivity**: Configurable key case sensitivity
- **Tiny Package & Zero Dependencies**: This package wouldn't ever has a dependency and it could be as small as 4KB (gzipped) or 15KB (minified), and never slowdown your page at all.

## 📦 Installation

#### npm
```bash
npm install fastls
```

#### yarn
```bash
yarn add fastls
```

#### pnpm
```bash
pnpm add fastls
```

## 🚀 Quick Start

```javascript
import FastLS from 'fastls';

// Basic usage
const db = new FastLS('my-database');

// Store data
db.set('user.profile.name', 'John Doe'); // No await for simple usage!
db.set('user.profile.age', 30);

// Retrieve data
const userName = db.get('user.profile.name'); // 'John Doe'

// Use folders
db.set('documents/reports/Q1.data', { revenue: 50000, profit: 15000 });

// Create shortcuts
db.setShortcut('q1-report', 'documents/reports/Q1.data');
const report = db.get('q1-report'); // { revenue: 50000, profit: 15000 }
```

## Change Log

### v1.0
* Initial release

### v2.0 (Major)
* Storage backends (IndexedDB, localStorage and CustomDB)
* Cross-database access
* Shortcuts, folders and nesting folders
* Added quotas
* Supports error handling and a much smarter way to remove keys.


### v2.1 (Minor)
* Can now save blobs.
* `auto:` prefix automatically uses IndexedDB or localStorage if IndexedDB is not usable. A await is needed even if localStorage picked.
* The usage of `\` character was problematic because the special usage in JavaScript. You can also use `/` for going into folders.
* Added gzipped version of library. It's as tiny as 4KB (vs 30KB original code)!
* There is `db.clean(path, checker, inputKey)`. Given a path, and a checker like `v => v.includes('_clean_if_old')` or anything else, it removes keys which your function returned `true` for them. `inputKey` tells include key as a function parameter or not. Do not use a random condition!
* **A major bug fixed. This tool wouldn't ever work at all.**

### v2.1.1 (Patch)
* No feature were added or removed - just this library **fully** tested and fixed all bugs.
* The documention updated and corrected.

## 📚 Storage Backends
### localStorage (Default)
```javascript
const db = new FastLS('my-app-data');
```
### IndexedDB
```javascript
const db = new FastLS('indexeddb:large-dataset');
// or use the alias
const db = new FastLS('kv:large-dataset');
```

### Custom Storage
```javascript
const db = new FastLS('customdb:external-storage');
// Use db.data to get/set the serialized data, and regularry save data and load on creation or database becomes empty!
```
## 🗂️ Folder System
FastLS introduces a powerful folder system that organizes your data hierarchically:

```javascript
// Create nested folder structures
db.set('company/departments/engineering/team.lead', 'Alice');
db.set('company/departments/engineering/team.members', 15);
db.set('company/departments/marketing/budget', 50000);

// Create a folder structure (empty, without keys)
db.createFolder('company/employees/engineering')

// Navigate using parent directory
const engineeringLead = db.get('company/departments/marketing/../engineering/team.lead'); // 'Alice'

// Access root
const rootData = db.get('/company/departments');
```

## Path Validation
Paths cannot contain `:`, `\` or `/` (v2.1+) characters in key names, and cannot be exactly `..`.

## 🔗 Shortcuts
Create convenient aliases for complex paths:

```javascript
db.setShortcut('eng-team', 'company/departments/engineering/team');
db.setShortcut('mkt-budget', 'company/departments/marketing/budget');

const team = db.get('eng-team'); // { lead: 'Alice', members: 15 }
const budget = db.get('mkt-budget'); // 50000
```

## 🔍 Advanced Search
### Search by Value
```javascript
const users = {
  alice: { age: 28, role: 'admin' },
  bob: { age: 32, role: 'user' },
  charlie: { age: 25, role: 'admin' }
};

db.set('company/users', users);

// Find all admins
const admins = db.search('company/users', user => user.role === 'admin');
// [{ age: 28, role: 'admin' }, { age: 25, role: 'admin' }]
```
### Search with Keys
```javascript
// Find users with age > 30 and key containing 'bob'
const results = db.search(
  'company/users', 
  (key, value) => value.age > 30 && key.includes('bob'),
  true // include key in predicate
);
```
### Find Paths
```javascript
// Find the path to users with age 25
const path = db.path('company/users', user => user.age === 25);
// 'charlie'
```

## 🗂️ Quotas 

`db.setQuota(123456)` - limit the global usage of database in bytes
`db.removeQuota()` - remove current quotas limit
`db.setFolderQuota('folder/folder 2', bytes)` - set quota to only a specified folder (less than global limit to be meaningful)
`db.quotaMessage` - `'meet'` if successfully increased database size (e.g., by `db.set()`) or `'cannotSave` if the key or it's name couldn't ever saved at all.

## 🗑️ Flexible Removal
FastLS provides multiple removal strategies:

```javascript
// Remove specific key
db.removeKey('company/departments/engineering/team.lead');

// Remove entire folder and contents
db.remove('company/departments/engineering', 'folder');

// Remove only root keys, keep folder structure
db.remove('company/departments', 'root');

// Delete folder contents but keep structure
db.remove('company/departments', 'structure');

// Keep root keys, delete nested folders
db.remove('company/departments', 'nestedFolders');

// Clear entire database
db.remove(null, 'database');

// Clear all keys but keep database
db.remove(null, 'databaseKeys');

// Batch operations
db.remove(
  'company/departments/engineering', 'nestedFolders',
  'company/departments/marketing', 'root'
);
```

## 🌐 Cross-Database Access
Access data across different databases:

```javascript
const mainDB = new FastLS('main-database');
const analyticsDB = new FastLS('analytics-data');

// Store data in analytics DB
analyticsDB.set('page-views.home', 1500);

// Access from main DB
const views = mainDB.get('analytics-data:page-views.home'); // 1500
```
## 💾 Custom Storage & File Operations
```javascript
const customDB = new FastLS('customdb:external');

// Get serialized data for external storage
const serializedData = customDB.data;

// Set data from external source
customDB.data = serializedData;

// Download database as file
customDB.downloadDB('backup.db');

// Upload database from file
customDB.uploadDB('backup.db');
```
## ⚙️ Configuration
### Constructor Options
```javascript
const db = new FastLS(databaseName, gzipped, caseSen, useAsync);
```

* **databaseName**: Name of the database with optional prefix (indexeddb: or kv:, customdb:)
* **gzipped**: Enable GZIP compression (default: false)
* **caseSen**: Key case sensitivity (default: true)
* **useAsync**: Whatever to instead of simple function calls, return a promise which **must** to used via `await db.function(params)`. Only these functions return promise (others always direct call without needing to use via await) even when `useAsync` is `true`:

##### Core CRUD operations
`get(fullPath)`                
`set(fullPath, value)`      
`setShortcut(shortcutName, targetPath)`

##### Search operations  
`search(path, predicate, includeKey = false) `
`path(path, predicate, includeKey = false)`

##### Removal operations
`remove(...operations)`            
`removeKey(fullPath)`            

##### Utility methods
`has(fullPath)`         
`keys()`                       
`values()`                         
`entries()`                      
`clear()`                    
`size()`                           
`count()`                          

##### Internal methods (not typically called directly)
`_getDatabase()`              
`_saveDatabase(db)`             
`_initIndexedDB()`     

**⚠️ Important Notice: IndexedDB operations cannot be turly synchronous because the browser woudln't allow synchronous IndexedDB usage for example because IndexedDB is slow due to disk I/O and makes UI freezing. So, even if `useAsync` is `false`, and the database is set to use IndexedDB, you get a warning and this still needs `await`, regardless of `useAsync`.**

## Examples
```javascript
// Compressed IndexedDB with case-insensitive keys
const db1 = new FastLS('indexeddb:app-data', true, false);

// Custom storage with compression
const db2 = new FastLS('customdb:mobile-storage', true, true);

// Standard localStorage
const db3 = new FastLS('simple-app');
```

## 📊 Feature Comparison

|Feature|Classic localStorage |Classic IndexedDB| Dexie.js | localStorage + JSON | FastLS | FastLS (IndexedDB) |
| - | - | - | - | - | - | - |
|Folder Support|❌|❌|❌|❌|✅|✅|
|Cross-DB Access|❌|❌|❌|❌|✅|✅|
|Shortcuts|❌|❌|❌|❌|✅|✅|
|Path Navigation|❌|❌|❌|❌|✅|✅|
|Advanced Search|❌|❌|⚠️|❌|✅|✅|
|Function Storage|❌|❌|❌|❌|✅|✅|
|Compression|❌|❌|❌|❌|✅|✅|
|Multiple Backends|❌|❌|❌|❌|✅|✅|
|Case Sensitivity|✅|✅|✅|✅|🔧|🔧|
|Storage Limit|5-10MB|50% disk|50% disk|5-10MB|5-10MB|50% disk|
|Performance|⚡|🐢|🚀|⚡|⚡|🚀|
🔧 = Configurable

## 🔧 API Reference
### Core Methods
`get(fullPath)`
Retrieve data from a path. Supports cross-database access.

`set(fullPath, value)`
Store data at a path. Creates necessary folder structure.

`setShortcut(shortcutName, targetPath)`
Create a shortcut to a complex path.

`search(path, predicate, includeKey = false)`
Search for values matching a predicate function.

`path(path, predicate, includeKey = false)`
Find the path to values matching a predicate function.

`remove(...operations)`
Remove data with flexible deletion strategies.

`removeKey(fullPath)`
Remove a specific key/path.

### Utility Methods

`has(fullPath)`
Check if a path exists.

`keys(), values(), entries()`
Get all keys, values, or entries.

`clear()`
Clear all data in the database.

`size()`
Get the storage size in bytes.

`count()`
Get the number of keys.

### File Operations (CustomDB only)

`downloadDB(filename, base64Encoded = true)`
Download database as a file.

`uploadDB(filename, base64Encoded = true)`
Upload database from a file.

### 🛠️ Advanced Usage
#### Function Storage
```javascript
// Store functions (saved as parameters)
const multiplier = (a, b) => a * b;
db.set('math/operations/multiply', multiplier);

// Later retrieve and use
const storedFunc = db.get('math/operations/multiply');
const result = storedFunc(5, 3); // 15
```

### Complex Data Structures
```javascript
db.set('app/data/users[0].profile', {
  name: 'Alice',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});

db.set('app/data/users[1].profile.name', 'Bob');
const user = db.get('app/data/users[0].profile.preferences.theme'); // 'dark'
```

### Batch Operations
```javascript
// Multiple operations in sequence
db.set('data/key1', 'value1');
db.set('data/key2', 'value2');
db.setShortcut('quick1', 'data/key1');
```

## 🚨 Error Handling
```javascript
try {
  db.set('invalid:path', 'value'); // Throws error due to ':'
} catch (error) {
  console.error('Invalid path:', error.message);
}

try {
  db.set('..', 'value'); // Throws error
} catch (error) {
  console.error('Cannot set parent directory as key');
}
```

## 🔒 Best Practices
* Use IndexedDB for Large Datasets: When storing large amounts of data, use the indexeddb: prefix.
* Organize with Folders: Use folder structures to keep your data organized and maintainable.
* Use Shortcuts for Complex Paths: Create shortcuts for frequently accessed complex paths.
* Enable Compression for Text Data: Use GZIP compression when storing large text data.
* Handle Cross-Database Dependencies: Be mindful of dependencies when accessing data across databases.

## 🌐 Browser Support
FastLS supports all modern browsers:

* Chrome 60+
* Firefox 55+
* Safari 11+
* Edge 79+

**Requirements:**

* Storage enabled (except for CustomDB mode)
* localStorage (for default mode)
* indexedDB (for IndexedDB mode)
* pako (optional, for compression - automatically used if available)

## 📈 Performance Tips

**Use Appropriate Storage Backend:**
* Small data: localStorage (faster)
* Large data: IndexedDB (more capacity)

**Use Fast Options:**
* Enable Compression for Text: Reduces storage size by 60-80% for text data.
* Use Case-Insensitive Keys: When appropriate, for faster lookups.
* Batch Related Operations: Group related set/update operations.

## 🤝 Contributing
We welcome contributions! Feel free to submit a pull request.

## 📄 License
MIT License

**FastLS - Because storage should be fast, flexible, and frustration-free! 🚀**

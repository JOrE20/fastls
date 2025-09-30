class FastLS {
    constructor(databaseName, gzipped = false, caseSen = true, useAsync = false) {
        // Handle undefined or null databaseName
        if (databaseName === undefined || databaseName === null) {
            throw new Error('Database name is required');
        }
        
        this.dbName = String(databaseName).replace(/^(customdb:|indexeddb:|kv:)/i, '');
        this.gzipped = gzipped;
        this.caseSen = caseSen;
        this.useAsync = useAsync;
        this.rootStorageKey = 'fastLS';
        this.useIndexedDB = /^(indexeddb:|kv:)/i.test(databaseName);
        this.useCustomDB = /^customdb:/i.test(databaseName);
        this.useLocalStorage = !this.useIndexedDB && !this.useCustomDB;
        
        // Initialize custom data storage
        this._customData = '';
        
        // Initialize quota system
        this.quota = null;
        this.folderQuotas = new Map();
        this.quotaMessage = null;
        
        // Initialize based on storage type
        if (this.useLocalStorage) {
            this._initLocalStorage();
        } else if (this.useIndexedDB) {
            this._initIndexedDB();
        }
        // CustomDB doesn't need initialization
    }

    // Initialization methods
    _initLocalStorage() {
        if (!localStorage.getItem(this.rootStorageKey)) {
            localStorage.setItem(this.rootStorageKey, this._serializeData({}));
        }
        
        const root = this._getRoot();
        if (!root[this.dbName]) {
            root[this.dbName] = {};
            this._saveRoot(root);
        }
    }

    async _initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FastLS_IndexedDB', 1);
            
            request.onerror = () => reject(new Error('IndexedDB initialization failed'));
            request.onsuccess = (event) => {
                this.idb = event.target.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('databases')) {
                    db.createObjectStore('databases', { keyPath: 'name' });
                }
            };
        });
    }

    // Quota Management
    setQuota(bytes) {
        this.quota = bytes;
        this.quotaMessage = null;
        return null;
    }

    removeQuota() {
        this.quota = null;
        this.quotaMessage = null;
        return null;
    }

    setFolderQuota(folderPath, bytes) {
        const normalizedPath = this._normalizePath(folderPath);
        this.folderQuotas.set(normalizedPath, bytes);
        this.quotaMessage = null;
        return null;
    }

    removeFolderQuota(folderPath) {
        const normalizedPath = this._normalizePath(folderPath);
        this.folderQuotas.delete(normalizedPath);
        this.quotaMessage = null;
        return null;
    }

    // Quota checking methods
    _calculateSize(data) {
        return new Blob([this._serializeData(data)]).size;
    }

    _checkQuotaBeforeSet(db, path, value) {
        this.quotaMessage = null;
        
        // Check folder quotas first
        for (const [folderPath, quota] of this.folderQuotas.entries()) {
            if (path.startsWith(folderPath + '\\') || path === folderPath) {
                const currentFolderSize = this._calculateFolderSize(db, folderPath);
                const newValueSize = this._calculateSize(value);
                const currentPathSize = db[path] ? this._calculateSize(db[path]) : 0;
                const projectedSize = currentFolderSize - currentPathSize + newValueSize;
                
                if (projectedSize > quota) {
                    if (newValueSize <= quota) {
                        // Can store as null
                        this.quotaMessage = 'storedNull';
                        return { allowed: true, storeNull: true };
                    } else {
                        // Cannot store at all
                        this.quotaMessage = 'cannotSave';
                        return { allowed: false };
                    }
                }
                break;
            }
        }
        
        // Check global quota
        if (this.quota !== null) {
            const currentSize = this._calculateSize(db);
            const newValueSize = this._calculateSize(value);
            const currentPathSize = db[path] ? this._calculateSize(db[path]) : 0;
            const projectedSize = currentSize - currentPathSize + newValueSize;
            
            if (projectedSize > this.quota) {
                if (newValueSize <= this.quota) {
                    // Can store as null
                    this.quotaMessage = 'storedNull';
                    return { allowed: true, storeNull: true };
                } else {
                    // Cannot store at all
                    this.quotaMessage = 'cannotSave';
                    return { allowed: false };
                }
            } else if (projectedSize === this.quota) {
                this.quotaMessage = 'meet';
            }
        }
        
        return { allowed: true, storeNull: false };
    }

    _calculateFolderSize(db, folderPath) {
        let totalSize = 0;
        for (const [key, value] of Object.entries(db)) {
            if (key.startsWith(folderPath + '\\') || key === folderPath) {
                totalSize += this._calculateSize(value);
            }
        }
        return totalSize;
    }

    // Root storage management
    _getRoot() {
        try {
            if (this.useLocalStorage) {
                const data = localStorage.getItem(this.rootStorageKey);
                return data ? this._deserializeData(data) : {};
            }
            return {};
        } catch {
            return {};
        }
    }

    _saveRoot(root) {
        try {
            if (this.useLocalStorage) {
                localStorage.setItem(this.rootStorageKey, this._serializeData(root));
            }
            return null;
        } catch (error) {
            return error.message;
        }
    }

    async _getDatabase() {
        if (this.useLocalStorage && !this.useAsync) {
            // Synchronous mode for localStorage
            const root = this._getRoot();
            return root[this.dbName] || {};
        } else if (this.useLocalStorage && this.useAsync) {
            // Async mode for localStorage (simulated)
            return new Promise((resolve) => {
                setTimeout(() => {
                    const root = this._getRoot();
                    resolve(root[this.dbName] || {});
                }, 0);
            });
        } else if (this.useIndexedDB) {
            if (!this.idb) {
                await this._initIndexedDB();
            }
            return new Promise((resolve, reject) => {
                const transaction = this.idb.transaction(['databases'], 'readonly');
                const store = transaction.objectStore('databases');
                const request = store.get(this.dbName);
                
                request.onerror = () => reject(new Error('IndexedDB read failed'));
                request.onsuccess = (event) => {
                    resolve(event.target.result ? event.target.result.data : {});
                };
            });
        } else if (this.useCustomDB) {
            if (this.useAsync) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(this._customData ? this._deserializeData(this._customData) : {});
                    }, 0);
                });
            } else {
                return this._customData ? this._deserializeData(this._customData) : {};
            }
        }
    }

    async _saveDatabase(db) {
        if (this.useLocalStorage && !this.useAsync) {
            // Synchronous mode for localStorage
            const root = this._getRoot();
            root[this.dbName] = db;
            return this._saveRoot(root);
        } else if (this.useLocalStorage && this.useAsync) {
            // Async mode for localStorage (simulated)
            return new Promise((resolve) => {
                setTimeout(() => {
                    const root = this._getRoot();
                    root[this.dbName] = db;
                    const result = this._saveRoot(root);
                    resolve(result);
                }, 0);
            });
        } else if (this.useIndexedDB) {
            if (!this.idb) {
                await this._initIndexedDB();
            }
            return new Promise((resolve, reject) => {
                const transaction = this.idb.transaction(['databases'], 'readwrite');
                const store = transaction.objectStore('databases');
                const request = store.put({ name: this.dbName, data: db });
                
                request.onerror = () => reject(new Error('IndexedDB write failed'));
                request.onsuccess = () => resolve(null);
            });
        } else if (this.useCustomDB) {
            if (this.useAsync) {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        this._customData = this._serializeData(db);
                        resolve(null);
                    }, 0);
                });
            } else {
                this._customData = this._serializeData(db);
                return null;
            }
        }
    }

    // Helper method to handle async/sync execution
    _executeSync(operation) {
        if (this.useLocalStorage && !this.useIndexedDB) {
            // For localStorage in sync mode, we can execute operations directly
            try {
                // This is a simplified sync execution - in reality, we'd need to handle promises
                // For now, we'll use a simple approach that works for basic cases
                let result;
                const root = this._getRoot();
                const db = root[this.dbName] || {};
                
                // For get operations, we can handle them directly
                if (operation.name === 'getOperation') {
                    const { path } = this._parseFullPath(arguments[0]);
                    const directValue = db[path];
                    if (directValue && directValue.__fastls_exception_shortcut) {
                        return this.get(directValue.__fastls_exception_shortcut);
                    }
                    return this._getValueByPath(db, path);
                }
                
                // For set operations
                if (operation.name === 'setOperation') {
                    const { path } = this._parseFullPath(arguments[0]);
                    const value = arguments[1];
                    
                    // Check quota before setting
                    const quotaCheck = this._checkQuotaBeforeSet(db, path, value);
                    if (!quotaCheck.allowed) {
                        return quotaCheck;
                    }
                    
                    const valueToStore = quotaCheck.storeNull ? null : value;
                    const updatedDB = this._setValueByPath(db, path, valueToStore);
                    root[this.dbName] = updatedDB;
                    this._saveRoot(root);
                    return quotaCheck;
                }
                
                return result;
            } catch (error) {
                console.error('Sync operation error:', error);
                return undefined;
            }
        } else {
            // For IndexedDB or async-required operations, we can't truly be synchronous
            console.warn('Synchronous mode not fully supported for IndexedDB. Some operations may not work as expected.');
            let result;
            operation().then(res => result = res).catch(err => { throw err; });
            return result;
        }
    }

    // Serialization with special format
    _serializeData(data) {
        const serialized = JSON.stringify(data, (key, value) => {
            if (typeof value === 'function') {
                const funcString = value.toString();
                const paramsMatch = funcString.match(/\((.*?)\)/);
                const params = paramsMatch ? paramsMatch[1] : '';
                return { __fastls_exception_function: `function(${params})` };
            }
            if (value && value.__fastls_exception_shortcut) {
                return value;
            }
            return value;
        });

        if (this.gzipped && typeof window !== 'undefined' && window.pako) {
            return btoa(String.fromCharCode(...pako.gzip(serialized)));
        }
        return serialized;
    }

    _deserializeData(data) {
        if (!data) return {};
        
        let processedData = data;
        
        if (this.gzipped && typeof window !== 'undefined' && window.pako) {
            try {
                const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
                processedData = pako.ungzip(compressed, { to: 'string' });
            } catch (e) {
                // If decompression fails, assume it's not compressed
            }
        }

        try {
            return JSON.parse(processedData, (key, value) => {
                if (value && value.__fastls_exception_function) {
                    // Return a placeholder function that can be identified
                    return { __fastls_function: value.__fastls_exception_function };
                }
                if (value && value.__fastls_exception_shortcut) {
                    return value;
                }
                return value;
            });
        } catch (e) {
            console.error('Deserialization error:', e);
            return {};
        }
    }

    // Path manipulation with folder support
    _normalizePath(path) {
        if (!path || typeof path !== 'string') return '';
        
        // Handle special prefixes and flags
        path = path.replace(/^[^:]+:/, ''); // Remove flag prefixes
        
        // Handle root and parent directory navigation
        let parts = path.split(/[\\/]/);
        let normalized = [];
        
        for (let part of parts) {
            if (part === '..') {
                normalized.pop();
            } else if (part === '' || part === '.') {
                // Skip empty or current directory
            } else {
                normalized.push(part);
            }
        }
        
        return normalized.join('\\');
    }

    _validatePath(path) {
        if (path && (path.includes(':') || path.includes('\\'))) {
            throw new Error('Path cannot contain ":" or "\\" in key names');
        }
        if (path === '..') {
            throw new Error('Path cannot be ".."');
        }
    }

    _parseFullPath(fullPath) {
        if (typeof fullPath !== 'string') return { dbName: null, path: '' };
        
        // Check for database prefix
        const dbMatch = fullPath.match(/^([^:]+):(.*)$/);
        if (dbMatch) {
            return { dbName: dbMatch[1], path: this._normalizePath(dbMatch[2]) };
        }
        
        return { dbName: null, path: this._normalizePath(fullPath) };
    }

    _getValueByPath(obj, path) {
        if (!path || !obj) return obj;
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            
            // Handle array indices
            const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const arrayName = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                if (current[arrayName] && Array.isArray(current[arrayName])) {
                    current = current[arrayName][index];
                } else {
                    return undefined;
                }
            } else {
                // Handle case sensitivity
                if (!this.caseSen && typeof current === 'object') {
                    const foundKey = Object.keys(current).find(k => 
                        k.toLowerCase() === key.toLowerCase()
                    );
                    current = foundKey ? current[foundKey] : undefined;
                } else {
                    current = current[key];
                }
            }
            
            if (current === undefined) break;
        }
        
        return current;
    }

    _setValueByPath(obj, path, value) {
        if (!path) return value;
        
        const keys = path.split('.');
        let current = obj || {};
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            
            // Handle array indices in path
            const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                const arrayName = arrayMatch[1];
                const index = parseInt(arrayMatch[2]);
                
                if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                    current[arrayName] = [];
                }
                
                while (current[arrayName].length <= index) {
                    current[arrayName].push({});
                }
                
                current = current[arrayName][index];
            } else {
                // Handle case sensitivity
                let actualKey = key;
                if (!this.caseSen && typeof current === 'object') {
                    const foundKey = Object.keys(current).find(k => 
                        k.toLowerCase() === key.toLowerCase()
                    );
                    actualKey = foundKey || key;
                }
                
                if (current[actualKey] === null || current[actualKey] === undefined || typeof current[actualKey] !== 'object') {
                    current[actualKey] = {};
                }
                current = current[actualKey];
            }
        }
        
        const lastKey = keys[keys.length - 1];
        const lastArrayMatch = lastKey.match(/(\w+)\[(\d+)\]/);
        
        if (lastArrayMatch) {
            const arrayName = lastArrayMatch[1];
            const index = parseInt(lastArrayMatch[2]);
            
            if (!current[arrayName] || !Array.isArray(current[arrayName])) {
                current[arrayName] = [];
            }
            
            while (current[arrayName].length <= index) {
                current[arrayName].push(undefined);
            }
            
            current[arrayName][index] = value;
        } else {
            // Handle case sensitivity for final key
            let actualKey = lastKey;
            if (!this.caseSen && typeof current === 'object') {
                const foundKey = Object.keys(current).find(k => 
                    k.toLowerCase() === lastKey.toLowerCase()
                );
                actualKey = foundKey || lastKey;
            }
            current[actualKey] = value;
        }
        
        return obj;
    }

    // Core CRUD operations with folder support
    get(fullPath) {
        const operation = async () => {
            try {
                const { dbName, path } = this._parseFullPath(fullPath);
                let targetDB = this;
                
                if (dbName && dbName !== this.dbName) {
                    // Access different database
                    targetDB = new FastLS(dbName, this.gzipped, this.caseSen, this.useAsync);
                    if (targetDB.useIndexedDB) {
                        await targetDB._initIndexedDB();
                    }
                }
                
                const db = await targetDB._getDatabase();
                
                // Handle shortcuts
                const directValue = db[path];
                if (directValue && directValue.__fastls_exception_shortcut) {
                    return targetDB.get(directValue.__fastls_exception_shortcut);
                }
                
                return this._getValueByPath(db, path);
            } catch (error) {
                console.error('FastLS get error:', error);
                return undefined;
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            // For sync mode, use the helper
            operation.name = 'getOperation';
            return this._executeSync(operation);
        }
    }

    set(fullPath, value) {
        const operation = async () => {
            try {
                const { dbName, path } = this._parseFullPath(fullPath);
                if (path) {
                    this._validatePath(path);
                }
                
                let targetDB = this;
                if (dbName && dbName !== this.dbName) {
                    targetDB = new FastLS(dbName, this.gzipped, this.caseSen, this.useAsync);
                    if (targetDB.useIndexedDB) {
                        await targetDB._initIndexedDB();
                    }
                }
                
                const db = await targetDB._getDatabase();
                
                // Check quota before setting
                const quotaCheck = this._checkQuotaBeforeSet(db, path, value);
                if (!quotaCheck.allowed) {
                    return quotaCheck;
                }
                
                const valueToStore = quotaCheck.storeNull ? null : value;
                const updatedDB = this._setValueByPath(db, path, valueToStore);
                const saveResult = await targetDB._saveDatabase(updatedDB);
                
                return {
                    saveResult,
                    quotaCheck,
                    quotaMessage: this.quotaMessage
                };
            } catch (error) {
                console.error('FastLS set error:', error);
                return error.message;
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            // For sync mode, use the helper
            operation.name = 'setOperation';
            return this._executeSync(operation);
        }
    }

    // Shortcut management
    setShortcut(shortcutName, targetPath) {
        return this.set(shortcutName, { 
            __fastls_exception_shortcut: targetPath 
        });
    }

    // Search operations
    search(path, predicate, includeKey = false) {
        const operation = async () => {
            try {
                const db = await this._getDatabase();
                const targetObj = this._getValueByPath(db, path);
                const results = [];
                
                const searchRecursive = (obj, currentPath = '') => {
                    if (obj && typeof obj === 'object') {
                        for (const [key, value] of Object.entries(obj)) {
                            const fullPath = currentPath ? `${currentPath}.${key}` : key;
                            
                            if (includeKey ? predicate(key, value) : predicate(value)) {
                                results.push(value);
                            }
                            
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                                searchRecursive(value, fullPath);
                            }
                        }
                    }
                };
                
                searchRecursive(targetObj);
                return results;
            } catch (error) {
                console.error('FastLS search error:', error);
                return [];
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    path(path, predicate, includeKey = false) {
        const operation = async () => {
            try {
                const db = await this._getDatabase();
                const targetObj = this._getValueByPath(db, path);
                let foundPath = null;
                
                const searchRecursive = (obj, currentPath = '') => {
                    if (obj && typeof obj === 'object') {
                        for (const [key, value] of Object.entries(obj)) {
                            const fullPath = currentPath ? `${currentPath}.${key}` : key;
                            
                            if (includeKey ? predicate(key, value) : predicate(value)) {
                                foundPath = fullPath;
                                return true;
                            }
                            
                            if (value && typeof value === 'object' && !Array.isArray(value)) {
                                if (searchRecursive(value, fullPath)) {
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                };
                
                searchRecursive(targetObj);
                return foundPath;
            } catch (error) {
                console.error('FastLS path error:', error);
                return null;
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    // Removal operations
    remove(...operations) {
        const operation = async () => {
            try {
                const db = await this._getDatabase();
                let updatedDB = { ...db };
                
                for (let i = 0; i < operations.length; i += 2) {
                    const path = operations[i];
                    const operation = operations[i + 1];
                    
                    if (path === null && operation === 'database') {
                        // Delete entire database
                        if (this.useLocalStorage) {
                            const root = this._getRoot();
                            delete root[this.dbName];
                            this._saveRoot(root);
                            return null;
                        } else if (this.useIndexedDB) {
                            const transaction = this.idb.transaction(['databases'], 'readwrite');
                            const store = transaction.objectStore('databases');
                            store.delete(this.dbName);
                            return null;
                        } else if (this.useCustomDB) {
                            this._customData = '';
                            return null;
                        }
                    }
                    
                    if ((path === null || path === '' || path === '\\') && operation === 'databaseKeys') {
                        // Clear all keys but keep database
                        updatedDB = {};
                        continue;
                    }
                    
                    const normalizedPath = this._normalizePath(path);
                    
                    switch (operation) {
                        case 'folder':
                            // Delete entire folder and all contents
                            updatedDB = this._deleteFolder(updatedDB, normalizedPath);
                            break;
                            
                        case 'root':
                            // Delete only root keys, keep folder structure
                            updatedDB = this._deleteRootKeys(updatedDB, normalizedPath);
                            break;
                            
                        case 'structure':
                            // Delete folder contents but keep structure
                            updatedDB = this._deleteFolderContents(updatedDB, normalizedPath);
                            break;
                            
                        case 'nestedFolders':
                            // Keep root keys, delete nested folders
                            updatedDB = this._deleteNestedFolders(updatedDB, normalizedPath);
                            break;
                            
                        default:
                            console.warn(`Unknown removal operation: ${operation}`);
                    }
                }
                
                return await this._saveDatabase(updatedDB);
            } catch (error) {
                console.error('FastLS remove error:', error);
                return error.message;
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    _deleteFolder(db, folderPath) {
        const newDB = {};
        for (const [key, value] of Object.entries(db)) {
            if (!key.startsWith(folderPath + '\\') && key !== folderPath) {
                newDB[key] = value;
            }
        }
        return newDB;
    }

    _deleteRootKeys(db, folderPath) {
        const newDB = {};
        for (const [key, value] of Object.entries(db)) {
            // Keep keys that are not in this folder or are direct children
            if (!key.startsWith(folderPath + '\\') || 
                (key.startsWith(folderPath + '\\') && !key.substring(folderPath.length + 1).includes('\\'))) {
                newDB[key] = value;
            }
        }
        return newDB;
    }

    _deleteFolderContents(db, folderPath) {
        // Keep keys that represent the structure but remove their values
        const newDB = {};
        for (const [key, value] of Object.entries(db)) {
            if (key.startsWith(folderPath + '\\') || key === folderPath) {
                // Keep the key but set to empty object to maintain structure
                newDB[key] = {};
            } else {
                newDB[key] = value;
            }
        }
        return newDB;
    }

    _deleteNestedFolders(db, folderPath) {
        const newDB = {};
        for (const [key, value] of Object.entries(db)) {
            if (!key.startsWith(folderPath + '\\') || 
                (key.startsWith(folderPath + '\\') && !key.substring(folderPath.length + 1).includes('\\'))) {
                newDB[key] = value;
            }
        }
        return newDB;
    }

    removeKey(fullPath) {
        const operation = async () => {
            try {
                const { dbName, path } = this._parseFullPath(fullPath);
                let targetDB = this;
                
                if (dbName && dbName !== this.dbName) {
                    targetDB = new FastLS(dbName, this.gzipped, this.caseSen, this.useAsync);
                    if (targetDB.useIndexedDB) {
                        await targetDB._initIndexedDB();
                    }
                }
                
                const db = await targetDB._getDatabase();
                if (db.hasOwnProperty(path)) {
                    delete db[path];
                    return await targetDB._saveDatabase(db);
                }
                return null; // Key didn't exist
            } catch (error) {
                console.error('FastLS removeKey error:', error);
                return error.message;
            }
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    // Custom DB file operations
    get data() {
        return this.useCustomDB ? this._customData : null;
    }

    set data(value) {
        if (this.useCustomDB) {
            this._customData = value;
        }
    }

    get dataBlob() {
        if (this.useCustomDB && typeof Blob !== 'undefined') {
            return new Blob([this._customData], { type: 'application/octet-stream' });
        }
        return null;
    }

    downloadDB(filename = 'database.db', base64Encoded = true) {
        if (typeof window === 'undefined' || !this.useCustomDB) {
            console.warn('downloadDB only works in browser environment with CustomDB');
            return;
        }
        
        let data = this._customData;
        if (!base64Encoded && data) {
            data = btoa(data);
        }
        
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    uploadDB(filename, base64Encoded = true) {
        if (typeof window === 'undefined' || !this.useCustomDB) {
            console.warn('uploadDB only works in browser environment with CustomDB');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                let data = e.target.result;
                if (base64Encoded && data) {
                    try {
                        data = atob(data);
                    } catch (err) {
                        console.error('Error decoding base64 data:', err);
                    }
                }
                this._customData = data;
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Utility methods
    has(fullPath) {
        const operation = async () => {
            const value = await this.get(fullPath);
            return value !== undefined;
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    keys() {
        const operation = async () => {
            const db = await this._getDatabase();
            return Object.keys(db);
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    values() {
        const operation = async () => {
            const db = await this._getDatabase();
            return Object.values(db);
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    entries() {
        const operation = async () => {
            const db = await this._getDatabase();
            return Object.entries(db);
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    clear() {
        const operation = async () => {
            return await this._saveDatabase({});
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    size() {
        const operation = async () => {
            const db = await this._getDatabase();
            return new Blob([this._serializeData(db)]).size;
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    count() {
        const operation = async () => {
            const db = await this._getDatabase();
            return Object.keys(db).length;
        };

        if (this.useAsync) {
            return operation();
        } else {
            return this._executeSync(operation);
        }
    }

    // Static methods
    static listDatabases() {
        try {
            const root = JSON.parse(localStorage.getItem('fastLS') || '{}');
            return Object.keys(root);
        } catch {
            return [];
        }
    }

    static removeAllDatabases() {
        try {
            localStorage.removeItem('fastLS');
            return null;
        } catch (error) {
            return error.message;
        }
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FastLS;
}
if (typeof window !== 'undefined') {
    window.FastLS = FastLS;
}

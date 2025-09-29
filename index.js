class FastLS {
    constructor(databaseName, allowUnserializable = false) {
        this.dbName = databaseName;
        this.allowUnserializable = allowUnserializable;
        this.rootStorageKey = 'fastLS';
        
        // Initialize root storage if doesn't exist
        if (!localStorage.getItem(this.rootStorageKey)) {
            localStorage.setItem(this.rootStorageKey, JSON.stringify({}));
        }
        
        // Initialize database if doesn't exist
        const root = this._getRoot();
        if (!root[this.dbName]) {
            root[this.dbName] = {};
            this._saveRoot(root);
        }
    }

    // Root storage management
    _getRoot() {
        try {
            return JSON.parse(localStorage.getItem(this.rootStorageKey) || '{}');
        } catch {
            return {};
        }
    }

    _saveRoot(root) {
        try {
            localStorage.setItem(this.rootStorageKey, JSON.stringify(root));
            return null;
        } catch (error) {
            return error.message;
        }
    }

    _getDatabase() {
        const root = this._getRoot();
        return root[this.dbName] || {};
    }

    _saveDatabase(db) {
        const root = this._getRoot();
        root[this.dbName] = db;
        return this._saveRoot(root);
    }

    // Serialization
    _serializeKey(key) {
        try {
            if (typeof key === 'string') return key;
            return JSON.stringify(key, (k, v) => {
                if (!this.allowUnserializable && (typeof v === 'function' || v instanceof Promise)) {
                    return null;
                }
                return v;
            });
        } catch (error) {
            throw new Error(`Key serialization failed: ${error.message}`);
        }
    }

    _serializeValue(value) {
        try {
            if (!this.allowUnserializable) {
                return JSON.stringify(value, (k, v) => {
                    if (typeof v === 'function' || v instanceof Promise) {
                        return null;
                    }
                    return v;
                });
            }
            return JSON.stringify(value);
        } catch (error) {
            throw new Error(`Value serialization failed: ${error.message}`);
        }
    }

    _deserializeValue(value) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    // Path manipulation
    _parsePath(path) {
        if (typeof path !== 'string') return [];
        return path.split('.').map(part => {
            // Handle array indices: peoples[318].age -> ['peoples', '318', 'age']
            const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
            if (arrayMatch) {
                return [arrayMatch[1], arrayMatch[2]];
            }
            return part;
        }).flat();
    }

    _getValueByPath(obj, path) {
        if (!path) return obj;
        
        const keys = this._parsePath(path);
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    _setValueByPath(obj, path, value) {
        const keys = this._parsePath(path);
        if (keys.length === 0) return value;
        
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return obj;
    }

    _deleteValueByPath(obj, path) {
        const keys = this._parsePath(path);
        if (keys.length === 0) return obj;
        
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
                return obj; // Path doesn't exist
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        if (current[lastKey] !== undefined) {
            delete current[lastKey];
        }
        
        return obj;
    }

    // Core CRUD operations
    get(key, path = '') {
        try {
            const serializedKey = this._serializeKey(key);
            const db = this._getDatabase();
            const value = db[serializedKey];
            
            if (value === undefined) return undefined;
            
            const deserializedValue = this._deserializeValue(value);
            return this._getValueByPath(deserializedValue, path);
        } catch (error) {
            console.error('FastLS get error:', error);
            return undefined;
        }
    }

    set(key, value, path = '') {
        try {
            const serializedKey = this._serializeKey(key);
            const db = this._getDatabase();
            
            if (path) {
                // Update nested property
                const existingValue = db[serializedKey] ? this._deserializeValue(db[serializedKey]) : {};
                const updatedValue = this._setValueByPath(existingValue, path, value);
                db[serializedKey] = this._serializeValue(updatedValue);
            } else {
                // Set entire value
                db[serializedKey] = this._serializeValue(value);
            }
            
            return this._saveDatabase(db);
        } catch (error) {
            return error.message;
        }
    }

    // Removal operations
    removeKey(key) {
        try {
            const serializedKey = this._serializeKey(key);
            const db = this._getDatabase();
            
            if (db[serializedKey] !== undefined) {
                delete db[serializedKey];
                return this._saveDatabase(db);
            }
            return null;
        } catch (error) {
            return error.message;
        }
    }

    removeRoot(rootKey) {
        try {
            const serializedKey = this._serializeKey(rootKey);
            const db = this._getDatabase();
            
            if (db[serializedKey] !== undefined) {
                delete db[serializedKey];
                return this._saveDatabase(db);
            }
            return null;
        } catch (error) {
            return error.message;
        }
    }

    removePath(key, path) {
        try {
            const serializedKey = this._serializeKey(key);
            const db = this._getDatabase();
            
            if (db[serializedKey] !== undefined) {
                const existingValue = this._deserializeValue(db[serializedKey]);
                const updatedValue = this._deleteValueByPath(existingValue, path);
                db[serializedKey] = this._serializeValue(updatedValue);
                return this._saveDatabase(db);
            }
            return null;
        } catch (error) {
            return error.message;
        }
    }

    removeDB() {
        try {
            const root = this._getRoot();
            delete root[this.dbName];
            return this._saveRoot(root);
        } catch (error) {
            return error.message;
        }
    }

    // Search and query
    search(predicate) {
        try {
            const db = this._getDatabase();
            const results = [];
            
            for (const [serializedKey, serializedValue] of Object.entries(db)) {
                try {
                    const key = this._deserializeValue(serializedKey);
                    const value = this._deserializeValue(serializedValue);
                    
                    const entry = { key, value, serializedKey, serializedValue };
                    
                    if (predicate(entry)) {
                        results.push(entry);
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return results;
        } catch (error) {
            console.error('FastLS search error:', error);
            return [];
        }
    }

    // Batch operations
    setMultiple(entries) {
        try {
            const db = this._getDatabase();
            
            for (const [key, value] of entries) {
                const serializedKey = this._serializeKey(key);
                db[serializedKey] = this._serializeValue(value);
            }
            
            return this._saveDatabase(db);
        } catch (error) {
            return error.message;
        }
    }

    getMultiple(keys) {
        const results = {};
        for (const key of keys) {
            results[key] = this.get(key);
        }
        return results;
    }

    removeMultiple(keys) {
        try {
            const db = this._getDatabase();
            
            for (const key of keys) {
                const serializedKey = this._serializeKey(key);
                if (db[serializedKey] !== undefined) {
                    delete db[serializedKey];
                }
            }
            
            return this._saveDatabase(db);
        } catch (error) {
            return error.message;
        }
    }

    // Utility methods
    has(key) {
        const serializedKey = this._serializeKey(key);
        const db = this._getDatabase();
        return db[serializedKey] !== undefined;
    }

    keys() {
        const db = this._getDatabase();
        return Object.keys(db).map(key => this._deserializeValue(key));
    }

    values() {
        const db = this._getDatabase();
        return Object.values(db).map(value => this._deserializeValue(value));
    }

    entries() {
        const db = this._getDatabase();
        return Object.entries(db).map(([key, value]) => [
            this._deserializeValue(key),
            this._deserializeValue(value)
        ]);
    }

    clear() {
        try {
            const db = {};
            return this._saveDatabase(db);
        } catch (error) {
            return error.message;
        }
    }

    size() {
        const db = this._getDatabase();
        return new Blob([JSON.stringify(db)]).size;
    }

    count() {
        const db = this._getDatabase();
        return Object.keys(db).length;
    }

    // Database management
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

    // Export/Import
    export() {
        return this._getDatabase();
    }

    import(data) {
        try {
            const db = this._getDatabase();
            Object.assign(db, data);
            return this._saveDatabase(db);
        } catch (error) {
            return error.message;
        }
    }

    // Advanced querying
    findByValue(value) {
        return this.search(entry => JSON.stringify(entry.value) === JSON.stringify(value));
    }

    findByKeyPattern(pattern) {
        const regex = new RegExp(pattern);
        return this.search(entry => regex.test(JSON.stringify(entry.key)));
    }

    findByValuePattern(pattern) {
        const regex = new RegExp(pattern);
        return this.search(entry => regex.test(JSON.stringify(entry.value)));
    }
}

module.exports = FastLS;
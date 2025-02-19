const { MongoClient } = require('mongodb');
const config = require('../config');

/**
 * Class representing the database connection and operations.
 */
class Database {
    constructor(mongoUrl = config.MONGODB_URL) {
        if (Database.instance) {
            return Database.instance;
        }

        this.client = new MongoClient(mongoUrl, {
            maxPoolSize: config.MONGODB_POOL_SIZE,
            minPoolSize: Math.floor(config.MONGODB_POOL_SIZE / 4),
        });
        this.connected = false;
        console.log('[Database] Initialized with mongoUrl:', mongoUrl);
        Database.instance = this;
    }

    /**
     * Connects to the MongoDB database.
     */
    async connect() {
        if (!this.connected) {
            try {
                await this.client.connect();
                this.db = this.client.db();
                this.connected = true;
                console.log('[Database] Connected to MongoDB');
            } catch (error) {
                console.error('[Database] Error connecting to MongoDB:', error);
                throw error;
            }
        }
    }

    /**
     * Disconnects from the MongoDB database.
     */
    async disconnect() {
        if (this.connected) {
            try {
                await this.client.close();
                this.connected = false;
                console.log('[Database] Disconnected from MongoDB');
            } catch (error) {
                console.error('[Database] Error disconnecting from MongoDB:', error);
            }
        }
    }

    /**
     * Upserts a document in the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} filter - The filter to find the document.
     * @param {Object} doc - The document to upsert.
     */
    async upsert(collectionName, filter, doc) {
        await this.connect();
        return this.db.collection(collectionName).updateOne(filter, { $set: doc }, { upsert: true });
    }

    /**
     * Inserts multiple documents into the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Array} docs - The documents to insert.
     */
    async insertMany(collectionName, docs) {
        await this.connect();
        return this.db.collection(collectionName).insertMany(docs, { ordered: false });
    }

    /**
     * Finds a single document in the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} filter - The filter to find the document.
     * @returns {Object} - The found document.
     */
    async findOne(collectionName, filter = {}) {
        await this.connect();
        return this.db.collection(collectionName).findOne(filter);
    }

    /**
     * Finds multiple documents in the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} filter - The filter to find the documents.
     * @param {Object} options - The options for sorting and limiting the results.
     * @returns {Array} - The found documents.
     */
    async findMany(collectionName, filter = {}, options = {}) {
        await this.connect();
        const cursor = this.db.collection(collectionName).find(filter);

        if (options.sort) {
            cursor.sort(options.sort);
        }
        if (options.limit) {
            cursor.limit(options.limit);
        }
        return cursor.toArray();
    }

    /**
     * Deletes multiple documents from the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} filter - The filter to find the documents to delete.
     */
    async deleteMany(collectionName, filter) {
        await this.connect();
        return this.db.collection(collectionName).deleteMany(filter);
    }

    /**
     * Creates an index on the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} keys - The keys for the index.
     * @param {Object} options - The options for the index.
     */
    async createIndex(collectionName, keys, options = {}) {
        await this.connect();
        return this.db.collection(collectionName).createIndex(keys, options);
    }

    /**
     * Sets an expiration time for a document in the specified collection.
     * @param {string} collectionName - The name of the collection.
     * @param {Object} filter - The filter to find the document.
     * @param {number} ttlMs - The time-to-live in milliseconds.
     */
    async setExpiration(collectionName, filter, ttlMs) {
        if (!ttlMs) return;
        const expireAt = new Date(Date.now() + ttlMs);
        await this.connect();
        return this.db.collection(collectionName).updateOne(
            filter,
            { $set: { expireAt } },
            { upsert: false }
        );
    }

    /**
     * Gets the last update time for a specific key.
     * @param {string} key - The key to find the last update time.
     * @returns {Date} - The last update time.
     */
    async getLastUpdateTime(key) {
        await this.connect();
        const result = await this.db.collection('system_status').findOne({ _id: key });
        return result ? result.lastUpdate : null;
    }

    /**
     * Sets the last update time for a specific key.
     * @param {string} key - The key to set the last update time.
     */
    async setLastUpdateTime(key) {
        await this.connect();
        await this.db.collection('system_status').updateOne(
            { _id: key },
            { $set: { lastUpdate: new Date() } },
            { upsert: true }
        );
    }
}

module.exports = new Database();

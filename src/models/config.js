const crypto = require('crypto');

class Config {
    constructor({ host, port, username, password }) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
    }

    /**
     * Creates a Config instance from a base64 encoded string.
     * @param {string} base64Config - The base64 encoded configuration string.
     * @returns {Config} - The Config instance.
     * @throws {Error} - If the configuration parameters are invalid or decoding fails.
     */
    static fromBase64(base64Config) {
        try {
            const decoded = Buffer.from(base64Config, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            const { host, port, username, password } = parsed;

            if (!host || !port || !username || !password) {
                throw new Error('Invalid configuration parameters');
            }

            return new Config({ host, port, username, password });
        } catch (error) {
            throw new Error('Failed to decode config');
        }
    }

    /**
     * Derives a short userId from the configuration.
     * @returns {string} - The derived userId.
     */
    getHash() {
        const str = JSON.stringify(this);
        return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
    }

    /**
     * Converts the configuration to a base64 encoded string.
     * @returns {string} - The base64 encoded configuration string.
     */
    toBase64() {
        return Buffer.from(JSON.stringify(this)).toString('base64');
    }
}

module.exports = Config;

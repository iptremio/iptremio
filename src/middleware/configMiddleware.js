const Config = require('../models/config');

/**
 * Middleware to decode and attach config to the request
 */
function configMiddleware(req, res, next) {
    try {
        const configParam = req.params.config;
        if (!configParam) {
            return res.status(400).json({ error: 'Config parameter is missing' });
        }

        const config = Config.fromBase64(configParam);
        req.config = config;
        req.configBase64 = configParam;
        next();
    } catch (error) {
        console.error('[ConfigMiddleware] Error:', error.message);
        return res.status(400).json({ error: 'Invalid configuration' });
    }
}

module.exports = configMiddleware;

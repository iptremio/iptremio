const { XtreamClient } = require('../services/xtreamClient');

/**
 * Middleware to initialize XtreamClient and attach it to the request
 */
function xtreamClientMiddleware(req, res, next) {
    try {
        if (!req.config) {
            throw new Error('Config not found on request');
        }
        const client = new XtreamClient(req.config);
        req.xtreamClient = client;
        next();
    } catch (error) {
        console.error('[XtreamClientMiddleware] Error:', error.message);
        return res.status(500).json({ error: 'Failed to initialize XtreamClient' });
    }
}

module.exports = xtreamClientMiddleware;
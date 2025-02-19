const express = require('express');
const router = express.Router();
const config = require('../config');
const configMiddleware = require('../middleware/configMiddleware');
const xtreamClientMiddleware = require('../middleware/xtreamClientMiddleware');

/**
 * GET /:config/manifest.json
 * Generates and returns the Stremio manifest
 */
router.get('/:config/manifest.json', configMiddleware, xtreamClientMiddleware, async (req, res) => {
    try {
        const client = req.xtreamClient; // Use XtreamClient from middleware
        const liveCategories = await client.getLiveCategories();

        const manifestName = config.isDev
            ? `[DEV] [${client.config.host}] IPTremio`
            : `[${client.config.host}] IPTremio`;

        const manifest = {
            id: 'ext.iptremio',
            version: '1.0.0',
            name: manifestName,
            description: 'Watch Xtream-codes content on Stremio',
            resources: ['catalog', 'stream', 'meta'],
            types: ['movie', 'series', 'tv'],
            idPrefixes: ['iptremio:', 'tt'],
            catalogs: [
                {
                    type: 'tv',
                    id: 'iptremio_live_tv',
                    name: `[${client.config.host}] IPTremio Live TV`,
                    extra: [
                        {
                            name: 'genre',
                            options: liveCategories.map(cat => cat.category_name)
                        }
                    ]
                }
            ]
        };

        return res.json(manifest);
    } catch (error) {
        console.error('[Manifest] Error:', error.message);

        return res.status(500).json({
            id: 'org.iptremio',
            version: '1.0.0',
            name: 'iptremio [ERROR]',
            description: 'Error loading manifest',
            resources: ['catalog', 'stream', 'meta'],
            types: ['movie', 'series', 'tv'],
            catalogs: []
        });
    }
});

module.exports = router;

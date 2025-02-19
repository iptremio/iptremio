const express = require('express');
const router = express.Router();
const configMiddleware = require('../middleware/configMiddleware');
const xtreamClientMiddleware = require('../middleware/xtreamClientMiddleware');

/**
 * GET /:config/meta/:type/:id
 * Retrieves the meta for a live stream (type=tv) or returns 404 otherwise
 */
router.get('/:config/meta/:type/:id', configMiddleware, xtreamClientMiddleware, async (req, res) => {
    try {
        console.log('[Meta] Params:', req.params);
        const { type } = req.params;

        const client = req.xtreamClient; // Use XtreamClient from middleware
        const cleanId = req.params.id
            .replace('iptremio:', '')
            .replace('.json', '');

        console.log('[Meta] Clean ID: ', cleanId);

        if (type === 'tv') {
            const meta = await client.getLiveStreamMeta(cleanId);
            console.log('[Meta] Live stream meta:', meta);

            if (!meta || Object.keys(meta).length === 0) {
                return res.status(404).json({ meta: {} });
            }

            // Add cache headers
            res.set('Cache-Control', 'max-age=3600, stale-while-revalidate=3600, stale-if-error=86400');
            return res.json({ meta });
        }

        // If the type is not 'tv', return a 404
        return res.status(404).json({ meta: {} });
    } catch (error) {
        console.error('[Meta] Error:', error.message);
        return res.status(500).json({ meta: {} });
    }
});

module.exports = router;

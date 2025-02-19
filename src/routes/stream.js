const express = require('express');
const router = express.Router();
const config = require('../config');
const configMiddleware = require('../middleware/configMiddleware');
const xtreamClientMiddleware = require('../middleware/xtreamClientMiddleware');

/**
 * GET /:config/stream/:type/:id.json
 * Retrieves the list of streams for a given type (tv, movie, series)
 */
router.get('/:config/stream/:type/:id.json', configMiddleware, xtreamClientMiddleware, async (req, res) => {
    try {
        const { type, id } = req.params;
        console.log('[Stream] Request params:', { type, id });

        const client = req.xtreamClient; // Use XtreamClient from middleware

        // Live TV case
        if (type === 'tv') {
            console.log('[Stream] Fetch live stream:', id);
            const liveStreamData = await client.getLiveStreamUrl(decodeURIComponent(id));
            return res.json(liveStreamData);
        }

        // Movie or series case
        const streams = await client.getStreams(type, id, `${config.BASE_URL}/${req.configBase64}`);

        if (streams.length === 0) {
            console.log('[Stream] No streams found for:', { type, id });
        }

        return res.json({ streams });
    } catch (error) {
        console.error('[Stream] Error:', error.message);
        return res.json({ streams: [] });
    }
});

module.exports = router;

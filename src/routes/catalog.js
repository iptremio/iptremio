const express = require('express');
const router = express.Router();
const configMiddleware = require('../middleware/configMiddleware');
const xtreamClientMiddleware = require('../middleware/xtreamClientMiddleware');

/**
 * Catalog type routes:
 * - /:config/catalog/:type/:id.json
 * - /:config/catalog/:type/:id/genre=:genre.json
 */
router.get('/:config/catalog/:type/:id.json', configMiddleware, xtreamClientMiddleware, handleCatalogRequest);
router.get('/:config/catalog/:type/:id/genre=:genre.json', configMiddleware, xtreamClientMiddleware, handleCatalogRequest);

/**
 * Handles catalog requests for different types and genres.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
async function handleCatalogRequest(req, res) {
    try {
        console.log('[Catalog] URL:', req.url);
        console.log('[Catalog] Params:', req.params);

        const { type, id, genre } = req.params;
        const client = req.xtreamClient; // Use XtreamClient from middleware

        // Catalog for live TV
        if (type === 'tv' && id === 'iptremio_live_tv') {
            const decodedGenre = genre ? decodeURIComponent(genre).replace(/\+/g, ' ') : null;
            // 
            if (decodedGenre) {
                console.log('[Catalog] Filtering by genre:', decodedGenre);
            }

            const response = await client.getLiveStreams(decodedGenre);
  
            return res.json(response); // Response is already properly formatted
        }

        // If no condition is met, return 404
        res.status(404).json({
            error: 'Catalog not found',
            metas: []
        });
    } catch (error) {
        console.error('[Catalog] Error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch catalog',
            metas: []
        });
    }
}

module.exports = router;

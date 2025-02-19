const express = require('express');
const router = express.Router();
const configMiddleware = require('../middleware/configMiddleware');
const xtreamClientMiddleware = require('../middleware/xtreamClientMiddleware');

/**
 * Route to handle stream redirection for movies and series.
 * @param {string} config - The base64 encoded configuration.
 * @param {string} type - The type of stream (movie or series).
 * @param {string} id - The ID of the stream.
 * @param {string} [season] - The season number (for series).
 * @param {string} [episode] - The episode number (for series).
 */
router.get('/:config/redirect/:type/:id/:season?/:episode?', configMiddleware, xtreamClientMiddleware, async (req, res) => {
    try {
        const { type, id, season, episode } = req.params;
        console.log('[Stream Redirect] Request for:', { type, id, season, episode });
        
        const client = req.xtreamClient; // Use XtreamClient from middleware
        let streamUrl;
        
        if (type === 'movie') {
            streamUrl = await client.getMovieStreamUrl(id);
        } else {
            streamUrl = await client.getSeriesStreamUrl(id, season, episode);
        }
        
        console.log('[Stream Redirect] Redirecting to:', streamUrl);
        res.redirect(streamUrl);
    } catch (error) {
        console.error('[Stream Redirect] Error:', error.message);
        res.status(404).send(error.message);
    }
});

module.exports = router;

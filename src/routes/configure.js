const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config');
const { XtreamClient } = require('../services/xtreamClient');
const Config = require('../models/config');

/**
 * GET Route - serves the configuration page
 */
router.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * POST Route - generates a base64 encoded config and returns the manifest URL
 */
router.post('/configure', async (req, res) => {
    try {
        let { host, port, username, password } = req.body;

        // Clean and validate host
        if (!host) return res.json({ error: 'Host is required' });
        host = host.trim().toLowerCase();
        host = host.replace(/^https?:\/\//i, ''); // Remove protocol if present
        host = host.split('/')[0]; // Remove path if present
        
        // Clean and validate port
        if (!port) {
            port = '80'; // Default port if not provided
        } else {
            // Remove any non-numeric characters (like 'http://' if entered in port)
            port = port.toString().replace(/[^0-9]/g, '');
            if (!port) port = '80';
            const portNum = parseInt(port);
            if (portNum <= 0 || portNum > 65535) {
                return res.json({ error: 'Invalid port number. Must be between 1 and 65535' });
            }
        }

        if (!username || !password) {
            return res.json({ error: 'Username and password are required' });
        }

        const userConfig = new Config({ host, port, username, password });
        const configBase64 = userConfig.toBase64();

        return res.json({
            success: true,
            configUrl: `${config.BASE_URL}/${configBase64}/manifest.json`
        });
    } catch (error) {
        console.error('[Configure] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * POST Route - test connection with provided credentials
 */
router.post('/test-connection', async (req, res) => {
    try {
        let { host, port, username, password } = req.body;

        // Clean and validate host/port like in configure route
        if (!host) return res.json({ error: 'Host is required' });
        host = host.trim().toLowerCase();
        host = host.replace(/^https?:\/\//i, '');
        host = host.split('/')[0];
        
        if (!port) {
            port = '80';
        } else {
            port = port.toString().replace(/[^0-9]/g, '');
            if (!port) port = '80';
            const portNum = parseInt(port);
            if (portNum <= 0 || portNum > 65535) {
                return res.json({ error: 'Invalid port number' });
            }
        }

        if (!username || !password) {
            return res.json({ error: 'Username and password are required' });
        }

        const client = new XtreamClient(new Config({ host, port, username, password }));
        const isValid = await client.validateConfig();

        if (!isValid) {
            return res.json({ error: 'Connection failed. Please verify your credentials.' });
        }

        return res.json({ success: true, message: 'Connection successful!' });
    } catch (error) {
        console.error('[Test Connection] Error:', error.message);
        return res.status(500).json({ error: 'Connection failed. Please check your information.' });
    }
});

module.exports = router;

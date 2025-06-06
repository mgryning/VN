const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const MISSING_ASSETS_FILE = path.join(__dirname, '..', '..', 'missing-assets.json');

// Endpoint to log missing assets
router.post('/log-missing-asset', async (req, res) => {
    try {
        const assetInfo = req.body;
        
        // Validate the asset info
        if (!assetInfo.timestamp || !assetInfo.type || !assetInfo.filename) {
            return res.status(400).json({ error: 'Invalid asset info' });
        }

        // Read existing missing assets file
        let missingAssets = [];
        try {
            const data = await fs.readFile(MISSING_ASSETS_FILE, 'utf8');
            missingAssets = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is empty, start with empty array
            missingAssets = [];
        }

        // Check if this asset is already logged
        const assetKey = `${assetInfo.type}_${assetInfo.name}_${assetInfo.mood || 'none'}`;
        const exists = missingAssets.some(asset => {
            const existingKey = `${asset.type}_${asset.name}_${asset.mood || 'none'}`;
            return existingKey === assetKey;
        });

        if (!exists) {
            // Add new missing asset
            missingAssets.push(assetInfo);
            
            // Write back to file
            await fs.writeFile(MISSING_ASSETS_FILE, JSON.stringify(missingAssets, null, 2));
            
            console.log(`📝 Logged missing asset: ${assetInfo.path}`);
        }

        res.json({ success: true, logged: !exists });
    } catch (error) {
        console.error('Error logging missing asset:', error);
        res.status(500).json({ error: 'Failed to log missing asset' });
    }
});

// Endpoint to get all missing assets
router.get('/missing-assets', async (req, res) => {
    try {
        const data = await fs.readFile(MISSING_ASSETS_FILE, 'utf8');
        const missingAssets = JSON.parse(data);
        res.json(missingAssets);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist
            res.json([]);
        } else {
            console.error('Error reading missing assets:', error);
            res.status(500).json({ error: 'Failed to read missing assets' });
        }
    }
});

// Endpoint to clear missing assets log
router.delete('/missing-assets', async (req, res) => {
    try {
        await fs.writeFile(MISSING_ASSETS_FILE, JSON.stringify([], null, 2));
        res.json({ success: true, message: 'Missing assets log cleared' });
    } catch (error) {
        console.error('Error clearing missing assets:', error);
        res.status(500).json({ error: 'Failed to clear missing assets' });
    }
});

module.exports = router;
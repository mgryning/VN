const express = require('express');
const axios = require('axios');
const router = express.Router();

const KINDROID_API_URL = 'https://api.kindroid.ai/v1';
const KINDROID_AI_ID = process.env.KINDROID_AI_ID;
const KINDROID_API_KEY = process.env.KINDROID_API_KEY;

// Validate environment variables
if (!KINDROID_AI_ID || !KINDROID_API_KEY) {
    console.error('⚠️ Kindroid AI credentials not found in environment variables');
    console.error('Please set KINDROID_AI_ID and KINDROID_API_KEY in your .env file');
}

// Endpoint to send message to Kindroid AI
router.post('/send-message', async (req, res) => {
    try {
        // Check if credentials are configured
        if (!KINDROID_AI_ID || !KINDROID_API_KEY) {
            return res.status(500).json({ error: 'Kindroid AI credentials not configured' });
        }

        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Send message to Kindroid AI
        const response = await axios.post(`${KINDROID_API_URL}/send-message`, {
            ai_id: KINDROID_AI_ID,
            message: message
        }, {
            headers: {
                'Authorization': `Bearer ${KINDROID_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Return the AI response
        res.json({
            success: true,
            response: response.data,
            message: response.data.message || response.data
        });

    } catch (error) {
        console.error('Kindroid API error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid Kindroid API key' });
        } else if (error.response?.status === 403) {
            res.status(403).json({ error: 'Access forbidden - check AI ID and permissions' });
        } else if (error.response?.status === 400) {
            res.status(400).json({ error: 'Bad request - check message format' });
        } else {
            res.status(500).json({ error: 'Failed to communicate with Kindroid AI' });
        }
    }
});

// Endpoint to repeat previous message
router.post('/repeat-previous', async (req, res) => {
    try {
        // Check if credentials are configured
        if (!KINDROID_AI_ID || !KINDROID_API_KEY) {
            return res.status(500).json({ error: 'Kindroid AI credentials not configured' });
        }

        const message = "Please repeat previous message without altering the story";
        
        // Send repeat request to Kindroid AI
        const response = await axios.post(`${KINDROID_API_URL}/send-message`, {
            ai_id: KINDROID_AI_ID,
            message: message
        }, {
            headers: {
                'Authorization': `Bearer ${KINDROID_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Return the AI response
        res.json({
            success: true,
            response: response.data,
            message: response.data.message || response.data
        });

    } catch (error) {
        console.error('Kindroid API error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid Kindroid API key' });
        } else if (error.response?.status === 403) {
            res.status(403).json({ error: 'Access forbidden - check AI ID and permissions' });
        } else if (error.response?.status === 400) {
            res.status(400).json({ error: 'Bad request - check message format' });
        } else {
            res.status(500).json({ error: 'Failed to communicate with Kindroid AI' });
        }
    }
});

module.exports = router;
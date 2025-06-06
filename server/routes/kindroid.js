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
            message: message,
            stream: false,
            image_urls: null,
            image_description: null,
            video_url: null,
            video_description: null,
            internet_response: null,
            link_url: null,
            link_description: null
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

// Endpoint to repeat previous message with streaming
router.post('/repeat-previous', async (req, res) => {
    console.log('🚀 Kindroid streaming endpoint called');
    
    try {
        // Check if credentials are configured
        if (!KINDROID_AI_ID || !KINDROID_API_KEY) {
            console.error('❌ Kindroid credentials not configured');
            return res.status(500).json({ error: 'Kindroid AI credentials not configured' });
        }

        const message = "(OOC: Please repeat previous message without altering the story)";
        
        console.log('Sending streaming request to Kindroid with:', {
            ai_id: KINDROID_AI_ID,
            message: message,
            stream: true
        });
        
        // Set up streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        
        // Send streaming request to Kindroid AI
        const response = await axios.post(`${KINDROID_API_URL}/send-message`, {
            ai_id: KINDROID_AI_ID,
            message: message,
            stream: true,
            image_urls: null,
            image_description: null,
            video_url: null,
            video_description: null,
            internet_response: null,
            link_url: null,
            link_description: null
        }, {
            headers: {
                'Authorization': `Bearer ${KINDROID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        let accumulatedText = '';
        let hasInitialSetup = false;

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            console.log('Received chunk:', chunkStr);
            
            const lines = chunkStr.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                if (line.startsWith('data: ')) {
                    const data = line.substring(6).trim();
                    
                    if (data === '[DONE]') {
                        res.write(`data: ${JSON.stringify({ type: 'done', message: accumulatedText })}\n\n`);
                        res.end();
                        return;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        // Handle different response formats
                        let messageChunk = '';
                        if (parsed.message) {
                            messageChunk = parsed.message;
                        } else if (parsed.delta && parsed.delta.content) {
                            messageChunk = parsed.delta.content;
                        } else if (typeof parsed === 'string') {
                            messageChunk = parsed;
                        }
                        
                        if (messageChunk) {
                            accumulatedText += messageChunk;
                            
                            // Check if we have basic setup (LOC/CHA/STP)
                            if (!hasInitialSetup && hasBasicSetup(accumulatedText)) {
                                hasInitialSetup = true;
                                res.write(`data: ${JSON.stringify({ 
                                    type: 'setup_ready', 
                                    message: accumulatedText 
                                })}\n\n`);
                            }
                            
                            // Send chunk update
                            res.write(`data: ${JSON.stringify({ 
                                type: 'chunk', 
                                message: accumulatedText 
                            })}\n\n`);
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse streaming data:', data, parseError.message);
                        // If it's not JSON, treat it as raw text
                        if (data && data !== '[DONE]') {
                            accumulatedText += data;
                            res.write(`data: ${JSON.stringify({ 
                                type: 'chunk', 
                                message: accumulatedText 
                            })}\n\n`);
                        }
                    }
                } else if (line.trim()) {
                    // Handle lines that don't start with 'data: '
                    console.log('Non-data line:', line);
                }
            }
        });

        response.data.on('end', () => {
            if (!res.headersSent) {
                res.write(`data: ${JSON.stringify({ type: 'done', message: accumulatedText })}\n\n`);
                res.end();
            }
        });

        response.data.on('error', (error) => {
            console.error('Streaming error:', error);
            if (!res.headersSent) {
                res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
                res.end();
            }
        });

    } catch (error) {
        console.error('Kindroid API error:', error.response?.data || error.message);
        
        if (!res.headersSent) {
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
    }
});

// Helper function to check if we have basic setup information
function hasBasicSetup(text) {
    const hasLoc = text.includes('LOC:');
    const hasCha = text.includes('CHA:');
    const hasStp = text.includes('STP:');
    
    // We need at least LOC and either CHA or STP to start
    return hasLoc && (hasCha || hasStp);
}

module.exports = router;
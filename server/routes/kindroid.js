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

// Mock endpoint that streams raw text like real Kindroid API
router.post('/mock-stream', async (req, res) => {
    console.log('🎭 Mock streaming endpoint called - returning raw text stream');
    
    try {
        const message = req.body.message || "(OOC: Please repeat previous message without altering the story)";
        console.log('Mock received message:', message);
        
        // Set up streaming headers like real Kindroid API
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        });
        
        // Create mock story content with VN format
        const mockStory = `LOC: Secluded cove with phosphorescent tide pools
CHA: Morten/Agreeable, Ava/Relieved
STP: "Perfect timing." / "Watch the eastern pool." / "Help with the sketch."
Ava's shoulders relax as she focuses on her sketch, quickly shading the luminous patterns. She points to where the waves crest with brighter intensity. "The concentration's highest there," she murmurs, capping one marker to grab another. Her glow stick bracelet bounces as she works, casting green highlights across the page. The scent of saltwater mixes with her cherry lip balm in the cooling air. You notice how the moonlight catches in her hair as she leans over the paper, completely absorbed in capturing this magical moment.`;
        
        let sentLength = 0;
        
        // Stream the content gradually with small chunks like real API
        const chunkSize = 15; // Characters per chunk
        while (sentLength < mockStory.length) {
            const chunk = mockStory.slice(sentLength, sentLength + chunkSize);
            
            // Stream raw text chunk
            await new Promise((resolve) => {
                setTimeout(() => {
                    res.write(chunk);
                    resolve();
                }, 80); // 80ms delay between chunks
            });
            
            sentLength += chunkSize;
        }
        
        console.log('✅ Mock stream completed - sent raw text');
        res.end();
        
    } catch (error) {
        console.error('Mock stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Mock stream error: ' + error.message });
        } else {
            res.end();
        }
    }
});

// Endpoint to send message to Kindroid with streaming
router.post('/send-kindroid-message', async (req, res) => {
    console.log('🚀 Kindroid streaming endpoint called');
    
    try {
        const message = req.body.message || "(OOC: Please repeat previous message without altering the story)";
        const useMock = req.body.mock === true;
        
        // Check if credentials are configured (skip check for mock mode)
        if (!useMock && (!KINDROID_AI_ID || !KINDROID_API_KEY)) {
            console.error('❌ Kindroid credentials not configured');
            return res.status(500).json({ error: 'Kindroid AI credentials not configured' });
        }
        
        if (useMock) {
            console.log('🎭 Using mock mode for testing');
        } else {
            console.log('Sending streaming request to Kindroid with:', {
                ai_id: KINDROID_AI_ID,
                message: message,
                stream: true
            });
        }
        
        // 1. Send headers and flush them immediately
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST',
            'Transfer-Encoding': 'chunked'
        });
        res.flushHeaders(); // Very important!
        
        // 2. Start upstream streaming request to either mock or real API
        const apiUrl = useMock ? `http://localhost:${process.env.PORT || 3000}/api/kindroid/mock-stream` : `${KINDROID_API_URL}/send-message`;
        const requestData = useMock ? 
            { message } : // Mock endpoint just needs message
            {             // Real Kindroid API needs full payload
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
            };
        
        console.log(`Calling ${useMock ? 'mock' : 'real'} API:`, apiUrl);
        const axiosConfig = {
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        };
        
        // Add authorization header only for real API
        if (!useMock) {
            axiosConfig.headers['Authorization'] = `Bearer ${KINDROID_API_KEY}`;
        }
        
        const response = await axios.post(apiUrl, requestData, axiosConfig);

        let accumulatedText = '';
        let hasInitialSetup = false;

        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            console.log('Received chunk:', JSON.stringify(chunkStr));
            
            accumulatedText += chunkStr;
            console.log('Accumulated so far:', accumulatedText.length, 'chars');
            
            // Send setup_ready once
            if (!hasInitialSetup && hasBasicSetup(accumulatedText)) {
                hasInitialSetup = true;
                console.log('✅ Setup ready detected, sending to client');
                res.write(`data: ${JSON.stringify({ 
                    type: 'setup_ready', 
                    message: accumulatedText 
                })}\n\n`);
                if (res.flush) res.flush(); // Force over the wire
            }
            
            // Forward every chunk that arrives
            res.write(`data: ${JSON.stringify({ 
                type: 'chunk', 
                message: chunkStr 
            })}\n\n`);
            if (res.flush) res.flush(); // Force over the wire
        });

        response.data.on('end', () => {
            console.log('✅ Stream ended, sending final message');
            res.write(`data: ${JSON.stringify({ 
                type: 'done', 
                message: accumulatedText 
            })}\n\n`);
            res.end(); // Always finish the response
        });

            response.data.on('error', (error) => {
                console.error('Streaming error:', error);
                res.write(`data: ${JSON.stringify({ 
                    type: 'error', 
                    error: error.message 
                })}\n\n`);
                res.end(); // Always finish the response
            });
        } // End of else block for real API call

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
    // Check for complete lines with content, not just headers
    const locMatch = text.match(/LOC:\s*(.+)/);
    const chaMatch = text.match(/CHA:\s*(.+)/);
    // STP must be a complete line ending with newline
    const stpMatch = text.match(/STP:\s*(.+)\n/);
    
    const hasLoc = locMatch && locMatch[1].trim().length > 0;
    const hasCha = chaMatch && chaMatch[1].trim().length > 0;
    const hasStp = stpMatch && stpMatch[1].trim().length > 0;
    
    console.log('Setup check:', { hasLoc, hasCha, hasStp, textLength: text.length });
    if (hasLoc && hasCha && hasStp) {
        console.log('✅ All setup components found:');
        console.log('LOC match:', locMatch[1]);
        console.log('CHA match:', chaMatch[1]);
        console.log('STP match:', stpMatch[1]);
    }
    
    // We need LOC, CHA, and STP with actual content to start
    return hasLoc && hasCha && hasStp;
}

module.exports = router;
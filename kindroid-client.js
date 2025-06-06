class KindroidClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        this.streamAccumulator = '';
        this.sceneSetupComplete = false;
        this.isTestMode = options.testMode || false;
        this.testResults = {};
        
        if (!this.isTestMode && typeof window !== 'undefined') {
            this.setupUI();
        }
    }

    setupUI() {
        // Create Kindroid button
        const kindroidBtn = document.createElement('button');
        kindroidBtn.id = 'kindroid-btn';
        kindroidBtn.textContent = 'Get AI Story';
        kindroidBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #6366f1;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
            transition: all 0.2s ease;
        `;

        // Add hover effect
        kindroidBtn.addEventListener('mouseenter', () => {
            kindroidBtn.style.background = '#4f46e5';
            kindroidBtn.style.transform = 'translateY(-1px)';
        });

        kindroidBtn.addEventListener('mouseleave', () => {
            kindroidBtn.style.background = '#6366f1';
            kindroidBtn.style.transform = 'translateY(0)';
        });

        // Add click handler
        kindroidBtn.addEventListener('click', () => {
            this.requestStoryFromAI();
        });

        document.body.appendChild(kindroidBtn);
    }

    async requestStoryFromAI() {
        // Browser-specific UI updates
        let button, originalText;
        if (!this.isTestMode && typeof window !== 'undefined') {
            button = document.getElementById('kindroid-btn');
            originalText = button.textContent;
            button.textContent = 'Streaming Story...';
            button.disabled = true;
            button.style.background = '#9ca3af';
        }
        
        try {
            // Reset state
            this.streamAccumulator = '';
            this.sceneSetupComplete = false;
            if (this.isTestMode) {
                this.testResults = {
                    streamingStarted: true,
                    sceneSetupCompleted: false,
                    directStreamingActivated: false,
                    storyContentReceived: false,
                    finalStoryLength: 0,
                    error: null
                };
            }

            // Set up fetch with streaming
            const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
            const response = await fetchFn(`${this.baseURL}/api/kindroid/repeat-previous`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let pending = '';
            let fullAccumulated = '';
            let hasStartedDisplay = false;
            let lineBuffer = ''; // Buffer for incomplete lines

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) break;
                        
                        pending += decoder.decode(value, { stream: true });
                        
                        // Handle every complete \n\n block we have
                        let idx;
                        while ((idx = pending.indexOf('\n\n')) !== -1) {
                            const raw = pending.slice(0, idx).trim();
                            pending = pending.slice(idx + 2);
                            
                            // Optional "event: ..." line
                            const payloadLine = raw.replace(/^event:.*\n?/, '');
                            const data = payloadLine.replace(/^data:\s*/, '');
                            
                            if (!data) continue;
                            
                            try {
                                const parsed = JSON.parse(data);
                                console.log('📨 Received event:', parsed.type, 'Content length:', parsed.message?.length || 0);
                                
                                switch (parsed.type) {
                                    case 'setup_ready':
                                        // We have LOC/CHA/STP - start displaying immediately
                                        if (!hasStartedDisplay) {
                                            hasStartedDisplay = true;
                                            if (!this.isTestMode && button) {
                                                button.textContent = 'Loading Scene...';
                                            }
                                            fullAccumulated = parsed.message;
                                            console.log('🎬 Starting story with setup:', parsed.message);
                                            // Set streaming mode and load initial setup
                                            if (!this.isTestMode && typeof window !== 'undefined' && window.game) {
                                                window.game.streaming = true;
                                                window.game.loadScript(parsed.message);
                                                window.game.startPlayback();
                                                // Clear the "click to begin" message
                                                setTimeout(() => {
                                                    if (window.game.dialogueText) {
                                                        window.game.dialogueText.textContent = '';
                                                        window.game.characterName.textContent = '';
                                                    }
                                                }, 100);
                                            }
                                        }
                                        break;
                                        
                                    case 'chunk':
                                        console.log('🔄 Processing chunk:', JSON.stringify(parsed.message), 'Setup complete:', this.sceneSetupComplete);
                                        fullAccumulated += parsed.message;
                                        // Update the script area with latest content
                                        this.updateScriptArea(fullAccumulated);
                                        
                                        // Check if we've completed scene setup (past LOC, CHA, STP) or if this is just regular text
                                        if (!this.sceneSetupComplete && hasStartedDisplay) {
                                            // Look for text that comes after STP line - need meaningful content
                                            const stpMatch = fullAccumulated.match(/STP:.*?\n(.*)$/s);
                                            console.log('🔍 STP detection:', { 
                                                hasMatch: !!stpMatch, 
                                                textAfterLength: stpMatch ? stpMatch[1].trim().length : 0,
                                                fullLength: fullAccumulated.length,
                                                sample: fullAccumulated.substring(0, 200) + '...'
                                            });
                                            
                                            // Check if this is a VN script format or just regular text
                                            const hasVNFormat = fullAccumulated.match(/LOC:|CHA:|STP:/);
                                            
                                            if (stpMatch && stpMatch[1].trim().length > 10) { 
                                                // VN format with complete STP
                                                this.sceneSetupComplete = true;
                                                console.log('🎭 Scene setup complete, switching to direct text streaming');
                                                console.log('📄 Text after STP:', JSON.stringify(stpMatch[1]));
                                                
                                                if (this.isTestMode) {
                                                    this.testResults.sceneSetupCompleted = true;
                                                    this.testResults.directStreamingActivated = true;
                                                    this.testResults.storyContentReceived = true;
                                                }
                                                
                                                // Clear any setup parsing and prepare for direct streaming
                                                if (!this.isTestMode && typeof window !== 'undefined' && window.game) {
                                                    window.game.characterName.textContent = 'Story';
                                                    window.game.dialogueText.textContent = '';
                                                    window.game.hideContinueIndicator();
                                                }
                                                // Extract text after STP and set as initial content
                                                const postStpText = stpMatch[1];
                                                this.streamAccumulator = postStpText;
                                                this.updateStreamedText();
                                                return; // Skip processing this chunk as script
                                            } else if (!hasVNFormat && fullAccumulated.trim().length > 50) {
                                                // Regular text format - treat entire content as story
                                                this.sceneSetupComplete = true;
                                                console.log('🎭 Regular text detected, treating as story content');
                                                
                                                if (this.isTestMode) {
                                                    this.testResults.sceneSetupCompleted = true;
                                                    this.testResults.directStreamingActivated = true;
                                                    this.testResults.storyContentReceived = true;
                                                }
                                                
                                                this.streamAccumulator = fullAccumulated;
                                                this.updateStreamedText();
                                                return;
                                            }
                                        }
                                        
                                        if (this.sceneSetupComplete) {
                                            // Accumulate streaming text and update display
                                            console.log('📺 Streaming mode - adding to accumulator:', JSON.stringify(parsed.message));
                                            this.streamAccumulator = (this.streamAccumulator || '') + parsed.message;
                                            
                                            if (this.isTestMode) {
                                                this.testResults.directStreamingActivated = true;
                                                this.testResults.storyContentReceived = true;
                                            }
                                            
                                            this.updateStreamedText();
                                        } else {
                                            // Still in setup phase - process as script commands
                                            // Buffer chunks until we have complete lines
                                            lineBuffer += parsed.message;
                                            const parts = lineBuffer.split('\n');
                                            
                                            // Everything except the last element is a complete line
                                            const completeLines = parts.slice(0, -1).join('\n');
                                            // Keep the last part (might be incomplete) for next chunk
                                            lineBuffer = parts[parts.length - 1];
                                            
                                            // Only send complete lines to the game engine
                                            if (completeLines.length > 0 && !this.isTestMode && typeof window !== 'undefined' && window.game) {
                                                console.log('📝 Adding complete lines:', completeLines);
                                                window.game.loadScript(completeLines + '\n', { append: true });
                                                window.game.resumeFromWaiting();
                                            }
                                        }
                                        
                                        console.log('📝 Added chunk, total length:', fullAccumulated.length);
                                        break;
                                        
                                    case 'done':
                                        fullAccumulated = parsed.message;
                                        console.log('✅ Story complete, final length:', fullAccumulated.length);
                                        // Update script area and end streaming mode
                                        this.updateScriptArea(fullAccumulated);
                                        
                                        // Flush any remaining content in the line buffer
                                        if (lineBuffer.trim().length > 0 && window.game) {
                                            console.log('📝 Flushing final content:', lineBuffer);
                                            window.game.loadScript(lineBuffer + '\n', { append: true });
                                            lineBuffer = '';
                                        }
                                        
                                        if (window.game) {
                                            window.game.streaming = false;
                                            window.game.resumeFromWaiting();
                                        }
                                        return;
                                        
                                    case 'error':
                                        throw new Error(parsed.error);
                                }
                            } catch (parseError) {
                                console.warn('Failed to parse streaming data:', data, parseError);
                            }
                        }
                    }
                } catch (streamError) {
                    console.error('Stream processing error:', streamError);
                    if (this.isTestMode) {
                        this.testResults.error = streamError.message;
                    } else {
                        this.showNotification('Streaming error occurred', 'error');
                    }
                }
            };

            await processStream();

        } catch (error) {
            console.error('Kindroid request failed:', error);
            if (this.isTestMode) {
                this.testResults.error = error.message;
            } else {
                this.showNotification(`Failed to get AI story: ${error.message}`, 'error');
            }
        } finally {
            if (this.isTestMode) {
                this.testResults.finalStoryLength = this.streamAccumulator?.length || 0;
            }
            
            // Reset button state after a delay (browser only)
            if (!this.isTestMode && button) {
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.background = '#6366f1';
                }, 1000);
            }
        }
    }

    updateScriptArea(fullMessage) {
        // Update the script area with the latest content (browser only)
        if (!this.isTestMode && typeof window !== 'undefined') {
            const scriptArea = document.getElementById('script-area');
            if (scriptArea) {
                scriptArea.value = fullMessage;
            }
        }
    }

    updateStreamedText() {
        // Update the dialogue box with accumulated streaming text
        if (!this.isTestMode && typeof window !== 'undefined' && window.game && window.game.dialogueText && this.streamAccumulator) {
            // Cancel any existing typewriter effects
            if (window.game.typewriterInterval) {
                clearInterval(window.game.typewriterInterval);
                window.game.typewriterInterval = null;
            }
            if (this.streamTypewriterInterval) {
                clearInterval(this.streamTypewriterInterval);
                this.streamTypewriterInterval = null;
            }
            
            // Set text directly without typewriter effect for smoother streaming
            window.game.dialogueText.textContent = this.streamAccumulator;
            console.log('📺 Updated streaming text, length:', this.streamAccumulator.length);
        } else if (this.isTestMode) {
            console.log('📺 Test mode - streaming text length:', this.streamAccumulator?.length || 0);
        }
    }

    tryIncrementalUpdate(currentText) {
        // Show live preview of streaming text in dialogue box
        if (window.game && window.game.dialogueText && currentText.length > 50) {
            // Extract the latest readable content to show as preview
            const lines = currentText.split('\n');
            const textLines = lines.filter(line => 
                !line.startsWith('LOC:') && 
                !line.startsWith('CHA:') && 
                !line.startsWith('STP:') &&
                !line.includes(':') && // Skip dialogue lines for now
                line.trim().length > 10
            );
            
        }
    }


    showNotification(message, type = 'info') {
        if (this.isTestMode || typeof window === 'undefined') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `kindroid-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : type === 'success' ? '#059669' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize Kindroid client when DOM is loaded (browser only)
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.kindroidClient = new KindroidClient();
    });
    window.KindroidClient = KindroidClient;
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KindroidClient;
}
class KindroidClient {
    constructor(options = {}) {
        this.baseURL = options.baseURL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        this.streamAccumulator = '';
        this.sceneSetupComplete = false;
        this.isTestMode = options.testMode || false;
        this.testResults = {};
        this.dialogueBoxObserver = null;
        this.positionCheckInterval = null;
        this.windowResizeHandler = null;
        
        if (!this.isTestMode && typeof window !== 'undefined') {
            this.setupUI();
            // Create persistent input panel immediately
            this.createPersistentInputPanel();
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
            this.requestMessageFromKindroid();
        });

        document.body.appendChild(kindroidBtn);
    }

    async requestMessageFromKindroid(message = null) {
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
                    locationLength: 0,
                    charactersLength: 0,
                    setupLength: 0,
                    error: null
                };
            }

            // Set up fetch with streaming
            const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
            const requestBody = message ? { message } : {};
            const response = await fetchFn(`${this.baseURL}/api/kindroid/send-kindroid-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(requestBody)
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
                                                    
                                                    // Extract and measure setup components
                                                    const locMatch = fullAccumulated.match(/LOC:\s*(.+)/);
                                                    const chaMatch = fullAccumulated.match(/CHA:\s*(.+)/);
                                                    const stpMatchForMeasure = fullAccumulated.match(/STP:\s*(.+)/);
                                                    
                                                    this.testResults.locationLength = locMatch ? locMatch[1].trim().length : 0;
                                                    this.testResults.charactersLength = chaMatch ? chaMatch[1].trim().length : 0;
                                                    this.testResults.setupLength = stpMatchForMeasure ? stpMatchForMeasure[1].trim().length : 0;
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
                                                // Continue processing - don't return early
                                            } else if (!hasVNFormat && fullAccumulated.trim().length > 50) {
                                                // Regular text format - treat entire content as story
                                                this.sceneSetupComplete = true;
                                                console.log('🎭 Regular text detected, treating as story content');
                                                
                                                if (this.isTestMode) {
                                                    this.testResults.sceneSetupCompleted = true;
                                                    this.testResults.directStreamingActivated = true;
                                                    this.testResults.storyContentReceived = true;
                                                    
                                                    // For regular text, set minimal values since no VN format detected
                                                    this.testResults.locationLength = 0;
                                                    this.testResults.charactersLength = 0;
                                                    this.testResults.setupLength = 0;
                                                }
                                                
                                                this.streamAccumulator = fullAccumulated;
                                                this.updateStreamedText();
                                                // Continue processing - don't return early
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
                                        
                                        // End streaming mode without flushing line buffer to preserve streamed content
                                        if (window.game) {
                                            window.game.streaming = false;
                                            window.game.resumeFromWaiting();
                                        }
                                        
                                        // Display STP options after streaming is complete
                                        this.displayStpOptions(fullAccumulated);
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


    createPersistentInputPanel() {
        console.log('🎮 Creating persistent input panel');
        
        // Create the persistent panel with no options initially
        this.createStpOptionButtons([]);
        
        // Mark it as persistent so it doesn't get removed
        const container = document.getElementById('stp-options-container');
        if (container) {
            container.setAttribute('data-persistent', 'true');
            
            // Set up monitoring for dialogue box changes
            this.setupDialogueBoxMonitoring();
        }
    }

    setupDialogueBoxMonitoring() {
        const dialogueBox = document.querySelector('.dialogue-box, #dialogue-box, .story-box, #story-box') || 
                           document.querySelector('[class*="dialogue"], [class*="story"], [id*="dialogue"], [id*="story"]');
        
        if (!dialogueBox) {
            console.log('⚠️ No dialogue box found for monitoring');
            return;
        }

        // Use ResizeObserver if available (modern browsers)
        if (window.ResizeObserver) {
            this.dialogueBoxObserver = new ResizeObserver((entries) => {
                this.updateInputPanelPosition();
            });
            this.dialogueBoxObserver.observe(dialogueBox);
            console.log('✅ ResizeObserver monitoring dialogue box changes');
        } else {
            // Fallback: Use MutationObserver and periodic checks
            this.dialogueBoxObserver = new MutationObserver(() => {
                this.updateInputPanelPosition();
            });
            this.dialogueBoxObserver.observe(dialogueBox, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                subtree: true
            });
            
            // Also do periodic checks as fallback
            this.positionCheckInterval = setInterval(() => {
                this.updateInputPanelPosition();
            }, 500);
            
            console.log('✅ MutationObserver + periodic monitoring dialogue box changes');
        }

        // Also listen for window resize
        this.windowResizeHandler = () => {
            setTimeout(() => this.updateInputPanelPosition(), 100);
        };
        window.addEventListener('resize', this.windowResizeHandler);
    }

    updateInputPanelPosition() {
        const container = document.getElementById('stp-options-container');
        const dialogueBox = document.querySelector('.dialogue-box, #dialogue-box, .story-box, #story-box') || 
                           document.querySelector('[class*="dialogue"], [class*="story"], [id*="dialogue"], [id*="story"]');
        
        if (!container || !dialogueBox) {
            return;
        }

        // Update positioning based on current dialogue box dimensions
        console.log('📐 Updating input panel position:', {
            left: dialogueBox.offsetLeft,
            top: dialogueBox.offsetTop,
            width: dialogueBox.offsetWidth,
            height: dialogueBox.offsetHeight
        });

        container.style.top = `${dialogueBox.offsetTop - 60}px`;
        container.style.left = `${dialogueBox.offsetLeft}px`;
        container.style.width = `${dialogueBox.offsetWidth}px`;
    }


    displayStpOptions(fullAccumulated) {
        if (this.isTestMode || typeof window === 'undefined') {
            console.log('📋 STP options would be displayed in browser mode');
            return;
        }

        // Extract STP content from the accumulated text
        const stpMatch = fullAccumulated.match(/STP:\s*(.+)/);
        if (!stpMatch) {
            console.log('⚠️ No STP content found to create options');
            return;
        }

        const stpContent = stpMatch[1].trim();
        console.log('🎯 Creating STP options from:', stpContent);

        // Parse options from STP content (split by '/' for multiple options)
        const options = stpContent.split('/').map(option => option.trim()).filter(option => option.length > 0);
        
        if (options.length === 0) {
            console.log('⚠️ No valid options found in STP content');
            return;
        }

        this.updateStpOptions(options);
    }

    updateStpOptions(options) {
        // Update existing panel or create new one
        const existingContainer = document.getElementById('stp-options-container');
        
        if (existingContainer) {
            // Update existing panel
            console.log(`🔄 Updating existing panel with ${options.length} options`);
            this.updateUnifiedPanel(existingContainer, options);
        } else {
            // Create new panel
            console.log(`🆕 Creating new panel with ${options.length} options`);
            this.createStpOptionButtons(options);
        }
    }

    createStpOptionButtons(options) {

        // Find the story/dialogue box to position options relative to it
        const dialogueBox = document.querySelector('.dialogue-box, #dialogue-box, .story-box, #story-box') || 
                           document.querySelector('[class*="dialogue"], [class*="story"], [id*="dialogue"], [id*="story"]');
        
        // Create or update the options container
        let optionsContainer = document.getElementById('stp-options-container');
        if (!optionsContainer) {
            optionsContainer = document.createElement('div');
            optionsContainer.id = 'stp-options-container';
            
            if (dialogueBox) {
                // Position relative to the dialogue box
                const boxRect = dialogueBox.getBoundingClientRect();
                console.log('📍 Dialogue box found:', {
                    left: dialogueBox.offsetLeft,
                    top: dialogueBox.offsetTop,
                    width: dialogueBox.offsetWidth,
                    height: dialogueBox.offsetHeight
                });
                
                optionsContainer.style.cssText = `
                    position: absolute;
                    top: ${dialogueBox.offsetTop - 60}px;
                    left: ${dialogueBox.offsetLeft}px;
                    width: ${dialogueBox.offsetWidth}px;
                    background: rgba(0, 0, 0, 0.8);
                    border-radius: 12px 12px 0 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                    border: 2px solid white;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
                    box-sizing: border-box;
                `;
            } else {
                // Fallback positioning if dialogue box not found
                console.log('⚠️ No dialogue box found, using fallback positioning');
                optionsContainer.style.cssText = `
                    position: fixed;
                    top: 20%;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    border-radius: 12px;
                    padding: 15px 20px;
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                    max-width: 400px;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
                `;
            }
            
            document.body.appendChild(optionsContainer);
        } else {
            // Clear existing options
            optionsContainer.innerHTML = '';
            
            // Update positioning if dialogue box moved
            if (dialogueBox) {
                optionsContainer.style.top = `${dialogueBox.offsetTop - 60}px`;
                optionsContainer.style.left = `${dialogueBox.offsetLeft}px`;
                optionsContainer.style.width = `${dialogueBox.offsetWidth}px`;
            }
        }

        // Create the unified panel content
        this.createUnifiedPanel(optionsContainer, options);
    }

    createUnifiedPanel(container, options) {
        // Create text input section (full width now)
        const inputSection = document.createElement('div');
        inputSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px 20px;
            box-sizing: border-box;
        `;

        // Create text input
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.id = 'stp-text-input';
        textInput.placeholder = 'Type your response...';
        textInput.style.cssText = `
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 10px 14px;
            color: white;
            font-size: 14px;
            outline: none;
            transition: all 0.3s ease;
        `;

        // Add input focus effects
        textInput.addEventListener('focus', () => {
            textInput.style.background = 'rgba(255, 255, 255, 0.15)';
            textInput.style.borderColor = 'rgba(102, 126, 234, 0.6)';
            textInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.2)';
        });

        textInput.addEventListener('blur', () => {
            textInput.style.background = 'rgba(255, 255, 255, 0.1)';
            textInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            textInput.style.boxShadow = 'none';
        });

        // Add enter key handler
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && textInput.value.trim()) {
                this.handleTextInput(textInput.value.trim());
                textInput.value = '';
            }
        });

        // Create send button
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send';
        sendButton.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.3s ease;
            min-width: 60px;
        `;

        sendButton.addEventListener('click', () => {
            if (textInput.value.trim()) {
                this.handleTextInput(textInput.value.trim());
                textInput.value = '';
            }
        });

        sendButton.addEventListener('mouseenter', () => {
            sendButton.style.transform = 'scale(1.05)';
            sendButton.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
        });

        sendButton.addEventListener('mouseleave', () => {
            sendButton.style.transform = 'scale(1)';
            sendButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        });

        inputSection.appendChild(textInput);
        inputSection.appendChild(sendButton);

        container.appendChild(inputSection);

        // Create separate options container for center-right positioning
        this.createCenterRightOptions(options);
        
        console.log(`✅ Created input panel and ${options.length} center-right option buttons`);
    }

    createCenterRightOptions(options) {
        // Remove existing center-right options container if it exists
        const existingContainer = document.getElementById('center-right-options');
        if (existingContainer) {
            existingContainer.remove();
        }

        if (options.length === 0) {
            return;
        }

        // Create center-right options container
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'center-right-options';
        optionsContainer.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 1000;
            pointer-events: auto;
        `;

        // Create option buttons
        options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'stp-option-button';
            button.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.3s ease;
                white-space: nowrap;
                text-align: center;
                min-width: 120px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            `;

            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px) scale(1.05)';
                button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                button.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0) scale(1)';
                button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            });

            // Add click handler
            button.addEventListener('click', () => {
                console.log(`🎯 STP option clicked: "${option}"`);
                this.handleStpOptionClick(option, index);
            });

            optionsContainer.appendChild(button);
        });

        // Add animation CSS if not exists
        if (!document.getElementById('stp-animations')) {
            const style = document.createElement('style');
            style.id = 'stp-animations';
            style.textContent = `
                @keyframes fadeInRight {
                    from {
                        opacity: 0;
                        transform: translateY(-50%) translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(-50%) translateX(0);
                    }
                }
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateY(-50%) translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-50%) translateX(20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Add fade-in animation
        optionsContainer.style.opacity = '0';
        optionsContainer.style.animation = 'fadeInRight 0.5s ease forwards';

        document.body.appendChild(optionsContainer);
        console.log(`✅ Created ${options.length} center-right option buttons`);
    }

    updateUnifiedPanel(container, options) {
        // Update the center-right options instead of panel options
        this.createCenterRightOptions(options);
        console.log(`🔄 Updated center-right options with ${options.length} buttons`);
    }

    async handleTextInput(text) {
        console.log(`📝 User typed: "${text}"`);
        
        // Show notification that we're processing
        this.showNotification(`Sending: ${text}`, 'info');
        
        // Send the user's message to Kindroid AI like the "Get AI Story" button
        await this.requestMessageFromKindroid(text);
    }


    async handleStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        let fullAccumulated = '';
        let hasStartedDisplay = false;
        let lineBuffer = '';

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
                                    if (!hasStartedDisplay) {
                                        hasStartedDisplay = true;
                                        fullAccumulated = parsed.message;
                                        console.log('🎬 Starting story with setup:', parsed.message);
                                        this.initializeGameDisplay(parsed.message);
                                    }
                                    break;
                                    
                                case 'chunk':
                                    console.log('🔄 Processing chunk:', JSON.stringify(parsed.message), 'Setup complete:', this.sceneSetupComplete);
                                    fullAccumulated += parsed.message;
                                    this.updateScriptArea(fullAccumulated);
                                    this.processStreamingChunk(parsed.message, fullAccumulated, lineBuffer);
                                    break;
                                    
                                case 'done':
                                    fullAccumulated = parsed.message;
                                    console.log('✅ Story complete, final length:', fullAccumulated.length);
                                    this.updateScriptArea(fullAccumulated);
                                    this.finalizeStory(fullAccumulated);
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
    }

    initializeGameDisplay(message) {
        if (!this.isTestMode && typeof window !== 'undefined' && window.game) {
            window.game.streaming = true;
            window.game.loadScript(message);
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

    processStreamingChunk(chunk, fullAccumulated, lineBuffer) {
        // Check if we've completed scene setup (past LOC, CHA, STP) or if this is just regular text
        if (!this.sceneSetupComplete) {
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
                this.handleSceneSetupComplete(stpMatch[1]);
            } else if (!hasVNFormat && fullAccumulated.trim().length > 50) {
                // Regular text format - treat entire content as story
                this.sceneSetupComplete = true;
                console.log('🎭 Regular text detected, treating as story content');
                this.handleRegularTextContent(fullAccumulated);
            }
        }
        
        if (this.sceneSetupComplete) {
            // Accumulate streaming text and update display
            console.log('📺 Streaming mode - adding to accumulator:', JSON.stringify(chunk));
            this.streamAccumulator = (this.streamAccumulator || '') + chunk;
            this.updateStreamedText();
        } else {
            // Still in setup phase - process as script commands
            this.handleSetupPhaseChunk(chunk, lineBuffer);
        }
    }

    handleSceneSetupComplete(postStpText) {
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
        this.streamAccumulator = postStpText;
        this.updateStreamedText();
    }

    handleRegularTextContent(fullAccumulated) {
        if (this.isTestMode) {
            this.testResults.sceneSetupCompleted = true;
            this.testResults.directStreamingActivated = true;
            this.testResults.storyContentReceived = true;
        }
        
        this.streamAccumulator = fullAccumulated;
        this.updateStreamedText();
    }

    handleSetupPhaseChunk(chunk, lineBuffer) {
        // Buffer chunks until we have complete lines
        lineBuffer += chunk;
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

    finalizeStory(fullAccumulated) {
        // End streaming mode without flushing line buffer to preserve streamed content
        if (window.game) {
            window.game.streaming = false;
            window.game.resumeFromWaiting();
        }
        
        // Display STP options after streaming is complete
        this.displayStpOptions(fullAccumulated);
    }

    processAIMessage(message) {
        // Process non-streaming AI response
        console.log('📄 Processing AI message:', message);
        
        // Update script area
        this.updateScriptArea(message);
        
        // Check if it's VN format or regular text
        const hasVNFormat = message.match(/LOC:|CHA:|STP:/);
        
        if (hasVNFormat) {
            // Process as VN script
            if (!this.isTestMode && typeof window !== 'undefined' && window.game) {
                window.game.streaming = false;
                window.game.loadScript(message);
                window.game.startPlayback();
            }
            // Display STP options
            this.displayStpOptions(message);
        } else {
            // Process as regular story text
            this.streamAccumulator = message;
            this.updateStreamedText();
            if (!this.isTestMode && typeof window !== 'undefined' && window.game) {
                window.game.characterName.textContent = 'Story';
                window.game.streaming = false;
            }
        }
    }

    handleStpOptionClick(option, index) {
        console.log(`🎯 User selected STP option ${index + 1}: "${option}"`);
        
        // Show notification for now
        this.showNotification(`Selected: ${option}`, 'info');
        
        // TODO: Implement actual option handling logic here
        // This is where you'd send the choice back to the game engine or AI
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

    // Cleanup method to remove observers and listeners
    cleanup() {
        if (this.dialogueBoxObserver) {
            this.dialogueBoxObserver.disconnect();
            this.dialogueBoxObserver = null;
        }
        
        if (this.positionCheckInterval) {
            clearInterval(this.positionCheckInterval);
            this.positionCheckInterval = null;
        }
        
        if (this.windowResizeHandler) {
            window.removeEventListener('resize', this.windowResizeHandler);
            this.windowResizeHandler = null;
        }
        
        console.log('🧹 Cleaned up dialogue box monitoring');
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
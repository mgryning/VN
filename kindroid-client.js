class KindroidClient {
    constructor() {
        this.baseURL = window.location.origin;
        this.setupUI();
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
        const button = document.getElementById('kindroid-btn');
        const originalText = button.textContent;
        
        try {
            // Update button state
            button.textContent = 'Streaming Story...';
            button.disabled = true;
            button.style.background = '#9ca3af';

            // Set up fetch with streaming
            const response = await fetch(`${this.baseURL}/api/kindroid/repeat-previous`, {
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
            let fullMessage = '';
            let hasStartedDisplay = false;

            const processStream = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) break;
                        
                        const chunk = new TextDecoder().decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);
                                if (data === '[DONE]') {
                                    return;
                                }
                                
                                try {
                                    const parsed = JSON.parse(data);
                                    
                                    switch (parsed.type) {
                                        case 'setup_ready':
                                            // We have LOC/CHA/STP - start displaying immediately
                                            if (!hasStartedDisplay) {
                                                hasStartedDisplay = true;
                                                button.textContent = 'Loading Scene...';
                                                this.parseAndLoadStoryPartial(parsed.message);
                                                this.showNotification('Scene setup received, starting story...', 'info');
                                            }
                                            break;
                                            
                                        case 'chunk':
                                            fullMessage = parsed.message;
                                            // Update the script area with latest content
                                            this.updateScriptArea(fullMessage);
                                            break;
                                            
                                        case 'done':
                                            fullMessage = parsed.message;
                                            this.finalizeStory(fullMessage);
                                            this.showNotification('AI story completed!', 'success');
                                            return;
                                            
                                        case 'error':
                                            throw new Error(parsed.error);
                                    }
                                } catch (parseError) {
                                    console.warn('Failed to parse streaming data:', data);
                                }
                            }
                        }
                    }
                } catch (streamError) {
                    console.error('Stream processing error:', streamError);
                    this.showNotification('Streaming error occurred', 'error');
                }
            };

            await processStream();

        } catch (error) {
            console.error('Kindroid request failed:', error);
            this.showNotification(`Failed to get AI story: ${error.message}`, 'error');
        } finally {
            // Reset button state after a delay
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
                button.style.background = '#6366f1';
            }, 1000);
        }
    }

    parseAndLoadStory(aiResponse) {
        // Load the AI response into the script area
        const scriptArea = document.getElementById('script-area');
        if (scriptArea) {
            scriptArea.value = aiResponse;
            
            // Auto-execute the script if the game engine is available
            if (window.game) {
                try {
                    window.game.loadScript(aiResponse);
                    window.game.startPlayback();
                    
                    // Auto-advance to first dialogue/action if available
                    setTimeout(() => {
                        this.autoAdvanceToFirstContent();
                    }, 100);
                } catch (error) {
                    console.error('Failed to load AI story:', error);
                    this.showNotification('AI story loaded but failed to parse. Check script format.', 'warning');
                }
            }
        }
    }

    parseAndLoadStoryPartial(partialResponse) {
        // Load partial response and start scene setup
        const scriptArea = document.getElementById('script-area');
        if (scriptArea) {
            scriptArea.value = partialResponse;
            
            // Start loading the scene with whatever we have
            if (window.game) {
                try {
                    window.game.loadScript(partialResponse);
                    window.game.startPlayback();
                    
                    // Auto-advance to show the scene setup
                    setTimeout(() => {
                        this.autoAdvanceToFirstContent();
                    }, 100);
                } catch (error) {
                    console.error('Failed to load partial story:', error);
                }
            }
        }
    }

    updateScriptArea(fullMessage) {
        // Update the script area with the latest content
        const scriptArea = document.getElementById('script-area');
        if (scriptArea) {
            scriptArea.value = fullMessage;
        }
    }

    finalizeStory(fullMessage) {
        // Final load with complete story
        const scriptArea = document.getElementById('script-area');
        if (scriptArea) {
            scriptArea.value = fullMessage;
            
            // Reload the complete script
            if (window.game) {
                try {
                    window.game.loadScript(fullMessage);
                    window.game.startPlayback();
                    
                    // Auto-advance to first dialogue/action
                    setTimeout(() => {
                        this.autoAdvanceToFirstContent();
                    }, 100);
                } catch (error) {
                    console.error('Failed to finalize story:', error);
                    this.showNotification('Story completed but failed to reload. Check script format.', 'warning');
                }
            }
        }
    }

    autoAdvanceToFirstContent() {
        if (window.game && window.game.isPlaying) {
            // Keep advancing until we hit dialogue or action content
            const maxAttempts = 10; // Prevent infinite loops
            let attempts = 0;
            
            const advanceToContent = () => {
                attempts++;
                
                if (attempts > maxAttempts) {
                    console.warn('Max attempts reached while auto-advancing');
                    return;
                }
                
                const currentCommand = window.game.currentCommand;
                
                // If no command yet, or it's just location/character setup, advance
                if (!currentCommand || 
                    currentCommand.type === 'location' || 
                    currentCommand.type === 'characters') {
                    
                    if (window.game.parser.hasNext()) {
                        window.game.nextCommand();
                        // Continue checking after a brief delay
                        setTimeout(advanceToContent, 50);
                    }
                } else if (currentCommand.type === 'dialogue' || currentCommand.type === 'action') {
                    // We've reached actual content, stop auto-advancing
                    console.log('Auto-advanced to first content:', currentCommand.type);
                }
            };
            
            advanceToContent();
        }
    }

    showNotification(message, type = 'info') {
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

// Initialize Kindroid client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kindroidClient = new KindroidClient();
});

window.KindroidClient = KindroidClient;
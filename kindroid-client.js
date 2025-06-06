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
            const decoder = new TextDecoder();
            let pending = '';
            let fullAccumulated = '';
            let hasStartedDisplay = false;

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
                                            button.textContent = 'Loading Scene...';
                                            fullAccumulated = parsed.message;
                                            console.log('🎬 Starting story with setup:', parsed.message.substring(0, 100) + '...');
                                            // Set streaming mode and load initial setup
                                            if (window.game) {
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
                                        fullAccumulated += parsed.message;
                                        // Update the script area with latest content
                                        this.updateScriptArea(fullAccumulated);
                                        // Append new content to the game engine
                                        if (window.game) {
                                            window.game.loadScript(parsed.message, { append: true });
                                            window.game.resumeFromWaiting();
                                        }
                                        console.log('📝 Added chunk, total length:', fullAccumulated.length);
                                        break;
                                        
                                    case 'done':
                                        fullAccumulated = parsed.message;
                                        console.log('✅ Story complete, final length:', fullAccumulated.length);
                                        // Update script area and end streaming mode
                                        this.updateScriptArea(fullAccumulated);
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


    updateScriptArea(fullMessage) {
        // Update the script area with the latest content
        const scriptArea = document.getElementById('script-area');
        if (scriptArea) {
            scriptArea.value = fullMessage;
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
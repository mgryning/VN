class AIIntegration {
    constructor(game, apiClient) {
        this.game = game;
        this.api = apiClient;
        this.isAIEnabled = false;
        this.currentChatCharacter = null;
        this.chatHistory = [];
        
        this.setupAIUI();
        this.bindAIEvents();
    }

    setupAIUI() {
        const aiPanel = document.createElement('div');
        aiPanel.id = 'ai-panel';
        aiPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #555;
            border-radius: 8px;
            padding: 15px;
            z-index: 30;
            display: none;
            max-height: 70vh;
            overflow-y: auto;
        `;

        aiPanel.innerHTML = `
            <div id="ai-header">
                <h3 style="color: #fff; margin: 0 0 15px 0;">AI Assistant</h3>
                <button id="ai-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #fff; cursor: pointer;">×</button>
            </div>
            
            <div id="ai-tabs">
                <button class="ai-tab active" data-tab="generate">Generate</button>
                <button class="ai-tab" data-tab="chat">Chat</button>
                <button class="ai-tab" data-tab="enhance">Enhance</button>
            </div>

            <div id="ai-content">
                <div id="generate-tab" class="ai-tab-content active">
                    <label for="story-prompt" style="color: #fff; display: block; margin-bottom: 5px;">Story Prompt:</label>
                    <textarea id="story-prompt" placeholder="Describe the story you want to generate..." style="width: 100%; height: 60px; margin-bottom: 10px; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;"></textarea>
                    
                    <label for="story-genre" style="color: #fff; display: block; margin-bottom: 5px;">Genre:</label>
                    <select id="story-genre" style="width: 100%; margin-bottom: 10px; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;">
                        <option value="fantasy">Fantasy</option>
                        <option value="romance">Romance</option>
                        <option value="mystery">Mystery</option>
                        <option value="scifi">Sci-Fi</option>
                        <option value="horror">Horror</option>
                    </select>
                    
                    <button id="generate-story" style="width: 100%; padding: 10px; background: #007acc; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Generate Story</button>
                    <button id="continue-story" style="width: 100%; padding: 10px; background: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Continue Current Story</button>
                </div>

                <div id="chat-tab" class="ai-tab-content">
                    <label for="chat-character" style="color: #fff; display: block; margin-bottom: 5px;">Chat with Character:</label>
                    <select id="chat-character" style="width: 100%; margin-bottom: 10px; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;">
                        <option value="">Select a character...</option>
                    </select>
                    
                    <div id="chat-history" style="background: #222; border: 1px solid #555; border-radius: 4px; padding: 10px; height: 200px; overflow-y: auto; margin-bottom: 10px; color: #fff; font-size: 12px;"></div>
                    
                    <input type="text" id="chat-input" placeholder="Type your message..." style="width: calc(100% - 60px); padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px;">
                    <button id="send-chat" style="width: 50px; padding: 8px; background: #007acc; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;">Send</button>
                </div>

                <div id="enhance-tab" class="ai-tab-content">
                    <button id="validate-script" style="width: 100%; padding: 10px; background: #ffc107; color: #000; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Validate Script</button>
                    <button id="format-script" style="width: 100%; padding: 10px; background: #17a2b8; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Format Script</button>
                    <button id="enhance-script" style="width: 100%; padding: 10px; background: #6f42c1; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">Enhance Script</button>
                    <button id="analyze-scene" style="width: 100%; padding: 10px; background: #fd7e14; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Analyze Scene</button>
                </div>
            </div>

            <div id="ai-status" style="margin-top: 15px; padding: 8px; background: #333; border-radius: 4px; color: #fff; font-size: 12px; display: none;"></div>
        `;

        document.body.appendChild(aiPanel);
        this.aiPanel = aiPanel;

        const aiToggle = document.createElement('button');
        aiToggle.id = 'ai-toggle';
        aiToggle.textContent = 'AI';
        aiToggle.style.cssText = `
            position: fixed;
            top: 20px;
            right: 380px;
            background: #007acc;
            color: #fff;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            cursor: pointer;
            z-index: 25;
            font-weight: bold;
        `;

        document.body.appendChild(aiToggle);

        this.addAIStyles();
    }

    addAIStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ai-tab {
                background: #444;
                color: #fff;
                border: none;
                padding: 8px 12px;
                margin-right: 5px;
                border-radius: 4px 4px 0 0;
                cursor: pointer;
            }
            .ai-tab.active {
                background: #007acc;
            }
            .ai-tab:hover {
                background: #555;
            }
            .ai-tab.active:hover {
                background: #0056b3;
            }
            .ai-tab-content {
                display: none;
                margin-top: 15px;
            }
            .ai-tab-content.active {
                display: block;
            }
            #chat-history .chat-message {
                margin-bottom: 10px;
                padding: 5px;
                border-radius: 4px;
            }
            #chat-history .user-message {
                background: #007acc;
                text-align: right;
            }
            #chat-history .ai-message {
                background: #444;
                text-align: left;
            }
            @media (max-width: 768px) {
                #ai-panel {
                    width: calc(100vw - 40px);
                    right: 20px;
                    left: 20px;
                }
                #ai-toggle {
                    right: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    bindAIEvents() {
        document.getElementById('ai-toggle').addEventListener('click', () => {
            this.toggleAIPanel();
        });

        document.getElementById('ai-close').addEventListener('click', () => {
            this.hideAIPanel();
        });

        const tabs = document.querySelectorAll('.ai-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.getElementById('generate-story').addEventListener('click', () => {
            this.generateStory();
        });

        document.getElementById('continue-story').addEventListener('click', () => {
            this.continueCurrentStory();
        });

        document.getElementById('send-chat').addEventListener('click', () => {
            this.sendChatMessage();
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        document.getElementById('validate-script').addEventListener('click', () => {
            this.validateCurrentScript();
        });

        document.getElementById('format-script').addEventListener('click', () => {
            this.formatCurrentScript();
        });

        document.getElementById('enhance-script').addEventListener('click', () => {
            this.enhanceCurrentScript();
        });

        document.getElementById('analyze-scene').addEventListener('click', () => {
            this.analyzeCurrentScene();
        });

        this.setupCharacterSelect();
    }

    setupCharacterSelect() {
        const select = document.getElementById('chat-character');
        const characters = [
            { name: 'morten', description: 'thoughtful, encouraging, observant' },
            { name: 'ava', description: 'artistic, self-critical, passionate' },
            { name: 'alice', description: 'curious, brave, optimistic' },
            { name: 'bob', description: 'cautious, protective, analytical' }
        ];
        
        characters.forEach(character => {
            const option = document.createElement('option');
            option.value = character.name;
            option.textContent = `${character.name} (${character.description})`;
            select.appendChild(option);
        });
    }

    toggleAIPanel() {
        const panel = this.aiPanel;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    hideAIPanel() {
        this.aiPanel.style.display = 'none';
    }

    switchTab(tabName) {
        document.querySelectorAll('.ai-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.ai-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async generateStory() {
        const prompt = document.getElementById('story-prompt').value;
        const genre = document.getElementById('story-genre').value;

        if (!prompt.trim()) {
            this.showStatus('Please enter a story prompt', 'error');
            return;
        }

        this.showStatus('Generating story...', 'loading');

        try {
            const response = await this.api.generateStory(prompt, genre, 5, ['protagonist', 'companion']);
            
            const scriptArea = document.getElementById('script-area');
            scriptArea.value = response.story;
            
            this.showStatus('Story generated successfully!', 'success');
        } catch (error) {
            this.showStatus('Failed to generate story: ' + error.message, 'error');
        }
    }

    async continueCurrentStory() {
        const currentScript = document.getElementById('script-area').value;
        
        if (!currentScript.trim()) {
            this.showStatus('No current script to continue', 'error');
            return;
        }

        this.showStatus('Continuing story...', 'loading');

        try {
            const response = await this.api.continueStory(
                currentScript,
                'continue naturally',
                ['alice', 'bob'],
                'current location'
            );
            
            const scriptArea = document.getElementById('script-area');
            scriptArea.value = currentScript + '\n\n' + response.continuation;
            
            this.showStatus('Story continued successfully!', 'success');
        } catch (error) {
            this.showStatus('Failed to continue story: ' + error.message, 'error');
        }
    }

    async sendChatMessage() {
        const character = document.getElementById('chat-character').value;
        const message = document.getElementById('chat-input').value;

        if (!character) {
            this.showStatus('Please select a character to chat with', 'error');
            return;
        }

        if (!message.trim()) {
            return;
        }

        this.addChatMessage('You', message, 'user');
        document.getElementById('chat-input').value = '';

        try {
            const response = await this.api.chatWithCharacter(
                character,
                message,
                this.getCurrentContext(),
                'neutral'
            );

            this.addChatMessage(character, response.response, 'ai');
        } catch (error) {
            this.addChatMessage('System', 'Failed to get response: ' + error.message, 'error');
        }
    }

    addChatMessage(sender, message, type) {
        const chatHistory = document.getElementById('chat-history');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        this.chatHistory.push({ sender, message, type, timestamp: Date.now() });
    }

    async validateCurrentScript() {
        const script = document.getElementById('script-area').value;
        
        if (!script.trim()) {
            this.showStatus('No script to validate', 'error');
            return;
        }

        this.showStatus('Validating script...', 'loading');

        try {
            const response = await this.api.validateScript(script);
            
            let statusMessage = `Validation ${response.valid ? 'passed' : 'failed'}`;
            if (response.errors.length > 0) {
                statusMessage += `\nErrors: ${response.errors.join(', ')}`;
            }
            if (response.warnings.length > 0) {
                statusMessage += `\nWarnings: ${response.warnings.join(', ')}`;
            }

            this.showStatus(statusMessage, response.valid ? 'success' : 'warning');
        } catch (error) {
            this.showStatus('Validation failed: ' + error.message, 'error');
        }
    }

    async formatCurrentScript() {
        const script = document.getElementById('script-area').value;
        
        if (!script.trim()) {
            this.showStatus('No script to format', 'error');
            return;
        }

        this.showStatus('Formatting script...', 'loading');

        try {
            const response = await this.api.formatScript(script, {
                normalizeSpacing: true,
                capitalizeNames: true,
                indentDialogue: false
            });
            
            document.getElementById('script-area').value = response.formatted;
            this.showStatus('Script formatted successfully!', 'success');
        } catch (error) {
            this.showStatus('Formatting failed: ' + error.message, 'error');
        }
    }

    async enhanceCurrentScript() {
        const script = document.getElementById('script-area').value;
        
        if (!script.trim()) {
            this.showStatus('No script to enhance', 'error');
            return;
        }

        this.showStatus('Enhancing script...', 'loading');

        try {
            const response = await this.api.enhanceScript(script, {
                addActions: true,
                enhanceDialogue: true,
                addMoodVariations: true
            });
            
            document.getElementById('script-area').value = response.enhanced.script;
            this.showStatus(`Script enhanced: ${response.enhanced.changes.join(', ')}`, 'success');
        } catch (error) {
            this.showStatus('Enhancement failed: ' + error.message, 'error');
        }
    }

    async analyzeCurrentScene() {
        const script = document.getElementById('script-area').value;
        
        if (!script.trim()) {
            this.showStatus('No script to analyze', 'error');
            return;
        }

        this.showStatus('Analyzing scene...', 'loading');

        try {
            const response = await this.api.analyzeScene(script, ['pacing', 'dialogue', 'character', 'mood']);
            
            this.showStatus(`Analysis: ${response.analysis}\n\nRecommendations: ${response.recommendations.join(', ')}`, 'info');
        } catch (error) {
            this.showStatus('Analysis failed: ' + error.message, 'error');
        }
    }

    getCurrentContext() {
        if (this.game && this.game.currentCommand) {
            return `Current scene: ${this.game.currentCommand.location || 'unknown'}, Characters: ${this.game.scene.currentCharacters.map(c => c.name).join(', ')}`;
        }
        return 'Visual novel context';
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('ai-status');
        statusDiv.style.display = 'block';
        statusDiv.textContent = message;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            loading: '#007acc',
            info: '#17a2b8'
        };

        statusDiv.style.backgroundColor = colors[type] || colors.info;
        statusDiv.style.color = type === 'warning' ? '#000' : '#fff';

        if (type !== 'loading') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    async checkServerConnection() {
        try {
            const health = await this.api.checkHealth();
            this.isAIEnabled = health.status === 'healthy';
            return this.isAIEnabled;
        } catch (error) {
            this.isAIEnabled = false;
            return false;
        }
    }
}

window.AIIntegration = AIIntegration;
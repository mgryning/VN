class APIClient {
    constructor(baseURL = 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.socket = null;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}/api${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    initSocket() {
        if (this.socket) return this.socket;

        this.socket = io(this.baseURL);
        
        this.socket.on('connect', () => {
            console.log('Connected to server via WebSocket');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return this.socket;
    }

    async generateStory(prompt, genre = 'fantasy', length = 5, characters = []) {
        return this.post('/ai/generate-story', {
            prompt,
            genre,
            length,
            characters
        });
    }

    async generateDialogue(character, situation, mood = 'neutral', previousContext = '') {
        return this.post('/ai/generate-dialogue', {
            character,
            situation,
            mood,
            previousContext
        });
    }


    async continueStory(currentScript, direction, characters = [], setting = '') {
        return this.post('/ai/continue-story', {
            currentScript,
            direction,
            characters,
            setting
        });
    }

    async analyzeScene(script, focusAreas = ['pacing', 'dialogue', 'character']) {
        return this.post('/ai/analyze-scene', {
            script,
            focusAreas
        });
    }

    async chatWithCharacter(character, message, context = '', mood = 'neutral') {
        return this.post('/ai/chat', {
            character,
            message,
            context,
            mood
        });
    }


    async analyzeMood(text, character = '') {
        return this.post('/ai/mood-analysis', {
            text,
            character
        });
    }

    async parseScript(script) {
        return this.post('/story/parse', { script });
    }

    async validateScript(script) {
        return this.post('/story/validate', { script });
    }

    async formatScript(script, options = {}) {
        return this.post('/story/format', { script, options });
    }

    async enhanceScript(script, enhanceOptions = {}) {
        return this.post('/story/enhance', { script, enhanceOptions });
    }

    async getStoryTemplates() {
        return this.get('/story/templates');
    }

    async convertFormat(script, fromFormat, toFormat) {
        return this.post('/story/convert', {
            script,
            fromFormat,
            toFormat
        });
    }

    chatWithAI(message, character, context = '') {
        if (!this.socket) {
            this.initSocket();
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('ai-chat', {
                message,
                character,
                context
            });

            this.socket.once('ai-response', resolve);
            this.socket.once('ai-error', reject);

            setTimeout(() => {
                reject(new Error('AI chat timeout'));
            }, 30000);
        });
    }

    joinStorySession(storyId) {
        if (!this.socket) {
            this.initSocket();
        }
        
        this.socket.emit('join-story', storyId);
    }

    onStoryUpdate(callback) {
        if (!this.socket) {
            this.initSocket();
        }
        
        this.socket.on('story-changed', callback);
    }

    sendStoryUpdate(storyId, data) {
        if (!this.socket) {
            this.initSocket();
        }
        
        this.socket.emit('story-update', { storyId, ...data });
    }

    async checkHealth() {
        try {
            return await this.get('/health');
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

window.APIClient = APIClient;
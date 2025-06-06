const axios = require('axios');

class AIController {
    constructor() {
        this.characterPersonalities = {
            alice: {
                traits: ['curious', 'brave', 'optimistic'],
                speaking_style: 'enthusiastic and descriptive',
                backstory: 'A young adventurer who loves exploring mysterious places'
            },
            bob: {
                traits: ['cautious', 'protective', 'analytical'],
                speaking_style: 'measured and concerned',
                backstory: 'Alice\'s companion who prefers safety over adventure'
            },
            morten: {
                traits: ['thoughtful', 'encouraging', 'observant'],
                speaking_style: 'calm and supportive with carefully chosen words',
                backstory: 'A reflective person who appreciates art and quiet moments by the ocean'
            },
            ava: {
                traits: ['artistic', 'self-critical', 'passionate'],
                speaking_style: 'expressive but uncertain, seeking validation',
                backstory: 'An artist with lavender hair who creates beautiful drawings but doubts her own talent'
            }
        };
    }

    async generateStory(req, res) {
        try {
            const { prompt, genre, length, characters } = req.body;
            
            const storyPrompt = this.buildStoryPrompt(prompt, genre, length, characters);
            const story = await this.callAI(storyPrompt);
            
            res.json({
                success: true,
                story: story,
                metadata: {
                    genre,
                    length,
                    characters,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async generateDialogue(req, res) {
        try {
            const { character, situation, mood, previousContext } = req.body;
            
            const personality = this.characterPersonalities[character.toLowerCase()] || {};
            const dialoguePrompt = this.buildDialoguePrompt(character, situation, mood, personality, previousContext);
            const dialogue = await this.callAI(dialoguePrompt);
            
            res.json({
                success: true,
                character,
                dialogue,
                mood,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    async continueStory(req, res) {
        try {
            const { currentScript, direction, characters, setting } = req.body;
            
            const continuationPrompt = this.buildContinuationPrompt(currentScript, direction, characters, setting);
            const continuation = await this.callAI(continuationPrompt);
            
            res.json({
                success: true,
                continuation,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async analyzeScene(req, res) {
        try {
            const { script, focusAreas } = req.body;
            
            const analysisPrompt = this.buildAnalysisPrompt(script, focusAreas);
            const analysis = await this.callAI(analysisPrompt);
            
            res.json({
                success: true,
                analysis,
                recommendations: this.generateRecommendations(analysis),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async chatWithCharacter(req, res) {
        try {
            const { character, message, context, mood } = req.body;
            
            const personality = this.characterPersonalities[character.toLowerCase()] || {};
            const chatPrompt = this.buildChatPrompt(character, message, context, mood, personality);
            const response = await this.callAI(chatPrompt);
            
            res.json({
                success: true,
                character,
                response,
                mood: this.inferMood(response),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    async analyzeMood(req, res) {
        try {
            const { text, character } = req.body;
            
            const moodPrompt = this.buildMoodAnalysisPrompt(text, character);
            const moodAnalysis = await this.callAI(moodPrompt);
            
            res.json({
                success: true,
                mood: moodAnalysis.mood || 'neutral',
                confidence: moodAnalysis.confidence || 0.8,
                reasoning: moodAnalysis.reasoning,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    buildStoryPrompt(prompt, genre, length, characters) {
        return `Generate a visual novel script in the following format:
LOC: location_name
CHA: character1/mood, character2/mood
Character: Dialogue text
Action descriptions

Story details:
- Prompt: ${prompt}
- Genre: ${genre}
- Length: ${length} scenes
- Characters: ${characters?.join(', ')}

Create an engaging story with proper visual novel formatting.`;
    }

    buildDialoguePrompt(character, situation, mood, personality, previousContext) {
        return `Generate dialogue for ${character} with the following context:
- Situation: ${situation}
- Current mood: ${mood}
- Personality traits: ${personality.traits?.join(', ')}
- Speaking style: ${personality.speaking_style}
- Previous context: ${previousContext}

Respond only with the dialogue text, staying true to the character's personality.`;
    }


    buildContinuationPrompt(currentScript, direction, characters, setting) {
        return `Continue this visual novel script:

Current script:
${currentScript}

Continue the story with:
- Direction: ${direction}
- Active characters: ${characters?.join(', ')}
- Setting: ${setting}

Use the same LOC:/CHA: format and maintain character consistency.`;
    }

    buildAnalysisPrompt(script, focusAreas) {
        return `Analyze this visual novel script:

${script}

Focus on: ${focusAreas?.join(', ')}

Provide insights on pacing, character development, dialogue quality, and narrative flow.`;
    }

    buildChatPrompt(character, message, context, mood, personality) {
        return `You are ${character} from a visual novel. Respond to this message in character:

Message: "${message}"
Context: ${context}
Current mood: ${mood}
Personality: ${personality.traits?.join(', ')}
Speaking style: ${personality.speaking_style}
Background: ${personality.backstory}

Respond as ${character} would, maintaining their personality and current emotional state.`;
    }

    buildMoodAnalysisPrompt(text, character) {
        return `Analyze the mood/emotion in this text from ${character}:

"${text}"

Return the dominant mood (happy, sad, angry, worried, excited, neutral, etc.) and explain why.`;
    }

    async callAI(prompt) {
        const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY;
        
        if (!apiKey) {
            return this.generatePlaceholderResponse(prompt);
        }

        try {
            if (process.env.OPENAI_API_KEY) {
                return await this.callOpenAI(prompt);
            } else if (process.env.ANTHROPIC_API_KEY) {
                return await this.callAnthropic(prompt);
            } else {
                return this.generatePlaceholderResponse(prompt);
            }
        } catch (error) {
            console.error('AI API call failed:', error);
            return this.generatePlaceholderResponse(prompt);
        }
    }

    async callOpenAI(prompt) {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant for creating visual novel content.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }

    async callAnthropic(prompt) {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        return response.data.content[0].text;
    }

    generatePlaceholderResponse(prompt) {
        if (prompt.includes('dialogue')) {
            return "This is a placeholder dialogue response. Set up your AI API key to get real AI-generated content.";
        } else if (prompt.includes('mood')) {
            return { mood: 'neutral', confidence: 0.8, reasoning: 'Placeholder mood analysis' };
        } else if (prompt.includes('character')) {
            return {
                speaking_patterns: ['Placeholder speaking pattern'],
                quirks: ['Placeholder character quirk'],
                relationships: 'Placeholder relationship info'
            };
        } else {
            return "This is a placeholder AI response. Configure your AI service credentials in the .env file to get real AI-generated content.";
        }
    }

    inferMood(text) {
        const moodKeywords = {
            happy: ['happy', 'joy', 'excited', 'wonderful', 'great'],
            sad: ['sad', 'crying', 'tears', 'sorrow', 'depressed'],
            angry: ['angry', 'mad', 'furious', 'rage', 'annoyed'],
            worried: ['worried', 'concerned', 'anxious', 'nervous', 'afraid'],
            surprised: ['surprised', 'shocked', 'amazed', 'wow', 'incredible']
        };

        const lowerText = text.toLowerCase();
        for (const [mood, keywords] of Object.entries(moodKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return mood;
            }
        }
        return 'neutral';
    }

    generateRecommendations(analysis) {
        return [
            'Consider adding more descriptive actions between dialogue',
            'Ensure character moods match their dialogue tone',
            'Add scene transitions for better pacing'
        ];
    }
}

module.exports = new AIController();
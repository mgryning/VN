class StoryController {
    constructor() {
        this.storyTemplates = {
            romance: {
                name: 'Romance Template',
                description: 'A romantic visual novel template',
                template: `LOC: park_bench
CHA: protagonist/nervous, love_interest/curious
Protagonist: I've been wanting to tell you something for a long time...
Love_Interest: What is it? You look so serious.
The protagonist takes a deep breath, gathering courage.
Protagonist: I... I think I'm falling in love with you.`
            },
            mystery: {
                name: 'Mystery Template',
                description: 'A mystery investigation template',
                template: `LOC: crime_scene
CHA: detective/focused, assistant/worried
Detective: Look at this carefully. What do you notice?
Assistant: The window is broken from the inside, not outside.
Detective: Exactly. Which means...
Assistant: The perpetrator was already in the room.`
            },
            fantasy: {
                name: 'Fantasy Adventure Template',
                description: 'A fantasy adventure template',
                template: `LOC: enchanted_forest
CHA: hero/determined, wizard/wise
Wizard: The ancient magic flows strong here. Can you feel it?
Hero: Yes, it's like electricity in the air.
A mystical glow emanates from the sacred grove ahead.
Wizard: We must proceed with caution. Not all magic is friendly.`
            }
        };
    }

    async parseScript(req, res) {
        try {
            const { script } = req.body;
            const parsed = this.parseVisualNovelScript(script);
            
            res.json({
                success: true,
                parsed,
                statistics: this.generateStatistics(parsed),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async validateScript(req, res) {
        try {
            const { script } = req.body;
            const validation = this.validateScriptSyntax(script);
            
            res.json({
                success: true,
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async formatScript(req, res) {
        try {
            const { script, options } = req.body;
            const formatted = this.formatScriptText(script, options);
            
            res.json({
                success: true,
                formatted,
                changes: this.getFormattingChanges(script, formatted),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async enhanceScript(req, res) {
        try {
            const { script, enhanceOptions } = req.body;
            const enhanced = await this.enhanceScriptContent(script, enhanceOptions);
            
            res.json({
                success: true,
                enhanced,
                enhancements: enhanced.changes,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getStoryTemplates(req, res) {
        try {
            res.json({
                success: true,
                templates: this.storyTemplates,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async convertFormat(req, res) {
        try {
            const { script, fromFormat, toFormat } = req.body;
            const converted = this.convertScriptFormat(script, fromFormat, toFormat);
            
            res.json({
                success: true,
                converted,
                fromFormat,
                toFormat,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    parseVisualNovelScript(script) {
        const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const parsed = {
            locations: [],
            characters: [],
            scenes: [],
            dialogue: [],
            actions: []
        };

        let currentLocation = null;
        let currentCharacters = [];
        let sceneIndex = 0;

        for (const line of lines) {
            if (line.startsWith('LOC:')) {
                currentLocation = line.substring(4).trim();
                if (!parsed.locations.includes(currentLocation)) {
                    parsed.locations.push(currentLocation);
                }
                sceneIndex++;
            } else if (line.startsWith('CHA:')) {
                const charactersText = line.substring(4).trim();
                currentCharacters = this.parseCharactersFromLine(charactersText);
                
                currentCharacters.forEach(char => {
                    if (!parsed.characters.find(c => c.name === char.name)) {
                        parsed.characters.push({ name: char.name, moods: [char.mood] });
                    } else {
                        const existingChar = parsed.characters.find(c => c.name === char.name);
                        if (!existingChar.moods.includes(char.mood)) {
                            existingChar.moods.push(char.mood);
                        }
                    }
                });
            } else if (line.includes(':') && !line.startsWith('LOC:') && !line.startsWith('CHA:')) {
                const [speaker, ...textParts] = line.split(':');
                const text = textParts.join(':').trim();
                parsed.dialogue.push({
                    speaker: speaker.trim(),
                    text,
                    location: currentLocation,
                    scene: sceneIndex
                });
            } else if (line.length > 0) {
                parsed.actions.push({
                    text: line,
                    location: currentLocation,
                    scene: sceneIndex
                });
            }
        }

        return parsed;
    }

    parseCharactersFromLine(charactersText) {
        return charactersText.split(',').map(part => {
            const trimmed = part.trim();
            if (trimmed.includes('/')) {
                const [name, mood] = trimmed.split('/');
                return { name: name.trim(), mood: mood.trim() };
            }
            return { name: trimmed, mood: 'neutral' };
        });
    }

    validateScriptSyntax(script) {
        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        const lines = script.split('\n');
        let hasLocation = false;
        let hasCharacters = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lineNum = i + 1;

            if (line.startsWith('LOC:')) {
                hasLocation = true;
                if (line.length <= 4) {
                    validation.errors.push(`Line ${lineNum}: Empty location`);
                    validation.valid = false;
                }
            } else if (line.startsWith('CHA:')) {
                hasCharacters = true;
                if (line.length <= 4) {
                    validation.errors.push(`Line ${lineNum}: Empty characters list`);
                    validation.valid = false;
                }
            } else if (line.includes(':') && line.length > 0) {
                const colonIndex = line.indexOf(':');
                if (colonIndex === 0) {
                    validation.errors.push(`Line ${lineNum}: Missing speaker name`);
                    validation.valid = false;
                }
                if (colonIndex === line.length - 1) {
                    validation.warnings.push(`Line ${lineNum}: Empty dialogue`);
                }
            }
        }

        if (!hasLocation) {
            validation.warnings.push('No locations defined in script');
        }
        if (!hasCharacters) {
            validation.warnings.push('No characters defined in script');
        }

        validation.suggestions.push('Consider adding more descriptive actions between dialogue');
        validation.suggestions.push('Ensure character moods match their dialogue content');

        return validation;
    }

    formatScriptText(script, options = {}) {
        const {
            indentDialogue = false,
            normalizeSpacing = true,
            capitalizeNames = true
        } = options;

        let formatted = script;

        if (normalizeSpacing) {
            formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
            formatted = formatted.replace(/\s+$/gm, '');
        }

        const lines = formatted.split('\n');
        const formattedLines = lines.map(line => {
            let formattedLine = line.trim();

            if (formattedLine.startsWith('LOC:') || formattedLine.startsWith('CHA:')) {
                return formattedLine;
            }

            if (formattedLine.includes(':') && !formattedLine.startsWith('LOC:') && !formattedLine.startsWith('CHA:')) {
                const [speaker, ...textParts] = formattedLine.split(':');
                let speakerName = speaker.trim();
                
                if (capitalizeNames) {
                    speakerName = speakerName.charAt(0).toUpperCase() + speakerName.slice(1);
                }

                const dialogueText = textParts.join(':').trim();
                formattedLine = `${speakerName}: ${dialogueText}`;

                if (indentDialogue) {
                    formattedLine = '  ' + formattedLine;
                }
            }

            return formattedLine;
        });

        return formattedLines.join('\n');
    }

    async enhanceScriptContent(script, options = {}) {
        const {
            addActions = true,
            enhanceDialogue = true,
            addMoodVariations = true
        } = options;

        let enhanced = script;
        const changes = [];

        if (addActions) {
            enhanced = this.addActionSuggestions(enhanced);
            changes.push('Added action suggestions between dialogue');
        }

        if (addMoodVariations) {
            enhanced = this.addMoodVariations(enhanced);
            changes.push('Added mood variations for characters');
        }

        return {
            script: enhanced,
            changes
        };
    }

    addActionSuggestions(script) {
        const lines = script.split('\n');
        const enhanced = [];

        for (let i = 0; i < lines.length; i++) {
            enhanced.push(lines[i]);

            if (lines[i].includes(':') && !lines[i].startsWith('LOC:') && !lines[i].startsWith('CHA:')) {
                if (i < lines.length - 1 && lines[i + 1].includes(':')) {
                    enhanced.push('[Action suggestion: Add character reaction or movement here]');
                }
            }
        }

        return enhanced.join('\n');
    }

    addMoodVariations(script) {
        const moodSuggestions = {
            happy: ['excited', 'joyful', 'cheerful'],
            sad: ['melancholy', 'dejected', 'sorrowful'],
            angry: ['furious', 'irritated', 'enraged'],
            neutral: ['calm', 'thoughtful', 'focused']
        };

        return script.replace(/CHA: ([^/]+)\/(\w+)/g, (match, character, mood) => {
            const suggestions = moodSuggestions[mood.toLowerCase()];
            if (suggestions) {
                const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                return `CHA: ${character}/${mood} [Mood suggestion: ${suggestion}]`;
            }
            return match;
        });
    }

    convertScriptFormat(script, fromFormat, toFormat) {
        if (fromFormat === 'vn' && toFormat === 'json') {
            return this.vnToJson(script);
        } else if (fromFormat === 'json' && toFormat === 'vn') {
            return this.jsonToVn(script);
        } else if (fromFormat === 'vn' && toFormat === 'markdown') {
            return this.vnToMarkdown(script);
        }
        
        return script;
    }

    vnToJson(script) {
        const parsed = this.parseVisualNovelScript(script);
        return JSON.stringify(parsed, null, 2);
    }

    jsonToVn(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let script = '';

            if (data.scenes) {
                data.scenes.forEach(scene => {
                    if (scene.location) script += `LOC: ${scene.location}\n`;
                    if (scene.characters) {
                        const charString = scene.characters.map(c => `${c.name}/${c.mood}`).join(', ');
                        script += `CHA: ${charString}\n`;
                    }
                    if (scene.dialogue) {
                        scene.dialogue.forEach(d => {
                            script += `${d.speaker}: ${d.text}\n`;
                        });
                    }
                    if (scene.actions) {
                        scene.actions.forEach(a => {
                            script += `${a.text}\n`;
                        });
                    }
                    script += '\n';
                });
            }

            return script;
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }

    vnToMarkdown(script) {
        const lines = script.split('\n');
        let markdown = '# Visual Novel Script\n\n';

        for (const line of lines) {
            if (line.startsWith('LOC:')) {
                markdown += `## Location: ${line.substring(4).trim()}\n\n`;
            } else if (line.startsWith('CHA:')) {
                markdown += `**Characters:** ${line.substring(4).trim()}\n\n`;
            } else if (line.includes(':') && !line.startsWith('LOC:') && !line.startsWith('CHA:')) {
                const [speaker, ...textParts] = line.split(':');
                const text = textParts.join(':').trim();
                markdown += `**${speaker.trim()}:** ${text}\n\n`;
            } else if (line.trim().length > 0) {
                markdown += `*${line.trim()}*\n\n`;
            }
        }

        return markdown;
    }

    generateStatistics(parsed) {
        return {
            totalLocations: parsed.locations.length,
            totalCharacters: parsed.characters.length,
            totalDialogueLines: parsed.dialogue.length,
            totalActions: parsed.actions.length,
            averageDialoguePerScene: parsed.dialogue.length / Math.max(1, parsed.locations.length),
            characterMoodVariety: parsed.characters.reduce((total, char) => total + char.moods.length, 0) / parsed.characters.length || 0
        };
    }

    getFormattingChanges(original, formatted) {
        const originalLines = original.split('\n').length;
        const formattedLines = formatted.split('\n').length;
        
        return {
            linesChanged: formattedLines - originalLines,
            spacingNormalized: original !== formatted,
            summary: 'Script formatted with normalized spacing and capitalization'
        };
    }
}

module.exports = new StoryController();
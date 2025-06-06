class ScriptParser {
    constructor() {
        this.commands = [];
        this.currentIndex = 0;
        this.storyTransitionPoints = []; // Store STP actions
    }
    
    parseScript(scriptText) {
        const lines = scriptText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        this.commands = [];
        this.storyTransitionPoints = []; // Reset STP for new script
        
        let currentLocation = null;
        let currentCharacters = [];
        
        for (const line of lines) {
            const command = this.parseLine(line, currentLocation, currentCharacters);
            
            if (command) {
                if (command.type === 'location') {
                    currentLocation = command.location;
                } else if (command.type === 'characters') {
                    currentCharacters = command.characters;
                } else if (command.type === 'dialogue' || command.type === 'action') {
                    command.location = currentLocation;
                    command.characters = [...currentCharacters];
                } else if (command.type === 'stp') {
                    // Store STP actions but don't add to commands (so they don't display)
                    this.storyTransitionPoints = command.actions;
                    continue; // Skip adding to commands
                }
                
                this.commands.push(command);
            }
        }
        
        this.currentIndex = 0;
        return this.commands;
    }
    
    parseLine(line, currentLocation, currentCharacters) {
        line = line.trim();
        
        if (line.startsWith('LOC:')) {
            return this.parseLocation(line);
        } else if (line.startsWith('CHA:')) {
            return this.parseCharacters(line);
        } else if (line.startsWith('STP:')) {
            return this.parseStoryTransitionPoints(line);
        } else if (line.includes(':') && !line.startsWith('LOC:') && !line.startsWith('CHA:') && !line.startsWith('STP:')) {
            return this.parseDialogue(line, currentLocation, currentCharacters);
        } else if (line.length > 0) {
            return this.parseAction(line, currentLocation, currentCharacters);
        }
        
        return null;
    }
    
    parseLocation(line) {
        const location = line.substring(4).trim();
        return {
            type: 'location',
            location: location,
            backgrounds: this.getBackgroundsForLocation(location)
        };
    }
    
    parseCharacters(line) {
        const charactersText = line.substring(4).trim();
        const characters = [];
        
        const characterParts = charactersText.split(',').map(part => part.trim());
        
        for (const part of characterParts) {
            if (part.includes('/')) {
                const [name, mood] = part.split('/').map(s => s.trim());
                characters.push({ name, mood });
            } else {
                characters.push({ name: part, mood: 'neutral' });
            }
        }
        
        return {
            type: 'characters',
            characters: characters
        };
    }

    parseStoryTransitionPoints(line) {
        const stpText = line.substring(4).trim();
        const actions = stpText.split('/').map(action => action.trim()).filter(action => action.length > 0);
        
        console.log('📋 Story Transition Points found:', actions);
        
        return {
            type: 'stp',
            actions: actions
        };
    }
    
    parseDialogue(line, location, characters) {
        const colonIndex = line.indexOf(':');
        const speaker = line.substring(0, colonIndex).trim();
        const text = line.substring(colonIndex + 1).trim();
        
        const speakerChar = characters.find(char => 
            char.name.toLowerCase() === speaker.toLowerCase()
        );
        
        return {
            type: 'dialogue',
            speaker: speaker,
            text: text,
            mood: speakerChar ? speakerChar.mood : 'neutral',
            location: location,
            characters: characters
        };
    }
    
    parseAction(line, location, characters) {
        return {
            type: 'action',
            text: line,
            location: location,
            characters: characters
        };
    }
    
    getBackgroundsForLocation(location) {
        const locationBackgrounds = {
            'forest_clearing': ['#228B22', '#90EE90'],
            'castle_hall': ['#8B4513', '#DAA520'],
            'beach': ['#87CEEB', '#F0E68C', '#FFE4B5'],
            'mountain': ['#696969', '#C0C0C0'],
            'city': ['#708090', '#2F4F4F'],
            'room': ['#DEB887', '#F5DEB3'],
            'library': ['#8B4513', '#DEB887'],
            'garden': ['#9ACD32', '#98FB98']
        };
        
        return locationBackgrounds[location] || ['#87CEEB', '#FFB6C1'];
    }
    
    getCurrentCommand() {
        if (this.currentIndex < this.commands.length) {
            return this.commands[this.currentIndex];
        }
        return null;
    }
    
    getNextCommand() {
        this.currentIndex++;
        return this.getCurrentCommand();
    }
    
    getPreviousCommand() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        }
        return this.getCurrentCommand();
    }
    
    hasNext() {
        return this.currentIndex < this.commands.length - 1;
    }
    
    hasPrevious() {
        return this.currentIndex > 0;
    }
    
    reset() {
        this.currentIndex = 0;
    }
    
    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.commands.length,
            percentage: Math.round(((this.currentIndex + 1) / this.commands.length) * 100)
        };
    }
    
    getAllCommands() {
        return this.commands;
    }
    
    setCurrentIndex(index) {
        if (index >= 0 && index < this.commands.length) {
            this.currentIndex = index;
            return true;
        }
        return false;
    }

    getStoryTransitionPoints() {
        return this.storyTransitionPoints;
    }

    hasStoryTransitionPoints() {
        return this.storyTransitionPoints.length > 0;
    }
}
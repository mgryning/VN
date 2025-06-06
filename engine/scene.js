class Scene {
    constructor(renderer) {
        this.renderer = renderer;
        this.currentLocation = null;
        this.currentCharacters = [];
        this.isTransitioning = false;
    }
    
    async renderCommand(command) {
        if (this.isTransitioning) return;
        
        switch (command.type) {
            case 'location':
                await this.setLocation(command);
                break;
            case 'characters':
                await this.setCharacters(command);
                break;
            case 'dialogue':
                await this.renderDialogue(command);
                break;
            case 'action':
                await this.renderAction(command);
                break;
        }
    }
    
    async setLocation(command) {
        this.isTransitioning = true;
        
        if (this.currentLocation !== command.location) {
            await this.renderer.fadeOut(300);
            this.currentLocation = command.location;
            await this.renderScene();
            await this.renderer.fadeIn(300);
        }
        
        this.isTransitioning = false;
    }
    
    async setCharacters(command) {
        this.currentCharacters = command.characters.filter(char => 
            char.name.toLowerCase() !== 'morten'
        );
        await this.renderScene();
    }
    
    async renderDialogue(command) {
        if (command.characters) {
            this.currentCharacters = command.characters.filter(char => 
                char.name.toLowerCase() !== 'morten'
            );
        }
        this.currentLocation = command.location || this.currentLocation;
        await this.renderScene();
    }
    
    async renderAction(command) {
        if (command.characters) {
            this.currentCharacters = command.characters.filter(char => 
                char.name.toLowerCase() !== 'morten'
            );
        }
        this.currentLocation = command.location || this.currentLocation;
        await this.renderScene();
    }
    
    async renderScene() {
        this.renderer.clear();
        
        if (this.currentLocation) {
            await this.renderer.drawBackground(this.currentLocation);
        }
        
        if (this.currentCharacters && this.currentCharacters.length > 0) {
            await this.positionAndDrawCharacters();
        }
    }
    
    async positionAndDrawCharacters() {
        const positions = this.calculateCharacterPositions(this.currentCharacters.length);
        
        // Draw characters sequentially to avoid conflicts
        for (let i = 0; i < this.currentCharacters.length; i++) {
            const character = this.currentCharacters[i];
            const position = positions[i];
            await this.renderer.drawCharacter(character.name, character.mood, position);
        }
    }
    
    calculateCharacterPositions(count) {
        if (count === 1) {
            return ['center'];
        } else if (count === 2) {
            return ['left', 'right'];
        } else if (count === 3) {
            return ['left', 'center', 'right'];
        } else {
            const positions = [];
            for (let i = 0; i < count; i++) {
                const ratio = i / (count - 1);
                if (ratio < 0.3) positions.push('left');
                else if (ratio > 0.7) positions.push('right');
                else positions.push('center');
            }
            return positions;
        }
    }
    
    async highlightCharacter(characterName) {
        await this.renderScene();
        
        const character = this.currentCharacters.find(char => 
            char.name.toLowerCase() === characterName.toLowerCase()
        );
        
        if (character) {
            const index = this.currentCharacters.indexOf(character);
            const positions = this.calculateCharacterPositions(this.currentCharacters.length);
            const position = positions[index];
            
            this.renderer.ctx.save();
            this.renderer.ctx.globalCompositeOperation = 'screen';
            this.renderer.ctx.globalAlpha = 0.3;
            
            let x;
            switch (position) {
                case 'left':
                    x = this.renderer.width * 0.2;
                    break;
                case 'right':
                    x = this.renderer.width * 0.8;
                    break;
                case 'center':
                default:
                    x = this.renderer.width / 2;
                    break;
            }
            
            const radius = 250;
            const gradient = this.renderer.ctx.createRadialGradient(
                x, this.renderer.height - 400, 0,
                x, this.renderer.height - 400, radius
            );
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(1, 'transparent');
            
            this.renderer.ctx.fillStyle = gradient;
            this.renderer.ctx.fillRect(
                x - radius, this.renderer.height - 400 - radius,
                radius * 2, radius * 2
            );
            
            this.renderer.ctx.restore();
        }
    }
    
    async transitionTo(newCommand) {
        if (this.isTransitioning) return;
        
        const needsTransition = this.needsLocationTransition(newCommand);
        
        if (needsTransition) {
            this.isTransitioning = true;
            await this.renderer.fadeOut(400);
            await this.renderCommand(newCommand);
            await this.renderer.fadeIn(400);
            this.isTransitioning = false;
        } else {
            await this.renderCommand(newCommand);
        }
    }
    
    needsLocationTransition(command) {
        return command.location && command.location !== this.currentLocation;
    }
    
    getCurrentState() {
        return {
            location: this.currentLocation,
            characters: [...this.currentCharacters],
            isTransitioning: this.isTransitioning
        };
    }
    
    reset() {
        this.currentLocation = null;
        this.currentCharacters = [];
        this.isTransitioning = false;
        this.renderer.clear();
    }
}
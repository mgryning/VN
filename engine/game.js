class VisualNovelEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.renderer = new Renderer(this.canvas);
        this.parser = new ScriptParser();
        this.scene = new Scene(this.renderer);
        
        this.isPlaying = false;
        this.autoMode = false;
        this.textSpeed = 50;
        this.autoSpeed = 2000;
        
        this.dialogueBox = document.getElementById('dialogue-box');
        this.characterName = document.getElementById('character-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.continueIndicator = document.getElementById('continue-indicator');
        
        this.currentCommand = null;
        this.typewriterInterval = null;
        this.isTyping = false;
        
        this.setupEventListeners();
        this.bindMobileControls();
        
        // Show dialogue box immediately with initial message
        this.showDialogueBox();
        this.characterName.textContent = '';
        this.dialogueText.textContent = 'Load a script to begin your visual novel experience...';
        this.hideContinueIndicator();
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => this.handleClick(e));
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.addEventListener('touchend', (e) => this.handleTouch(e));
        
        const executeButton = document.getElementById('execute-script');
        executeButton.addEventListener('click', () => this.executeScript());
        
        const scriptArea = document.getElementById('script-area');
        scriptArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.executeScript();
            }
        });
    }
    
    bindMobileControls() {
        let touchStartY = 0;
        let touchEndY = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        this.canvas.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });
        
        const handleSwipe = () => {
            const swipeDistance = touchStartY - touchEndY;
            const minSwipeDistance = 50;
            
            if (Math.abs(swipeDistance) > minSwipeDistance) {
                if (swipeDistance > 0) {
                    this.nextCommand();
                } else {
                    this.previousCommand();
                }
            }
        };
        
        this.handleSwipe = handleSwipe;
    }
    
    executeScript() {
        const scriptArea = document.getElementById('script-area');
        const script = scriptArea.value.trim();
        
        if (!script) return;
        
        try {
            this.loadScript(script);
            this.startPlayback();
        } catch (error) {
            console.error('Script parsing error:', error);
            alert('Error parsing script: ' + error.message);
        }
    }
    
    loadScript(scriptText) {
        this.parser.parseScript(scriptText);
        this.scene.reset();
        this.showDialogueBox();
        this.characterName.textContent = '';
        this.dialogueText.textContent = 'Click or press Space to begin...';
        this.hideContinueIndicator();
        this.isPlaying = false;
    }
    
    startPlayback() {
        if (this.parser.commands.length === 0) return;
        
        this.isPlaying = true;
        this.parser.reset();
        this.executeCurrentCommand();
    }
    
    async executeCurrentCommand() {
        this.currentCommand = this.parser.getCurrentCommand();
        
        if (!this.currentCommand) {
            this.isPlaying = false;
            return;
        }
        
        await this.scene.renderCommand(this.currentCommand);
        
        if (this.currentCommand.type === 'dialogue') {
            this.showDialogue(this.currentCommand);
        } else if (this.currentCommand.type === 'action') {
            this.showAction(this.currentCommand);
        } else if (this.currentCommand.type === 'characters') {
            // Character-only commands (mood changes) should auto-advance
            // since they don't provide new story content
            this.nextCommand();
        } else {
            if (this.autoMode) {
                setTimeout(() => this.nextCommand(), 1000);
            }
        }
    }
    
    showDialogue(command) {
        this.characterName.textContent = command.speaker || '';
        this.dialogueText.textContent = '';
        this.showDialogueBox();
        
        this.typeText(command.text, () => {
            this.showContinueIndicator();
            if (this.autoMode) {
                setTimeout(() => this.nextCommand(), this.autoSpeed);
            }
        });
    }
    
    showAction(command) {
        this.characterName.textContent = 'Narration';
        this.dialogueText.textContent = '';
        this.showDialogueBox();
        
        this.typeText(command.text, () => {
            this.showContinueIndicator();
            if (this.autoMode) {
                setTimeout(() => this.nextCommand(), this.autoSpeed);
            }
        });
    }
    
    typeText(text, callback) {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
        }
        
        this.isTyping = true;
        this.hideContinueIndicator();
        
        let currentIndex = 0;
        this.typewriterInterval = setInterval(() => {
            if (currentIndex < text.length) {
                this.dialogueText.textContent += text[currentIndex];
                currentIndex++;
            } else {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
                this.isTyping = false;
                if (callback) callback();
            }
        }, this.textSpeed);
    }
    
    skipText() {
        if (this.isTyping && this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
            this.isTyping = false;
            
            const command = this.currentCommand;
            if (command && (command.type === 'dialogue' || command.type === 'action')) {
                this.dialogueText.textContent = command.text;
                this.showContinueIndicator();
            }
        }
    }
    
    nextCommand() {
        if (this.isTyping) {
            this.skipText();
            return;
        }
        
        if (this.parser.hasNext()) {
            this.parser.getNextCommand();
            this.executeCurrentCommand();
        } else {
            this.endPlayback();
        }
    }
    
    previousCommand() {
        if (this.isTyping) {
            this.skipText();
            return;
        }
        
        if (this.parser.hasPrevious()) {
            this.parser.getPreviousCommand();
            this.executeCurrentCommand();
        }
    }
    
    endPlayback() {
        this.isPlaying = false;
        this.characterName.textContent = '';
        this.dialogueText.textContent = 'Story completed. Click to restart or load new script.';
        this.hideContinueIndicator();
        console.log('Visual novel playback completed');
    }
    
    showDialogueBox() {
        // Dialogue box is now always visible
    }
    
    hideDialogue() {
        // Dialogue box is now always visible
    }
    
    showContinueIndicator() {
        this.continueIndicator.style.display = 'block';
    }
    
    hideContinueIndicator() {
        this.continueIndicator.style.display = 'none';
    }
    
    handleClick(e) {
        if (e.target.closest('#script-input')) {
            return;
        }
        
        if (this.isPlaying) {
            this.nextCommand();
        }
    }
    
    handleKeyPress(e) {
        if (e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                if (this.isPlaying) {
                    this.nextCommand();
                }
                break;
            case 'ArrowLeft':
            case 'Backspace':
                e.preventDefault();
                if (this.isPlaying) {
                    this.previousCommand();
                }
                break;
            case 'a':
            case 'A':
                this.toggleAutoMode();
                break;
        }
    }
    
    handleTouch(e) {
        if (e.target.closest('#script-input')) {
            return;
        }
        
        e.preventDefault();
        if (this.isPlaying) {
            this.nextCommand();
        }
    }
    
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        console.log('Auto mode:', this.autoMode ? 'ON' : 'OFF');
    }
    
    
    getGameState() {
        return {
            isPlaying: this.isPlaying,
            autoMode: this.autoMode,
            currentCommand: this.currentCommand,
            progress: this.parser.getProgress(),
            sceneState: this.scene.getCurrentState()
        };
    }
    
    setTextSpeed(speed) {
        this.textSpeed = Math.max(10, Math.min(200, speed));
    }
    
    setAutoSpeed(speed) {
        this.autoSpeed = Math.max(500, Math.min(5000, speed));
    }
}
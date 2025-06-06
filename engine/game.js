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
        this.streaming = false;   // true while SSE connection is open
        this.waitingMore = false; // true when we've reached end but streaming continues
        
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
        
        // Execute script functionality removed - only Kindroid integration
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
    
    
    loadScript(scriptText, options = {}) {
        const { append = false } = options;
        
        if (append) {
            // Append new commands to existing script
            this.parser.appendScript(scriptText);
        } else {
            // Replace script entirely
            this.parser.parseScript(scriptText);
            this.scene.reset();
            this.showDialogueBox();
            this.characterName.textContent = '';
            this.dialogueText.textContent = 'Click or press Space to begin...';
            this.hideContinueIndicator();
            this.isPlaying = false;
        }
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
            if (this.streaming) {
                // We've reached the end but more content is coming
                this.waitingMore = true;
                return;
            }
            // Really at the end
            return;
        }
        
        // If we were waiting and now have a command, continue
        this.waitingMore = false;
        
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
            // Auto-advance through all commands during streaming
            if (this.streaming) {
                setTimeout(() => this.nextCommand(), 100);
            } else if (this.autoMode) {
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
            if (this.streaming || this.autoMode) {
                setTimeout(() => this.nextCommand(), this.streaming ? 1500 : this.autoSpeed);
            }
        });
    }
    
    showAction(command) {
        this.characterName.textContent = 'Narration';
        this.dialogueText.textContent = '';
        this.showDialogueBox();
        
        this.typeText(command.text, () => {
            this.showContinueIndicator();
            if (this.streaming || this.autoMode) {
                setTimeout(() => this.nextCommand(), this.streaming ? 1500 : this.autoSpeed);
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
        // Skip clicks on Kindroid button
        if (e.target.closest('#kindroid-btn')) {
            return;
        }
        
        // Only allow manual advancement when not streaming
        if (this.isPlaying && !this.streaming) {
            this.nextCommand();
        }
    }
    
    handleKeyPress(e) {
        if (e.target.tagName === 'TEXTAREA') return;
        
        // Only allow manual controls when not streaming
        if (!this.streaming) {
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
    }
    
    handleTouch(e) {
        // Skip touches on Kindroid button
        if (e.target.closest('#kindroid-btn')) {
            return;
        }
        
        e.preventDefault();
        // Only allow manual advancement when not streaming
        if (this.isPlaying && !this.streaming) {
            this.nextCommand();
        }
    }
    
    toggleAutoMode() {
        this.autoMode = !this.autoMode;
        console.log('Auto mode:', this.autoMode ? 'ON' : 'OFF');
    }
    
    resumeFromWaiting() {
        if (this.waitingMore) {
            this.waitingMore = false;
            this.executeCurrentCommand();
        }
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
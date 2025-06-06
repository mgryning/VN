class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;  // Will be set by updateCanvasSize
        this.height = 0; // Will be set by updateCanvasSize
        this.scale = 1;
        
        // Create off-screen canvas for double buffering
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        this.backgrounds = new Map();
        this.characters = new Map();
        this.loadedImages = new Map();
        this.missingFiles = new Set(); // Track missing files to avoid duplicate logs
        
        this.setupCanvas();
        this.bindEvents();
    }
    
    setupCanvas() {
        this.updateCanvasSize();
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Use full container size instead of maintaining fixed aspect ratio
        this.width = containerWidth;
        this.height = containerHeight;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        // Update offscreen canvas size to match
        this.offscreenCanvas.width = this.width;
        this.offscreenCanvas.height = this.height;
        this.offscreenCtx.imageSmoothingEnabled = true;
        this.offscreenCtx.imageSmoothingQuality = 'high';
        
        this.scale = 1;
    }
    
    bindEvents() {
        window.addEventListener('resize', () => this.updateCanvasSize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateCanvasSize(), 100);
        });
    }
    
    async loadImage(src) {
        if (this.loadedImages.has(src)) {
            return this.loadedImages.get(src);
        }
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages.set(src, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }
    
    createGradientBackground(colors = ['#87CEEB', '#FFB6C1']) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Create sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Add beach-specific elements if it's a beach scene
        if (colors.length === 3 && colors[0] === '#87CEEB') {
            this.addBeachElements(ctx);
        }
        
        return canvas;
    }
    
    addBeachElements(ctx) {
        // Add sand at the bottom
        const sandGradient = ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
        sandGradient.addColorStop(0, '#F4A460');
        sandGradient.addColorStop(1, '#FFE4B5');
        
        ctx.fillStyle = sandGradient;
        ctx.fillRect(0, this.height * 0.7, this.width, this.height * 0.3);
        
        // Add simple wave lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < 3; i++) {
            const y = this.height * 0.6 + (i * 20);
            ctx.beginPath();
            ctx.moveTo(0, y);
            
            for (let x = 0; x <= this.width; x += 40) {
                const waveHeight = Math.sin(x * 0.01 + i) * 8;
                ctx.lineTo(x, y + waveHeight);
            }
            ctx.stroke();
        }
        
        // Add sun
        const sunX = this.width * 0.8;
        const sunY = this.height * 0.2;
        const sunRadius = 60;
        
        const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
        sunGradient.addColorStop(0, '#FFD700');
        sunGradient.addColorStop(0.7, '#FFA500');
        sunGradient.addColorStop(1, 'rgba(255, 165, 0, 0.3)');
        
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    createCharacterPlaceholder(name, mood = 'neutral') {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        const colors = {
            alice: '#FFB6C1',
            bob: '#87CEEB',
            morten: '#8FBC8F',
            ava: '#DDA0DD',
            default: '#D3D3D3'
        };
        
        const moodColors = {
            happy: '#FFD700',
            sad: '#4682B4',
            angry: '#DC143C',
            worried: '#FF8C00',
            content: '#98FB98',
            expectant: '#FFE4B5',
            thoughtful: '#B0C4DE',
            nervous: '#FFA07A',
            encouraging: '#90EE90',
            surprised: '#FFB6C1',
            neutral: '#808080'
        };
        
        const baseColor = colors[name.toLowerCase()] || colors.default;
        const moodColor = moodColors[mood.toLowerCase()] || moodColors.neutral;
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = moodColor;
        ctx.fillRect(0, 0, canvas.width, 50);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), canvas.width / 2, 35);
        
        ctx.font = '18px Arial';
        ctx.fillText(`(${mood})`, canvas.width / 2, canvas.height - 20);
        
        return canvas;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    }
    
    // Method to render entire scene to offscreen canvas, then copy to main canvas
    renderSceneToBuffer(renderFunction) {
        return new Promise(async (resolve) => {
            // Clear offscreen canvas
            this.offscreenCtx.clearRect(0, 0, this.width, this.height);
            
            // Temporarily redirect drawing context to offscreen canvas
            const originalCtx = this.ctx;
            this.ctx = this.offscreenCtx;
            
            try {
                // Execute the render function on offscreen canvas
                await renderFunction();
                
                // Restore original context
                this.ctx = originalCtx;
                
                // Copy offscreen canvas to main canvas in one operation
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.ctx.drawImage(this.offscreenCanvas, 0, 0);
                
                resolve();
            } catch (error) {
                // Restore context even if there's an error
                this.ctx = originalCtx;
                throw error;
            }
        });
    }
    
    async drawBackground(backgroundKey) {
        let bg = this.backgrounds.get(backgroundKey);
        if (!bg) {
            bg = await this.createBackground(backgroundKey);
            this.backgrounds.set(backgroundKey, bg);
        }
        
        this.ctx.drawImage(bg, 0, 0, this.width, this.height);
    }
    
    async createBackground(locationName) {
        // Try to load PNG images from resources folder first
        const possiblePaths = [
            `resources/backgrounds/${locationName}.png`,
            `resources/backgrounds/${locationName.toLowerCase()}.png`,
            `resources/backgrounds/${locationName.replace('_', '-')}.png`,
            `resources/backgrounds/${locationName.replace('_', ' ')}.png`
        ];
        
        for (const imagePath of possiblePaths) {
            try {
                const img = await this.loadImage(imagePath);
                console.log(`✅ Loaded background image: ${imagePath}`);
                return this.createImageBackground(img);
            } catch (error) {
                // Image not found, try next path
            }
        }
        
        // Log missing background file only once
        const missingKey = `bg_${locationName.toLowerCase()}`;
        if (!this.missingFiles.has(missingKey)) {
            this.missingFiles.add(missingKey);
            // Don't await to avoid blocking rendering
            this.logMissingFile('background', locationName).catch(err => 
                console.warn('Failed to log missing background:', err)
            );
        }
        
        // Fallback to gradient background if no image found
        const colors = this.getBackgroundColorsForLocation(locationName);
        return this.createGradientBackground(colors);
    }
    
    createImageBackground(img) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Calculate scaling to cover the entire canvas while maintaining aspect ratio
        const imgAspectRatio = img.width / img.height;
        const canvasAspectRatio = this.width / this.height;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgAspectRatio > canvasAspectRatio) {
            // Image is wider than canvas
            drawHeight = this.height;
            drawWidth = drawHeight * imgAspectRatio;
            offsetX = (this.width - drawWidth) / 2;
        } else {
            // Image is taller than canvas
            drawWidth = this.width;
            drawHeight = drawWidth / imgAspectRatio;
            offsetY = (this.height - drawHeight) / 2;
        }
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        return canvas;
    }
    
    getBackgroundColorsForLocation(locationName) {
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
        
        return locationBackgrounds[locationName] || ['#87CEEB', '#FFB6C1'];
    }
    
    async drawCharacter(name, mood, position = 'center') {
        const key = `${name}_${mood}`;
        let character = this.characters.get(key);
        
        if (!character) {
            character = await this.createCharacter(name, mood);
            this.characters.set(key, character);
        }
        
        const charWidth = character.width;
        const charHeight = character.height;
        
        let x, y;
        
        switch (position) {
            case 'left':
                x = this.width * 0.2 - charWidth / 2;
                break;
            case 'right':
                x = this.width * 0.8 - charWidth / 2;
                break;
            case 'center':
            default:
                x = this.width / 2 - charWidth / 2;
                break;
        }
        
        // Position character bottom to align with dialogue box top
        // Calculate based on CSS: bottom: 20px, padding: 20px, border: 2px
        // Dialogue box top = canvas height - bottom margin - estimated height of text area
        const dialogueBoxBottomMargin = 20;
        const estimatedDialogueHeight = 120; // Approximate height including padding and text
        const dialogueBoxTop = this.height - dialogueBoxBottomMargin - estimatedDialogueHeight;
        
        y = dialogueBoxTop - charHeight;
        
        this.ctx.save();
        this.ctx.globalAlpha = 1.0;
        this.ctx.drawImage(character, x, y, charWidth, charHeight);
        this.ctx.restore();
    }
    
    async drawCharacterWithTransition(name, oldMood, newMood, position = 'center') {
        const oldKey = `${name}_${oldMood}`;
        const newKey = `${name}_${newMood}`;
        
        let oldCharacter = this.characters.get(oldKey);
        let newCharacter = this.characters.get(newKey);
        
        if (!newCharacter) {
            newCharacter = await this.createCharacter(name, newMood);
            this.characters.set(newKey, newCharacter);
        }
        
        const charWidth = newCharacter.width;
        const charHeight = newCharacter.height;
        
        let x;
        switch (position) {
            case 'left':
                x = this.width * 0.2 - charWidth / 2;
                break;
            case 'right':
                x = this.width * 0.8 - charWidth / 2;
                break;
            case 'center':
            default:
                x = this.width / 2 - charWidth / 2;
                break;
        }
        
        // Calculate position same as regular drawCharacter
        const dialogueBoxBottomMargin = 20;
        const estimatedDialogueHeight = 120;
        const dialogueBoxTop = this.height - dialogueBoxBottomMargin - estimatedDialogueHeight;
        const y = dialogueBoxTop - charHeight;
        
        this.ctx.save();
        
        // Draw the old character with reduced opacity (fade out)
        if (oldCharacter) {
            this.ctx.globalAlpha = 0.4;
            this.ctx.drawImage(oldCharacter, x, y, charWidth, charHeight);
        }
        
        // Draw the new character with higher opacity (fade in)
        this.ctx.globalAlpha = 0.8;
        this.ctx.drawImage(newCharacter, x, y, charWidth, charHeight);
        
        this.ctx.restore();
    }
    
    async createCharacter(name, mood) {
        // First try to load specific mood image
        const specificPath = `resources/characters/${name.toLowerCase()}_${mood.toLowerCase()}.png`;
        try {
            const img = await this.loadImage(specificPath);
            console.log(`✅ Loaded character image: ${specificPath}`);
            return this.createCharacterImage(img);
        } catch (error) {
            // Specific mood image not found, log it
            const missingKey = `${name.toLowerCase()}_${mood.toLowerCase()}`;
            if (!this.missingFiles.has(missingKey)) {
                this.missingFiles.add(missingKey);
                // Don't await to avoid blocking rendering
                this.logMissingFile('character', name, mood).catch(err => 
                    console.warn('Failed to log missing character:', err)
                );
            }
        }
        
        // Try fallback to general character image
        const generalPath = `resources/characters/${name.toLowerCase()}.png`;
        try {
            const img = await this.loadImage(generalPath);
            console.log(`✅ Loaded fallback character image: ${generalPath}`);
            return this.createCharacterImage(img);
        } catch (error) {
            // No character image at all, use placeholder
            return this.createCharacterPlaceholder(name, mood);
        }
    }

    async logMissingFile(type, name, mood = null) {
        const timestamp = new Date().toISOString();
        const filename = mood ? 
            `${name.toLowerCase()}_${mood.toLowerCase()}.png` : 
            `${name.toLowerCase()}.png`;
        
        const logEntry = `[${timestamp}] Missing ${type}: resources/${type}s/${filename}`;
        
        // Log to console
        console.warn(`📝 ${logEntry}`);
        
        // Store locally
        if (!window.missingAssets) {
            window.missingAssets = [];
        }
        const assetInfo = {
            timestamp,
            type,
            name: name.toLowerCase(),
            mood: mood?.toLowerCase(),
            filename,
            path: `resources/${type}s/${filename}`
        };
        window.missingAssets.push(assetInfo);
        
        // Persist to server file
        try {
            await fetch('/api/log-missing-asset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(assetInfo)
            });
        } catch (error) {
            console.warn('Failed to persist missing asset log:', error);
        }
    }

    // Helper function to export missing assets log
    static exportMissingAssets() {
        if (!window.missingAssets || window.missingAssets.length === 0) {
            console.log('📋 No missing assets to export');
            return;
        }
        
        const logContent = window.missingAssets
            .map(asset => `${asset.timestamp} - ${asset.path}`)
            .join('\n');
        
        console.log('📋 Missing Assets Report:');
        console.log(logContent);
        
        // Also return the structured data
        return window.missingAssets;
    }
    
    createCharacterImage(img) {
        const canvas = document.createElement('canvas');
        const targetHeight = Math.min(600, this.height * 0.8);
        const aspectRatio = img.width / img.height;
        const targetWidth = targetHeight * aspectRatio;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw the character image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        return canvas;
    }
    
    drawText(text, x, y, options = {}) {
        const {
            font = '24px Arial',
            color = '#fff',
            align = 'left',
            maxWidth = this.width - 40,
            lineHeight = 30
        } = options;
        
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                this.ctx.fillText(line, x, currentY);
                line = words[i] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, currentY);
    }
    
    fadeIn(duration = 500) {
        return new Promise(resolve => {
            this.canvas.style.opacity = '0';
            this.canvas.style.transition = `opacity ${duration}ms ease-in`;
            
            requestAnimationFrame(() => {
                this.canvas.style.opacity = '1';
                setTimeout(resolve, duration);
            });
        });
    }
    
    fadeOut(duration = 500) {
        return new Promise(resolve => {
            this.canvas.style.transition = `opacity ${duration}ms ease-out`;
            this.canvas.style.opacity = '0';
            setTimeout(resolve, duration);
        });
    }
}
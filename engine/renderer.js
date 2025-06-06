class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 1920;
        this.height = 1080;
        this.scale = 1;
        
        this.backgrounds = new Map();
        this.characters = new Map();
        this.loadedImages = new Map();
        
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
        
        const aspectRatio = this.width / this.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (containerAspectRatio > aspectRatio) {
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * aspectRatio;
        } else {
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / aspectRatio;
        }
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        this.scale = canvasWidth / this.width;
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
    }
    
    drawBackground(backgroundKey) {
        let bg = this.backgrounds.get(backgroundKey);
        if (!bg) {
            bg = this.createGradientBackground();
            this.backgrounds.set(backgroundKey, bg);
        }
        
        this.ctx.drawImage(bg, 0, 0, this.width, this.height);
    }
    
    drawCharacter(name, mood, position = 'center') {
        const key = `${name}_${mood}`;
        let character = this.characters.get(key);
        
        if (!character) {
            character = this.createCharacterPlaceholder(name, mood);
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
        
        y = this.height - charHeight - 200;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.9;
        this.ctx.drawImage(character, x, y, charWidth, charHeight);
        this.ctx.restore();
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
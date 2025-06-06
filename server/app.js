const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const aiRoutes = require('./routes/ai');
const storyRoutes = require('./routes/story');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/ai', aiRoutes);
app.use('/api/story', storyRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join-story', (storyId) => {
        socket.join(`story-${storyId}`);
        console.log(`Client ${socket.id} joined story ${storyId}`);
    });
    
    socket.on('ai-chat', async (data) => {
        try {
            const response = await handleAIChat(data);
            socket.emit('ai-response', response);
        } catch (error) {
            socket.emit('ai-error', { error: error.message });
        }
    });
    
    socket.on('story-update', (data) => {
        socket.to(`story-${data.storyId}`).emit('story-changed', data);
    });
    
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

async function handleAIChat(data) {
    const { message, character, context } = data;
    
    return {
        character: character || 'AI',
        message: `[AI Response to: "${message}"] This is a placeholder response. Integrate with your preferred AI service here.`,
        timestamp: new Date().toISOString(),
        mood: 'neutral'
    };
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
    console.log(`Visual Novel Server running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = { app, io };
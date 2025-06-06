# Visual Novel Engine with AI Integration

A modern web-based visual novel engine with AI-powered story generation, character interaction, and real-time collaboration features.

## Features

### Core Engine
- **Canvas-based rendering** with responsive scaling for mobile devices
- **Script parser** supporting `LOC:`, `CHA:`, and dialogue/action format
- **Character mood system** with visual representations
- **Scene management** with transitions and animations
- **Mobile-friendly controls** (touch, swipe, responsive UI)

### AI Integration
- **Story generation** from prompts with genre selection
- **Character dialogue generation** with personality consistency
- **Script enhancement** and validation
- **Real-time character chat** via WebSocket
- **Mood analysis** and character personality system
- **Story continuation** based on current context

### Supported Script Format
```
LOC: location_name
CHA: character1/mood, character2/mood
Character: Dialogue text here
Action descriptions without colons are treated as narration
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment (Optional)
Copy `.env.example` to `.env` and configure your AI API keys:
```bash
cp .env.example .env
```

Edit `.env` with your preferred AI service:
```env
# Choose one:
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### 3. Run the Application

**Development mode (with server auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Access the Application
- Application: http://localhost:3000
- API: http://localhost:3000/api

## Usage

### Basic Visual Novel
1. Open the application in your browser
2. Use the script editor (top-left) to write your story
3. Click "Execute" to run the visual novel
4. Use controls to navigate:
   - Click/Tap or Space/Enter: Advance
   - Left Arrow/Backspace: Go back
   - A: Toggle auto mode
   - Escape: Toggle menu

### AI Features
1. Click the "AI" button (top-right) to open the AI panel
2. **Generate Tab**: Create new stories from prompts
3. **Chat Tab**: Have conversations with characters
4. **Enhance Tab**: Validate, format, and enhance existing scripts

### Mobile Support
- Touch controls for navigation
- Swipe gestures (up/down) for story progression
- Responsive UI that adapts to screen size
- Optimized for both portrait and landscape orientations

## API Endpoints

### AI Endpoints
- `POST /api/ai/generate-story` - Generate new story from prompt
- `POST /api/ai/generate-dialogue` - Generate character dialogue
- `POST /api/ai/continue-story` - Continue existing story
- `POST /api/ai/chat` - Chat with character
- `POST /api/ai/mood-analysis` - Analyze text mood

### Story Endpoints
- `POST /api/story/parse` - Parse visual novel script
- `POST /api/story/validate` - Validate script syntax
- `POST /api/story/format` - Format script text
- `POST /api/story/enhance` - Enhance script with AI
- `GET /api/story/templates` - Get story templates

### WebSocket Events
- `ai-chat` - Send message to AI character
- `ai-response` - Receive AI character response
- `join-story` - Join collaborative story session
- `story-update` - Broadcast story changes

## Configuration

### Environment Variables
```env
PORT=3000                    # Server port
NODE_ENV=development         # Environment mode
OPENAI_API_KEY=             # OpenAI API key
ANTHROPIC_API_KEY=          # Anthropic Claude API key
RATE_LIMIT_MAX_REQUESTS=100 # Rate limiting
CORS_ORIGINS=               # Allowed CORS origins
```

### Character Personalities
Characters are defined in `server/controllers/aiController.js` with:
- Personality traits
- Speaking styles
- Background stories
- Mood patterns

## File Structure
```
VN/
├── server/                 # Backend server
│   ├── routes/            # API routes
│   ├── controllers/       # Request handlers
│   └── app.js            # Main server file
├── engine/                # Core game engine
│   ├── renderer.js       # Canvas rendering
│   ├── parser.js         # Script parsing
│   ├── scene.js          # Scene management
│   └── game.js           # Main game logic
├── js/                    # Frontend modules
│   ├── apiClient.js      # API communication
│   └── aiIntegration.js  # AI features UI
├── index.html            # Main HTML file
├── styles.css            # Styling
├── main.js               # Frontend initialization
└── package.json          # Dependencies
```

## AI Service Integration

### OpenAI Integration
```javascript
// Set in .env
OPENAI_API_KEY=your_key_here

// Uses GPT-3.5-turbo by default
// Supports story generation, dialogue, and chat
```

### Anthropic Claude Integration
```javascript
// Set in .env
ANTHROPIC_API_KEY=your_key_here

// Uses Claude-3-Sonnet by default
// Supports all AI features
```

### Custom AI Service
```javascript
// Set in .env
AI_API_KEY=your_key_here
AI_API_URL=https://your-service.com/v1/chat

// Implement custom integration in aiController.js
```

## Development

### Auto-Restart with Nodemon

The development environment uses nodemon for automatic server restart:

**Server Auto-Restart:**
- Automatically restarts server when backend files change
- Watches `server/`, `engine/`, `js/`, and `.env` files
- Configurable via `nodemon.json`

**Development Workflow:**
1. Run `npm run dev` to start the development server
2. Edit any server-side files
3. Server automatically restarts
4. Refresh browser to see changes

**File Watching:**
- `server/**/*.js` (API routes, controllers)
- `engine/**/*.js` (Game engine files)  
- `js/**/*.js` (Frontend modules)
- `.env` (Environment variables)

### Adding New Characters
Edit `server/controllers/aiController.js`:
```javascript
this.characterPersonalities.newCharacter = {
    traits: ['brave', 'curious'],
    speaking_style: 'enthusiastic',
    backstory: 'Character background'
};
```

### Adding New Story Templates
Edit `server/controllers/storyController.js`:
```javascript
this.storyTemplates.newTemplate = {
    name: 'Template Name',
    description: 'Template description',
    template: 'LOC: location\nCHA: character/mood\n...'
};
```

### Custom Rendering
Extend `engine/renderer.js` to add:
- Custom character sprites
- Background images
- Special effects
- Animation systems

## Troubleshooting

### Common Issues
1. **AI features not working**: Check if server is running and API keys are configured
2. **Socket connection failed**: Ensure server is accessible and CORS is configured
3. **Script parsing errors**: Validate script format (LOC:, CHA:, proper dialogue syntax)
4. **Mobile touch issues**: Check if touch events are properly bound

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

### Health Check
Check server status:
```bash
curl http://localhost:3000/api/health
```

## License

MIT License - feel free to use in your own projects!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For questions or support, please open an issue on the repository.
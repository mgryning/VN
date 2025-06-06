let game;

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupUI();
    loadExampleScript();
});

function initializeGame() {
    game = new VisualNovelEngine('game-canvas');
    
    window.game = game;
    
    console.log('Visual Novel Engine initialized');
    console.log('Controls:');
    console.log('- Click/Tap or Space/Enter: Advance');
    console.log('- Left Arrow/Backspace: Go back');
    console.log('- A: Toggle auto mode');
    console.log('- Ctrl+Enter in script area: Execute script');
}


function setupUI() {
    const scriptArea = document.getElementById('script-area');
    
    scriptArea.addEventListener('input', () => {
        localStorage.setItem('vn_script_draft', scriptArea.value);
    });
}

function loadExampleScript() {
    const exampleScript = `LOC: beach
CHA: ava/expectant
Ava waits, her marker hovering over the page. The breeze catches a strand of her lavender hair, brushing it across her cheek. She doesn't push for an answer, just studies her own work with a critical eye, one knee bouncing slightly in the sand.
The sunlight glints off her glasses as she glances at you, then back at the drawing, her lips pressed together in a faint line of uncertainty.
Ava: What do you think? Does it capture the moment right?
CHA: ava/nervous
Morten takes a moment to consider the sketch, watching the waves crash against the shore in the distance.
Morten: It's beautiful, Ava. But I think you're being too hard on yourself.
CHA: ava/surprised
Ava looks up from her drawing, a small smile breaking through her uncertainty.
Ava: Really? Sometimes I feel like I'm not seeing what everyone else sees.
The ocean breeze carries the scent of salt and possibility between them.`;

    const scriptArea = document.getElementById('script-area');
    
    // One-time migration from old forest scene
    const migrationKey = 'vn_migration_v2';
    if (!localStorage.getItem(migrationKey)) {
        const savedDraft = localStorage.getItem('vn_script_draft');
        if (savedDraft && (savedDraft.includes('forest_clearing') || savedDraft.includes('Alice') || savedDraft.includes('Bob'))) {
            localStorage.removeItem('vn_script_draft');
        }
        localStorage.setItem(migrationKey, 'true');
    }
    
    // Load saved draft or default example
    const savedDraft = localStorage.getItem('vn_script_draft');
    if (savedDraft && savedDraft.trim()) {
        scriptArea.value = savedDraft;
        game.loadScript(savedDraft);
        game.startPlayback();
    } else {
        scriptArea.value = exampleScript;
        game.loadScript(exampleScript);
        game.startPlayback();
    }
}


function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

window.addEventListener('beforeunload', () => {
    if (game) {
        const script = document.getElementById('script-area').value;
        localStorage.setItem('vn_script_draft', script);
    }
});


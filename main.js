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
    console.log('Kindroid AI Integration:');
    console.log('- Click "Get AI Story" to start');
    console.log('- Click/Tap or Space/Enter: Advance');
    console.log('- Left Arrow/Backspace: Go back');
    console.log('- A: Toggle auto mode');
}


function setupUI() {
    // UI setup for Kindroid-only integration
    // Script area is hidden and not interactive
}

function loadExampleScript() {
    const scriptArea = document.getElementById('script-area');
    
    // Clear any existing local storage
    localStorage.removeItem('vn_script_draft');
    localStorage.removeItem('vn_save_data');
    localStorage.removeItem('vn_migration_v2');
    
    // Clear script area and show message to use AI
    scriptArea.value = '';
    
    // Show initial message in dialogue box
    if (window.game) {
        window.game.characterName.textContent = '';
        window.game.dialogueText.textContent = 'Click "Get AI Story" to start your interactive story experience...';
        window.game.hideContinueIndicator();
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


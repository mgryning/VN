const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/generate-story', aiController.generateStory);

router.post('/generate-dialogue', aiController.generateDialogue);

router.post('/continue-story', aiController.continueStory);

router.post('/analyze-scene', aiController.analyzeScene);

router.post('/chat', aiController.chatWithCharacter);

router.post('/mood-analysis', aiController.analyzeMood);

module.exports = router;
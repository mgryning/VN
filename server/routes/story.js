const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');

router.post('/parse', storyController.parseScript);

router.post('/validate', storyController.validateScript);

router.post('/format', storyController.formatScript);

router.post('/enhance', storyController.enhanceScript);

router.get('/templates', storyController.getStoryTemplates);

router.post('/convert', storyController.convertFormat);

module.exports = router;
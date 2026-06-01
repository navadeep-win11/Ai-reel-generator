const express = require('express');
const { 
    generateIdeas, 
    generateScript, 
    generateTts, 
    generateImage, 
    generateThumbnail, 
    renderReel 
} = require('./controllers');

const router = express.Router();

// System routes
router.get('/health', (req, res) => {
    res.json({ status: "ok", pipeline: "ready" });
});

router.get('/config', (req, res) => {
    res.json({ hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// AI Generation routes
router.post('/generate-ideas', generateIdeas);
router.post('/generate-script', generateScript);
router.post('/generate-tts', generateTts);
router.post('/generate-image', generateImage);
router.post('/generate-thumbnail', generateThumbnail);

// Limitless Video Rendering (Queue Based)
router.post('/render-reel', renderReel);

module.exports = router;

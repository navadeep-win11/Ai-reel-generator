const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const queue = require('./queue');
const { renderVideo } = require('./videoRenderer');

// Initialize Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContentWithFallback(prompt, config = null) {
    try {
        const params = { model: 'gemini-1.5-flash-latest', contents: prompt };
        if (config) params.config = config;
        return await ai.models.generateContent(params);
    } catch (error1) {
        const is404 = error1.status === 404 || (error1.message && (error1.message.includes('404') || error1.message.includes('NOT_FOUND')));
        if (is404) {
            console.warn("gemini-1.5-flash-latest not found, falling back to gemini-1.5-pro-latest");
            try {
                const params2 = { model: 'gemini-1.5-pro-latest', contents: prompt };
                if (config) params2.config = config;
                return await ai.models.generateContent(params2);
            } catch (error2) {
                console.warn("gemini-1.5-pro-latest failed, falling back to gemini-pro");
                const params3 = { model: 'gemini-pro', contents: prompt };
                if (config) params3.config = config;
                return await ai.models.generateContent(params3);
            }
        }
        throw error1;
    }
}

// No offline fallback ideas; return real errors instead

exports.generateIdeas = async (req, res) => {
    const { visualStyle, languageScript, topic } = req.body;
    console.log(`[API] generateIdeas payload -> Topic: ${topic}, Language: ${languageScript}`);
    try {
        let languageRule = `Language: ${languageScript}.`;
        if (languageScript && languageScript.toLowerCase() === 'tenglish') {
            languageRule = `Language: Telugu (written in English/Latin alphabet only).`;
        } else if (languageScript && languageScript.toLowerCase() === 'hindi') {
            languageRule = `Language: Pure Hindi (no English words).`;
        } else {
            languageRule = `Language: strictly ${languageScript}.`;
        }
        
        const prompt = `Generate 5 short video ideas on topic: "${topic}".
${languageRule}
Style: "${visualStyle}".
Output strictly as a JSON array of 5 objects with keys: "quote", "quoteTranslation", "imagePrompt", "suggestedVoice". No markdown.`;
        
        const response = await generateContentWithFallback(prompt, {
            responseMimeType: 'application/json'
        });
        
        const rawText = response.text().trim();
        // Fallback clean if it includes markdown blocks despite mimeType
        const cleanJson = rawText.replace(/^```json/i, '').replace(/```$/, '').trim();
        const ideas = JSON.parse(cleanJson);
        res.json({ ideas });
    } catch (error) {
        console.error("Gemini ideas error:", error);
        
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            return res.status(429).json({ 
                success: false, 
                error: 'API_RATE_LIMIT', 
                message: 'Gemini API quota exceeded. Please wait a minute or update your API key.' 
            });
        }
        
        res.status(500).json({ error: "Failed to generate ideas", details: error.message });
    }
};

exports.generateScript = async (req, res) => {
    const { quote, languageScript, duration } = req.body;
    try {
        const prompt = `Write a short video script for the following quote: "${quote}". 
Language: ${languageScript}. Target duration: ${duration} seconds.
Pace it at approximately 2.5 words per second. 
Format it strictly into three parts: Hook, Body, and Call to Action (CTA). 
IMPORTANT: Return ONLY the clean spoken text. No markdown, no bold text, no labels like "Hook:", just the natural text to be read out loud.`;

        const response = await generateContentWithFallback(prompt);
        
        // Ensure clean text without markdown tags
        const cleanText = response.text().replace(/[\*\#]/g, '').trim();
        res.send(cleanText);
    } catch (error) {
        console.error("Script generation error:", error);
        res.status(500).json({ error: "Failed to generate script", details: error.message });
    }
};

exports.generateTts = async (req, res) => {
    const { text, voice } = req.body;
    try {
        const googleTTS = require('google-tts-api');
        const axios = require('axios');
        
        // Use free google-tts-api (limited to 200 chars per chunk, but sufficient for quotes)
        // For longer texts we'd use getAllAudioBase64, but getAudioBase64 is fine for short text.
        const base64Audio = await googleTTS.getAudioBase64(text.substring(0, 200), {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
        });
        
        return res.json({ base64Audio });
    } catch (error) {
        console.error("TTS generation error:", error);
        res.status(500).json({ error: "Failed to generate TTS", details: error.message });
    }
};

exports.generateImage = async (req, res) => {
    const { imagePrompt, provider } = req.body;
    const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
    const fullPrompt = `${imagePrompt}, ${cinematicTags}`;
    
    if (provider === 'gemini') {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-3.0',
                prompt: fullPrompt,
                config: {
                    aspectRatio: '9:16',
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg'
                }
            });
            const base64 = response.generatedImages[0].image.imageBytes;
            return res.json({ image: `data:image/jpeg;base64,${base64}` });
        } catch (error) {
            console.error("Imagen failed, automatically falling back to Pollinations.ai:", error.message);
            // Fall through to free provider logic automatically
        }
    }
    
    // Fallback or explicit free provider: Pollinations.ai
    const formattedPrompt = encodeURIComponent(fullPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;
    res.json({ image: pollinationsUrl });
};

exports.generateThumbnail = async (req, res) => {
    const { quoteText, visualStyle } = req.body;
    const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
    const promptTemplate = `A striking, high-quality ${visualStyle} vertical thumbnail background. In the center, clear and bold typography displaying the exact text: '${quoteText}'. ${cinematicTags}`;
    const formattedPrompt = encodeURIComponent(promptTemplate);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;
    res.json({ image: pollinationsUrl });
};

exports.renderReel = async (req, res) => {
    const { selectedIdea } = req.body;
    console.log(`[API] renderReel payload -> selectedIdea:`, selectedIdea);
    
    if (!selectedIdea) {
        return res.status(400).json({ error: "selectedIdea is required" });
    }

    try {
        // Step 1: Image Generation with Cinematic Tags
        const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
        const formattedPrompt = encodeURIComponent(`${selectedIdea.imagePrompt}, ${cinematicTags}`);
        const imageUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

        // Step 2: TTS Generation using google-tts-api
        const googleTTS = require('google-tts-api');
        const textToSpeech = selectedIdea.quote;
        const base64Audio = await googleTTS.getAudioBase64(textToSpeech.substring(0, 200), {
            lang: 'en',
            slow: false,
            host: 'https://translate.google.com',
        });
        const ttsAudio = `data:audio/mp3;base64,${base64Audio}`;

        // Enqueue the rendering job to prevent RAM overloading on Railway
        const videoPath = await queue.add(async () => {
            return await renderVideo(imageUrl, ttsAudio, selectedIdea.quote);
        });

        // Strictly set the header before sending MP4
        res.setHeader('Content-Type', 'video/mp4');
        
        // Stream the file back to the client
        const stream = fs.createReadStream(videoPath);
        stream.pipe(res);
        
        // Instant ephemeral cleanup after streaming finishes
        stream.on('end', () => {
            try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (e) {}
        });
        
        stream.on('error', (err) => {
            console.error("Stream error during video transfer:", err);
            try { if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath); } catch (e) {}
            if (!res.headersSent) res.status(500).end();
        });
        
    } catch (error) {
        console.error("Render queue error:", error);
        res.status(500).json({ error: "Failed to render video", details: error.message });
    }
};

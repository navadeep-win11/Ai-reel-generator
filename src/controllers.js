const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const queue = require('./queue');
const { renderVideo } = require('./videoRenderer');

// Initialize Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const offlineFallbackIdeas = [
    {
        quote: "Success is not final, failure is not fatal.",
        quoteTranslation: "El éxito no es el final, el fracaso no es fatal.",
        imagePrompt: "A dark moody mountain landscape at sunrise",
        suggestedVoice: "alloy"
    },
    {
        quote: "Do what you can, with what you have, where you are.",
        quoteTranslation: "Haz lo que puedas, con lo que tengas, donde estés.",
        imagePrompt: "A solitary boat on a calm lake reflecting the starry night",
        suggestedVoice: "echo"
    },
    {
        quote: "Believe you can and you're halfway there.",
        quoteTranslation: "Cree que puedes y ya estás a medio camino.",
        imagePrompt: "A steep staircase leading up into the clouds",
        suggestedVoice: "fable"
    },
    {
        quote: "It always seems impossible until it's done.",
        quoteTranslation: "Siempre parece imposible hasta que se hace.",
        imagePrompt: "A person standing at the edge of a cliff looking at a galaxy",
        suggestedVoice: "onyx"
    },
    {
        quote: "Dream big and dare to fail.",
        quoteTranslation: "Sueña en grande y atrévete a fallar.",
        imagePrompt: "A glowing doorway in a dark enchanted forest",
        suggestedVoice: "nova"
    }
];

exports.generateIdeas = async (req, res) => {
    const { visualStyle, languageScript, topic } = req.body;
    try {
        const prompt = `Generate 5 video ideas about "${topic}" in "${languageScript}" language with a "${visualStyle}" visual style.
Return a JSON array of exactly 5 objects. Each object must have these keys: "quote" (the text), "quoteTranslation" (translation if applicable, or repeat the quote), "imagePrompt" (a visual prompt for AI image gen), "suggestedVoice" (a voice name).`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const ideas = JSON.parse(response.text());
        res.json({ ideas });
    } catch (error) {
        console.error("Gemini ideas error, using fallback:", error);
        res.json({ ideas: offlineFallbackIdeas });
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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        
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
    
    if (provider === 'gemini') {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-3.0',
                prompt: imagePrompt,
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
    const formattedPrompt = encodeURIComponent(imagePrompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;
    res.json({ image: pollinationsUrl });
};

exports.generateThumbnail = async (req, res) => {
    const { quoteText, visualStyle } = req.body;
    // Direct URL-safe prompt formatting for Pollinations
    const promptTemplate = `A striking, high-quality ${visualStyle} vertical thumbnail background. In the center, clear and bold typography displaying the exact text: '${quoteText}'.`;
    const formattedPrompt = encodeURIComponent(promptTemplate);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;
    res.json({ image: pollinationsUrl });
};

exports.renderReel = async (req, res) => {
    const { imageUrl, ttsAudio, text } = req.body;
    
    if (!imageUrl || !ttsAudio) {
        return res.status(400).json({ error: "imageUrl and ttsAudio are required" });
    }

    try {
        // Enqueue the rendering job to prevent RAM overloading on Railway
        const videoPath = await queue.add(async () => {
            return await renderVideo(imageUrl, ttsAudio, text);
        });

        // Strictly set the header before sending
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

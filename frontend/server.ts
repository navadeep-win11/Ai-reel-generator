import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent startup crash if GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is missing or invalid. Please configure it in your Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Check if Gemini API is available/configured
app.get("/api/config", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({ hasGeminiKey: hasKey });
});

// Post endpoint to generate ideas using Gemini
app.post("/api/generate-ideas", async (req, res) => {
  try {
    const { visualStyle, languageScript, topic } = req.body;

    const offlineFallback = getOfflineIdeas(visualStyle, languageScript, topic);
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    // Check if key is actual placeholder or empty
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.log("No GEMINI_API_KEY provided. Serving premium fallback templates.");
      return res.json({ ideas: offlineFallback, isOfflineMode: true });
    }

    const ai = getGeminiClient();

    const p = `Identify as an elite, high-aesthetic faceless reels designer.
Generate exactly 5 original, high-impact ideas for portrait 9:16 quote reels.
Topic: ${topic || "Stoic Grit / Devotion / Modern grind"}
Visual style requested: ${visualStyle}
Language / Script representation requested: ${languageScript}

Style definition guidelines:
1. 'pencil_sketch': Graphite texture, hand-drawn fine lines, high-contrast dark sketches, ink outlines, charcoal shader, minimalist frame.
2. 'watercolor': Dark moody monochrome indigo washes, bleeding paints on parchment, glowing translucent strokes, dark ink art.
3. 'dark_minimalist': 100% black pitch, ultra-slim white glowing borders, hairline sans-serif typography, elegant empty spaces, clean focus.
4. 'cinematic_motorcycle': Night highway blurred bokeh, black asphalt reflections, Ducati or Duke 390 dark carbon chassis, glowing neon orange or red tail light tail streaks.

Language representation rules:
- 'english': short deep inspirational, stoic, or gritty statements.
- 'hinglish': Hindi text written using English alphabet (e.g., "Kamiyabi shor machayegi", "Zindagi me kuch bada karna hai").
- 'tenglish': Telugu text written using English alphabet (e.g., "Modhalupettu, gelupu varaku agaku", "Nee gamyam nuvve vethukovali").

Ensure every quote is short (5 to 12 words) for fast reading with tremendous impact.
Return a valid JSON array complying strictly to this JSON schema:
[
  {
    "quote": "Short powerful quote text here",
    "quoteTranslation": "If Hinglish/Tenglish, write the elegant English translation here, otherwise leave empty or match quote",
    "imagePrompt": "A concrete descriptive search prompt for beautiful dark-mode matching stock photo/illustration. E.g., 'dark minimalist glowing thin white line on deep obsidian slab, 8k'",
    "suggestedVoice": "Zephyr" (choose one of: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr')
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: p,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING, description: "The short quote under 12 words in requested language" },
              quoteTranslation: { type: Type.STRING, description: "Translation of quote to English if Hinglish/Tenglish" },
              imagePrompt: { type: Type.STRING, description: "High-detail visual stock-image search terms conforming to visual style" },
              suggestedVoice: { type: Type.STRING, description: "Voice option matching the vibe" }
            },
            required: ["quote", "imagePrompt", "suggestedVoice"]
          }
        }
      }
    });

    const text = response.text || "[]";
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ ideas: parsed.map((item, i) => ({ id: `gen-${i}-${Date.now()}`, ...item })), isOfflineMode: false });
      }
    } catch (parseErr) {
      console.warn("Could not parse JSON. Falling back to offline formulas:", text);
    }

    return res.json({ ideas: offlineFallback, isOfflineMode: true });

  } catch (error: any) {
    console.error("Gemini Idea Generator error:", error.message);
    // Graceful fallback to avoid crash
    const { visualStyle, languageScript, topic } = req.body;
    return res.json({ 
      ideas: getOfflineIdeas(visualStyle, languageScript, topic), 
      isOfflineMode: true,
      error: error.message 
    });
  }
});

// Endpoint for TTS generation using gemini-3.1-flash-tts-preview
app.post("/api/generate-tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || "";

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ error: "Missing GEMINI_API_KEY. Client speech synthesis will be used as a premium fallback." });
    }

    const ai = getGeminiClient();
    const cleanVoice = voice || "Zephyr";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read this raw text calmly: "${text}"` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: cleanVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({ base64Audio });
    } else {
      return res.status(500).json({ error: "No audio stream returned from Gemini TTS. Browser synthesis will take over." });
    }
  } catch (err: any) {
    console.error("Gemini TTS service error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate TTS audio stream." });
  }
});

// Offline backup idea builder
function getOfflineIdeas(style: string, script: string, topic: string) {
  const genericTopic = topic || "Stoicism";
  
  const formulas: Record<string, Array<{quote: string, quoteTranslation: string, prompt: string, voice: string}>> = {
    english: [
      {
        quote: "Silence is the ultimate weapon of the wise.",
        quoteTranslation: "Silence is the ultimate weapon of the wise.",
        prompt: "high contrast dark minimalist zen stone path white line, glowing soft light",
        voice: "Zephyr"
      },
      {
        quote: "They play. We plan. The results will deliver the message.",
        quoteTranslation: "They play. We plan. The results will deliver the message.",
        prompt: "duke 390 motorcycle cinematic rear tail light neon orange wet highway rain, dark raw ink style",
        voice: "Fenrir"
      },
      {
        quote: "Do not adapt to the noise. Seek the void inside.",
        quoteTranslation: "Do not adapt to the noise. Seek the void inside.",
        prompt: "fine pencil sketch profile face looking up into dark nebula clouds, hand-drawn lines",
        voice: "Charon"
      },
      {
        quote: "Greatness is built in the shadows where nobody checks.",
        quoteTranslation: "Greatness is built in the shadows where nobody checks.",
        prompt: "dark watercolor indigo bleeding paint splash on wet canvas charcoal texture",
        voice: "Kore"
      },
      {
        quote: "Comfort is the enemy. Pain is the roadmap to power.",
        quoteTranslation: "Comfort is the enemy. Pain is the roadmap to power.",
        prompt: "sleek dark minimalist asphalt wet road narrow view, white glowing hairline horizon border",
        voice: "Puck"
      }
    ],
    hinglish: [
      {
        quote: "Mehnat itni khamoshi se karo, ki tumhara kam shor machaye.",
        quoteTranslation: "Work in silence, and let your results make the noise.",
        prompt: "dark monochrome minimalist graphite sketch of hands plotting in darkness",
        voice: "Zephyr"
      },
      {
        quote: "Akele chalna seekho, kyunki bheed tabhi sath hoti hai jab tum kamiyab ho.",
        quoteTranslation: "Learn to walk alone, because the crowd only joins you once you are successful.",
        prompt: "lone night motorcycle tail light glowing yellow, dark highway motion blurred background, Duke aesthetic",
        voice: "Fenrir"
      },
      {
        quote: "Waqt sabka aata hai, par tumhaari bari tum khud likhoge.",
        quoteTranslation: "Everyone's time comes, but you will write your own chapter yourself.",
        prompt: "dark minimalist deep black background with single glowing white quartz crystal, sharp lighting",
        voice: "Kore"
      },
      {
        quote: "Hausle ke aage yeh samundar bhi chota lagne lagega.",
        quoteTranslation: "With enough courage, even this endless ocean will feel tiny.",
        prompt: "indigo dark watercolor ocean storm high ink bleed texture, monochrome paper background",
        voice: "Charon"
      },
      {
        quote: "Dard ko apna yaar bana lo, phir jeetna aasan ho jayega.",
        quoteTranslation: "Make pain your friend, and winning becomes effortless.",
        prompt: "fine pencil sketch of vintage motorbike parked beneath an old dark neon highway bridge, handdrawn",
        voice: "Puck"
      }
    ],
    tenglish: [
      {
        quote: "Nee gamyam nuvve decide chesko. Parichayam avasaram ledu.",
        quoteTranslation: "Decide your destination yourself. No explanations are needed.",
        prompt: "dark watercolor indigo mist blending with sharp shadows on wet paper canvas",
        voice: "Kore"
      },
      {
        quote: "Kastam nee chelimi aithe, gelupu nee dhariki thwaraga vasthundi.",
        quoteTranslation: "If hard work is your partner, victory will find its path to you rapidly.",
        prompt: "glowing neon orange line cutting through pure obsidian minimalist background, sharp border",
        voice: "Zephyr"
      },
      {
        quote: "Maatalu thagginchu, nee prathibha tho jabaabu cheppu.",
        quoteTranslation: "Reduce words, let your talent deliver the perfect answers.",
        prompt: "minimalist pencil sketch of warrior standing solitary in rain graphite texture",
        voice: "Charon"
      },
      {
        quote: "Sankalpam balamainadhi aithe, adhi pralayanni kooda aputhundhi.",
        quoteTranslation: "If your determination is mighty, it can cease even an active storm.",
        prompt: "night motorcycle cinematic Duke rear carbon fibre armor highlights bokeh amber orange lights",
        voice: "Fenrir"
      },
      {
        quote: "Prapancham lo evari kosam aagaku. Nee prayanam ekaaki gaane modhalu.",
        quoteTranslation: "Do not stop for anyone in this world. Your journey begins solo.",
        prompt: "dark ink wash watercolor abstract forest in absolute pitch black backdrop and subtle starlight",
        voice: "Puck"
      }
    ]
  };

  const selectedList = formulas[script] || formulas.english;
  return selectedList.map((item, index) => {
    // Modify slightly with topic variation
    const adjustedQuote = item.quote;
    // Adapt prompts to chosen style
    let updatedPrompt = item.prompt;
    if (style === 'pencil_sketch') {
      updatedPrompt = `Pencil outline sketch of: ${updatedPrompt}, graphite, hand-drawn fine-line ink art`;
    } else if (style === 'watercolor') {
      updatedPrompt = `Bleeding dark watercolor canvas painting: ${updatedPrompt}, indigo monochrome wash`;
    } else if (style === 'dark_minimalist') {
      updatedPrompt = `Sleek high contrast pitch black art: ${updatedPrompt}, thin glowing white layout borders`;
    } else if (style === 'cinematic_motorcycle') {
      updatedPrompt = `Hyper-realistic dark cinematic motorsport Duke motorcycle aesthetic: ${updatedPrompt}, blurred wet highway, high dynamic range`;
    }
    
    return {
      id: `fallback-${style}-${script}-${index}-${Date.now()}`,
      quote: adjustedQuote,
      quoteTranslation: item.quoteTranslation,
      imagePrompt: updatedPrompt,
      suggestedVoice: item.voice as any
    };
  });
}

// Endpoint 3: Render Reel (The Core Video Engine)
app.post("/api/render-reel", async (req, res) => {
  try {
    const { ideaId, quoteText, backgroundImageUrl, duration, voiceoverOn, phonkBgmOn, visualStyle, ttsAudioBase64 } = req.body;

    if (!quoteText || !backgroundImageUrl) {
      return res.status(400).json({ error: "Missing required fields: quoteText, backgroundImageUrl" });
    }

    const reelDuration = parseInt(duration, 10) || 15; // default 15s

    // Create temp directory for this render job
    const jobId = crypto.randomUUID();
    const tempDir = path.join(os.tmpdir(), `faceless-reels-${jobId}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const imagePath = path.join(tempDir, "bg.jpg");
    // Handle image download
    if (backgroundImageUrl.startsWith("http")) {
      const imgRes = await fetch(backgroundImageUrl);
      const buffer = await imgRes.arrayBuffer();
      fs.writeFileSync(imagePath, Buffer.from(buffer));
    } else {
      fs.copyFileSync(path.resolve(backgroundImageUrl), imagePath);
    }

    const outputPath = path.join(tempDir, "output.mp4");
    let command = ffmpeg();

    // 1. Add Background Image (looped to duration)
    command.input(imagePath).loop(reelDuration);

    let audioInputs = 0;
    
    // 2. Setup Audio Inputs
    if (voiceoverOn && ttsAudioBase64) {
      const ttsAudioPath = path.join(tempDir, "tts.mp3");
      fs.writeFileSync(ttsAudioPath, Buffer.from(ttsAudioBase64, "base64"));
      command.input(ttsAudioPath);
      audioInputs++;
    }

    if (phonkBgmOn) {
      // Assuming a local phonk BGM file exists in assets/
      const bgmPath = path.join(__dirname, "assets", "phonk_bgm.mp3");
      if (fs.existsSync(bgmPath)) {
        command.input(bgmPath).inputOptions(["-stream_loop -1"]);
        audioInputs++;
      }
    }

    // 3. Build Complex Filters
    let complexFilter = [];
    
    // Scale and crop to 9:16 aspect ratio (1080x1920)
    let videoFilters = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";

    // Dark cinematic color grading based on visualStyle
    if (visualStyle === 'pencil_sketch') {
      videoFilters += ",eq=contrast=1.5:brightness=0.1:saturation=0.2";
    } else if (visualStyle === 'dark_minimalist') {
      videoFilters += ",eq=contrast=1.2:brightness=-0.1:saturation=0.5";
    } else if (visualStyle === 'watercolor') {
      videoFilters += ",eq=contrast=1.1:saturation=1.3";
    } else if (visualStyle === 'cinematic_motorcycle') {
      videoFilters += ",eq=contrast=1.3:saturation=1.2:gamma=0.9";
    }

    // Add Text Overlay (dynamically centered)
    const sanitizedQuote = quoteText.replace(/['":\\]/g, "");
    videoFilters += `,drawtext=text='${sanitizedQuote}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=2:shadowy=2:borderw=2:bordercolor=black`;
    
    complexFilter.push({ filter: videoFilters, inputs: "0:v", outputs: "v_out" });

    // Audio mixing
    if (audioInputs === 2) {
      // Lower BGM volume (input 2) to 0.3
      complexFilter.push({ filter: "volume=0.3", inputs: "2:a", outputs: "bgm_low" });
      complexFilter.push({ filter: "amix=inputs=2:duration=first", inputs: ["1:a", "bgm_low"], outputs: "a_out" });
    } else if (audioInputs === 1) {
      // Input 1 is either TTS or BGM
      complexFilter.push({ filter: "anull", inputs: "1:a", outputs: "a_out" });
    }

    if (complexFilter.length > 0) {
      command.complexFilter(complexFilter, audioInputs > 0 ? ["v_out", "a_out"] : ["v_out"]);
    }

    // 4. Output Configuration
    command.outputOptions([
      "-c:v libx264",
      "-preset fast",
      "-pix_fmt yuv420p",
      `-t ${reelDuration}`,
    ]);

    if (audioInputs > 0) {
      command.outputOptions(["-c:a aac", "-b:a 128k", "-shortest"]);
    } else {
      command.outputOptions(["-an"]);
    }

    command.output(outputPath);

    // 5. Execute FFmpeg
    command.on("error", (err, stdout, stderr) => {
      console.error("FFmpeg Error:", err.message);
      res.status(500).json({ error: "Failed to render video", details: err.message });
    });

    command.on("end", () => {
      console.log("FFmpeg rendering finished successfully:", outputPath);
      // Stream back to client
      res.download(outputPath, "rendered_reel.mp4", (err) => {
        if (err) console.error("Error sending file:", err);
        // Cleanup temp files
        fs.unlinkSync(outputPath);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        fs.rmdirSync(tempDir);
      });
    });

    command.run();

  } catch (error: any) {
    console.error("Render Reel error:", error);
    res.status(500).json({ error: "Internal server error during rendering." });
  }
});

// Vite integration middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In development, load Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware loaded for active HMR-disabled asset development.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Faceless Reels AI server active on port http://0.0.0.0:${PORT}`);
  });
}

startServer();

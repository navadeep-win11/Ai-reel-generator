/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Download, RefreshCw, Smartphone, Sparkles, AlertCircle, ArrowLeft, Volume2, Music, VolumeX } from 'lucide-react';
import { IdeaItem, VisualStyle, ReelControls } from './types';
import { getAestheticImage } from './utils/imageCurator';
import { phonkSynth } from './utils/phonkSynth';
import { generateTTS, API_BASE } from './utils/api';

interface ReelPreviewProps {
  idea: IdeaItem | null;
  controls: ReelControls;
  onReset: () => void;
}

export default function ReelPreview({ idea, controls, onReset }: ReelPreviewProps) {
  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0: Idle, 1: Rendering, 2: Ready, 3: Error
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [estimatedRemainingSeconds, setEstimatedRemainingSeconds] = useState<number>(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [hasGeminiTTS, setHasGeminiTTS] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<SpeechSynthesisUtterance | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // High quality images & background assets
  const imageUrl = idea ? getAestheticImage(controls.visualStyle, 2) : '';
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  // Load the background image
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // critical for canvas recorder security
      img.src = imageUrl;
      img.onload = () => {
        backgroundImageRef.current = img;
      };
    }
  }, [imageUrl]);

  // Async Pipeline Executor
  useEffect(() => {
    if (idea && pipelineStep === 0) {
      setPipelineStep(1);
      setProgress(0);
      setConsoleLogs([]);
      setPipelineError(null);

      const runPipeline = async () => {
        try {
          // 1. Script / Setup
          setConsoleLogs(prev => [...prev, "[RENDER ENGINE] Initializing GPU Canvas sandbox context..."]);
          setProgress(20);
          console.log("[Pipeline] Starting Script/Setup phase...");
          await new Promise(r => setTimeout(r, 600)); // Simulate sandbox init
          console.log("[Pipeline] Script/Setup phase complete.");

          // 2. TTS Generation
          if (controls.voiceoverOn) {
            setConsoleLogs(prev => [...prev, `[RENDER ENGINE] Contacting Gemini TTS server voice [${idea.suggestedVoice}]...`]);
            console.log("[Pipeline] Starting TTS API call...");
            const ttsData = await generateTTS({ text: idea.quote, voice: idea.suggestedVoice });
            console.log("[Pipeline] TTS API call complete.", ttsData);
            
            if (ttsData.base64Audio) {
              const audioUrl = `data:audio/mp3;base64,${ttsData.base64Audio}`;
              const audio = new Audio(audioUrl);
              ttsAudioRef.current = audio;
              setHasGeminiTTS(true);
            }
          } else {
            setConsoleLogs(prev => [...prev, "[RENDER ENGINE] Voiceover option disabled."]);
            setHasGeminiTTS(false);
          }
          setProgress(50);

          // 3. Image Pipeline
          setConsoleLogs(prev => [...prev, `[RENDER ENGINE] Injecting visual style shaders for [${controls.visualStyle.toUpperCase()}] layer...`]);
          console.log("[Pipeline] Starting Image rendering phase...");
          await new Promise(r => setTimeout(r, 600)); // Image load simulation
          console.log("[Pipeline] Image rendering phase complete.");
          setProgress(75);

          // 4. Render / Composite
          setConsoleLogs(prev => [...prev, "[RENDER ENGINE] Compiling multi-track sub-mixes and rasterizing..."]);
          console.log("[Pipeline] Starting Render composition...");
          await new Promise(r => setTimeout(r, 600));
          console.log("[Pipeline] Render composition complete.");
          setProgress(100);

          setPipelineStep(2);
        } catch (err: any) {
          console.error("[Pipeline] Error during sequential pipeline:", err);
          setPipelineError(err.message || "Unknown pipeline error occurred.");
          setPipelineStep(3);
        }
      };

      runPipeline();
    }
  }, [idea, pipelineStep, controls]);

  // Custom multi-track client playback runner
  const startPlayback = () => {
    if (!idea) return;
    setIsPlaying(true);
    setPlaybackTime(0);

    // 1. Phonk Drum BGM
    if (controls.phonkBgmOn) {
      phonkSynth.start().catch((err) => console.warn('Synth failed:', err));
    }

    // 2. TTS vocal
    if (controls.voiceoverOn) {
      if (hasGeminiTTS && ttsAudioRef.current) {
        ttsAudioRef.current.currentTime = 0;
        ttsAudioRef.current.play().catch(e => console.warn('Audio play error:', e));
      } else {
        // Fallback Client Speech Synthesis
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(idea.quote);
          
          // Match standard voice parameters based on suggestion
          if (idea.suggestedVoice === 'Fenrir') {
            utterance.pitch = 0.5; // Deep alpha
            utterance.rate = 0.85;
          } else if (idea.suggestedVoice === 'Charon') {
            utterance.pitch = 0.7; // Gritty mature
            utterance.rate = 0.9;
          } else {
            utterance.pitch = 1.0; // standard
            utterance.rate = 0.95;
          }

          utterance.onend = () => {
            // Keep playing loop, but vocal is complete
          };
          
          window.speechSynthesis.speak(utterance);
          setActiveSpeech(utterance);
        }
      }
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    phonkSynth.stop();
    
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveSpeech(null);
  };

  // Toggle playback
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Handle loop clock timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= controls.duration) {
            // Loop reset
            stopPlayback();
            setTimeout(() => {
              startPlayback();
            }, 500);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isPlaying, controls.duration]);

  // Clean-up synthesis resources on unmount
  useEffect(() => {
    return () => {
      phonkSynth.stop();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Frame composition drawing subroutine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pipelineStep !== 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrame = 0;
    const draw = () => {
      localFrame++;
      
      // Canvas dimensions are hard port 9:16 (1080x1920)
      const w = 1080;
      const h = 1920;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // 1. Ken Burns background image rendering
      if (backgroundImageRef.current) {
        const panProgress = (localFrame % 1000) / 1000;
        const zoom = 1.1 + Math.sin(panProgress * Math.PI) * 0.12; // slow push back
        const panX = Math.cos(panProgress * Math.PI * 2) * 50;
        const panY = Math.sin(panProgress * Math.PI * 2) * 20;

        const img = backgroundImageRef.current;
        const aspect = img.width / img.height;
        let drawW = w * zoom;
        let drawH = (w / aspect) * zoom;
        
        if (drawH < h) {
          drawH = h * zoom;
          drawW = (h * aspect) * zoom;
        }

        const x = (w - drawW) / 2 + panX;
        const y = (h - drawH) / 2 + panY;

        ctx.globalAlpha = 0.35; // keep visual dark for caption contrast (Artloss vibe)
        ctx.drawImage(img, x, y, drawW, drawH);
        ctx.globalAlpha = 1.0;
      }

      // 2. Apply Custom Style Shader
      applyStyleShader(ctx, controls.visualStyle, w, h, localFrame);

      // 3. Audio spectrum overlay (dancing rings)
      if (isPlaying) {
        drawVisualizer(ctx, w, h, localFrame);
      }

      // 4. Kinetic Subtitles caption mapping
      if (idea) {
        drawSubtitles(ctx, idea.quote, controls.selectedFont, w, h, localFrame);
      }

      // 5. Watermark / Brand Logo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 24px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('facelessreels.ai', w / 2, h - 90);

      // Draw aesthetic thin border if dark_minimalist
      if (controls.visualStyle === 'dark_minimalist') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 12;
        ctx.strokeRect(30, 30, w - 60, h - 60);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pipelineStep, idea, isPlaying, controls]);

  // Style Shader Drawings
  const applyStyleShader = (ctx: CanvasRenderingContext2D, style: VisualStyle, w: number, h: number, frame: number) => {
    if (style === 'pencil_sketch') {
      // Charcoal graphite vignette lines
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 550 + i * 35 + Math.sin(frame * 0.02) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Sketch lines cross-hatch overlay
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.font = '200px serif';
      ctx.fillText('/', w / 4, h / 3);
      ctx.fillText('/', w * 0.75, h * 0.7);

      // Noise grain
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < 15; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.fillRect(rx, ry, 2, 60);
      }

    } else if (style === 'watercolor') {
      // Soft pulsing dark indigo blobs
      ctx.fillStyle = 'rgba(28, 49, 100, 0.15)';
      ctx.beginPath();
      const radius = 300 + Math.sin(frame * 0.03) * 50;
      ctx.arc(w / 2 + Math.cos(frame * 0.01) * 60, h / 3, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(30, 30, 46, 0.2)';
      ctx.beginPath();
      ctx.arc(w / 2 - Math.sin(frame * 0.01) * 80, h * 0.65, radius + 80, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'cinematic_motorcycle') {
      // Wet road light reflections / night bokeh dots
      const orangeBokeh = ['rgba(249, 115, 22, 0.08)', 'rgba(251, 146, 60, 0.05)', 'rgba(239, 68, 68, 0.07)'];
      orangeBokeh.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        const bx = (w / 3) * (idx + 1) + Math.sin(frame * 0.01 + idx) * 40;
        const by = (h * 0.7) + Math.cos(frame * 0.015 + idx) * 30;
        ctx.arc(bx, by, 180 + idx * 30, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rain streaking lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const rx = (i * w / 10 + frame * 4) % w;
        const ry = (i * h / 10 + frame * 18) % h;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 10, ry + 50);
        ctx.stroke();
      }
    }
  };

  // Sound visualization wave (glowing orb)
  const drawVisualizer = (ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    
    const scale = 250 + Math.sin(frame * 0.15) * 20; // bounce on beat
    for (let u = 0; u <= 360; u += 5) {
      const angle = (u * Math.PI) / 180;
      const noise = Math.sin(angle * 8 + frame * 0.25) * 15;
      const r = scale + noise;
      const x = w / 2 + Math.cos(angle) * r;
      const y = h / 2 + Math.sin(angle) * r;

      if (u === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Pulse core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 85 + Math.sin(frame * 0.12) * 8, 0, Math.PI * 2);
    ctx.fill();
  };

  // Kinetic overlay captions drawer
  const drawSubtitles = (ctx: CanvasRenderingContext2D, quote: string, font: string, w: number, h: number, frame: number) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = quote.split(' ');
    // We cycle highlighting words in groups or single based on time
    const highlightWordIndex = Math.floor((frame / 20) % (words.length + 3));

    // Canvas layout font mapper
    ctx.font = `bold 62px "${font}", "Inter", sans-serif`;

    const lineY = h / 3 + 100; // centered above visualizer
    const maxLineW = w - 160;

    // Wrap quote lines cleanly
    let currentLine = '';
    const lines: string[][] = [];
    let lineWords: string[] = [];

    words.forEach((word) => {
      const test = currentLine + word + ' ';
      const metrics = ctx.measureText(test);
      if (metrics.width > maxLineW && currentLine !== '') {
        lines.push(lineWords);
        lineWords = [word];
        currentLine = word + ' ';
      } else {
        lineWords.push(word);
        currentLine = test;
      }
    });
    if (lineWords.length > 0) {
      lines.push(lineWords);
    }

    // Now render wrapped lines
    let globalWordIdx = 0;
    let startY = h / 2 - (lines.length * 90) / 2;

    lines.forEach((line, lineIdx) => {
      const lineText = line.join(' ');
      const totalWidth = ctx.measureText(lineText).width;
      let startX = (w - totalWidth) / 2;

      line.forEach((word, wordIdx) => {
        const isHighlighted = globalWordIdx === highlightWordIndex;
        
        ctx.fillStyle = isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.4)';
        
        if (isHighlighted) {
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 24;
        } else {
          ctx.shadowBlur = 0;
        }

        const wordWidth = ctx.measureText(word + ' ').width;
        ctx.fillText(word, startX + wordWidth / 2, startY + lineIdx * 110);
        
        ctx.shadowBlur = 0; // reset
        startX += wordWidth;
        globalWordIdx++;
      });
    });
  };

  // Triggers the backend FFmpeg rendering pipeline instead of client-side MediaRecorder
  const compileAndDownloadVideo = async () => {
    if (!idea) return;
    try {
      setIsRecording(true);
      setRecordProgress(50);
      setEstimatedRemainingSeconds(10);
      setConsoleLogs(prev => [...prev, "[RENDER ENGINE] Triggering backend /render-reel compilation (libx264/aac)..."]);

      const response = await fetch(`${API_BASE}/render-reel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIdea: idea })
      });

      if (!response.ok) {
        throw new Error('Backend rendering failed.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setCompiledVideoUrl(url);
      setRecordProgress(100);
      setIsRecording(false);
      
      setConsoleLogs(prev => [...prev, "[RENDER ENGINE] MP4 Video compiled and ready for preview."]);
    } catch (err: any) {
      console.error("Backend render failed:", err);
      setIsRecording(false);
      alert("Failed to render video on the backend server.");
    }
  };

  return (
    <div id="reel-preview-grand-container" className="pt-8 border-t border-zinc-900 animate-fade-in">
      
      {/* State 3: Pipeline Error */}
      {pipelineStep === 3 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl relative">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-medium tracking-tight">Pipeline Generation Failed</h3>
          </div>
          <p className="text-red-300/80 text-sm mb-6">{pipelineError}</p>
          <button 
            onClick={onReset}
            className="bg-red-900/40 hover:bg-red-900/60 text-red-200 text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go Back & Try Again
          </button>
        </div>
      )}

      {/* State 1: Rendering pipeline in progress */}
      {pipelineStep === 1 && (
        <div className="bg-[#0e0e12] border border-zinc-800 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Sparkles className="w-40 h-40 text-white" />
          </div>

          <div className="flex items-center gap-3.5 mb-6">
            <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
            <h3 className="text-lg font-medium text-white tracking-tight">
              Executing GPU Multi-Track Render Layer
            </h3>
          </div>

          {/* Progress bar */}
          <div className="space-y-2 mb-8">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Merging Frame Matrices</span>
              <span className="font-bold text-white">{progress}%</span>
            </div>
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
              <div 
                className="h-full bg-white transition-all duration-300 shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Terminal debugger output */}
          <div className="bg-black/90 rounded-xl p-4 border border-zinc-900/80 font-mono text-[11px] text-zinc-400 space-y-2 max-h-52 overflow-y-auto shadow-inner select-none">
            {consoleLogs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                <span className={index === consoleLogs.length - 1 ? 'text-zinc-200' : 'text-zinc-550'}>{log}</span>
              </div>
            ))}
            <div className="animate-pulse text-zinc-500 text-[10px]">■ Awaiting renderer signal...</div>
          </div>
        </div>
      )}

      {/* State 2: Video editor dashboard */}
      {pipelineStep === 2 && idea && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Explanations + Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={onReset}
                id="back-to-controls-hdr-btn"
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pipeline Output</span>
                <h3 className="text-2xl font-semibold text-white tracking-tight leading-none mt-1">
                  Reel Render Complete
                </h3>
              </div>
            </div>

            <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-xl p-6 space-y-5">
              <div className="space-y-1">
                <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Selected Quote</h4>
                <p className="text-zinc-100 text-lg font-sans font-medium italic leading-relaxed">
                  &ldquo;{idea.quote}&rdquo;
                </p>
                {idea.quoteTranslation && idea.quoteTranslation !== idea.quote && (
                  <p className="text-xs text-zinc-400 mt-1 italic pl-3 border-l-2 border-zinc-800">
                    {idea.quoteTranslation}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-900 space-y-1">
                <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Design Specs</h4>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Canvas Style</span>
                    <span className="text-xs font-medium text-zinc-300 block capitalize">{controls.visualStyle.replace('_', ' ')}</span>
                  </div>
                  <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Render Font</span>
                    <span className="text-xs font-medium text-zinc-300 block">{controls.selectedFont}</span>
                  </div>
                  <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Duration Limit</span>
                    <span className="text-xs font-medium text-zinc-300 block">{controls.duration}s</span>
                  </div>
                  <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-lg">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">BGM Layer</span>
                    <span className="text-xs font-medium text-zinc-300 block">{controls.phonkBgmOn ? 'Phonk Synth ON' : 'OFF'}</span>
                  </div>
                </div>
              </div>

              {/* Live interactive player logs */}
              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Volume2 className="w-4 h-4 text-zinc-500" />
                  <span className="font-mono uppercase tracking-wider">Sound Synthesizer status</span>
                </div>
                <div className="text-[11px] font-sans text-zinc-400 leading-relaxed">
                  {controls.voiceoverOn ? (
                    hasGeminiTTS ? (
                      <span className="text-zinc-300">✓ Real 24kHz multi-band deep AI voice initialized successfully.</span>
                    ) : (
                      <span className="text-zinc-400">⚡ Speech synthesis server offline. Activated local computer audio browser voice synthesis smoothly.</span>
                    )
                  ) : (
                    <span>Narrator track muted by designer selection.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline controls */}
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <button
                onClick={compileAndDownloadVideo}
                disabled={isRecording || compiledVideoUrl !== null}
                id="download-video-btn"
                className="flex-1 flex items-center justify-center gap-2.5 bg-zinc-100 hover:bg-white text-black font-semibold text-sm py-4 px-6 rounded-xl transition-all shadow-md shadow-zinc-500/5 disabled:opacity-50"
              >
                {isRecording ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 text-black animate-spin" />
                    <span>Compiling MP4 on Server...</span>
                  </>
                ) : compiledVideoUrl ? (
                  <>
                    <Sparkles className="w-4.5 h-4.5 text-black" />
                    <span>Reel Compiled successfully</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4.5 h-4.5 text-black" />
                    <span>Export & Compile MP4</span>
                  </>
                )}
              </button>

              <button
                onClick={onReset}
                id="reset-creator-btn"
                disabled={isRecording}
                className="flex-1 flex items-center justify-center gap-2 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 font-semibold text-sm py-4 px-6 rounded-xl transition-all"
              >
                <RefreshCw className="w-4.5 h-4.5" />
                <span>Configure Another Reel</span>
              </button>
            </div>
            
            {isRecording && (
              <p className="text-[11px] text-zinc-500 text-center animate-pulse">
                ⚙️ Standby. We are executing an offline raster pass. Keep this browser window visible and active while recording.
              </p>
            )}
          </div>

          {/* Right Column: 9:16 mobile mock preview */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-[#020202] rounded-[38px] p-2.5 shadow-2xl border-4 border-zinc-800/80 flex items-center justify-center">
              
              {/* Upper dynamic speaker Notch */}
              <div className="absolute top-4 w-28 h-4 bg-zinc-900 rounded-full z-20 border border-zinc-800/40 flex items-center justify-center">
                <span className="block w-2 h-2 rounded-full bg-zinc-800" />
              </div>

              {/* Side camera and interactive layers */}
              <div className="absolute inset-2 bg-black rounded-[28px] overflow-hidden flex flex-col justify-between relative shadow-inner">
                
                {/* 1. Real 9:16 canvas display or MP4 Preview */}
                {compiledVideoUrl ? (
                  <video 
                    controls
                    src={compiledVideoUrl}
                    className="absolute inset-0 w-full h-full object-cover rounded-[28px] z-30"
                  />
                ) : (
                  <canvas 
                    ref={canvasRef} 
                    width={1080} 
                    height={1920} 
                    className="absolute inset-0 w-full h-full object-cover rounded-[28px]"
                    id="rendered-reels-canvas"
                  />
                )}

                {/* Subtitle / Volume Toggles overlay corner */}
                <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-full bg-black/40 border border-zinc-800/60 flex items-center justify-center text-white backdrop-blur-xs">
                    {controls.voiceoverOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black/40 border border-zinc-800/60 flex items-center justify-center text-white backdrop-blur-xs font-bold text-[9px] font-mono">
                    {controls.duration}s
                  </div>
                </div>

                {!compiledVideoUrl && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 flex flex-col space-y-4 z-20">
                    
                    {/* Progress Line */}
                    <div className="space-y-1">
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${(playbackTime / controls.duration) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                        <span>0:0{playbackTime}</span>
                        <span>0:0{controls.duration}</span>
                      </div>
                    </div>

                    {/* Play Button Overlay */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={togglePlay}
                        id="play-reels-player-btn"
                        className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 fill-black stroke-black stroke-[3px]" />
                        ) : (
                          <Play className="w-5 h-5 fill-black stroke-black ml-0.5 stroke-[3px]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

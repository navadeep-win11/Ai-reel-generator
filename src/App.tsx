/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Film, Sparkles, Wand2, Info, Moon, Settings, Zap, Compass, RefreshCw } from 'lucide-react';
import { ReelControls, IdeaItem } from './types';
import ControlPanel from './ControlPanel';
import IdeaCards from './IdeaCards';
import ReelPreview from './ReelPreview';
import { fetchConfig, generateIdeas } from './utils/api';

export default function App() {
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<IdeaItem | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1); // 1: Setup, 2: Selection, 3: Reel Ready
  const [controls, setControls] = useState<ReelControls>({
    visualStyle: 'cinematic_motorcycle',
    languageScript: 'english',
    topic: 'Grind & Stoic Success',
    voiceoverOn: true,
    phonkBgmOn: true,
    selectedFont: 'Space Grotesk',
    duration: 15,
  });

  // Query server config to check key availability
  useEffect(() => {
    fetchConfig()
      .then((data) => {
        setHasGeminiKey(data.hasGeminiKey);
      })
      .catch((err) => console.log('Could not connect to config server:', err));
  }, []);

  const handleGenerateIdeas = async (newControls: ReelControls) => {
    setIsLoadingIdeas(true);
    setControls(newControls);
    setIdeas([]);
    setSelectedIdea(null);
    setActiveStep(1);

    try {
      const data = await generateIdeas({
        visualStyle: newControls.visualStyle,
        languageScript: newControls.languageScript,
        topic: newControls.topic,
      });

      if (data.ideas && data.ideas.length > 0) {
        const ideasWithIds = data.ideas.map((idea: any, index: number) => ({
          ...idea,
          id: idea.id || `idea-${Date.now()}-${index}`
        }));
        setIdeas(ideasWithIds);
        setActiveStep(2);
      } else {
        alert("Server returned empty ideas block. Please try again.");
      }
    } catch (err: any) {
      console.error("API error generating ideas:", err);
      alert("Failed to reach creative AI engine. Verify server state.");
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const handleCreateReel = (idea: IdeaItem) => {
    setSelectedIdea(idea);
    setActiveStep(3);
  };

  const handleReset = () => {
    setIdeas([]);
    setSelectedIdea(null);
    setActiveStep(1);
  };

  return (
    <div id="saas-dashboard-root" className="min-h-screen bg-[#030303] text-zinc-150 relative overflow-hidden flex flex-col justify-between selection:bg-zinc-800">
      
      {/* Absolute backdrop atmospheric subtle glow lines */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-zinc-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-zinc-950 rounded-full blur-[100px] pointer-events-none" />

      {/* Header boundary line */}
      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-lg">
              <Film className="w-4.5 h-4.5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-md font-semibold text-white tracking-tight leading-none">
                Faceless Reels AI
              </h1>
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 block mt-1">
                Aesthetic Quote Reels Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-zinc-900/30 px-3 py-1 rounded-full border border-zinc-900">
              <Compass className="w-3.5 h-3.5 text-zinc-500" />
              v1.0.3 • Production Ready
            </span>
            <div className="w-8 h-8 rounded-full border border-zinc-900 flex items-center justify-center text-zinc-400">
              <Moon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Dashboard layout */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full relative">
        
        {/* Intro branding slogan row */}
        {activeStep === 1 && (
          <div className="mb-12 space-y-3.5 max-w-4xl animate-fade-in">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/40 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-zinc-300" /> Human-in-the-Loop Bulk Reel Orchestrator
            </span>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
              Create cinematic aesthetic quote reels <span className="bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600 bg-clip-text text-transparent italic font-serif">instantly.</span>
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed tracking-wide max-w-2xl">
              Engineered for YouTube Shorts, Instagram motivational nodes, and dark-aesthetic creators. Curate raw ink-wash shading background layers and automated verbal synthesis.
            </p>
          </div>
        )}

        {/* Dashboard grid structure */}
        <div className="space-y-12">
          
          {/* Active section blocks depending on step progress */}
          {activeStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Configuration panel left */}
              <div className="lg:col-span-8">
                <ControlPanel 
                  onGenerate={handleGenerateIdeas} 
                  isLoading={isLoadingIdeas} 
                  hasGeminiKey={hasGeminiKey}
                />
              </div>

              {/* High-Craft Context Sidebar Right */}
              <div className="lg:col-span-4 bg-[#08080a]/60 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Info className="w-32 h-32 text-zinc-600" />
                </div>
                
                <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-zinc-500" /> Visual & Vibe Inspiration
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  The aesthetics of our tool borrow from fine ink profiles like <span className="text-zinc-200 font-medium">@point_n_pigment</span>, deep gothic themes from <span className="text-zinc-200 font-medium">@wag_guy</span>, and motorcycle raw bokeh of <span className="text-zinc-200 font-medium">@artloss_x</span>. 
                </p>

                <div className="space-y-4 pt-4 border-t border-zinc-900/80">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">1. Fine Fine Ink & Pencil sketch</span>
                    <span className="text-xs text-zinc-400 block leading-relaxed">
                      We model graphite chalk borders and rapid cross-hatch textures, leaving generous breathing spaces for quote kinetic overlays.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">2. Bleeding watercolor indigo</span>
                    <span className="text-xs text-zinc-400 block leading-relaxed">
                      A blend of glowing, translucent monochromatic ink bleeds that float organically in a dark void. Perfect for melancholic motivation pages.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">3. Cinematic bike bokeh</span>
                    <span className="text-xs text-zinc-400 block leading-relaxed">
                      High dynamic-range orange/red lighting peaks reflecting over dark wet streets as a motorcycle speeds past. Peak Duke 390 ambiance.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Selection Block Grid */}
          {activeStep === 2 && (
            <IdeaCards 
              ideas={ideas} 
              visualStyle={controls.visualStyle} 
              onCreateReel={handleCreateReel}
              isRendering={false}
            />
          )}

          {/* Step 3 Final Video Editor Deck */}
          {activeStep === 3 && (
            <ReelPreview 
              idea={selectedIdea} 
              controls={controls} 
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-zinc-900/60 py-6 bg-black/20 text-center relative z-10 text-[11px] font-mono text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 100% Automatic Faceless Reels AI Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#vibe-curator" className="hover:text-zinc-400 transition-colors">Fine Ink Model</a>
            <a href="#procedural-synthesizer" className="hover:text-zinc-400 transition-colors">Phonk Machine v1.0</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

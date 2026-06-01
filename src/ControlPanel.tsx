/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Eye, Music, Volume2, Type, Clock, ShieldCheck, Flame } from 'lucide-react';
import { ReelControls, VisualStyle, LanguageScript } from './types';

interface ControlPanelProps {
  onGenerate: (controls: ReelControls) => void;
  isLoading: boolean;
  hasGeminiKey: boolean;
}

export default function ControlPanel({ onGenerate, isLoading, hasGeminiKey }: ControlPanelProps) {
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('cinematic_motorcycle');
  const [languageScript, setLanguageScript] = useState<LanguageScript>('english');
  const [topic, setTopic] = useState<string>('Grind & Stoic Success');
  const [voiceoverOn, setVoiceoverOn] = useState(true);
  const [phonkBgmOn, setPhonkBgmOn] = useState(true);
  const [selectedFont, setSelectedFont] = useState('Space Grotesk');
  const [duration, setDuration] = useState(15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      visualStyle,
      languageScript,
      topic,
      voiceoverOn,
      phonkBgmOn,
      selectedFont,
      duration,
    });
  };

  const topicsList = [
    'Grind & Stoic Success',
    'Chasing Shadows (Discreet Motivation)',
    'Pain & Emotional Heavy Ink',
    'Furious Ambition & Speed',
    'Wisdom of the Solitary'
  ];

  return (
    <div id="control-panel-container" className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Absolute faint grid pattern for premium tech aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <h2 className="relative text-xl font-medium tracking-tight text-white mb-6 flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-zinc-400" />
          Reel Configuration
        </span>
        <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${hasGeminiKey ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-indigo-400'}`} />
          {hasGeminiKey ? 'Gemini AI Active' : 'Offline Template Mode'}
        </span>
      </h2>

      <form onSubmit={handleSubmit} className="relative space-y-6">
        {/* Row 1: Style & Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Core Visual Style
            </label>
            <select
              id="visual-style-dropdown"
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all font-sans"
            >
              <option value="cinematic_motorcycle">🏍️ Cinematic Motorcycle (Duke 390 style)</option>
              <option value="pencil_sketch">✏️ Graphite Pencil Sketch (Hand-Drawn)</option>
              <option value="watercolor">🎨 Bleeding Watercolor Ink (Moody Indigo)</option>
              <option value="dark_minimalist">⬛ Dark Minimalist (Obidian & Neon Edge)</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Defines the canvas textures, color mapping, and visual aesthetic.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Language Script
            </label>
            <select
              id="language-script-dropdown"
              value={languageScript}
              onChange={(e) => setLanguageScript(e.target.value as LanguageScript)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all font-sans"
            >
              <option value="english">🇬🇧 English (Standard Stoic Grit)</option>
              <option value="hinglish">🇮🇳 Hinglish (Hindi in Roman script)</option>
              <option value="tenglish">🇮🇳 Tenglish (Telugu in Roman script)</option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              We leverage romanized local scripts for native authenticity and deep engagement.
            </p>
          </div>
        </div>

        {/* Topic Suggestion */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> Quote Topic / Motif
          </label>
          <div className="flex flex-wrap gap-2">
            {topicsList.map((t) => (
              <button
                key={t}
                type="button"
                id={`topic-btn-${t.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setTopic(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  topic === t
                    ? 'bg-zinc-100 text-black border-zinc-100 font-medium'
                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/80 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Typography & Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-zinc-900">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Subtitle Caption Font
            </label>
            <select
              id="font-selector-dropdown"
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all"
            >
              <option value="Space Grotesk">⚡ Space Grotesk (Bold & Tech)</option>
              <option value="Cormorant Garamond">✍️ Cormorant Garamond (Poetic Serif)</option>
              <option value="JetBrains Mono">💻 JetBrains Mono (Minimalist Code)</option>
              <option value="Inter">❄️ Inter (Clean Swiss Geometric)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Duration
              </label>
              <span className="text-xs font-mono text-zinc-200 font-bold">{duration} seconds</span>
            </div>
            <input
              type="range"
              id="duration-slider"
              min="10"
              max="40"
              step="5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-900 rounded-lg outline-none"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
              <span>10s</span>
              <span>25s</span>
              <span>40s</span>
            </div>
          </div>
        </div>

        {/* Audio Toggles Card */}
        <div className="bg-[#111115] border border-zinc-800/60 rounded-xl p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-zinc-500" /> Audio Design Layer
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-2.5 bg-zinc-950/40 rounded-lg border border-zinc-900 cursor-pointer hover:bg-zinc-900 transition-all">
              <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${voiceoverOn ? 'text-zinc-300' : 'text-zinc-600'}`} />
                <div className="text-left">
                  <span className="text-xs font-medium text-zinc-200 block">AI Voiceover (TTS)</span>
                  <span className="text-[10px] text-zinc-500 block">Atmospheric narrator narration</span>
                </div>
              </div>
              <input
                type="checkbox"
                id="toggle-voice-btn"
                checked={voiceoverOn}
                onChange={() => setVoiceoverOn(!voiceoverOn)}
                className="w-4 h-4 rounded border-zinc-800 text-zinc-100 bg-zinc-900 focus:ring-0 cursor-pointer accent-zinc-300"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-zinc-950/40 rounded-lg border border-zinc-900 cursor-pointer hover:bg-zinc-900 transition-all">
              <div className="flex items-center gap-2">
                <Music className={`w-4 h-4 ${phonkBgmOn ? 'text-zinc-300' : 'text-zinc-600'}`} />
                <div className="text-left">
                  <span className="text-xs font-medium text-zinc-200 block">Phonk BGM Beat</span>
                  <span className="text-[10px] text-zinc-500 block">Deep bass energy Cowbell rhythm</span>
                </div>
              </div>
              <input
                type="checkbox"
                id="toggle-music-btn"
                checked={phonkBgmOn}
                onChange={() => setPhonkBgmOn(!phonkBgmOn)}
                className="w-4 h-4 rounded border-zinc-800 text-zinc-100 bg-zinc-900 focus:ring-0 cursor-pointer accent-zinc-300"
              />
            </label>
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          id="generate-ideas-btn"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 bg-white text-black font-semibold text-sm py-3.5 px-6 rounded-xl hover:bg-zinc-200 transition-all duration-300 shadow-md hover:shadow-zinc-500/20 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
              <span>Generating Deep Aesthetic Designs...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              <span>Generate 5 Premium Ideas (Step 1)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

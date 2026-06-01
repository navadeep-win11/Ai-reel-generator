/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Film, Layers, ArrowRight, BookOpen, VolumeX } from 'lucide-react';
import { IdeaItem, VisualStyle } from './types';
import { getAestheticImage } from './utils/imageCurator';

interface IdeaCardsProps {
  ideas: IdeaItem[];
  visualStyle: VisualStyle;
  onCreateReel: (selectedIdea: IdeaItem) => void;
  isRendering: boolean;
}

export default function IdeaCards({ ideas, visualStyle, onCreateReel, isRendering }: IdeaCardsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select the first idea on generation so the user is always one click away from rendering
  useEffect(() => {
    if (ideas.length > 0 && !selectedId) {
      setSelectedId(ideas[0].id);
    }
  }, [ideas, selectedId]);

  const handleCardClick = (id: string) => {
    setSelectedId(id);
  };

  const handleCreateReelClick = () => {
    if (!selectedId) return;
    const selectedIdea = ideas.find(i => i.id === selectedId);
    if (selectedIdea) {
      onCreateReel(selectedIdea);
    }
  };

  if (ideas.length === 0) return null;

  return (
    <div id="ideas-selection-wrapper" className="space-y-8 animate-fade-in mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-medium text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-400" />
            Step 2: Compare & Select Golden Concept
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Pick your preferred quote mood. The cinematic 9:16 rendering pipeline will build using this selected template.
          </p>
        </div>

        <button
          onClick={handleCreateReelClick}
          disabled={!selectedId || isRendering}
          id="trigger-reel-render-btn"
          className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black font-semibold text-xs py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-black/40 disabled:opacity-50 disabled:cursor-not-allowed font-sans uppercase tracking-wider shrink-0"
        >
          <span>Create Selected Reel (Step 3)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {ideas.map((idea, index) => {
          const isSelected = selectedId === idea.id;
          const thumbnail = getAestheticImage(visualStyle, index);

          return (
            <div
              key={idea.id}
              onClick={() => handleCardClick(idea.id)}
              id={`idea-card-${index}`}
              className={`group flex flex-col justify-between rounded-xl relative border cursor-pointer overflow-hidden transition-all duration-300 ${
                isSelected
                  ? 'bg-zinc-900 border-zinc-200/80 shadow-[0_0_24px_rgba(255,255,255,0.06)] scale-[1.02]'
                  : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/60'
              }`}
            >
              {/* Thumbnail header */}
              <div className="aspect-[4/5] w-full overflow-hidden relative border-b border-zinc-900 bg-zinc-950">
                <img
                  src={thumbnail}
                  alt={idea.imagePrompt}
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 transition-opacity duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual filter overlay mimicking fine fine lines */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent opacity-80" />
                
                {/* Active check indicator */}
                <div className="absolute top-3 right-3 z-10">
                  {isSelected ? (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-black shadow-lg">
                      <CheckCircle2 className="w-4 h-4 stroke-[3px]" />
                    </span>
                  ) : (
                    <span className="block w-5 h-5 rounded-full border-2 border-zinc-600 bg-black/40 backdrop-blur-xs group-hover:border-zinc-400" />
                  )}
                </div>

                {/* Number tag */}
                <span className="absolute bottom-3 left-4 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-zinc-300">
                  REEL IDEA #{index + 1}
                </span>
              </div>

              {/* Card content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-zinc-100 font-sans text-sm font-medium leading-relaxed tracking-tight break-words">
                    &ldquo;{idea.quote}&rdquo;
                  </p>
                  
                  {idea.quoteTranslation && idea.quoteTranslation !== idea.quote && (
                    <div className="flex items-start gap-1 p-1.5 rounded bg-zinc-900/40 border border-zinc-900">
                      <BookOpen className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] italic text-zinc-400 leading-snug line-clamp-3">
                        {idea.quoteTranslation}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-zinc-900/80">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                    Visual Prompt
                  </p>
                  <p className="text-[11px] text-zinc-400 line-clamp-3 font-sans leading-relaxed tracking-wide">
                    {idea.imagePrompt}
                  </p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">
                      Voice: {idea.suggestedVoice}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

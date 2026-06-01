/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VisualStyle = 'pencil_sketch' | 'watercolor' | 'dark_minimalist' | 'cinematic_motorcycle';

export type LanguageScript = 'english' | 'tenglish' | 'hinglish';

export interface ReelControls {
  visualStyle: VisualStyle;
  languageScript: LanguageScript;
  voiceoverOn: boolean;
  phonkBgmOn: boolean;
  selectedFont: string;
  duration: number; // in seconds (10 to 40)
  topic: string; // e.g. "Stoicism", "Grind & Success", "Relationships", "Deity/Wisdom"
}

export interface IdeaItem {
  id: string;
  quote: string;
  quoteTranslation?: string;
  imagePrompt: string;
  suggestedVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  imageUrl?: string; // Search-sourced or AI-generated image
}

export interface RenderParams {
  id: string;
  quote: string;
  imagePrompt: string;
  audioVoice: string;
  musicBgm: boolean;
  duration: number;
  visualStyle: VisualStyle;
  selectedFont: string;
}

export interface RenderResult {
  videoUrl: string;
  success: boolean;
  error?: string;
}

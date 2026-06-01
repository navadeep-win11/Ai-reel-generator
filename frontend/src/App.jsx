import { useState } from 'react';
import { Sparkles, Video, Settings, PlayCircle, Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const [topic, setTopic] = useState('');
  const [visualStyle, setVisualStyle] = useState('Cinematic and moody');
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic) return;
    
    setIsGenerating(true);
    setVideoUrl('');
    
    try {
      // 1. Generate Ideas
      setStatus('Brainstorming ideas...');
      const ideasRes = await fetch('http://localhost:3000/api/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, visualStyle, languageScript: language })
      });
      const ideas = await ideasRes.json();
      const selectedIdea = ideas[0];
      
      // 2. Generate TTS
      setStatus('Synthesizing voice...');
      const ttsRes = await fetch('http://localhost:3000/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedIdea.quote, voice: selectedIdea.suggestedVoice })
      });
      const ttsData = await ttsRes.json();
      
      // 3. Generate Image
      setStatus('Generating visuals...');
      const imgRes = await fetch('http://localhost:3000/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: selectedIdea.imagePrompt, provider: 'gemini' })
      });
      const imgData = await imgRes.json();
      
      // 4. Render Reel
      setStatus('Rendering final video... (this may take a minute)');
      const renderRes = await fetch('http://localhost:3000/api/render-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl: imgData.image, 
          ttsAudio: ttsData.audio, 
          text: selectedIdea.quote 
        })
      });
      
      if (!renderRes.ok) throw new Error('Render failed');
      
      const blob = await renderRes.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setStatus('');
      
    } catch (error) {
      console.error(error);
      setStatus('An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <div className="bg-gradient"></div>
      
      <header className="glass-panel">
        <div className="logo">
          <div className="logo-icon">
            <Video size={24} color="#00f5d4" />
          </div>
          <h1>Faceless <span>Reels AI</span></h1>
        </div>
      </header>

      <main>
        <div className="layout">
          <div className="left-panel glass-panel">
            <div className="panel-header">
              <Settings size={20} />
              <h2>Campaign Settings</h2>
            </div>
            
            <form onSubmit={handleGenerate} className="settings-form">
              <div className="input-group">
                <label>What's the video about?</label>
                <textarea 
                  placeholder="e.g. Stoicism quotes, Motivation for gym, Finance tips..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="input-group">
                <label>Visual Style</label>
                <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}>
                  <option value="Cinematic and moody">Cinematic and Moody</option>
                  <option value="Neon cyberpunk">Neon Cyberpunk</option>
                  <option value="Minimalist black and white">Minimalist B&W</option>
                  <option value="Anime style">Anime Style</option>
                  <option value="Hyper-realistic 3D render">Hyper-realistic 3D</option>
                </select>
              </div>

              <div className="input-group">
                <label>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isGenerating || !topic}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    {status}
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Faceless Reel
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="right-panel glass-panel">
            <div className="video-container">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="result-video"
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <PlayCircle size={48} />
                  </div>
                  <h3>Your Masterpiece Awaits</h3>
                  <p>Fill in the settings and click generate to create a completely unique, AI-generated faceless reel in seconds.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

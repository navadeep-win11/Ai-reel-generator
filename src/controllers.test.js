jest.mock('fs');
jest.mock('./queue');

// Mock ffmpeg explicitly to prevent missing path error during require
jest.mock('fluent-ffmpeg', () => {
    const mock = jest.fn();
    mock.setFfmpegPath = jest.fn();
    return mock;
});
jest.mock('@ffmpeg-installer/ffmpeg', () => ({
    path: '/mock/path'
}));
jest.mock('./videoRenderer');

jest.mock('google-tts-api', () => ({
  getAudioBase64: jest.fn()
}));

const mockGroqCreate = jest.fn();
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockGroqCreate
        }
      }
    };
  });
});

const { renderReel, generateImage, generateThumbnail, generateIdeas, generateScript, generateTts } = require('./controllers');
const fs = require('fs');
const queue = require('./queue');
const { renderVideo } = require('./videoRenderer');
const googleTTS = require('google-tts-api');
const EventEmitter = require('events');

describe('Controllers', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('renderReel', () => {
    it('should return 400 if selectedIdea is missing', async () => {
      await renderReel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "selectedIdea is required" });
    });

    it('should stream the video successfully', async () => {
      req.body.selectedIdea = {
        imagePrompt: 'A cool prompt',
        quote: 'This is a quote'
      };

      googleTTS.getAudioBase64.mockResolvedValue('fakeBase64Audio');

      queue.add.mockImplementation(async (fn) => {
        return await fn();
      });

      renderVideo.mockResolvedValue('/path/to/fake/video.mp4');

      const mockStream = new EventEmitter();
      mockStream.pipe = jest.fn();
      fs.createReadStream.mockReturnValue(mockStream);
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue();

      await renderReel(req, res);

      expect(googleTTS.getAudioBase64).toHaveBeenCalledWith(
        'This is a quote',
        { lang: 'en', slow: false, host: 'https://translate.google.com' }
      );

      const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
      const formattedPrompt = encodeURIComponent(`A cool prompt, ${cinematicTags}`);
      const expectedImageUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

      expect(renderVideo).toHaveBeenCalledWith(
        expectedImageUrl,
        'data:audio/mp3;base64,fakeBase64Audio',
        'This is a quote'
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
      expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/fake/video.mp4');
      expect(mockStream.pipe).toHaveBeenCalledWith(res);

      // Trigger end event
      mockStream.emit('end');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/fake/video.mp4');
    });

    it('should handle stream error', async () => {
      req.body.selectedIdea = {
        imagePrompt: 'A cool prompt',
        quote: 'This is a quote'
      };

      googleTTS.getAudioBase64.mockResolvedValue('fakeBase64Audio');

      queue.add.mockImplementation(async (fn) => {
        return await fn();
      });

      renderVideo.mockResolvedValue('/path/to/fake/video.mp4');

      const mockStream = new EventEmitter();
      mockStream.pipe = jest.fn();
      fs.createReadStream.mockReturnValue(mockStream);
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue();

      res.headersSent = false;

      await renderReel(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');

      // Trigger error event
      mockStream.emit('error', new Error('Stream error'));

      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/fake/video.mp4');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle general errors and return 500', async () => {
      req.body.selectedIdea = {
        imagePrompt: 'A cool prompt',
        quote: 'This is a quote'
      };

      googleTTS.getAudioBase64.mockRejectedValue(new Error('TTS Error'));

      await renderReel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to render video',
        details: 'TTS Error'
      });
    });
  });

  describe('generateImage', () => {
    it('should return pollinations URL', async () => {
      req.body.imagePrompt = 'dog playing poker';
      await generateImage(req, res);

      const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
      const expectedPrompt = encodeURIComponent(`dog playing poker, ${cinematicTags}`);

      expect(res.json).toHaveBeenCalledWith({
        image: `https://image.pollinations.ai/prompt/${expectedPrompt}?width=1080&height=1920&nologo=true`
      });
    });
  });

  describe('generateThumbnail', () => {
    it('should return pollinations URL for thumbnail', async () => {
      req.body.quoteText = 'Hello World';
      req.body.visualStyle = 'cyberpunk';
      await generateThumbnail(req, res);

      const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
      const promptTemplate = `A striking, high-quality cyberpunk vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'Hello World'. ${cinematicTags}`;
      const expectedPrompt = encodeURIComponent(promptTemplate);

      expect(res.json).toHaveBeenCalledWith({
        image: `https://image.pollinations.ai/prompt/${expectedPrompt}?width=1080&height=1920&nologo=true`
      });
    });
  });

  describe('generateTts', () => {
    it('should return base64 audio', async () => {
      req.body.text = 'Hello World';
      googleTTS.getAudioBase64.mockResolvedValue('base64String');

      await generateTts(req, res);

      expect(googleTTS.getAudioBase64).toHaveBeenCalledWith('Hello World', {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
      });
      expect(res.json).toHaveBeenCalledWith({ base64Audio: 'base64String' });
    });

    it('should handle errors in TTS', async () => {
      req.body.text = 'Hello World';
      googleTTS.getAudioBase64.mockRejectedValue(new Error('TTS failed'));

      await generateTts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to generate TTS',
        details: 'TTS failed'
      });
    });
  });

  describe('generateScript', () => {
    it('should return generated script from Groq', async () => {
      req.body.quote = 'Be yourself';
      req.body.languageScript = 'English';
      req.body.duration = 15;

      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: '**Hook:** This is the hook.\nBody: This is the body.' } }]
      });

      await generateScript(req, res);

      expect(mockGroqCreate).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith('Hook: This is the hook.\nBody: This is the body.');
    });

    it('should handle errors in script generation', async () => {
      req.body.quote = 'Be yourself';

      mockGroqCreate.mockRejectedValue(new Error('Groq failed'));

      await generateScript(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to generate script',
        details: 'Groq failed'
      });
    });
  });

  describe('generateIdeas', () => {
    it('should return parsed ideas from Groq', async () => {
      req.body.topic = 'success';
      req.body.visualStyle = 'minimalist';

      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: '```json\n[{"quote": "idea"}]\n```' } }]
      });

      await generateIdeas(req, res);

      expect(mockGroqCreate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ideas: [{ quote: 'idea' }] });
    });

    it('should handle rate limit errors', async () => {
      req.body.topic = 'success';

      const error = new Error('Rate limit');
      error.status = 429;
      mockGroqCreate.mockRejectedValue(error);

      await generateIdeas(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API_RATE_LIMIT',
        message: 'Groq API quota exceeded. Please wait a minute or update your API key.'
      });
    });

    it('should handle other errors', async () => {
      req.body.topic = 'success';

      mockGroqCreate.mockRejectedValue(new Error('Some error'));

      await generateIdeas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to generate ideas',
        details: 'Some error'
      });
    });
  });
});

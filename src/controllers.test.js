const { generateIdeas } = require('./controllers');
const httpMocks = require('node-mocks-http');
const Groq = require('groq-sdk');

jest.mock('groq-sdk');
jest.mock('./queue');
jest.mock('./videoRenderer');

describe('generateIdeas Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  it('should successfully call Groq, strip markdown, and return cleaned JSON array', async () => {
    req.body = {
      visualStyle: 'cinematic',
      languageScript: 'english',
      topic: 'Space'
    };

    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: '```json\n[{"quote": "Test quote", "quoteTranslation": "Test trans", "imagePrompt": "Test prompt", "suggestedVoice": "Test voice"}]\n```'
          }
        }
      ]
    };

    const mockCreate = jest.fn().mockResolvedValue(mockGroqResponse);
    Groq.prototype.chat = { completions: { create: mockCreate } };

    await generateIdeas(req, res);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'llama-3.1-8b-instant',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Language: strictly english.')
          })
        ])
      })
    );

    expect(res.statusCode).toBe(200);
    const data = res._getJSONData();
    expect(data).toHaveProperty('ideas');
    expect(data.ideas).toBeInstanceOf(Array);
    expect(data.ideas[0]).toHaveProperty('quote', 'Test quote');
  });

  it('should handle "tenglish" language script correctly', async () => {
    req.body = {
      visualStyle: 'cinematic',
      languageScript: 'tenglish',
      topic: 'Space'
    };

    const mockGroqResponse = {
      choices: [{ message: { content: '[{"quote": "Test"}]' } }]
    };

    const mockCreate = jest.fn().mockResolvedValue(mockGroqResponse);
    Groq.prototype.chat = { completions: { create: mockCreate } };

    await generateIdeas(req, res);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Language: Telugu (written in English/Latin alphabet only).')
          })
        ])
      })
    );
  });

  it('should handle "hindi" language script correctly', async () => {
    req.body = {
      visualStyle: 'cinematic',
      languageScript: 'hindi',
      topic: 'Space'
    };

    const mockGroqResponse = {
      choices: [{ message: { content: '[{"quote": "Test"}]' } }]
    };

    const mockCreate = jest.fn().mockResolvedValue(mockGroqResponse);
    Groq.prototype.chat = { completions: { create: mockCreate } };

    await generateIdeas(req, res);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Language: Pure Hindi (no English words).')
          })
        ])
      })
    );
  });

  it('should handle Groq 429 rate limit error', async () => {
    req.body = { visualStyle: 'cinematic', languageScript: 'english', topic: 'Space' };

    const mockError = new Error('Rate limit exceeded');
    mockError.status = 429;

    const mockCreate = jest.fn().mockRejectedValue(mockError);
    Groq.prototype.chat = { completions: { create: mockCreate } };

    await generateIdeas(req, res);

    expect(res.statusCode).toBe(429);
    const data = res._getJSONData();
    expect(data.success).toBe(false);
    expect(data.error).toBe('API_RATE_LIMIT');
  });

  it('should handle general 500 exceptions', async () => {
    req.body = { visualStyle: 'cinematic', languageScript: 'english', topic: 'Space' };

    const mockError = new Error('Internal Server Error');

    const mockCreate = jest.fn().mockRejectedValue(mockError);
    Groq.prototype.chat = { completions: { create: mockCreate } };

    await generateIdeas(req, res);

    expect(res.statusCode).toBe(500);
    const data = res._getJSONData();
    expect(data.error).toBe('Failed to generate ideas');
    expect(data.details).toBe('Internal Server Error');
  });
});

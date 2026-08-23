const controllers = require('./controllers');
const googleTTS = require('google-tts-api');

// Mock external dependencies
jest.mock('google-tts-api', () => ({
    getAudioBase64: jest.fn(),
}));
jest.mock('axios');

// Mock components required by other controllers just in case they are initialized on require
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: jest.fn() } },
    }));
});
jest.mock('./queue', () => ({
    add: jest.fn(),
}));
jest.mock('./videoRenderer', () => ({
    renderVideo: jest.fn(),
}));

describe('Controllers', () => {
    describe('generateTts', () => {
        let req, res;

        beforeEach(() => {
            req = {
                body: {
                    text: 'Hello, this is a test text.',
                    voice: 'en-US' // Not used in implementation, but passed
                }
            };

            res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            jest.clearAllMocks();
        });

        it('should generate TTS audio base64 and return it successfully', async () => {
            const mockBase64Audio = 'mockBase64String12345';
            googleTTS.getAudioBase64.mockResolvedValue(mockBase64Audio);

            await controllers.generateTts(req, res);

            expect(googleTTS.getAudioBase64).toHaveBeenCalledWith('Hello, this is a test text.', {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
            });
            expect(res.json).toHaveBeenCalledWith({ base64Audio: mockBase64Audio });
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should truncate text to 200 characters when calling googleTTS', async () => {
            const longText = 'a'.repeat(250);
            req.body.text = longText;
            const mockBase64Audio = 'mockBase64String12345';
            googleTTS.getAudioBase64.mockResolvedValue(mockBase64Audio);

            await controllers.generateTts(req, res);

            expect(googleTTS.getAudioBase64).toHaveBeenCalledWith('a'.repeat(200), {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
            });
            expect(res.json).toHaveBeenCalledWith({ base64Audio: mockBase64Audio });
        });

        it('should handle errors and return a 500 status response', async () => {
            const errorMessage = 'Google TTS API Failed';
            googleTTS.getAudioBase64.mockRejectedValue(new Error(errorMessage));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await controllers.generateTts(req, res);

            expect(googleTTS.getAudioBase64).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('TTS generation error:', expect.any(Error));
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to generate TTS',
                details: errorMessage
            });

            consoleSpy.mockRestore();
        });
    });
});

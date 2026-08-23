// Mock environment variables
process.env.GROQ_API_KEY = 'test_key';

const { generateThumbnail } = require('../src/controllers');

// Mock dependencies
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => {
        return {
            chat: {
                completions: {
                    create: jest.fn().mockResolvedValue({
                        choices: [{ message: { content: 'mocked content' } }]
                    })
                }
            }
        };
    });
});

describe('generateThumbnail controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {}
        };
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly format and return a pollinations URL based on quoteText and visualStyle', async () => {
        mockReq.body = {
            quoteText: 'Never give up',
            visualStyle: 'dark fantasy'
        };

        const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
        const expectedPromptTemplate = `A striking, high-quality dark fantasy vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'Never give up'. ${cinematicTags}`;
        const expectedFormattedPrompt = encodeURIComponent(expectedPromptTemplate);
        const expectedUrl = `https://image.pollinations.ai/prompt/${expectedFormattedPrompt}?width=1080&height=1920&nologo=true`;

        await generateThumbnail(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ image: expectedUrl });
    });

    it('should handle special characters in quoteText and visualStyle correctly', async () => {
        mockReq.body = {
            quoteText: 'Stop & Go! @#%',
            visualStyle: 'neonpunk 2.0 / glitch'
        };

        const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
        const expectedPromptTemplate = `A striking, high-quality neonpunk 2.0 / glitch vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'Stop & Go! @#%'. ${cinematicTags}`;
        const expectedFormattedPrompt = encodeURIComponent(expectedPromptTemplate);
        const expectedUrl = `https://image.pollinations.ai/prompt/${expectedFormattedPrompt}?width=1080&height=1920&nologo=true`;

        await generateThumbnail(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ image: expectedUrl });
    });

    it('should handle undefined values gracefully (if controller allows it)', async () => {
        // Based on controller code, if they are undefined, they will be formatted as "undefined" string, which encodeURIComponent handles.
        // It's good to ensure it doesn't crash.
        mockReq.body = {};

        const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
        const expectedPromptTemplate = `A striking, high-quality undefined vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'undefined'. ${cinematicTags}`;
        const expectedFormattedPrompt = encodeURIComponent(expectedPromptTemplate);
        const expectedUrl = `https://image.pollinations.ai/prompt/${expectedFormattedPrompt}?width=1080&height=1920&nologo=true`;

        await generateThumbnail(mockReq, mockRes);

        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({ image: expectedUrl });
    });
});

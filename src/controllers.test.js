// Mock environment variables to prevent initialization errors in controllers.js
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-key';

const { generateImage, generateThumbnail } = require('./controllers');

describe('API Controllers', () => {
    describe('generateImage', () => {
        let req, res;

        beforeEach(() => {
            req = {
                body: {}
            };
            res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };
        });

        it('should generate an image URL with the provided prompt', async () => {
            req.body.imagePrompt = 'A futuristic cityscape';

            await generateImage(req, res);

            const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
            const fullPrompt = `A futuristic cityscape, ${cinematicTags}`;
            const formattedPrompt = encodeURIComponent(fullPrompt);
            const expectedUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

            expect(res.json).toHaveBeenCalledWith({ image: expectedUrl });
        });

        it('should handle undefined imagePrompt gracefully', async () => {
            req.body.imagePrompt = undefined;

            await generateImage(req, res);

            const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
            const fullPrompt = `undefined, ${cinematicTags}`;
            const formattedPrompt = encodeURIComponent(fullPrompt);
            const expectedUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

            expect(res.json).toHaveBeenCalledWith({ image: expectedUrl });
        });
    });

    describe('generateThumbnail', () => {
        let req, res;

        beforeEach(() => {
            req = {
                body: {}
            };
            res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };
        });

        it('should generate a thumbnail URL with the provided quote text and visual style', async () => {
            req.body.quoteText = 'Life is beautiful';
            req.body.visualStyle = 'minimalist';

            await generateThumbnail(req, res);

            const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
            const promptTemplate = `A striking, high-quality minimalist vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'Life is beautiful'. ${cinematicTags}`;
            const formattedPrompt = encodeURIComponent(promptTemplate);
            const expectedUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

            expect(res.json).toHaveBeenCalledWith({ image: expectedUrl });
        });

        it('should handle missing body properties gracefully', async () => {
            req.body = {};

            await generateThumbnail(req, res);

            const cinematicTags = "cinematic lighting, ultra-realistic textures, dark moody atmosphere, professional raw photography, motorcycle raw bokeh documentary aesthetic";
            const promptTemplate = `A striking, high-quality undefined vertical thumbnail background. In the center, clear and bold typography displaying the exact text: 'undefined'. ${cinematicTags}`;
            const formattedPrompt = encodeURIComponent(promptTemplate);
            const expectedUrl = `https://image.pollinations.ai/prompt/${formattedPrompt}?width=1080&height=1920&nologo=true`;

            expect(res.json).toHaveBeenCalledWith({ image: expectedUrl });
        });
    });
});

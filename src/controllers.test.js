const { generateScript } = require('./controllers');
const Groq = require('groq-sdk');

jest.mock('groq-sdk');

describe('generateScript', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            body: {
                quote: 'Test quote',
                languageScript: 'English',
                duration: 30
            }
        };
        res = {
            send: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should generate a script and return clean text without markdown', async () => {
        const mockGroqResponse = {
            choices: [
                {
                    message: {
                        content: '***Here is the script***'
                    }
                }
            ]
        };

        Groq.prototype.chat = {
            completions: {
                create: jest.fn().mockResolvedValue(mockGroqResponse)
            }
        };

        await generateScript(req, res);

        expect(Groq.prototype.chat.completions.create).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith('Here is the script');
    });

    it('should handle API errors and return a 500 status', async () => {
        Groq.prototype.chat = {
            completions: {
                create: jest.fn().mockRejectedValue(new Error('API failed'))
            }
        };

        // Spy on console.error to keep test output clean
        jest.spyOn(console, 'error').mockImplementation(() => {});

        await generateScript(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: "Failed to generate script",
            details: "API failed"
        });

        console.error.mockRestore();
    });
});

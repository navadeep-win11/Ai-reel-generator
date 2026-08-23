const fs = require('fs');
const axios = require('axios');
const videoRenderer = require('./videoRenderer');
const { downloadFile, saveBase64ToFile } = videoRenderer.__test__ || {};

jest.mock('axios');
jest.mock('fs');
jest.mock('fluent-ffmpeg', () => {
    const mockFfmpeg = () => {
        return {
            input: jest.fn().mockReturnThis(),
            loop: jest.fn().mockReturnThis(),
            videoCodec: jest.fn().mockReturnThis(),
            audioCodec: jest.fn().mockReturnThis(),
            outputOptions: jest.fn().mockReturnThis(),
            save: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
        };
    };
    mockFfmpeg.setFfmpegPath = jest.fn();
    return mockFfmpeg;
});
jest.mock('@ffmpeg-installer/ffmpeg', () => ({ path: '/mock/path/to/ffmpeg' }));
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('videoRenderer helper functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('downloadFile', () => {
        it('should successfully download and pipe data to a file', async () => {
            const mockUrl = 'http://example.com/image.jpg';
            const mockDestPath = '/tmp/test.jpg';

            // Create a mock stream
            const mockPipe = jest.fn();
            const mockResponseData = { pipe: mockPipe };
            axios.mockResolvedValueOnce({ data: mockResponseData });

            const mockFileStream = {
                on: jest.fn(),
                close: jest.fn()
            };

            // Mock fs.createWriteStream to return our mock file stream
            fs.createWriteStream.mockReturnValue(mockFileStream);

            // Mock the stream event 'finish' to instantly fire
            mockFileStream.on.mockImplementation((event, callback) => {
                if (event === 'finish') {
                    callback();
                }
            });

            await downloadFile(mockUrl, mockDestPath);

            expect(axios).toHaveBeenCalledWith({ url: mockUrl, responseType: 'stream' });
            expect(fs.createWriteStream).toHaveBeenCalledWith(mockDestPath);
            expect(mockPipe).toHaveBeenCalledWith(mockFileStream);
            expect(mockFileStream.close).toHaveBeenCalled();
        });

        it('should reject when stream encounters an error', async () => {
            const mockUrl = 'http://example.com/image.jpg';
            const mockDestPath = '/tmp/test.jpg';

            const mockPipe = jest.fn();
            axios.mockResolvedValueOnce({ data: { pipe: mockPipe } });

            const mockFileStream = {
                on: jest.fn(),
                close: jest.fn()
            };
            fs.createWriteStream.mockReturnValue(mockFileStream);

            const testError = new Error('Stream error');
            mockFileStream.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(testError);
                }
            });

            await expect(downloadFile(mockUrl, mockDestPath)).rejects.toThrow('Stream error');
        });
    });

    describe('saveBase64ToFile', () => {
        it('should strip data prefix and save base64 buffer to file', () => {
            const base64Str = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ='; // "Hello World"
            const destPath = '/tmp/test.jpg';

            saveBase64ToFile(base64Str, destPath);

            // Buffer.from('SGVsbG8gV29ybGQ=', 'base64') -> <Buffer 48 65 6c 6c 6f 20 57 6f 72 6c 64>
            expect(fs.writeFileSync).toHaveBeenCalled();
            const [callDestPath, callBuffer] = fs.writeFileSync.mock.calls[0];

            expect(callDestPath).toBe(destPath);
            expect(callBuffer).toBeInstanceOf(Buffer);
            expect(callBuffer.toString('utf8')).toBe('Hello World');
        });

        it('should handle string without data prefix correctly', () => {
            const base64Str = 'SGVsbG8gV29ybGQ=';
            const destPath = '/tmp/test2.jpg';

            saveBase64ToFile(base64Str, destPath);

            expect(fs.writeFileSync).toHaveBeenCalled();
            const callBuffer = fs.writeFileSync.mock.calls[0][1];
            expect(callBuffer.toString('utf8')).toBe('Hello World');
        });
    });
});

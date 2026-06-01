const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Helper to download remote files (like Pollinations.ai images)
async function downloadFile(url, destPath) {
    const response = await axios({ url, responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        response.data.pipe(file);
        file.on('finish', () => {
            file.close();
            resolve();
        });
        file.on('error', reject);
    });
}

// Helper to write raw base64 data to a file
function saveBase64ToFile(base64Str, destPath) {
    // Strip data prefix if present (e.g., data:audio/mp3;base64,...)
    const base64Data = base64Str.replace(/^data:\w+\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(destPath, buffer);
}

/**
 * Creates a video combining an image and TTS audio via FFmpeg.
 * Implements strict ephemeral storage and cleanup.
 */
exports.renderVideo = async (imageUrl, ttsAudio, text) => {
    const runId = uuidv4();
    const tempVideo = path.join(os.tmpdir(), `output-${runId}.mp4`);
    const tempImage = path.join(os.tmpdir(), `image-${runId}.jpg`);
    const tempAudio = path.join(os.tmpdir(), `audio-${runId}.mp3`);

    const tempFilesToClean = [tempImage, tempAudio];

    try {
        // 1. Prepare Image Input
        if (imageUrl.startsWith('http')) {
            await downloadFile(imageUrl, tempImage);
        } else if (imageUrl.startsWith('data:image')) {
            saveBase64ToFile(imageUrl, tempImage);
        }

        // 2. Prepare Audio Input
        if (ttsAudio.startsWith('http')) {
            await downloadFile(ttsAudio, tempAudio);
        } else {
            saveBase64ToFile(ttsAudio, tempAudio);
        }

        // 3. Render 1080x1920 .mp4 pipeline with fluent-ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(tempImage)
                .loop(1) // Loop the image infinitely
                .input(tempAudio) // Add the audio track
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    // Crucial: cuts the infinite image loop exactly when the shortest stream (audio) ends
                    '-shortest',
                    // Scale and crop to ensure strict 9:16 aspect ratio (1080x1920)
                    '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
                ])
                .save(tempVideo)
                .on('end', resolve)
                .on('error', reject);
        });

        // 4. Strict ephemeral cleanup (inputs)
        tempFilesToClean.forEach(f => {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
        });

        return tempVideo;
    } catch (error) {
        // Absolute cleanup on any failure
        [...tempFilesToClean, tempVideo].forEach(f => {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
        });
        throw error;
    }
};

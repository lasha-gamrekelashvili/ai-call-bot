import axios from 'axios';
import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.resolve('./public/audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

export async function getAgentReply(userText, history = []) {
    const res = await axios.post(
        `https://api.elevenlabs.io/v1/agents/${process.env.ELEVEN_AGENT_ID}/chat`,
        { text: userText, history },
        {
            headers: {
                'xi-api-key': process.env.ELEVEN_API_KEY,
                'Content-Type': 'application/json',
            },
        }
    );
    return res.data.text;
}

export async function generateSpeech(text, fileName) {
    const filePath = path.join(AUDIO_DIR, `${fileName}.mp3`);
    const res = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
        headers: {
            'xi-api-key': process.env.ELEVEN_API_KEY,
            'Content-Type': 'application/json',
        },
        data: {
            text,
            model_id: 'eleven_flash_v2',
            voice_settings: {
                stability: 0.4,
                similarity_boost: 0.8,
            },
        },
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/audio/${fileName}.mp3`));
        writer.on('error', reject);
    });
}

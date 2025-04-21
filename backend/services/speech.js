import { generateSpeech as gen } from '../utils/elevenlabs.js';
import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

export const generateSpeech = async (text, filename) => {
    const now = new Date().toISOString();
    const logLine = `[🗣️ AI][${now}][${filename}] ${text}`;

    console.log(logLine);

    fs.appendFileSync(
        path.join(logDir, 'ai-speech.log'),
        logLine + '\n'
    );

    return gen(text, filename);
};

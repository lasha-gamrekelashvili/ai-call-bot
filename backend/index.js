import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { OpenAI } from 'openai';
import pkg from 'twilio';
import { WebSocketServer } from 'ws';
import { attachTranscriberSocket } from './websockets/transcriber.js'

import campaignRoutes from './routes/campaigns.js';
import callRoutes from './routes/calls.js';

dotenv.config();

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const twilioClient = new pkg.Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cold Call App API',
      version: '1.0.0',
      description: 'API for AI-driven cold call campaigns',
    },
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/campaigns', campaignRoutes);
app.use('/', callRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`🚀 Server listening on port ${PORT}`)
);

const wss = new WebSocketServer({ server, path: '/media' });
attachTranscriberSocket(wss)



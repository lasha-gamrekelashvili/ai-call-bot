import express from 'express';
import dotenv from 'dotenv';
import pkg from 'twilio';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { OpenAI } from 'openai';
import mongoose from 'mongoose';
import Campaign from './models/Campaign.js';
import {generateSpeech } from './utils/elevenlabs.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

const { Twilio } = pkg;
const { twiml: { VoiceResponse } } = pkg;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

const callMap = new Map();

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Cold Call App API',
            version: '1.0.0',
            description: 'API for AI-driven cold call campaigns',
        },
    },
    apis: ['./index.js'],
};
app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerJsdoc(swaggerOptions))
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Campaign:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         ownerId:
 *           type: string
 *         name:
 *           type: string
 *         systemPrompt:
 *           type: string
 *         initialGreeting:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   - name: Campaigns
 *     description: CRUD operations for cold call campaigns
 */

/**
 * @swagger
 * /campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags:
 *       - Campaigns
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - systemPrompt
 *               - initialGreeting
 *             properties:
 *               name:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               initialGreeting:
 *                 type: string
 *     responses:
 *       201:
 *         description: Campaign created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 */
app.post('/campaigns', async (req, res) => {
    console.log('📑 [Campaigns] POST /campaigns', req.body);
    const { name, systemPrompt, initialGreeting } = req.body;
    const campaign = await Campaign.create({
        ownerId: 'default',
        name,
        systemPrompt,
        initialGreeting
    });
    console.log('✅ Created campaign:', campaign._id);
    res.status(201).json(campaign);
});

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Retrieve all campaigns
 *     tags:
 *       - Campaigns
 *     responses:
 *       200:
 *         description: A list of campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 */
app.get('/campaigns', async (_req, res) => {
    console.log('📑 [Campaigns] GET /campaigns');
    const list = await Campaign.find();
    res.json(list);
});

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Retrieve a single campaign by ID
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The campaign ID
 *     responses:
 *       200:
 *         description: A single campaign
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
app.get('/campaigns/:id', async (req, res) => {
    console.log(`📑 [Campaigns] GET /campaigns/${req.params.id}`);
    const camp = await Campaign.findById(req.params.id);
    if (!camp) {
        console.warn('❌ Campaign not found:', req.params.id);
        return res.status(404).send('Campaign not found');
    }
    res.json(camp);
});

/**
 * @swagger
 * /campaigns/{id}:
 *   put:
 *     summary: Update an existing campaign
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               initialGreeting:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated campaign
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 */
app.put('/campaigns/:id', async (req, res) => {
    console.log(`📑 [Campaigns] PUT /campaigns/${req.params.id}`, req.body);
    const camp = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!camp) {
        console.warn('❌ Campaign not found for update:', req.params.id);
        return res.status(404).send('Campaign not found');
    }
    console.log('✅ Updated campaign:', camp._id);
    res.json(camp);
});

/**
 * @swagger
 * /campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The campaign ID
 *     responses:
 *       204:
 *         description: Campaign deleted (no content)
 *       404:
 *         description: Campaign not found
 */
app.delete('/campaigns/:id', async (req, res) => {
    console.log(`📑 [Campaigns] DELETE /campaigns/${req.params.id}`);
    const result = await Campaign.findByIdAndDelete(req.params.id);
    if (!result) {
        console.warn('❌ Campaign not found for delete:', req.params.id);
        return res.status(404).send('Campaign not found');
    }
    console.log('✅ Deleted campaign:', req.params.id);
    res.status(204).send();
});

/**
 * @swagger
 * /call:
 *   post:
 *     summary: Initiate a call for a campaign
 *     tags:
 *       - Campaigns
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - number
 *               - campaignId
 *             properties:
 *               number:
 *                 type: string
 *               campaignId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call started
 */
app.post('/call', async (req, res) => {
    const { number, campaignId } = req.body;
    console.log('📞 [Call] Requested to', number, 'for campaign', campaignId);

    if (!number || !campaignId) {
        console.warn('⚠️ [Call] Missing number or campaignId');
        return res.status(400).send('`number` and `campaignId` required');
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign || !campaign.isActive) {
        console.warn('❌ [Call] Campaign not found or inactive:', campaignId);
        return res.status(404).send('Campaign not found or inactive');
    }

    try {
        const call = await client.calls.create({
            to: number,
            from: process.env.TWILIO_PHONE_NUMBER,
            url: `${process.env.PUBLIC_URL}/voice?campaignId=${campaignId}`,
            statusCallback: `${process.env.PUBLIC_URL}/status?campaignId=${campaignId}`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            method: 'POST'
        });
        console.log('✅ [Call] Initiated:', call.sid);
        res.send(`Call started: ${call.sid}`);
    } catch (err) {
        console.error('❌ [Call] Twilio error:', err);
        res.status(500).send('Failed to start call');
    }
});

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Twilio status callback for calls
 *     tags:
 *       - Campaigns
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Logged status
 */
app.post('/status', (req, res) => {
    const { campaignId } = req.query;
    const { CallSid, CallStatus, Timestamp } = req.body;
    console.log(`📈 [Status][${campaignId}] Call ${CallSid} status: ${CallStatus} timestamp: ${Timestamp}`);


    if (CallStatus === 'completed') {
        cleanupCall(CallSid);
    }

    res.sendStatus(200);
});

/**
 * Voice webhook: plays initial greeting and sets up gather
 */
app.post('/voice', async (req, res) => {
    const { campaignId } = req.query;
    const callSid = req.body.CallSid;
    const vr = new VoiceResponse();

    const camp = await Campaign.findById(campaignId);
    if (!camp) {
        vr.say('Sorry, campaign not found. Goodbye.');
        return res.type('text/xml').send(vr.toString());
    }

    callMap.set(callSid, {
        history: [
            { role: 'assistant', content: camp.initialGreeting },
        ],
        silenceCount: 0,
    });

    console.log(`🤖 [Voice][${callSid}] Initial greeting:`, camp.initialGreeting);

    const fileName = `${callSid}-greeting`;
    const audioUrl = await generateSpeech(camp.initialGreeting, fileName);

    const gather = vr.gather({
        input: 'speech',
        speechTimeout: 'auto',
        timeout: 6,
        action: `/gather?campaignId=${campaignId}`,
        actionOnEmptyResult: true,
        method: 'POST',
    });

    gather.play(`${process.env.PUBLIC_URL}${audioUrl}`);
    res.type('text/xml').send(vr.toString());
});


/**
 * Gather webhook: classify intent, branch, or continue conversation
 */
app.post('/gather', async (req, res) => {
    const { campaignId } = req.query;
    const callSid = req.body.CallSid;
    const userText = (req.body?.SpeechResult || '').trim();
    const isSilent = !userText;

    const vr = new VoiceResponse();
    console.log(`🎙️ [Gather][${callSid}] Customer:`, userText || '(silence)');

    const state = callMap.get(callSid);
    if (!state) {
        vr.say('Session expired. Goodbye.');
        vr.hangup();
        return res.type('text/xml').send(vr.toString());
    }

    state.history.push({ role: 'user', content: userText });
    if (state.history.length > 12) {
        state.history.splice(0, state.history.length - 12);
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        vr.say('Campaign not found. Goodbye.');
        vr.hangup();
        return res.type('text/xml').send(vr.toString());
    }

    if (isSilent) {
        state.silenceCount = (state.silenceCount || 0) + 1;
    
        const fileName = `${callSid}-silence-${state.silenceCount}`;
        let messageText;
    
        if (state.silenceCount >= 2) {
            messageText = "I didn’t catch that again. Goodbye.";
            const audioUrl = await generateSpeech(messageText, fileName);
            vr.play(`${process.env.PUBLIC_URL}${audioUrl}`);
            vr.hangup();
            cleanupCall(callSid);
            return res.type('text/xml').send(vr.toString());
        }
    
        messageText = "Sorry, I didn’t catch that. Could you repeat?";
        const audioUrl = await generateSpeech(messageText, fileName);
    
        const gather = vr.gather({
            input: 'speech',
            speechTimeout: 'auto',
            timeout: 6,
            action: `/gather?campaignId=${campaignId}`,
            actionOnEmptyResult: true,
            method: 'POST',
        });
    
        gather.play(`${process.env.PUBLIC_URL}${audioUrl}`);
        return res.type('text/xml').send(vr.toString());
    }
    

    const convo = [
        { role: 'system', content: campaign.systemPrompt },
        ...state.history,
    ];

    let assistantReply = '';
    try {
        const chatRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 120,
            messages: convo,
        });
        assistantReply = chatRes.choices[0].message.content.trim();
        state.history.push({ role: 'assistant', content: assistantReply });
    } catch (err) {
        console.error('❌ GPT assistant error:', err);
        vr.say('Something went wrong. Goodbye.');
        vr.hangup();
        cleanupCall(callSid);
        return res.type('text/xml').send(vr.toString());
    }

    const lastCustomerMsg = state.history
        .slice()
        .reverse()
        .find((entry) => entry.role === 'user')?.content;

    let intent = 'neutral';
    try {
        const intentRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 5,
            messages: [
                {
                    role: 'system',
                    content: `
  You are an intent classifier.

  Based ONLY on the customer's last message:
  "${lastCustomerMsg}"

  Classify their intent with STRICT criteria:
  - "interested" = customer clearly wants to be contacted or proceed
  - "not_interested" = they clearly decline or end the conversation
  - "neutral" = vague answers or curiosity

  Respond with ONLY one word: interested, not_interested, or neutral.
                    `.trim(),
                },
            ],
        });

        const rawIntent = intentRes.choices[0].message.content.trim().toLowerCase();
        const validIntents = ['interested', 'not_interested', 'neutral'];
        intent = validIntents.includes(rawIntent) ? rawIntent : 'neutral';
        console.log(`📌 [Gather][${callSid}] Classified intent:`, intent);
    } catch (err) {
        console.warn('⚠️ GPT intent classification failed:', err);
    }

    let responseText = assistantReply;
    if (intent === 'interested') {
        responseText = 'Perfect—someone from our team will contact you shortly. Thank you and goodbye!';
        cleanupCall(callSid);
    } else if (intent === 'not_interested') {
        responseText = 'Understood. Thank you for your time. Goodbye.';
        cleanupCall(callSid);
    }

    const fileName = `${callSid}-${Date.now()}`;
    const audioUrl = await generateSpeech(responseText, fileName);

    console.log(`🤖 [Gather][${callSid}] AI reply:`, responseText);

    const gather = intent === 'neutral'
        ? vr.gather({
            input: 'speech',
            speechTimeout: 'auto',
            timeout: 6,
            action: `/gather?campaignId=${campaignId}`,
            actionOnEmptyResult: true,
            method: 'POST',
        })
        : vr;

    gather.play(`${process.env.PUBLIC_URL}${audioUrl}`);

    if (intent !== 'neutral') {
        gather.hangup();
    }

    return res.type('text/xml').send(vr.toString());
});


function cleanupCall(callSid) {
    if (callMap.delete(callSid)) {
        console.log(`🧹 [Cleanup] Removed in‑memory state for ${callSid}`);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));

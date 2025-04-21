import { openai, twilioClient } from '../index.js';
import { generateSpeech } from '../services/speech.js';
import Campaign from '../models/Campaign.js';
import pkg from 'twilio';
const { twiml } = pkg;

const callMap = new Map();

export async function initiateCall(req, res) {
    const { number, campaignId } = req.body;
    if (!number || !campaignId)
        return res.status(400).send('`number` and `campaignId` required');

    const camp = await Campaign.findById(campaignId);
    if (!camp?.isActive)
        return res.status(404).send('Campaign not found or inactive');

    try {
        const call = await twilioClient.calls.create({
            to: number,
            from: process.env.TWILIO_PHONE_NUMBER,
            url: `${process.env.PUBLIC_URL}/voice?campaignId=${campaignId}`,
            statusCallback: `${process.env.PUBLIC_URL}/status?campaignId=${campaignId}`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            method: 'POST',
        });
        res.send(`Call started: ${call.sid}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to start call');
    }
}

// export async function voiceWebhook(req, res) {
//     const { campaignId } = req.query;
//     const callSid = req.body.CallSid;
//     const camp = await Campaign.findById(campaignId);
//     const vr = new twiml.VoiceResponse();

//     if (!camp) {
//         vr.say('Sorry, campaign not found. Goodbye.');
//         return res.type('text/xml').send(vr.toString());
//     }

//     const greeting = camp.initialGreeting;
//     callMap.set(callSid, { history: [{ role: 'assistant', content: greeting }], silenceCount: 0 });
//     const fileName = `${callSid}-greeting`;
//     const url = await generateSpeech(greeting, fileName);

//     vr.play(`${process.env.PUBLIC_URL}${url}`);

//     vr.connect().stream({
//         url: `wss://${process.env.PUBLIC_URL.replace(/^https?:\/\//, '')}/media?callSid=${callSid}&campaignId=${campaignId}`,
//         tracks: 'inbound',
//         statusCallback: `${process.env.PUBLIC_URL}/stream-status?callSid=${callSid}`,
//       });
      

//     res.type('text/xml').send(vr.toString());
// }


export async function voiceWebhook(req, res) {
    const { campaignId } = req.query;
    const callSid = req.body.CallSid;
    const camp = await Campaign.findById(campaignId);
    const vr = new twiml.VoiceResponse();

    if (!camp) {
        vr.say('Sorry, campaign not found. Goodbye.');
        return res.type('text/xml').send(vr.toString());
    }

    const greeting = camp.initialGreeting;
    callMap.set(callSid, { history: [{ role: 'assistant', content: greeting }], silenceCount: 0 });
    const fileName = `${callSid}-greeting`;
    const url = await generateSpeech(greeting, fileName);

    const gather = vr.gather({ input: 'speech', speechTimeout: 2, timeout: 6, action: `/gather?campaignId=${campaignId}`, method: 'POST', actionOnEmptyResult: true });
    gather.play(`${process.env.PUBLIC_URL}${url}`);

    res.type('text/xml').send(vr.toString());
}


export async function gatherWebhook(req, res) {
    const { campaignId } = req.query;
    const callSid = req.body.CallSid;
    const userText = (req.body.SpeechResult || '').trim();
    const isSilent = !userText;
    const vr = new twiml.VoiceResponse();

    const state = callMap.get(callSid);
    if (!state) {
        vr.say('Session expired. Goodbye.');
        vr.hangup();
        return res.type('text/xml').send(vr.toString());
    }

    console.log(`🎙️ [Gather][${callSid}] Customer said: "${userText}"`);
    state.history.push({ role: 'user', content: userText });
    if (state.history.length > 12) state.history.splice(0, state.history.length - 12);

    if (isSilent) {
        state.silenceCount = (state.silenceCount || 0) + 1;

        const fileName = `${callSid}-silence-${state.silenceCount}`;
        const messageText = state.silenceCount >= 2
            ? "I didn’t catch that again. Goodbye."
            : "Sorry, I didn’t catch that. Could you repeat?";
        const audioUrl = await generateSpeech(messageText, fileName);

        if (state.silenceCount >= 2) {
            vr.play(`${process.env.PUBLIC_URL}${audioUrl}`);
            vr.hangup();
            cleanupCall(callSid);
        } else {
            const gather = vr.gather({
                input: 'speech',
                speechTimeout: 'auto',
                timeout: 6,
                action: `/gather?campaignId=${campaignId}`,
                actionOnEmptyResult: true,
                method: 'POST',
            });
            gather.play(`${process.env.PUBLIC_URL}${audioUrl}`);
        }

        return res.type('text/xml').send(vr.toString());
    }


    const campaign = await Campaign.findById(campaignId);
    const messages = [
        { role: 'system', content: campaign.systemPrompt },
        ...state.history,
    ];

    let intent = 'neutral';
    try {
        const lastMsg = state.history.slice().reverse().find(e => e.role === 'user').content;
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
"${lastMsg}"
Classify intent strictly:
- "interested": clearly wants to proceed
- "not_interested": clearly declines
- "neutral": otherwise
Respond with one word: interested, not_interested, or neutral.
                    `.trim()
                }
            ]
        });
        const raw = intentRes.choices[0].message.content.trim().toLowerCase();
        intent = ['interested', 'not_interested', 'neutral'].includes(raw) ? raw : 'neutral';

        console.log(`🧠 [Intent][${callSid}] Classified as: ${intent}`);
    } catch (e) {
        console.warn('Intent classification failed', e);
    }

    let responseText;
    if (intent === 'interested') {
        responseText = 'Perfect—someone from our team will contact you shortly. Thank you and goodbye!';
    } else if (intent === 'not_interested') {
        responseText = 'Understood. Thank you for your time. Goodbye.';
    } else {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                temperature: 0.7,
                max_tokens: 120,
                messages,
            });
            responseText = response.choices[0].message.content.trim();
            state.history.push({ role: 'assistant', content: responseText });
        } catch (err) {
            console.error(err);
            vr.say('Something went wrong. Goodbye.');
            vr.hangup();
            cleanupCall(callSid);
            return res.type('text/xml').send(vr.toString());
        }
    }

    const file = `${callSid}-${Date.now()}`;
    const audioUrl = await generateSpeech(responseText, file);

    if (intent === 'neutral') {
        const g = vr.gather({
            input: 'speech',
            speechTimeout: 2,
            timeout: 6,
            action: `/gather?campaignId=${campaignId}`,
            method: 'POST',
            actionOnEmptyResult: true,
        });
        g.play(`${process.env.PUBLIC_URL}${audioUrl}`);
    } else {
        vr.play(`${process.env.PUBLIC_URL}${audioUrl}`);
        vr.hangup();
        cleanupCall(callSid);
    }

    return res.type('text/xml').send(vr.toString());
}

export function streamStatusWebhook(req, res) {
    const { CallSid, StreamSid, StreamStatus } = req.body;
    console.log(`📶 [Stream Status] CallSid: ${CallSid}, StreamSid: ${StreamSid}, Status: ${StreamStatus}`);
    res.sendStatus(200);
}

export function statusCallback(req, res) {
    const { campaignId } = req.query;
    const { CallSid, CallStatus } = req.body;
    console.log(`📈 [Status][${campaignId}] ${CallSid} → ${CallStatus}`);
    if (CallStatus === 'completed') cleanupCall(CallSid);
    res.sendStatus(200);
}

function cleanupCall(callSid) {
    if (callMap.delete(callSid)) console.log(`🧹 Cleaned up ${callSid}`);
}
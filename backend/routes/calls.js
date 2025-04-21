import { Router } from 'express';
import * as ctrl from '../controllers/calls.js';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Calls
 *   description: Endpoints for initiating and handling calls
 */

/**
 * @swagger
 * /call:
 *   post:
 *     summary: Start a call
 *     tags: [Calls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [number, campaignId]
 *             properties:
 *               number:
 *                 type: string
 *               campaignId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Call started
 */
router.post('/call', ctrl.initiateCall);

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Twilio status callback
 *     tags: [Calls]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Logged
 */
router.post('/status', ctrl.statusCallback);

/**
 * @swagger
 * /stream-status:
 *   post:
 *     summary: Twilio stream status callback (connect stream events)
 *     tags: [Calls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               CallSid:
 *                 type: string
 *               StreamSid:
 *                 type: string
 *               StreamStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stream status received
 */
router.post('/stream-status', ctrl.streamStatusWebhook);

/**
 * @swagger
 * /voice:
 *   post:
 *     summary: Twilio voice webhook
 *     tags: [Calls]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Returns TwiML
 */
router.post('/voice', ctrl.voiceWebhook);

/**
 * @swagger
 * /gather:
 *   post:
 *     summary: Twilio gather webhook
 *     tags: [Calls]
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Returns TwiML
 */
router.post('/gather', ctrl.gatherWebhook);

export default router;
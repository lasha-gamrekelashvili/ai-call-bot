import { Router } from 'express';
import * as ctrl from '../controllers/campaigns.js';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: CRUD for cold call campaigns
 */

/**
 * @swagger
 * /campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, systemPrompt, initialGreeting]
 *             properties:
 *               name:
 *                 type: string
 *               systemPrompt:
 *                 type: string
 *               initialGreeting:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', ctrl.createCampaign);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', ctrl.getAllCampaigns);

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.get('/:id', ctrl.getCampaignById);

/**
 * @swagger
 * /campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
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
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.put('/:id', ctrl.updateCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     tags: [Campaigns]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       204:
 *         description: No Content
 */
router.delete('/:id', ctrl.deleteCampaign);

export default router;
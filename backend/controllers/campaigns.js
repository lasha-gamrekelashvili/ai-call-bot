import Campaign from '../models/Campaign.js';

export async function createCampaign(req, res) {
  const { name, systemPrompt, initialGreeting } = req.body;
  const camp = await Campaign.create({ ownerId: 'default', name, systemPrompt, initialGreeting });
  res.status(201).json(camp);
}

export async function getAllCampaigns(_req, res) {
  const list = await Campaign.find();
  res.json(list);
}

export async function getCampaignById(req, res) {
  const camp = await Campaign.findById(req.params.id);
  if (!camp) return res.status(404).send('Campaign not found');
  res.json(camp);
}

export async function updateCampaign(req, res) {
  const camp = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!camp) return res.status(404).send('Campaign not found');
  res.json(camp);
}

export async function deleteCampaign(req, res) {
  const result = await Campaign.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).send('Campaign not found');
  res.status(204).send();
}
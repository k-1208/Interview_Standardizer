import { retrieveBot, type RecallWebhookPayload, type RecallWebhookResult } from './zoomBot.service.js';

export const handleRecallWebhook = async (payload: RecallWebhookPayload): Promise<RecallWebhookResult> => {
    console.log('Received Recall Webhook Payload:', JSON.stringify(payload, null, 2));
	return retrieveBot(payload);
};

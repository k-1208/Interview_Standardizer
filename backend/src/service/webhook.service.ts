import { retrieveBot, type RecallWebhookPayload, type RecallWebhookResult } from './zoomBot.service.js';

export const handleRecallWebhook = async (payload: RecallWebhookPayload): Promise<RecallWebhookResult> => {
    // Metadata only: payloads can carry meeting/transcript details.
    console.log('Received Recall webhook', {
        event: payload?.event,
        botId: payload?.data?.bot?.id,
        code: payload?.data?.data?.code,
    });
	return retrieveBot(payload);
};

import { makeChatHandler } from '@/lib/mcp/chat-handler';
import { getDefaultModel, getModelById, modelConfigs, type ModelId } from '@/lib/ai-providers';

export const maxDuration = 30;

export const POST = makeChatHandler({
  resolveModel: (requested?: string) => {
    if (typeof requested === 'string' && requested in modelConfigs) {
      return getModelById(requested as ModelId);
    }
    return getDefaultModel();
  },
  system: 'You are a helpful assistant. Prefer tool calls when appropriate.',
  maxSteps: 5,
}); 
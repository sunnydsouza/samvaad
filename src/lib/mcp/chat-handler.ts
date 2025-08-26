import { streamText, convertToModelMessages, type UIMessage, stepCountIs, type ToolSet } from 'ai';
import type { ModelId } from '@/lib/ai-providers';
import { getDefaultModel, getModelById, modelConfigs } from '@/lib/ai-providers';
import { createMCPManager } from './manager';
import type { MCPKitConfig } from './config';

export interface ChatHandlerOptions {
  resolveModel?: (requested?: string) => ReturnType<typeof getDefaultModel>;
  system?: string;
  maxSteps?: number;
  config?: MCPKitConfig | null;
}

type AugmentedTool = { mcpNamespace?: string } & Record<string, unknown>;

export function makeChatHandler(opts: ChatHandlerOptions = {}) {
  const systemPrompt = opts.system || 'You are a helpful assistant.';
  const maxSteps = typeof opts.maxSteps === 'number' ? opts.maxSteps : 5;

  return async function POST(req: Request) {
    try {
      const { messages, model: requestedModel, serverNamespace }: { messages: UIMessage[]; model?: string; serverNamespace?: string | null } = await req.json();

      let model = getDefaultModel();
      if (typeof requestedModel === 'string' && requestedModel in modelConfigs) {
        model = getModelById(requestedModel as ModelId);
      } else if (typeof opts.resolveModel === 'function') {
        const resolved = opts.resolveModel(requestedModel);
        model = resolved;
      }

      const manager = await createMCPManager({ config: opts.config || null });

      let allTools: Record<string, AugmentedTool> = {};
      try {
        allTools = (await manager.getTools()) as Record<string, AugmentedTool>;
      } catch {
        allTools = {};
      }

      let tools: Record<string, AugmentedTool> = allTools;
      if (serverNamespace) {
        tools = Object.fromEntries(Object.entries(allTools).filter(([_, v]) => v?.mcpNamespace === serverNamespace));
      }

      if (process.env.MCP_DEBUG) {
        const byServer: Record<string, number> = {};
        for (const [, v] of Object.entries(tools)) {
          const ns = v?.mcpNamespace || 'unknown';
          byServer[ns] = (byServer[ns] || 0) + 1;
        }
        console.log('[MCP_DEBUG] tools discovered:', byServer);
      }

      const result = await streamText({
        model,
        system: systemPrompt,
        messages: convertToModelMessages(messages),
        tools: tools as unknown as ToolSet,
        stopWhen: stepCountIs(maxSteps),
      });

      return result.toUIMessageStreamResponse({
        onFinish: async () => {
          try { await manager.closeAll(); } catch {}
        },
        onError: (error) => {
          if (error == null) return 'unknown error';
          if (typeof error === 'string') return error;
          if (error instanceof Error) return error.message;
          try { return JSON.stringify(error); } catch { return 'error'; }
        },
        messageMetadata: ({ part }) => {
          if (part.type === 'finish') {
            const usage = part.totalUsage;
            return usage ? { totalUsage: usage, totalTokens: usage.totalTokens } : undefined;
          }
          return undefined;
        },
      });
    } catch (error) {
      console.error('Chat API error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to process chat request',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
} 
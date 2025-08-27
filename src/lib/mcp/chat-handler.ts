import { streamText, type UIMessage, stepCountIs, type ToolSet, type ModelMessage, type TextPart, type ImagePart, type FilePart } from 'ai';
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

function makeOut(messages: UIMessage[], model?: string, serverNamespace?: string | null) {
  const out: { messages: UIMessage[]; model?: string; serverNamespace?: string | null } = { messages };
  if (typeof model === 'string') out.model = model;
  if (serverNamespace !== undefined) out.serverNamespace = serverNamespace;
  return out;
}

async function parseBody(req: Request): Promise<{ messages: UIMessage[]; model?: string; serverNamespace?: string | null }> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    const { messages, model, serverNamespace } = (body || {}) as { messages?: UIMessage[]; model?: string; serverNamespace?: string | null };
    if (Array.isArray(messages)) return makeOut(messages, model, serverNamespace);

    const text = (body && (body as { text?: string }).text) || '';
    const content = (body && (body as { content?: unknown }).content) as unknown;
    const parts = Array.isArray(content) ? (content as Array<{ type: string }>) : (text ? [{ type: 'text', text }] : []);
    const fallback: UIMessage[] = parts.length > 0 ? [{ id: 'u1', role: 'user', content: parts as never[] }] as unknown as UIMessage[] : [];
    return makeOut(fallback, model, serverNamespace);
  }

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData();
    const raw = fd.get('messages') as string | null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { messages?: UIMessage[]; model?: string; serverNamespace?: string | null };
        if (Array.isArray(parsed?.messages)) return makeOut(parsed.messages as UIMessage[], parsed.model, parsed.serverNamespace);
      } catch {}
    }
    const content = fd.get('content');
    const text = fd.get('text');
    const parts = content ? (JSON.parse(String(content)) as Array<{ type: string }>) : (text ? [{ type: 'text', text: String(text) }] : []);
    const fallback: UIMessage[] = parts.length > 0 ? [{ id: 'u1', role: 'user', content: parts as never[] }] as unknown as UIMessage[] : [];
    const model = (fd.get('model') as string) || undefined;
    const serverNamespace = (fd.get('serverNamespace') as string) || undefined;
    return makeOut(fallback, model, serverNamespace);
  }

  try {
    const body = await req.json();
    const { messages, model, serverNamespace } = (body || {}) as { messages?: UIMessage[]; model?: string; serverNamespace?: string | null };
    if (Array.isArray(messages)) return makeOut(messages, model, serverNamespace);
  } catch {}
  return { messages: [] };
}

function normalizeMessages(input: UIMessage[]): UIMessage[] {
  return (Array.isArray(input) ? input : []).map((m, idx) => {
    const mm = m as unknown as { role?: string; content?: unknown; parts?: unknown };
    let content: unknown = mm.content;
    if (Array.isArray(mm.parts) && !Array.isArray(mm.content)) {
      content = mm.parts as unknown[];
    }
    if (!Array.isArray(content) && typeof content !== 'string') {
      content = [] as unknown[];
    }
    return { id: (m as { id?: string }).id ?? `msg-${idx}`, role: (mm.role as string) || 'user', content } as unknown as UIMessage;
  });
}

function toModelMessages(uiMessages: UIMessage[]): ModelMessage[] {
  const castText = (p: unknown): TextPart | null => {
    const r = p as { type?: string; text?: string };
    return r && r.type === 'text' && typeof r.text === 'string' ? { type: 'text', text: r.text } : null;
  };
  const castImage = (p: unknown): ImagePart | null => {
    const r = p as { type?: string; image?: string | URL; mediaType?: string };
    return r && r.type === 'image' && r.image && typeof r.mediaType === 'string' ? { type: 'image', image: r.image as string | URL, mediaType: r.mediaType } : null;
  };
  const castFile = (p: unknown): FilePart | null => {
    const r = p as { type?: string; data?: string | URL; mediaType?: string; filename?: string };
    return r && r.type === 'file' && r.data && typeof r.mediaType === 'string' ? { type: 'file', data: r.data as string | URL, mediaType: r.mediaType, filename: r.filename ?? 'file' } : null;
  };

  return uiMessages
    .filter((m) => {
      const role = (m as unknown as { role?: string }).role;
      return role === 'user' || role === 'assistant' || role === 'system';
    })
    .map((m) => {
      const role = (m as unknown as { role?: string }).role as string;
      const c = (m as unknown as { content?: unknown }).content;

      if (role === 'system') {
        const text = typeof c === 'string' ? c : Array.isArray(c) ? (c.map((p) => (castText(p)?.text || '')).join('\n')) : '';
        return { role: 'system', content: text };
      }

      if (role === 'assistant') {
        if (typeof c === 'string') return { role: 'assistant', content: c };
        const arr = Array.isArray(c) ? c : [];
        const parts = arr.map((p) => castText(p) || castFile(p)).filter((p): p is TextPart | FilePart => !!p);
        return { role: 'assistant', content: parts };
      }

      // default to user
      if (typeof c === 'string') return { role: 'user', content: c };
      const arr = Array.isArray(c) ? c : [];
      const parts = arr.map((p) => castText(p) || castImage(p) || castFile(p)).filter((p): p is TextPart | ImagePart | FilePart => !!p);
      return { role: 'user', content: parts };
    });
}

export function makeChatHandler(opts: ChatHandlerOptions = {}) {
  const systemPrompt = opts.system || 'You are a helpful assistant.';
  const maxSteps = typeof opts.maxSteps === 'number' ? opts.maxSteps : 5;

  return async function POST(req: Request) {
    try {
      const { messages, model: requestedModel, serverNamespace } = await parseBody(req);

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

      const normalized = normalizeMessages(messages);
      const modelMessages = toModelMessages(normalized);

      const result = await streamText({
        model,
        system: systemPrompt,
        messages: modelMessages,
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
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageRenderer } from '@/components/message-renderer';
import { ModelSelector } from '@/components/model-selector';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, Settings as SettingsIcon, X, AlertCircle } from 'lucide-react';

export interface ChatCoreProps {
  apiPath?: string; // default '/api/chat'
  initialModel?: string; // model id
  header?: React.ReactNode; // deprecated - no longer used
  footer?: React.ReactNode; // optional extra footer content
  onRequestClose?: () => void;
  enableAttachments?: boolean | undefined; // feature toggle
  maxAttachmentMB?: number | undefined; // override default 10MB
}

type ServerInfo = { name: string; ok: boolean; tools?: number; toolNames?: string[] };

const ENV_ENABLE_ATTACHMENTS = String(process.env.NEXT_PUBLIC_ENABLE_ATTACHMENTS || '').toLowerCase() === 'true';

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

function isAccepted(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatCore({ apiPath = '/api/chat', initialModel = 'openai:gpt-5', footer, onRequestClose, enableAttachments, maxAttachmentMB }: ChatCoreProps) {
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [view, setView] = useState<'chat' | 'settings'>('chat');

  const attachmentsEnabled = (typeof enableAttachments === 'boolean' ? enableAttachments : ENV_ENABLE_ATTACHMENTS);
  const sizeLimitMB = typeof maxAttachmentMB === 'number' && maxAttachmentMB > 0 ? maxAttachmentMB : 10; // default 10MB
  const sizeLimitBytes = sizeLimitMB * 1024 * 1024;

  const transport = useMemo(() => new DefaultChatTransport({ api: apiPath, body: { model: selectedModel } }), [apiPath, selectedModel]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => console.error('Chat error:', e),
    onData: (part) => console.debug('AI SDK data part:', part),
  });

  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const accepted: File[] = [];
    for (const f of incoming) {
      if (!isAccepted(f)) {
        setRejected(`Unsupported type: ${f.type || f.name}`);
        continue;
      }
      if (f.size > sizeLimitBytes) {
        setRejected(`File too large (>${sizeLimitMB}MB): ${f.name}`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;
    setAttachedFiles((prev) => [...prev, ...accepted].slice(0, 6));
  }

  useEffect(() => {
    if (!attachmentsEnabled) return;
    const el = dropRef.current;
    if (!el) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      if (dt.files && dt.files.length > 0) addFiles(dt.files);
    };

    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [attachmentsEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const hasText = !!input.trim();
    const hasFiles = attachmentsEnabled && attachedFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const parts: Array<{ type: 'text'; text: string } | { type: 'image'; image: string; mediaType?: string } | { type: 'file'; data: string; mediaType: string; filename?: string }> = [];
    if (hasText) parts.push({ type: 'text', text: input });

    if (hasFiles) {
      for (const f of attachedFiles) {
        const dataUrl = await fileToDataUrl(f);
        if (f.type.startsWith('image/')) {
          parts.push({ type: 'image', image: dataUrl, mediaType: f.type });
        } else {
          parts.push({ type: 'file', data: dataUrl, mediaType: f.type, filename: f.name });
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sendMessage as any)({ content: parts });

    setInput('');
    setRejected(null);
    setAttachedFiles([]);
  };

  const [servers, setServers] = useState<ServerInfo[]>([]);
  useEffect(() => {
    if (view !== 'settings') return;
    let mounted = true;
    (async () => {
      try {
        const [healthRes, toolsRes] = await Promise.all([
          fetch('/api/mcp/health', { cache: 'no-store' }),
          fetch('/api/mcp/tools', { cache: 'no-store' }),
        ]);
        const healthJson = (await healthRes.json()) as { servers?: Array<{ name: string; ok: boolean; tools?: number }> };
        const toolsJson = (await toolsRes.json()) as { toolsByNamespace?: Record<string, Array<{ name: string }>> };
        if (!mounted) return;
        const byNs = toolsJson.toolsByNamespace || {};
        const merged: ServerInfo[] = (healthJson.servers || []).map((s) => ({
          name: s.name,
          ok: !!s.ok,
          tools: s.tools || (byNs[s.name]?.length || 0),
          toolNames: (byNs[s.name] || []).map((t) => t.name),
        }));
        setServers(merged);
      } catch {
        if (!mounted) return;
        setServers([]);
      }
    })();
    return () => { mounted = false; };
  }, [view]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {view === 'chat' && (
          <>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-blue-50 rounded-lg p-6 max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome</h3>
                  <p className="text-gray-600 text-sm mb-4">Ask a question or try a tool-enabled prompt.</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <MessageRenderer key={message.id} message={message as any} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">Analyzing with AI...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">
                  <strong>Error:</strong> {error.message}
                </p>
              </div>
            )}
          </>
        )}

        {view === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('chat')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              {onRequestClose && (
                <button
                  type="button"
                  onClick={onRequestClose}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  ×
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Model</div>
                <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">MCP Servers</div>
                <div className="space-y-3">
                  {servers.length === 0 && (
                    <div className="text-xs text-gray-500">No servers found.</div>
                  )}
                  {servers.map((s) => (
                    <div key={s.name} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${s.ok ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{s.tools || 0} tools</span>
                      </div>
                      {s.toolNames && s.toolNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.toolNames.slice(0, 20).map((t) => (
                            <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                          {s.toolNames.length > 20 && (
                            <span className="text-xs text-gray-500">+{s.toolNames.length - 20} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 space-y-2" ref={dropRef}>
        {view === 'chat' && (
          <form onSubmit={handleSubmit} className={`flex flex-col gap-2 ${isDragging ? 'ring-2 ring-blue-400 rounded-lg bg-blue-50/50' : ''}`}>
            {rejected && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{rejected}</span>
              </div>
            )}
            {attachmentsEnabled && attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="inline-flex items-center gap-2 text-xs bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="truncate max-w-[140px]" title={f.name}>{f.name}</span>
                    <button type="button" className="text-gray-400 hover:text-gray-700" onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {attachmentsEnabled && isDragging && attachedFiles.length === 0 && (
              <div className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded px-2 py-1 w-fit">Drop files to attach</div>
            )}

            <div className="flex items-center gap-2">
              {attachmentsEnabled && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  disabled={isLoading}
                  aria-label="Attach files"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPT_ATTRIBUTE} onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                addFiles(files);
                if (e.currentTarget) e.currentTarget.value = '';
              }} />

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachmentsEnabled ? 'Type your message, or drag & drop files...' : 'Type your message...'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-end gap-3">
          <img src="/logo_text_clear.png" alt="Samvaad" className="h-4 w-auto hidden sm:block" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xs text-gray-500">Powered by Samvaad</span>
          <button
            type="button"
            onClick={() => setView('settings')}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md px-2 py-1"
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
        {footer}
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { ChatCore } from './ChatCore';

export interface ChatBubbleProps {
  position?: 'bottom-right' | 'bottom-left';
  apiPath?: string;
  initialModel?: string;
  enableAttachments?: boolean;
}

export function ChatBubble({ position = 'bottom-right', apiPath = '/api/chat', initialModel = 'openai:gpt-5', enableAttachments }: ChatBubbleProps) {
  const [open, setOpen] = useState(false);
  const posClass = position === 'bottom-right' ? 'right-6 bottom-6' : 'left-6 bottom-6';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${posClass} z-50 rounded-full bg-blue-600 text-white w-14 h-14 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        aria-label="Open chat"
      >
        Chat
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className={`absolute ${position === 'bottom-right' ? 'right-6 bottom-24' : 'left-6 bottom-24'} w-[380px] h-[520px] bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200`}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatCore apiPath={apiPath} initialModel={initialModel} onRequestClose={() => setOpen(false)} enableAttachments={enableAttachments} />
          </div>
        </div>
      )}
    </>
  );
} 
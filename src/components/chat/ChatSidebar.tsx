'use client';

import { useState } from 'react';
import { ChatCore } from './ChatCore';

export interface ChatSidebarProps {
  side?: 'right' | 'left';
  width?: number; // px
  apiPath?: string;
  initialModel?: string;
}

export function ChatSidebar({ side = 'right', width = 380, apiPath = '/api/chat', initialModel = 'openai:gpt-5' }: ChatSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
      >
        Open Chat
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full bg-white shadow-2xl border-l border-gray-200`}
            style={{ width }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <ChatCore apiPath={apiPath} initialModel={initialModel} onRequestClose={() => setOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
### Using the MCP Chat Client

You can mount the chat as a full page, a floating bubble, or a sidebar drawer.

#### Full Page
```tsx
import { ChatCore } from '@/components/chat/ChatCore';

export default function Page() {
  return (
    <main className="h-screen">
      <ChatCore />
    </main>
  );
}
```

#### Bubble (Floating)
```tsx
import { ChatBubble } from '@/components/chat/ChatBubble';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatBubble position="bottom-right" />
    </>
  );
}
```

#### Sidebar (Right)
```tsx
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export default function Page() {
  return (
    <div className="p-4">
      <ChatSidebar side="right" />
    </div>
  );
}
```

#### Filtering by MCP Server
- Use the built-in server selector in `ChatCore`.
- It filters the exposed tools by namespace before passing to the model.

#### Configuration
- See CONFIG.md for JSON options and precedence.
- If no servers are configured, the chat works as a regular model-only assistant. 
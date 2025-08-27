import { ChatBubble } from 'samvaad';

export default function BubbleExample() {
  return (
    <main className="min-h-screen">
      <div className="p-6">This page shows the floating bubble chat.</div>
      <ChatBubble position="bottom-right" enableAttachments={true} />
    </main>
  );
} 
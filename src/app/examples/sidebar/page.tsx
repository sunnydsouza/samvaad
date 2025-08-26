import { ChatSidebar } from 'samvaad';

export default function SidebarExample() {
  return (
    <main className="min-h-screen p-4">
      <div className="mb-4">This page shows a button that opens a right sidebar chat.</div>
      <ChatSidebar side="right" />
    </main>
  );
} 
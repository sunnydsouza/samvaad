import { ChatCore } from 'samvaad';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Samvaad
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Dialogue-first, config-driven MCP chat with embeddable UI components
          </p>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <ChatCore />
      </div>
    </main>
  );
}

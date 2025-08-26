import Link from 'next/link';

export default function ExamplesHome() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">MCP Chat Client Examples</h1>
      <p className="text-gray-600">Choose an example to view:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><Link className="text-blue-600 hover:underline" href="/examples/full">Full Page Chat</Link></li>
        <li><Link className="text-blue-600 hover:underline" href="/examples/bubble">Floating Bubble Chat</Link></li>
        <li><Link className="text-blue-600 hover:underline" href="/examples/sidebar">Sidebar Chat</Link></li>
      </ul>
    </main>
  );
} 
// A minimal SSE route. Replace the `tokens` source with your LLM provider
// (OpenAI / Anthropic / local) — the only contract is one `data:` line
// per token.

const TEXT =
  'The cosmos is within us. We are made of star-stuff. ' +
  'We are a way for the universe to know itself.';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tokens = TEXT.split(/(\s+)/);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(`data: ${token}\n\n`));
        await new Promise((r) => setTimeout(r, 50));
      }
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

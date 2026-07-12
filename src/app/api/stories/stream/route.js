import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Maintain a set of active connections
if (!global.sseClients) {
  global.sseClients = new Set();
}

if (!global.broadcastStory) {
  global.broadcastStory = (story) => {
    const data = `data: ${JSON.stringify(story)}\n\n`;
    for (const client of global.sseClients) {
      try {
        client(data);
      } catch (err) {
        console.error('Failed to send SSE event to client, removing:', err);
        global.sseClients.delete(client);
      }
    }
  };
}

export async function GET(request) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection header/event
  writer.write(encoder.encode(': ok\n\n'));

  const clientCallback = (data) => {
    try {
      writer.write(encoder.encode(data));
    } catch (err) {
      console.error('SSE writer write error:', err);
    }
  };

  global.sseClients.add(clientCallback);

  // Send periodic heartbeats to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(': heartbeat\n\n'));
    } catch (err) {
      // client disconnected
      clearInterval(heartbeatInterval);
      global.sseClients.delete(clientCallback);
      try {
        writer.close();
      } catch (e) {}
    }
  }, 15000);

  // Clean up when request is aborted
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    global.sseClients.delete(clientCallback);
    try {
      writer.close();
    } catch (e) {}
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

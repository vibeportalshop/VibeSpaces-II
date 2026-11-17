export interface ChatHistoryTurn {
  role: 'user' | 'model';
  senderName: string;
  text: string;
}

export async function streamNovaResponse(params: {
  message: string;
  history?: ChatHistoryTurn[];
  activeSpaceName?: string;
  channelName?: string;
  userName?: string;
  onChunk: (accumulatedText: string) => void;
}): Promise<string> {
  const { message, history, activeSpaceName, channelName, userName, onChunk } = params;

  try {
    const response = await fetch('/api/ai/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        activeSpaceName,
        channelName,
        userName,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const line = block.trim();
        if (!line.startsWith('data:')) continue;
        const jsonRaw = line.replace(/^data:\s*/, '');
        try {
          const parsed = JSON.parse(jsonRaw);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            accumulated += parsed.text;
            onChunk(accumulated);
          }
        } catch {
          // Ignore partial JSON chunk parse issues
        }
      }
    }

    if (accumulated.trim()) {
      return accumulated.trim();
    }
  } catch {
    // Fallback to standard JSON endpoint if streaming is interrupted
    try {
      const fallbackRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          activeSpaceName,
          channelName,
          userName,
        }),
      });
      const data = await fallbackRes.json();
      if (data.text) {
        onChunk(data.text);
        return data.text;
      }
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (innerErr) {
      const errText =
        innerErr instanceof Error
          ? `NovaAI notice: ${innerErr.message}`
          : 'NovaAI is catching a breath—please check your connection or API key in Settings > Secrets.';
      onChunk(errText);
      return errText;
    }
  }

  return 'Hey! I am here in the lounge with you.';
}

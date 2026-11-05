// Buffer SSE events across network chunks (including split UTF-8 characters).
export async function readReply(response, onText) {
  if (!response.ok) throw new Error(`请求失败（${response.status}），请稍后重试。`);
  if (!response.body) throw new Error('服务器未返回内容。');
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    const data = await response.json();
    const text = data.response ?? data.result?.response;
    if (typeof text !== 'string' || !text) throw new Error('服务器返回了空回复。');
    onText(text); return;
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', received = false;
  function consume(line) {
    const raw = line.trim().replace(/^data:\s*/, '');
    if (!raw || raw === '[DONE]' || raw.startsWith(':') || /^(event|id|retry):/.test(raw)) return;
    const data = JSON.parse(raw);
    if (data.error) throw new Error('模型生成失败，请重试。');
    if (typeof data.response === 'string' && data.response) { received = true; onText(data.response); }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n'); buffer = lines.pop();
      for (const line of lines) consume(line);
      if (done) { if (buffer.trim()) consume(buffer); break; }
    }
    if (!received) throw new Error('服务器返回了空回复。');
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

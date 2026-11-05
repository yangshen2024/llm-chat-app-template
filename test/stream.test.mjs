import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code=await readFile(new URL('../public/stream.js',import.meta.url),'utf8');
const {readReply}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('SSE preserves split UTF-8 and network frames',async()=>{const bytes=new TextEncoder().encode(': heartbeat\r\ndata: {"response":"你好"}\r\n\r\ndata: {"response":"！"}\n\ndata: [DONE]\n\n');const stream=new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}});let out='';await readReply(new Response(stream),x=>out+=x);assert.equal(out,'你好！');});
test('JSON fallback',async()=>{let out='';await readReply(Response.json({response:'hello'}),x=>out+=x);assert.equal(out,'hello');});
test('HTTP errors and empty output reject',async()=>{await assert.rejects(readReply(new Response('',{status:503}),()=>{}),/503/);await assert.rejects(readReply(new Response('data: [DONE]\n'),()=>{}),/空回复/);});
test('final frame without newline',async()=>{let out='';await readReply(new Response('data: {"response":"done"}'),x=>out+=x);assert.equal(out,'done');});

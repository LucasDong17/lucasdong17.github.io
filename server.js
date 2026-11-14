import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCoachAnswer } from './openai-helper.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const env = await loadEnv(join(ROOT, '.env'));
const PORT = Number(env.PORT || 3000);
const MODEL = env.OPENAI_MODEL || 'gpt-5-mini';
const BRIEF = await readFile(join(ROOT, 'BRIEF.md'), 'utf8');
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/coach') return await handleCoach(request, response);
    if (request.method !== 'GET') return json(response, 405, { message: 'Method not allowed.' });

    const urlPath = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(ROOT, safePath);
    if (!filePath.startsWith(ROOT)) return json(response, 403, { message: 'Forbidden.' });
    const contents = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(contents);
  } catch (error) {
    if (error.code === 'ENOENT') return json(response, 404, { message: 'Not found.' });
    json(response, 500, { message: 'Something went wrong.' });
  }
});

async function handleCoach(request, response) {
  const body = await readJson(request);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
  const history = Array.isArray(body.history) ? body.history.slice(-8).flatMap(item => {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
    const content = typeof item?.content === 'string' ? item.content.trim().slice(0, 1000) : '';
    return role && content ? [{ role, content }] : [];
  }) : [];
  if (!message) return json(response, 400, { message: 'Ask the coach a short question.' });
  if (!env.OPENAI_API_KEY) return json(response, 503, { message: 'The coach is not connected yet. Please check the API key in .env and restart.' });

  try {
    const answer = await getCoachAnswer({ apiKey: env.OPENAI_API_KEY, model: MODEL, brief: BRIEF, message, history });
    json(response, 200, { answer });
  } catch {
    json(response, 502, { message: 'Please check the API key and internet connection, then try again.' });
  }
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('Request too large');
  }
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function loadEnv(path) {
  try {
    const text = await readFile(path, 'utf8');
    return Object.fromEntries(text.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('=')).map(line => {
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      return [key, value];
    }));
  } catch { return {}; }
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`School's Helper is running at http://localhost:${PORT}`);
  if (!env.OPENAI_API_KEY) console.log('AI is in setup mode: add OPENAI_API_KEY to .env and restart.');
});

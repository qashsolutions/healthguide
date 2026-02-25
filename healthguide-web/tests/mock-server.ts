/**
 * Lightweight mock Supabase server for Playwright E2E tests.
 * Runs on port 3100. Next.js is started with NEXT_PUBLIC_SUPABASE_URL=http://localhost:3100.
 *
 * Endpoints:
 *   POST /configure           — set mock responses for the next test
 *   POST /reset               — restore default fixture data
 *   POST /functions/v1/public-caregiver-search — mocked edge function
 *   GET  /rest/v1/caregiver_ratings             — mocked reviews query
 *   GET  /rest/v1/caregiver_profiles            — fallback profile query
 */

import http from 'http';
import { MARIA, JAMES, REVIEWS, searchResponse } from './fixtures/caregivers';

const DEFAULT_EDGE_RESPONSE = searchResponse([MARIA, JAMES]);
const DEFAULT_RATINGS_RESPONSE = REVIEWS;

// Per-request mutable state
let edgeFunctionResponse: Record<string, unknown> = DEFAULT_EDGE_RESPONSE;
let ratingsResponse: unknown[] = DEFAULT_RATINGS_RESPONSE;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  // Universal CORS headers (Supabase client sends preflight requests)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, apikey, x-client-info, prefer, accept, x-supabase-api-version'
  );
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '';

  // ── Configure endpoint (called by tests via page.request) ────────────────
  if (url === '/configure' && req.method === 'POST') {
    const body = await readBody(req);
    const updates = JSON.parse(body || '{}');
    if ('edgeFunctionResponse' in updates) {
      edgeFunctionResponse = updates.edgeFunctionResponse;
    }
    if ('ratingsResponse' in updates) {
      ratingsResponse = updates.ratingsResponse;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── Reset endpoint ────────────────────────────────────────────────────────
  if (url === '/reset' && req.method === 'POST') {
    edgeFunctionResponse = { ...DEFAULT_EDGE_RESPONSE };
    ratingsResponse = [...DEFAULT_RATINGS_RESPONSE];
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── Edge function: public-caregiver-search ────────────────────────────────
  if (url.includes('/functions/v1/public-caregiver-search')) {
    // Consume request body (required or Node.js may stall)
    await readBody(req);
    res.writeHead(200);
    res.end(JSON.stringify(edgeFunctionResponse));
    return;
  }

  // ── REST API: caregiver_ratings ───────────────────────────────────────────
  if (url.includes('/rest/v1/caregiver_ratings')) {
    res.writeHead(200);
    res.end(JSON.stringify(ratingsResponse));
    return;
  }

  // ── REST API: caregiver_profiles (fallback in [id]/page.tsx) ─────────────
  if (url.includes('/rest/v1/caregiver_profiles')) {
    const isSingle =
      (req.headers['accept'] ?? '').includes('vnd.pgrst.object') ||
      (req.headers['prefer'] ?? '').includes('return=representation');

    // Extract the first caregiver from the current edge function response
    const caregivers = (edgeFunctionResponse as any)?.caregivers ?? [];
    const first = caregivers[0] ?? null;

    if (isSingle) {
      if (first) {
        res.writeHead(200);
        res.end(JSON.stringify(first));
      } else {
        // Mimic Supabase "PGRST116 — The result contains 0 rows"
        res.writeHead(406);
        res.end(JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned', hint: '' }));
      }
    } else {
      res.writeHead(200);
      res.end(JSON.stringify(first ? [first] : []));
    }
    return;
  }

  // ── 404 fallback ──────────────────────────────────────────────────────────
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', url }));
});

const PORT = 3100;
server.listen(PORT, () => {
  console.log(`Mock Supabase server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());

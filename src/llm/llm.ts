import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { db } from '../lib/storage.js';

/**
 * OpenGravity LLM router (V10.5)
 *
 * - Native HTTP via undici fetch (no more shell-out to curl: no
 *   command-injection surface, no event-loop blocking, no temp files)
 * - API keys travel in headers, never in URLs
 * - Conversation history is sent in true chronological order with a
 *   real limit (the storage layer now executes orderBy/limit)
 * - Per-provider timeout + graceful failover across the provider list
 */

const HISTORY_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 30_000;

type ProviderType = 'openai' | 'gemini_native';

interface Provider {
    id: string;
    apiKey: string;
    url: string;
    model: string;
    type: ProviderType;
    proxy?: string;
}

// Cache ProxyAgents so we don't rebuild them on every call
const proxyAgents = new Map<string, ProxyAgent>();
function getProxyAgent(proxyUrl: string): ProxyAgent {
    let agent = proxyAgents.get(proxyUrl);
    if (!agent) {
        agent = new ProxyAgent(proxyUrl);
        proxyAgents.set(proxyUrl, agent);
    }
    return agent;
}

function buildProviders(): Provider[] {
    const providers: Provider[] = [];

    const mistral = process.env.MISTRAL_API_KEY;
    if (mistral) {
        providers.push({
            id: 'Mistral',
            apiKey: mistral,
            url: 'https://api.mistral.ai/v1/chat/completions',
            model: 'mistral-small-latest',
            type: 'openai'
        });
    }

    const moonshot = process.env.MOONSHOT_API_KEY;
    if (moonshot) {
        providers.push({
            id: 'Moonshot',
            apiKey: moonshot,
            url: 'https://api.moonshot.cn/v1/chat/completions',
            model: 'moonshot-v1-8k',
            type: 'openai'
        });
    }

    // Gemini fallbacks, optionally routed through local proxies
    const geminiKeys = [process.env.GEMINI_KEY_8, process.env.GEMINI_KEY_1, process.env.GEMINI_KEY_2].filter(Boolean) as string[];
    const proxies = [process.env.LAUNCH_URL_11435, process.env.LAUNCH_URL_11436].filter(Boolean) as string[];

    geminiKeys.forEach((key, i) => {
        providers.push({
            id: `Gemini-8B-${i}`,
            apiKey: key,
            // Key travels in the x-goog-api-key header, NOT in the URL
            url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent',
            model: 'gemini-1.5-flash-8b',
            type: 'gemini_native',
            proxy: proxies[i]
        });
    });

    return providers;
}

async function callProvider(p: Provider, payload: unknown): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (p.type === 'gemini_native') {
        headers['x-goog-api-key'] = p.apiKey;
    } else {
        headers['Authorization'] = `Bearer ${p.apiKey}`;
    }

    const res = await undiciFetch(p.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(p.proxy ? { dispatcher: getProxyAgent(p.proxy) } : {})
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${p.id} responded ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
}

function extractReply(providerType: ProviderType, data: any): string {
    if (providerType === 'gemini_native') {
        return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
    return data?.choices?.[0]?.message?.content ?? '';
}

export async function processMessage(userMessage: string): Promise<string> {
    // 1. Persist the user message (ISO string timestamps sort reliably)
    await db.collection('messages').add({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
    });

    // 2. Load the latest HISTORY_LIMIT messages in true chronological order.
    //    orderBy + limit now REALLY execute in the storage layer:
    //    desc + limit -> newest N, then reverse -> oldest -> newest.
    const snapshot = await db
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(HISTORY_LIMIT)
        .get();
    const history = snapshot.docs.map((doc: any) => doc.data()).reverse();

    // 3. Try each provider in order until one answers
    const providers = buildProviders();

    for (const p of providers) {
        try {
            const payload =
                p.type === 'gemini_native'
                    ? {
                          contents: history.map((m: any) => ({
                              role: m.role === 'assistant' ? 'model' : 'user',
                              parts: [{ text: m.content }]
                          })),
                          generationConfig: { maxOutputTokens: 1024 }
                      }
                    : {
                          model: p.model,
                          messages: history.map((m: any) => ({ role: m.role, content: m.content })),
                          max_tokens: 1024
                      };

            const data = await callProvider(p, payload);
            const reply = extractReply(p.type, data);

            if (reply) {
                await db.collection('messages').add({
                    role: 'assistant',
                    content: reply,
                    timestamp: new Date().toISOString(),
                    provider: p.id
                });
                return reply;
            }
        } catch (e) {
            // Log and fail over to the next provider
            console.error(`[llm] provider ${p.id} failed:`, e instanceof Error ? e.message : e);
        }
    }

    return '❌ Ningún motor respondió. Tu mensaje quedó guardado en memoria; reintenta en unos segundos.';
}

// Lee el token directamente del .env para evitar problemas de copiar/pegar
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const vars = {};
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    let key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
    vars[key] = val;
});

const ACCOUNT_ID = vars.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = vars.CLOUDFLARE_API_TOKEN;

console.log("Account ID:", ACCOUNT_ID);
console.log("Token (first 10 chars):", API_TOKEN?.substring(0, 10) + "...");
console.log("Token length:", API_TOKEN?.length);
console.log("");

// Test 1: Verify
console.log("=== TEST 1: Verify Token ===");
try {
    const r1 = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    console.log("Status:", r1.status, await r1.text());
} catch (e) { console.log("Error:", e.message); }

// Test 2: AI models
console.log("\n=== TEST 2: AI Models ===");
try {
    const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/models/search?per_page=100`, {
        headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    const d2 = await r2.json();
    if (d2.success && d2.result) {
        console.log(`✅ ${d2.result.length} modelos disponibles:\n`);
        const byTask = {};
        d2.result.forEach(m => {
            const task = m.task?.name || "other";
            if (!byTask[task]) byTask[task] = [];
            byTask[task].push(m.name);
        });
        Object.entries(byTask).forEach(([task, models]) => {
            console.log(`📦 ${task.toUpperCase()} (${models.length}):`);
            models.forEach(m => console.log(`   - ${m}`));
            console.log("");
        });
    } else {
        console.log("❌", JSON.stringify(d2));
    }
} catch (e) { console.log("Error:", e.message); }

// Test 3: Quick AI test
console.log("\n=== TEST 3: LLaMA 3.1 8B Quick Test ===");
try {
    const r3 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Di hola en una palabra" }] })
    });
    const d3 = await r3.json();
    if (d3.success) {
        console.log("✅ Respuesta:", d3.result?.response);
    } else {
        console.log("❌", JSON.stringify(d3));
    }
} catch (e) { console.log("Error:", e.message); }

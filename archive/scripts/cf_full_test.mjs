const TOKEN = "Y1Pz8THwhLfRNCRe7gzlfCSrwjabIynAKlo1hCeS";
const ACCT = "faf93cd2a0d373573de88591bcc95323";

// Get all AI models
console.log("=== MODELOS DISPONIBLES EN TU CUENTA ===\n");
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/models/search?per_page=200`, {
    headers: { "Authorization": `Bearer ${TOKEN}` }
});
const d = await r.json();
if (d.success && d.result) {
    const byTask = {};
    d.result.forEach(m => {
        const task = m.task?.name || "other";
        if (!byTask[task]) byTask[task] = [];
        byTask[task].push({ name: m.name, desc: m.description?.substring(0, 60) || "" });
    });
    Object.entries(byTask).sort().forEach(([task, models]) => {
        console.log(`\n📦 ${task.toUpperCase()} (${models.length} modelos):`);
        models.forEach(m => console.log(`   ${m.name}`));
    });
    console.log(`\n🔢 TOTAL: ${d.result.length} modelos disponibles`);
} else {
    console.log("Error:", JSON.stringify(d));
}

// Test LLaMA
console.log("\n\n=== TEST: LLaMA 3.1 8B ===");
const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Di hola en español, una sola palabra" }] })
});
const d2 = await r2.json();
console.log("Status:", r2.status);
if (d2.success) console.log("✅ Respuesta:", d2.result?.response);
else console.log("❌", JSON.stringify(d2));

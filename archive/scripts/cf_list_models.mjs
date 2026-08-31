const EMAIL = "eddyflores100@gmail.com";
const KEY = "73b13e4360bb3b89198c2bd69f70a0c04e6a4";
const ACCT = "faf93cd2a0d373573de0859b1cc95328";
const H = { "X-Auth-Email": EMAIL, "X-Auth-Key": KEY };

console.log("=== TODOS LOS MODELOS DISPONIBLES EN TU CLOUDFLARE ===\n");
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/models/search?per_page=200`, { headers: H });
const d = await r.json();
if (d.success && d.result) {
    const byTask = {};
    d.result.forEach(m => {
        const task = m.task?.name || "other";
        if (!byTask[task]) byTask[task] = [];
        byTask[task].push(m.name);
    });
    Object.entries(byTask).sort().forEach(([task, models]) => {
        console.log(`📦 ${task.toUpperCase()} (${models.length}):`);
        models.forEach(m => console.log(`   - ${m}`));
        console.log("");
    });
    console.log(`\n🔢 TOTAL: ${d.result.length} modelos disponibles`);
} else {
    console.log("Error:", JSON.stringify(d));
}

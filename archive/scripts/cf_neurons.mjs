const EMAIL = "eddyflores100@gmail.com";
const KEY = "73b13e4360bb3b89198c2bd69f70a0c04e6a4";
const ACCT = "faf93cd2a0d373573de0859b1cc95328";
const H = { "X-Auth-Email": EMAIL, "X-Auth-Key": KEY };

// Get models with full details
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/models/search?per_page=200`, { headers: H });
const d = await r.json();

if (d.success && d.result) {
    const byTask = {};
    d.result.forEach(m => {
        const task = m.task?.name || "other";
        if (!byTask[task]) byTask[task] = [];
        byTask[task].push({
            name: m.name,
            properties: m.properties || {},
            task: m.task || {}
        });
    });

    Object.entries(byTask).sort().forEach(([task, models]) => {
        console.log(`\n========== ${task.toUpperCase()} ==========`);
        models.forEach(m => {
            const props = m.properties || {};
            console.log(`\n  📌 ${m.name}`);
            if (props.neurons_per_total_token !== undefined) console.log(`     Neurons/token: ${props.neurons_per_total_token}`);
            if (props.neurons_per_request !== undefined) console.log(`     Neurons/request: ${props.neurons_per_request}`);
            if (props.neurons_per_second !== undefined) console.log(`     Neurons/second: ${props.neurons_per_second}`);
            if (props.max_tokens !== undefined) console.log(`     Max tokens: ${props.max_tokens}`);
            if (props.context_window !== undefined) console.log(`     Context window: ${props.context_window}`);
            if (props.max_input_tokens !== undefined) console.log(`     Max input tokens: ${props.max_input_tokens}`);
            // Print all properties
            const keys = Object.keys(props).filter(k => !['neurons_per_total_token', 'neurons_per_request', 'neurons_per_second', 'max_tokens', 'context_window', 'max_input_tokens'].includes(k));
            keys.forEach(k => console.log(`     ${k}: ${JSON.stringify(props[k])}`));
        });
    });
}

// Also check usage/quota
console.log("\n\n========== USAGE / QUOTA ==========");
try {
    const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/usage`, { headers: H });
    const d2 = await r2.json();
    console.log(JSON.stringify(d2, null, 2));
} catch (e) { console.log("Usage endpoint error:", e.message); }

try {
    const r3 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai`, { headers: H });
    const d3 = await r3.json();
    console.log(JSON.stringify(d3, null, 2));
} catch (e) { }

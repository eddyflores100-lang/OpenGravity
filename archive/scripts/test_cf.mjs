const ACCOUNT_ID = "faf93cd2a0d373573de88591bcc95323";
const API_TOKEN = "eZlu3Qot-ChDv8ip2oPEapIR40cGvXv3iI212JCi";

async function testToken() {
  console.log("=== TEST 1: Verify Token ===");
  try {
    const r1 = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    const d1 = await r1.json();
    console.log("Status:", r1.status);
    console.log("Result:", JSON.stringify(d1, null, 2));
  } catch (e) { console.log("Error:", e.message); }

  console.log("\n=== TEST 2: List AI Models ===");
  try {
    const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/models/search`, {
      headers: { "Authorization": `Bearer ${API_TOKEN}` }
    });
    const d2 = await r2.json();
    console.log("Status:", r2.status);
    if (d2.result) {
      console.log("Models found:", d2.result.length);
      d2.result.slice(0, 10).forEach(m => console.log(`  - ${m.name} (${m.task?.name || "unknown"})`));
    } else {
      console.log("Result:", JSON.stringify(d2, null, 2));
    }
  } catch (e) { console.log("Error:", e.message); }

  console.log("\n=== TEST 3: Direct AI Call (LLaMA 3.1 8B) ===");
  try {
    const r3 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Say hello in one word" }] })
    });
    const d3 = await r3.json();
    console.log("Status:", r3.status);
    console.log("Result:", JSON.stringify(d3, null, 2));
  } catch (e) { console.log("Error:", e.message); }
}

testToken();

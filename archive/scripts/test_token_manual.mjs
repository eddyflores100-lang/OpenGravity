// INSTRUCCION: Corre esto en tu terminal asi:
// node test_token_manual.mjs TU_TOKEN_AQUI
// Ejemplo: node test_token_manual.mjs k5uywjSJ65-2yYRp6iWhrkZmMUyDJjY5TY2IyjHS

const token = process.argv[2];
if (!token) { console.log("Uso: node test_token_manual.mjs TU_TOKEN"); process.exit(1); }

console.log("Token recibido:", token);
console.log("Length:", token.length);
console.log("Hex:", Buffer.from(token).toString('hex'));
console.log("");

console.log("=== Verificando token... ===");
const r = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { "Authorization": `Bearer ${token}` }
});
const d = await r.json();
console.log("Status:", r.status);
console.log("Response:", JSON.stringify(d, null, 2));

if (d.success) {
    console.log("\n✅ TOKEN VALIDO! Probando AI...");
    const acct = "faf93cd2a0d373573de88591bcc95323";
    const r2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Di hola" }] })
    });
    const d2 = await r2.json();
    console.log("AI Status:", r2.status);
    console.log("AI Response:", JSON.stringify(d2, null, 2));
} else {
    console.log("\n❌ Token invalido. Verifica que lo copiaste completo.");
}

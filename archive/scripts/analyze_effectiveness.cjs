const fs = require('fs');

const jsonlPath = 'open-gravity-ui/emergency_audit_log.jsonl';
if (!fs.existsSync(jsonlPath)) {
    console.log("No log found");
    process.exit(1);
}

const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean);

const badCompanies = ["Juicero", "MoviePass", "Quibi", "Theranos", "Ofo", "FTX", "Fast", "Color", "WeWork", "Pets.com", "Webvan", "FyreFestival", "Shyp", "Munchery"];
const goodCompanies = ["Snapchat", "Zoom", "Airbnb", "Dropbox", "Notion", "Stripe", "GitHub", "Canva", "WhatsApp", "Instagram"];

let totalEvaluated = 0;
let evaluables = 0;
let correctPredictions = 0;
let falsePositives = 0;
let falseNegatives = 0;

for (const line of lines) {
    try {
        const item = JSON.parse(line);
        const jobId = item.jobId;
        const viabScore = item.report?.viabilityScore || 0;
        const isViable = viabScore >= 60; // 60 is viable
        
        // El formato ahora es Nombre_Sim o Nombre_Tech_X_Sim
        // Extraemos solo la primera parte del nombre para clasificar si es "Bad" o "Good" en su origen
        const companyBase = jobId.split('_')[0]; 
        
        totalEvaluated++;
        let isCorrect = null;
        
        if (badCompanies.includes(companyBase)) {
            // Bad companies should die. If they are marked viable, it's a false positive.
            if (!isViable) {
                isCorrect = true;
            } else {
                isCorrect = false;
                falsePositives++;
            }
        } else if (goodCompanies.includes(companyBase)) {
            // Good companies should live
            if (isViable) {
                isCorrect = true;
            } else {
                isCorrect = false;
                falseNegatives++;
            }
        }
        
        if (isCorrect !== null) {
            evaluables++;
            if (isCorrect) correctPredictions++;
        }
    } catch(e) {}
}

const effectiveness = evaluables > 0 ? ((correctPredictions / evaluables) * 100).toFixed(2) : 0;

console.log(`=========================================`);
console.log(`📊 REPORTE DE EFECTIVIDAD MONTE CARLO V3`);
console.log(`=========================================`);
console.log(`Total simulaciones registradas: ${totalEvaluated}`);
console.log(`Total evaluadas (Casos de Control): ${evaluables}`);
console.log(`Predicciones Correctas: ${correctPredictions}`);
console.log(`Falsos Positivos (Dijo que sí a empresas basura): ${falsePositives}`);
console.log(`Falsos Negativos (Dijo que no a unicornios reales): ${falseNegatives}`);
console.log(`-----------------------------------------`);
console.log(`🎯 EFECTIVIDAD DEL MODELO: ${effectiveness}%`);
console.log(`=========================================`);

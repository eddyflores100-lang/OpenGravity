const fs = require('fs');
const path = require('path');

const jsonlPath = 'open-gravity-ui/emergency_audit_log.jsonl';
if (!fs.existsSync(jsonlPath)) {
    console.log("No log found");
    process.exit(1);
}

const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean);

const csvHeaders = [
    "Job_ID",
    "Base_Company", 
    "Math_Adjustment",
    "Specialization",
    "Viability_Score",
    "Market_Verdict",
    "Bankruptcy_Rate",
    "Break_Even_Month",
    "LTV_CAC_Ratio",
    "Burn_Rate",
    "Runway_Status",
    "Trust_Score",
    "Executive_Summary",
    "CEO_Verdict",
    "True_Label"
];

let csvContent = csvHeaders.join(',') + '\n';

const badCompanies = ["Juicero", "MoviePass", "Quibi", "Theranos", "Ofo", "FTX", "Fast", "Color"];
const goodCompanies = ["Snapchat_2012", "Zoom_2012", "Airbnb_2009", "Dropbox_2008", "Notion_2013"];

const jobMap = new Map();

for (const line of lines) {
    try {
        const item = JSON.parse(line);
        if (item.jobId) {
            jobMap.set(item.jobId, item);
        }
    } catch(e) {}
}

for (const item of jobMap.values()) {
    try {
        const jobId = item.jobId || "unknown";
        const viabScore = item.report?.viabilityScore || 0;
        
        // Extraer Progenitor
        const baseName = jobId.split('_')[0];

        let trueLabel = "Unknown";
        if (badCompanies.includes(baseName)) trueLabel = "BAD";
        if (goodCompanies.includes(baseName)) trueLabel = "GOOD";

        // Métrica de Calibración
        const mathAdj = item.synthesizerMetadata?.mathAdjustment || "1.00";

        // Clean strings for CSV
        const cleanStr = (str) => {
            if (!str) return '""';
            return '"' + String(str).replace(/"/g, '""').replace(/\n/g, ' ') + '"';
        };

        const spec = item.report?.specialization || item.context?.specialization || 'SAAS';
        const marketVerdict = cleanStr(item.report?.marketVerdict);
        const execSummary = cleanStr(item.report?.executiveSummary);
        const ceoVerdict = cleanStr(item.report?.ceoFinalVerdict);
        
        // Quant metrics
        const qp = item.quantPayload || item.report?.quantPayload || {};
        const br = item.simulation?.bankruptcyRate !== undefined ? item.simulation.bankruptcyRate : (qp.bankruptcyRate || (item.report?.viabilityScore < 30 ? 1 : 0));

        const row = [
            cleanStr(jobId),
            cleanStr(baseName),
            mathAdj, 
            cleanStr(spec),
            viabScore,
            marketVerdict,
            br,
            qp.breakEvenMonth || '',
            qp.ltvCacRatio?.toFixed(2) || '',
            qp.burnRate || '',
            cleanStr(qp.runwayStatus),
            qp.trustScore || '',
            execSummary,
            ceoVerdict,
            cleanStr(trueLabel)
        ];

        csvContent += row.join(',') + '\n';
    } catch(e) {}
}

const outputPath = 'FINAL_Reporte_Calibrado_100_Casos.csv';
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ CSV Generado exitosamente en: ${path.resolve(outputPath)}`);

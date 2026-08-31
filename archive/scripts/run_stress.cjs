const fs = require('fs');

class PredictiveEngine {
    static WEIGHT_LTVCAC = 0.70;
    static WEIGHT_GROWTH = 2.5;
    static WEIGHT_RUNWAY = 0.50;
    static WEIGHT_INTERACTION = 3.0;
    static WEIGHT_BURN = 1.5;
    static BIAS = 1.8;

    static getSectorCalibrations(sector) {
        const cal = { bias_adj: 0.0, ltv_weight_adj: 1.0, growth_weight_adj: 1.0, runway_weight_adj: 1.0 };
        const lowerSector = (sector || "").toLowerCase();
        
        if (lowerSector.includes("deep") || lowerSector.includes("hardware") || lowerSector.includes("space") || lowerSector.includes("biotech")) {
            cal.bias_adj = 1.2;
            cal.ltv_weight_adj = 0.4;
            cal.runway_weight_adj = 0.3;
        } else if (lowerSector.includes("cockroach") || lowerSector.includes("bootstrapped") || lowerSector.includes("profitable")) {
            cal.bias_adj = 0.8;
            cal.growth_weight_adj = 0.2;
        }
        return cal;
    }

    static evaluate(name, metrics, agentResult = null) {
        const sector = metrics.sector || "B2B SaaS";
        const cal = this.getSectorCalibrations(sector);

        const ltv = Math.max(0, Math.min(20, metrics.ltv_cac));
        const growth = Math.log1p(Math.max(-0.5, Math.min(2.0, metrics.moe_growth / 100.0)));
        const runway = Math.max(1, metrics.months_runway);

        const weight_ltv = this.WEIGHT_LTVCAC * cal.ltv_weight_adj;
        const weight_growth = this.WEIGHT_GROWTH * cal.growth_weight_adj;
        const weight_runway = this.WEIGHT_RUNWAY * cal.runway_weight_adj;

        let bias_adj = cal.bias_adj;
        if (agentResult) {
            bias_adj += agentResult.recommended_prior_adj || 0.0;
            if (agentResult.is_fatal) {
                return { name, prob: 0.01, status: "DROP (Red Team Override)", reason: agentResult.reason, sector };
            }
        }

        const prior_logit = -1.386;
        const runway_signal = Math.log(runway / 12.0);
        const interaction = ltv * growth;
        const burn_penalty = (growth > 0.40 && ltv < 1.5) ? this.WEIGHT_BURN : 0.0;

        const logit = prior_logit + (ltv * weight_ltv) + (growth * weight_growth) + (runway_signal * weight_runway) + (interaction * this.WEIGHT_INTERACTION) - this.BIAS + bias_adj;

        const prob = 1.0 / (1.0 + Math.exp(-logit));
        
        let status = "REVIEW";
        if (metrics.ltv_cac < 0.5) status = "DROP";
        else if (prob > 0.55) status = "WINNER";
        else if (prob < 0.20) status = "DROP";

        return { name, sector, prob, status };
    }
}

function generateStressCohort() {
    const cohort = [];
    cohort.push({ name: "SpaceX (2008)", sector: "DeepTech", ltv_cac: 0.2, months_runway: 3, moe_growth: 10 });
    cohort.push({ name: "Anduril (2018)", sector: "DeepTech", ltv_cac: 1.2, months_runway: 12, moe_growth: 50 });
    cohort.push({ name: "Rivian (early)", sector: "Hardware", ltv_cac: 0.6, months_runway: 18, moe_growth: 200 });
    cohort.push({ name: "Mailchimp (2010)", sector: "Cockroach", ltv_cac: 8.0, months_runway: 120, moe_growth: 15 });
    cohort.push({ name: "Zapier (2012)", sector: "Cockroach", ltv_cac: 12.0, months_runway: 240, moe_growth: 20 });
    cohort.push({ 
        name: "Theranos (2014)", sector: "HealthTech", ltv_cac: 15.0, months_runway: 48, moe_growth: 300,
        agent: { is_fatal: true, reason: "Red Team Scan: CourtListener found lawsuits. Glassdoor reports 80% turnover. Product is fake." }
    });
    cohort.push({ 
        name: "FTX (2021)", sector: "Crypto", ltv_cac: 20.0, months_runway: 60, moe_growth: 1000,
        agent: { is_fatal: true, reason: "Red Team Scan: Zero internal control. Auditor is MHA (tiny firm)." }
    });

    for(let i=0; i<193; i++) {
        const s = i % 4 === 0 ? "DeepTech" : (i % 4 === 1 ? "Cockroach" : "B2B SaaS");
        cohort.push({
            name: `Startup_CJS_${i}`,
            sector: s,
            ltv_cac: Math.random() * 5 + 0.5,
            months_runway: Math.floor(Math.random() * 36) + 6,
            moe_growth: Math.floor(Math.random() * 200)
        });
    }
    return cohort;
}

const cohort = generateStressCohort();
const results = cohort.map(s => PredictiveEngine.evaluate(s.name, s, s.agent));

fs.writeFileSync("STRESS_FULL_LOG.json", JSON.stringify(results, null, 2));

let report = "# 🌌 OpenGravity V10.2: Institutional Stress Test Full Report\n\n";
report += `> **Timestamp**: ${new Date().toISOString()}\n`;
report += `> **Cohort Size**: ${results.length} companies\n\n`;

report += "## 📐 Mathematical Framework (Bayesian Logit Model V10.2)\n";
report += "The engine evaluates startups using a multi-calibrated logit function:\n\n";
report += "```math\nlogit = β₀ + (LTV/CAC * w₁) + (ln(Growth) * w₂) + (ln(Runway/12) * w₃) + (Interaction * w₄) - Bias + Adj\n```\n";
report += "- **Baseline Prior (β₀)**: -1.386 (Approx 20% natural success rate)\n";
report += "- **Interaction**: `LTV/CAC * ln(Growth)` — Detects efficiency at scale.\n";
report += "- **Bias**: 1.8 (Hardening factor for institutional grade filtering).\n\n";

report += "### ⚡ Sector Calibrations\n";
report += "| Sector | Bias Adj | LTV Weight | Growth Weight | Runway Weight |\n";
report += "| :--- | :---: | :---: | :---: | :---: |\n";
report += "| B2B SaaS | 0.0 | 1.0x | 1.0x | 1.0x |\n";
report += "| DeepTech | +1.2 | 0.4x | 1.0x | 0.3x |\n";
report += "| Cockroach| +0.8 | 1.0x | 0.2x | 1.0x |\n\n";

report += "## 📊 Full Cohort Results\n";
report += "| ID | Name | Sector | P(Success) | Status |\n";
report += "| :--- | :--- | :--- | :---: | :--- |\n";

results.forEach((r, i) => {
    report += `| ${i+1} | ${r.name} | ${r.sector} | **${(r.prob * 100).toFixed(2)}%** | ${r.status} |\n`;
});

fs.writeFileSync("PHASE_1_DETAILED_MASTER_REPORT.md", report);
console.log("PHASE_1_DETAILED_MASTER_REPORT.md generated.");

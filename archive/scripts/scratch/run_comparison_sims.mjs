import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000/api/predict';
const RESULTS_DIR = './scratch/simulation_results';

const SCENARIOS = [
  {
    name: "Uber_2010",
    idea: "On-demand ride-sharing platform that connects riders with drivers via a mobile app. Disrupting the taxi market through technology and dynamic pricing.",
    financials: {
      cac: 75,
      ltv: 500,
      monthly_burn: 500000,
      market_size: 100000000000,
      gross_margin: 0.20
    },
    context: "Early stage expansion into major cities. High regulatory friction expected."
  },
  {
    name: "WeWork_2016",
    idea: "Space-as-a-Service provider. Leasing long-term commercial real estate, renovating it into trendy co-working spaces, and renting out desks on a short-term basis.",
    financials: {
      cac: 500,
      ltv: 1200,
      monthly_burn: 50000000,
      fixed_costs: 40000000,
      gross_margin: 0.15
    },
    context: "Rapid international expansion. Extremely high operational leverage and fixed cost exposure."
  },
  {
    name: "Pets_DotCom_1999",
    idea: "Online retailer for pet supplies and food. Massive marketing expenditure to capture the 'first-mover' advantage in the pet e-commerce space.",
    financials: {
      cac: 200,
      ltv: 80,
      monthly_burn: 10000000,
      gross_margin: -0.05
    },
    context: "Selling products below cost to gain market share. High shipping costs for heavy items like pet food."
  }
];

async function pollStatus(jobId) {
  console.log(`[${jobId}] Polling status...`);
  while (true) {
    try {
      const res = await fetch(`${API_BASE}/status?jobId=${jobId}`);
      const data = await res.json();
      if (data.status === 'completed') {
        return data;
      }
      if (data.status === 'failed') {
        throw new Error(data.error || 'Simulation failed');
      }
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.error(`\nError polling ${jobId}:`, err.message);
      throw err;
    }
  }
}

async function runSimulations() {
  for (const scenario of SCENARIOS) {
    console.log(`\n>>> Starting simulation for: ${scenario.name}`);
    try {
      const startRes = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: scenario.idea,
          financials: scenario.financials,
          context: scenario.context
        })
      });

      const startData = await startRes.json();
      const { jobId } = startData;
      
      if (!jobId) {
        throw new Error(`No jobId returned: ${JSON.stringify(startData)}`);
      }
      
      console.log(`Job enqueued: ${jobId}`);

      const result = await pollStatus(jobId);
      console.log(`\nSimulation COMPLETED for ${scenario.name}`);

      const filePath = path.join(RESULTS_DIR, `${scenario.name}_result.json`);
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
      console.log(`Results saved to: ${filePath}`);

    } catch (err) {
      console.error(`Simulation FAILED for ${scenario.name}:`, err.message);
    }
  }
}

runSimulations().then(() => console.log("\nAll simulations finished."));

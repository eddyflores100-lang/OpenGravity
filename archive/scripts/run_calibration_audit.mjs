import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAudit() {
  const groundTruthPath = './ground_truth_v1.json';
  const logPath = './open-gravity-ui/emergency_audit_log.jsonl';
  const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));
  const endpoint = "http://localhost:3000/api/predict";

  console.log(`\n🚀 INICIANDO AUDITORÍA ESTADÍSTICA (FASE 1: ENCOLAMIENTO)`);
  
  const jobIds = groundTruth.map(s => `audit_v1_${s.name.replace(/ /g, '_')}`);

  // Limpiar log antes de empezar
  if (fs.existsSync(logPath)) fs.truncateSync(logPath, 0);

  // Check if server is up
  try {
    await fetch(endpoint.replace('/api/predict', '/api/hello')); // Or any valid endpoint
  } catch(e) {
    console.log("⚠️ Esperando a que el servidor Next.js esté listo en puerto 3000...");
    await sleep(5000);
  }

  let finalizedResults = new Map();


  for (let i = 0; i < groundTruth.length; i++) {
    const startup = groundTruth[i];
    const jobId = jobIds[i];
    console.log(`\n[${i+1}/${groundTruth.length}] Procesando: ${startup.name}...`);
    
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: startup.idea,
          jobId: jobId,
          context: { specialization: startup.specialization, skipIntake: true },
          financials: startup.financials
        })
      });

      // Poll log for THIS specific jobId
      let found = false;
      let pollAttempts = 0;
      while (!found && pollAttempts < 60) {
        pollAttempts++;
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          const lines = content.trim().split('\n').filter(l => l.length > 0);
          for (const line of lines) {
            const item = JSON.parse(line);
            if (item.jobId === jobId) {
              const pSuccess = (item.report?.viabilityScore || 0) / 100;
              finalizedResults.set(jobId, {
                name: startup.name,
                predicted: pSuccess,
                actual: startup.ground_truth,
                error: Math.pow(pSuccess - startup.ground_truth, 2)
              });
              console.log(`   ✅ Resultado: P(success)=${pSuccess} | Actual=${startup.ground_truth}`);
              found = true;
              break;
            }
          }
        }
        if(!found) await sleep(2000);
      }
    } catch (e) {
      console.error(`Error en ${startup.name}:`, e.message);
    }
  }

  // --- CÁLCULO DE MÉTRICAS ---
  const results = Array.from(finalizedResults.values());
  const n = results.length;
  if (n === 0) { console.error("No se recolectaron resultados."); return; }

  const brierScore = results.reduce((acc, curr) => acc + curr.error, 0) / n;
  const correct = results.filter(r => (r.predicted >= 0.5 && r.actual === 1) || (r.predicted < 0.5 && r.actual === 0)).length;
  const accuracy = correct / n;
  
  const tp = results.filter(r => r.predicted >= 0.5 && r.actual === 1).length;
  const fp = results.filter(r => r.predicted >= 0.5 && r.actual === 0).length;
  const fn = results.filter(r => r.predicted < 0.5 && r.actual === 1).length;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;

  console.log(`\n=========================================`);
  console.log(`📈 MÉTRICAS DE CALIBRACIÓN REAL (V1)`);
  console.log(`=========================================`);
  console.log(`Total Casos:    ${n}`);
  console.log(`Brier Score:    ${brierScore.toFixed(4)}`);
  console.log(`Accuracy:       ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Precision:      ${(precision * 100).toFixed(2)}%`);
  console.log(`Recall:         ${(recall * 100).toFixed(2)}%`);
  console.log(`=========================================\n`);

  // --- EXPORTAR A CSV (EXCEL COMPATIBLE) ---
  const csvHeaders = "Name,Predicted,Actual,Error\n";
  const csvRows = results.map(r => `${r.name},${r.predicted},${r.actual},${r.error.toFixed(4)}`).join('\n');
  fs.writeFileSync('reporte_calibracion_100_casos.csv', csvHeaders + csvRows);
  console.log(`✅ Reporte Excel (CSV) generado: reporte_calibracion_100_casos.csv`);

  fs.writeFileSync('calibracion_analytics.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics: { brierScore, accuracy, precision, recall },
    results
  }, null, 2));
}

runAudit();

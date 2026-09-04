import fs from 'fs';

async function main() {
    const endpoint = "http://localhost:3000/api/predict";
    const idea = "Concesión y construcción a 50 años de una red de trenes de levitación magnética (Maglev) de ultra alta velocidad conectando toda la costa pacífica de Sudamérica. Requiere $120 Millones en estudios iniciales y $15 Billones en CAPEX antes de mover el primer tren.";
    
    console.log("Inyectando Test Level 10 (Hardware/Mega-Infraestructura)...");
    
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idea: idea,
            jobId: "Infra_Maglev_Test",
            context: { specialization: "hardware", source: "Calibration" },
            financials: {
                cac: 50,           // Costo por ticket/pasajero
                monthly_burn: 50000000,   // $50M burn asumiendo intereses y capex estructurado
                initial_cash: 15000000000, 
                market_size: 100000000,
                gross_margin: 0.15 
            }
        })
    });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
}

main();

/**
 * 🔬 OPENGRAVITY SEC FINANCIAL EXTRACTOR
 * Pulls real Revenue, Net Income, and Assets from SEC EDGAR XBRL API
 * to compute actual LTV/CAC proxies (Revenue per $ of Sales expense)
 */

const SEC_COMPANIES = [
  { name: "Airbnb",     cik: "0001559720" },
  { name: "Dropbox",    cik: "0001467623" },
  { name: "Uber",       cik: "0001543151" },
  { name: "Zoom",       cik: "0001585521" },
  { name: "Shopify",    cik: "0001594805" },
  { name: "Peloton",    cik: "0001639825" },
  { name: "Blue Apron", cik: "0001701114" },
  { name: "WeWork",     cik: "0001533523" },
];

// XBRL concepts to pull
const CONCEPTS = [
  { tag: "Revenues", taxonomy: "us-gaap" },
  { tag: "RevenueFromContractWithCustomerExcludingAssessedTax", taxonomy: "us-gaap" },
  { tag: "NetIncomeLoss", taxonomy: "us-gaap" },
  { tag: "SellingAndMarketingExpense", taxonomy: "us-gaap" },
  { tag: "SellingGeneralAndAdministrativeExpense", taxonomy: "us-gaap" },
  { tag: "Assets", taxonomy: "us-gaap" },
  { tag: "CashAndCashEquivalentsAtCarryingValue", taxonomy: "us-gaap" },
];

async function fetchCompanyFacts(cik) {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'OpenGravity Research admin@opengravity.dev' }
  });
  if (!resp.ok) return null;
  return resp.json();
}

function extractLatestAnnual(facts, taxonomy, tag) {
  const concept = facts?.facts?.[taxonomy]?.[tag];
  if (!concept) return null;
  
  const usd = concept.units?.USD;
  if (!usd || usd.length === 0) return null;
  
  // Get annual filings (10-K) only, most recent first
  const annuals = usd
    .filter(d => d.form === '10-K' && d.frame)
    .sort((a, b) => (b.end || '').localeCompare(a.end || ''));
  
  if (annuals.length === 0) return null;
  
  // Return most recent + one prior year for growth calc
  return {
    latest: { val: annuals[0].val, period: annuals[0].end, frame: annuals[0].frame },
    prior: annuals[1] ? { val: annuals[1].val, period: annuals[1].end, frame: annuals[1].frame } : null
  };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  🔬 SEC EDGAR XBRL — Real Financial Data Extraction     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  
  for (const company of SEC_COMPANIES) {
    console.log(`\n━━━ ${company.name.toUpperCase()} (CIK: ${company.cik}) ━━━`);
    
    const facts = await fetchCompanyFacts(company.cik);
    if (!facts) {
      console.log("  ❌ Could not fetch XBRL data");
      await new Promise(r => setTimeout(r, 200));
      continue;
    }
    
    // Extract each concept
    for (const { tag, taxonomy } of CONCEPTS) {
      const data = extractLatestAnnual(facts, taxonomy, tag);
      if (data) {
        const valStr = (data.latest.val / 1e6).toFixed(1);
        let growthStr = '';
        if (data.prior) {
          const growth = ((data.latest.val - data.prior.val) / Math.abs(data.prior.val)) * 100;
          growthStr = ` | YoY: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
        }
        console.log(`  ${tag.padEnd(52)} $${valStr.padStart(10)}M (${data.latest.frame})${growthStr}`);
      }
    }
    
    // Compute LTV/CAC proxy: Revenue / S&M Expense
    const rev = extractLatestAnnual(facts, 'us-gaap', 'Revenues') || 
                extractLatestAnnual(facts, 'us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax');
    const sm  = extractLatestAnnual(facts, 'us-gaap', 'SellingAndMarketingExpense') ||
                extractLatestAnnual(facts, 'us-gaap', 'SellingGeneralAndAdministrativeExpense');
    const cash = extractLatestAnnual(facts, 'us-gaap', 'CashAndCashEquivalentsAtCarryingValue');
    const netIncome = extractLatestAnnual(facts, 'us-gaap', 'NetIncomeLoss');
    
    if (rev && sm && sm.latest.val !== 0) {
      const ratio = rev.latest.val / Math.abs(sm.latest.val);
      console.log(`\n  📊 Revenue/S&M Ratio (LTV/CAC Proxy): ${ratio.toFixed(2)}x`);
    }
    if (rev?.prior && rev?.latest) {
      const revGrowth = ((rev.latest.val - rev.prior.val) / Math.abs(rev.prior.val)) * 100;
      console.log(`  📈 Revenue Growth YoY: ${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`);
    }
    if (cash && netIncome) {
      const monthlyBurn = netIncome.latest.val < 0 ? Math.abs(netIncome.latest.val) / 12 : 0;
      if (monthlyBurn > 0) {
        const runwayMonths = cash.latest.val / monthlyBurn;
        console.log(`  ⏳ Estimated Runway: ${runwayMonths.toFixed(0)} months (Cash / Monthly Net Loss)`);
      } else {
        console.log(`  ✅ Cash-flow Positive (Net Income > 0)`);
      }
    }
    
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }
  
  console.log("\n\n✅ Financial extraction complete.");
}

main().catch(console.error);

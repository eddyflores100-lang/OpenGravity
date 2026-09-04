/**
 * 🌌 OPENGRAVITY ENCYCLOPEDIA HARVESTER V1.0
 * ══════════════════════════════════════════════════════════════════
 * Connects to 7 FREE APIs (zero cost, no API keys) to build
 * the most comprehensive startup intelligence database possible.
 *
 * APIs:
 * 1. YC Companies API — 5,690 startups (status, batch, team, sector)
 * 2. SEC EDGAR XBRL — Real financials from 10-K/10-Q filings
 * 3. Wikidata SPARQL — Founding date, employees, industry, HQ
 * 4. Hacker News Algolia — Community traction (points, comments)
 * 5. World Bank API — Macro indicators (GDP growth, interest rates)
 * 6. GitHub API — Open source traction (stars, forks, contributors)
 * 7. Wikipedia API — Company descriptions and infobox data
 * ══════════════════════════════════════════════════════════════════
 */

import { writeFileSync } from 'fs';

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const RESULTS = {};

// ═══════════════════════════════════════════════════════════════
// TARGETS: Companies to research
// ═══════════════════════════════════════════════════════════════
const TARGETS = [
  // Current dataset winners
  "Airbnb", "Dropbox", "Stripe", "Slack", "Figma",
  "WhatsApp", "Zoom", "Shopify", "Instagram", "Uber",
  // Current dataset failures
  "Quibi", "Juicero", "Theranos", "WeWork", "Clubhouse",
  "Peloton", "Blue Apron", "Jawbone", "Katerra",
  // Potential additions (famous cases)
  "Coinbase", "DoorDash", "Robinhood", "Palantir", "Snowflake",
  "Unity Technologies", "Rivian", "Bird scooter", "Wag dog walking",
  "Lime scooter", "MoviePass", "Solyndra", "Pets.com",
  "Snap Inc", "Pinterest", "Twilio", "Datadog",
  "CrowdStrike", "Roku", "Square", "Affirm"
];

// ═══════════════════════════════════════════════════════════════
// 1. WIKIDATA SPARQL — Structured company data (NO AUTH)
// ═══════════════════════════════════════════════════════════════
async function fetchWikidata() {
  console.log("\n═══ 📚 WIKIDATA SPARQL (Structured Knowledge Graph) ═══\n");

  const sparql = `
    SELECT ?company ?companyLabel ?foundingDate ?employees ?countryLabel ?industryLabel ?inception WHERE {
      VALUES ?companyLabel { ${TARGETS.map(t => `"${t}"@en`).join(' ')} }
      ?company rdfs:label ?companyLabel.
      FILTER(LANG(?companyLabel) = "en")
      ?company wdt:P31/wdt:P279* wd:Q783794.
      OPTIONAL { ?company wdt:P571 ?foundingDate. }
      OPTIONAL { ?company wdt:P1128 ?employees. }
      OPTIONAL { ?company wdt:P17 ?country. }
      OPTIONAL { ?company wdt:P452 ?industry. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 200
  `;

  // Fallback: query individual companies for better results
  const wikiResults = [];
  const simpleTargets = ["Airbnb", "Dropbox", "Stripe", "Uber", "Shopify", "Snap Inc",
    "Pinterest", "Twilio", "Coinbase", "WeWork", "Peloton", "Palantir"];

  for (const company of simpleTargets) {
    try {
      const q = `
        SELECT ?item ?itemLabel ?foundingDate ?employees ?countryLabel ?industryLabel WHERE {
          ?item rdfs:label "${company}"@en.
          ?item wdt:P31/wdt:P279* wd:Q783794.
          OPTIONAL { ?item wdt:P571 ?foundingDate. }
          OPTIONAL { ?item wdt:P1128 ?employees. }
          OPTIONAL { ?item wdt:P17 ?country. }
          OPTIONAL { ?item wdt:P452 ?industry. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 1
      `;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}&format=json`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity/1.0 (research)', 'Accept': 'application/json' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const bindings = data.results?.bindings;
        if (bindings?.[0]) {
          const b = bindings[0];
          const result = {
            name: company,
            wikidata_id: b.item?.value?.split('/').pop(),
            founded: b.foundingDate?.value?.slice(0, 10),
            employees: b.employees?.value ? parseInt(b.employees.value) : null,
            country: b.countryLabel?.value,
            industry: b.industryLabel?.value,
          };
          wikiResults.push(result);
          console.log(`  ✅ ${company.padEnd(18)} Founded:${(result.founded||'?').padEnd(12)} Emp:${String(result.employees||'?').padEnd(8)} ${result.country||''}`);
        } else {
          console.log(`  ⚠️ ${company.padEnd(18)} No Wikidata match`);
        }
      }
    } catch (e) {
      console.log(`  ❌ ${company.padEnd(18)} Error: ${e.message.slice(0,50)}`);
    }
    await delay(500); // Be polite to Wikidata
  }

  RESULTS.wikidata = wikiResults;
  console.log(`\n  Total: ${wikiResults.length} companies enriched from Wikidata`);
}

// ═══════════════════════════════════════════════════════════════
// 2. HACKER NEWS ALGOLIA — Community traction (NO AUTH)
// ═══════════════════════════════════════════════════════════════
async function fetchHackerNews() {
  console.log("\n═══ 🔶 HACKER NEWS ALGOLIA (Community Traction) ═══\n");

  const hnResults = [];
  for (const company of TARGETS.slice(0, 30)) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query="${company}"&tags=story&hitsPerPage=0`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const totalHits = data.nbHits || 0;

        // Get top story points
        const topUrl = `https://hn.algolia.com/api/v1/search?query="${company}"&tags=story&hitsPerPage=3`;
        const topResp = await fetch(topUrl);
        const topData = topResp.ok ? await topResp.json() : { hits: [] };
        const topPoints = topData.hits?.[0]?.points || 0;
        const topTitle = topData.hits?.[0]?.title?.slice(0, 60) || '';

        hnResults.push({
          name: company,
          total_mentions: totalHits,
          top_story_points: topPoints,
          top_story_title: topTitle
        });
        console.log(
          `  ${company.padEnd(18)} Mentions:${String(totalHits).padStart(6)} ` +
          `TopPts:${String(topPoints).padStart(5)} "${topTitle.slice(0,45)}"`
        );
      }
    } catch (e) {
      console.log(`  ❌ ${company}: ${e.message.slice(0,50)}`);
    }
    await delay(200);
  }

  RESULTS.hacker_news = hnResults;
  console.log(`\n  Total: ${hnResults.length} companies with HN traction data`);
}

// ═══════════════════════════════════════════════════════════════
// 3. WORLD BANK API — Macro Indicators (NO AUTH)
// ═══════════════════════════════════════════════════════════════
async function fetchWorldBank() {
  console.log("\n═══ 🌍 WORLD BANK API (Macro Indicators) ═══\n");

  const indicators = [
    { id: "NY.GDP.MKTP.KD.ZG", name: "GDP Growth (%)" },
    { id: "FR.INR.RINR", name: "Real Interest Rate (%)" },
    { id: "IC.BUS.NREG", name: "New Business Registrations" },
    { id: "CM.MKT.LCAP.CD", name: "Market Capitalization ($)" },
    { id: "BX.KLT.DINV.CD.WD", name: "Foreign Direct Investment ($)" },
  ];

  const wbResults = {};
  for (const ind of indicators) {
    try {
      const url = `https://api.worldbank.org/v2/country/US/indicator/${ind.id}?date=2015:2025&format=json&per_page=15`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const records = data[1]?.filter(r => r.value !== null) || [];
        const values = records.map(r => ({ year: r.date, value: r.value })).slice(0, 8);
        wbResults[ind.id] = { name: ind.name, data: values };
        console.log(`  ✅ ${ind.name.padEnd(35)} ${values.length} years of data`);
        if (values.length > 0) {
          values.slice(0, 4).forEach(v => {
            console.log(`     ${v.year}: ${typeof v.value === 'number' ? v.value.toLocaleString() : v.value}`);
          });
        }
      }
    } catch (e) {
      console.log(`  ❌ ${ind.name}: ${e.message.slice(0,50)}`);
    }
    await delay(300);
  }

  RESULTS.world_bank = wbResults;
}

// ═══════════════════════════════════════════════════════════════
// 4. GITHUB API — Open Source traction (NO AUTH, 60 req/hr)
// ═══════════════════════════════════════════════════════════════
async function fetchGitHub() {
  console.log("\n═══ 🐙 GITHUB API (Open Source Traction) ═══\n");

  const ghTargets = [
    { company: "Stripe", repo: "stripe/stripe-node" },
    { company: "Airbnb", repo: "airbnb/javascript" },
    { company: "Dropbox", repo: "dropbox/dropbox-sdk-js" },
    { company: "Shopify", repo: "Shopify/hydrogen" },
    { company: "Uber", repo: "uber-go/zap" },
    { company: "Figma", repo: "figma/plugin-samples" },
    { company: "Slack", repo: "slackapi/bolt-js" },
    { company: "Palantir", repo: "palantir/blueprint" },
    { company: "Twilio", repo: "twilio/twilio-node" },
    { company: "Square", repo: "square/okhttp" },
    { company: "Coinbase", repo: "coinbase/coinbase-sdk-nodejs" },
    { company: "Snap", repo: "nicklockwood/SwiftFormat" }, // proxy
  ];

  const ghResults = [];
  for (const { company, repo } of ghTargets) {
    try {
      const url = `https://api.github.com/repos/${repo}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity/1.0' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const result = {
          company,
          repo,
          stars: data.stargazers_count,
          forks: data.forks_count,
          watchers: data.watchers_count,
          open_issues: data.open_issues_count,
          language: data.language,
          updated: data.pushed_at?.slice(0, 10),
          created: data.created_at?.slice(0, 10),
        };
        ghResults.push(result);
        console.log(
          `  ✅ ${company.padEnd(14)} ${repo.padEnd(35)} ⭐${String(data.stargazers_count).padStart(7)} ` +
          `🍴${String(data.forks_count).padStart(6)} ${data.language || ''}`
        );
      } else {
        console.log(`  ⚠️ ${company.padEnd(14)} ${repo} — HTTP ${resp.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${company}: ${e.message.slice(0,50)}`);
    }
    await delay(1200); // GitHub rate limit: 60/hr without auth
  }

  RESULTS.github = ghResults;
  console.log(`\n  Total: ${ghResults.length} repos analyzed`);
}

// ═══════════════════════════════════════════════════════════════
// 5. WIKIPEDIA API — Company descriptions (NO AUTH)
// ═══════════════════════════════════════════════════════════════
async function fetchWikipedia() {
  console.log("\n═══ 📖 WIKIPEDIA API (Company Descriptions) ═══\n");

  const wikiTargets = [
    "Quibi", "Juicero", "Theranos", "Jawbone_(company)", "Katerra",
    "Solyndra", "MoviePass", "Pets.com", "Bird_(company)", "Wag!_(company)",
    "Rivian", "DoorDash", "Robinhood_(company)", "CrowdStrike", "Datadog",
    "Affirm_(company)", "Roku", "Snowflake_Inc."
  ];

  const wikiResults = [];
  for (const title of wikiTargets) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity/1.0 (research)' }
      });
      if (resp.ok) {
        const data = await resp.json();
        wikiResults.push({
          title: data.title,
          description: data.description,
          extract: data.extract?.slice(0, 200),
          type: data.type
        });
        console.log(`  ✅ ${(data.title||title).padEnd(22)} ${(data.description||'').slice(0,55)}`);
      } else {
        console.log(`  ⚠️ ${title.padEnd(22)} HTTP ${resp.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${title}: ${e.message.slice(0,50)}`);
    }
    await delay(200);
  }

  RESULTS.wikipedia = wikiResults;
  console.log(`\n  Total: ${wikiResults.length} company descriptions fetched`);
}

// ═══════════════════════════════════════════════════════════════
// 6. SEC EDGAR — Financial data for ALL public targets
// ═══════════════════════════════════════════════════════════════
async function fetchSECBatch() {
  console.log("\n═══ 🏛️ SEC EDGAR XBRL (Real Financials) ═══\n");

  const secTargets = [
    { name: "Airbnb",      cik: "0001559720" },
    { name: "Dropbox",     cik: "0001467623" },
    { name: "Uber",        cik: "0001543151" },
    { name: "Zoom",        cik: "0001585521" },
    { name: "Shopify",     cik: "0001594805" },
    { name: "Peloton",     cik: "0001639825" },
    { name: "Coinbase",    cik: "0001679788" },
    { name: "DoorDash",    cik: "0001792789" },
    { name: "Robinhood",   cik: "0001783879" },
    { name: "Palantir",    cik: "0001321655" },
    { name: "Snowflake",   cik: "0001640147" },
    { name: "Snap",        cik: "0001564408" },
    { name: "Pinterest",   cik: "0001562088" },
    { name: "Twilio",      cik: "0001447669" },
    { name: "Datadog",     cik: "0001561550" },
    { name: "CrowdStrike", cik: "0001535527" },
    { name: "Roku",        cik: "0001428439" },
    { name: "Square/Block",cik: "0001512673" },
    { name: "Affirm",      cik: "0001820953" },
    { name: "Rivian",      cik: "0001874178" },
  ];

  const secResults = [];
  for (const target of secTargets) {
    try {
      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${target.cik}.json`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity Research admin@opengravity.dev' }
      });
      if (!resp.ok) { console.log(`  ⚠️ ${target.name.padEnd(15)} HTTP ${resp.status}`); continue; }
      const facts = await resp.json();

      // Extract key metrics
      const extract = (taxonomy, tag) => {
        const usd = facts?.facts?.[taxonomy]?.[tag]?.units?.USD;
        if (!usd) return null;
        const annual = usd.filter(d => d.form === '10-K' && d.frame).sort((a,b) => (b.end||'').localeCompare(a.end||''));
        return annual[0] ? { val: annual[0].val, period: annual[0].end } : null;
      };

      const rev  = extract('us-gaap','Revenues') || extract('us-gaap','RevenueFromContractWithCustomerExcludingAssessedTax');
      const ni   = extract('us-gaap','NetIncomeLoss');
      const sm   = extract('us-gaap','SellingAndMarketingExpense');
      const sga  = extract('us-gaap','SellingGeneralAndAdministrativeExpense');
      const cash = extract('us-gaap','CashAndCashEquivalentsAtCarryingValue');
      const assets = extract('us-gaap','Assets');

      const salesExp = sm || sga;
      const revSM = (rev && salesExp && salesExp.val !== 0) ? (rev.val / Math.abs(salesExp.val)).toFixed(2) : null;

      const result = {
        name: target.name,
        revenue_M: rev ? (rev.val/1e6).toFixed(0) : null,
        net_income_M: ni ? (ni.val/1e6).toFixed(0) : null,
        sales_expense_M: salesExp ? (salesExp.val/1e6).toFixed(0) : null,
        cash_M: cash ? (cash.val/1e6).toFixed(0) : null,
        assets_M: assets ? (assets.val/1e6).toFixed(0) : null,
        rev_sm_ratio: revSM,
        period: rev?.period || ni?.period || '?'
      };
      secResults.push(result);

      console.log(
        `  ✅ ${target.name.padEnd(15)} Rev:$${(result.revenue_M||'?')+'M'.padEnd(8)} ` +
        `NI:$${(result.net_income_M||'?')+'M'.padEnd(8)} ` +
        `Rev/S&M:${(revSM||'?')+'x'.padEnd(6)} ` +
        `Cash:$${(result.cash_M||'?')+'M'.padEnd(8)} ` +
        `(${result.period})`
      );
    } catch (e) {
      console.log(`  ❌ ${target.name}: ${e.message.slice(0,50)}`);
    }
    await delay(200); // SEC rate limit: 10 req/s
  }

  RESULTS.sec_edgar = secResults;
  console.log(`\n  Total: ${secResults.length} companies with real financial data`);
}

// ═══════════════════════════════════════════════════════════════
// 7. YC COMPANIES — All 5,690 companies
// ═══════════════════════════════════════════════════════════════
async function fetchYCAll() {
  console.log("\n═══ 🟠 YC COMPANIES — Full Database ═══\n");

  try {
    const resp = await fetch('https://yc-oss.github.io/api/companies/all.json');
    if (resp.ok) {
      const all = await resp.json();
      console.log(`  Total YC companies: ${all.length}`);

      // Status breakdown
      const statusMap = {};
      all.forEach(c => { statusMap[c.status||'Unknown'] = (statusMap[c.status||'Unknown']||0) + 1; });
      console.log(`  Status breakdown:`);
      Object.entries(statusMap).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
        console.log(`    ${k.padEnd(12)} ${v} (${((v/all.length)*100).toFixed(1)}%)`);
      });

      // Batch breakdown (last 5 years)
      const batchMap = {};
      all.forEach(c => { if (c.batch) batchMap[c.batch] = (batchMap[c.batch]||0) + 1; });
      const recentBatches = Object.entries(batchMap)
        .filter(([k]) => k.includes('202'))
        .sort((a,b) => b[0].localeCompare(a[0]));
      console.log(`\n  Recent batches:`);
      recentBatches.slice(0,10).forEach(([k,v]) => console.log(`    ${k}: ${v} companies`));

      // Tag frequency
      const tagMap = {};
      all.forEach(c => (c.tags||[]).forEach(t => { tagMap[t] = (tagMap[t]||0) + 1; }));
      const topTags = Object.entries(tagMap).sort((a,b) => b[1]-a[1]).slice(0, 15);
      console.log(`\n  Top 15 sectors:`);
      topTags.forEach(([k,v]) => console.log(`    ${k.padEnd(28)} ${v} companies`));

      // Dead companies for dataset expansion
      const dead = all.filter(c => c.status === 'Inactive' || c.status === 'Dead');
      console.log(`\n  Dead/Inactive companies: ${dead.length} (candidates for FAILURE dataset)`);
      
      // Save dead companies for later use
      RESULTS.yc_dead = dead.map(c => ({
        name: c.name,
        batch: c.batch,
        tags: (c.tags||[]).slice(0,3),
        team_size: c.team_size,
        one_liner: (c.one_liner||'').slice(0,100),
        url: c.url,
        long_description: (c.long_description||'').slice(0,200)
      }));

      RESULTS.yc_stats = {
        total: all.length,
        status: statusMap,
        recent_batches: Object.fromEntries(recentBatches.slice(0,10)),
        top_tags: Object.fromEntries(topTags)
      };
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Run all harvesters + save encyclopedia
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  🌌 OPENGRAVITY ENCYCLOPEDIA HARVESTER V1.0                 ║");
  console.log("║  7 Free APIs • Zero Cost • Full Automation                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  const t0 = Date.now();
  
  await fetchYCAll();
  await fetchSECBatch();
  await fetchWikidata();
  await fetchHackerNews();
  await fetchWorldBank();
  await fetchGitHub();
  await fetchWikipedia();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // Save full encyclopedia
  RESULTS.metadata = {
    generated: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    apis_used: [
      "YC Companies API (yc-oss.github.io)",
      "SEC EDGAR XBRL (data.sec.gov)",
      "Wikidata SPARQL (query.wikidata.org)",
      "Hacker News Algolia (hn.algolia.com)",
      "World Bank API (api.worldbank.org)",
      "GitHub API (api.github.com)",
      "Wikipedia REST (en.wikipedia.org)"
    ]
  };

  writeFileSync('opengravity_encyclopedia.json', JSON.stringify(RESULTS, null, 2));

  // Final summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  📊 ENCYCLOPEDIA HARVEST COMPLETE                           ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Time:           ${elapsed}s                                  ║`);
  console.log(`║  YC Companies:   ${RESULTS.yc_stats?.total || '?'} total (${RESULTS.yc_dead?.length || '?'} dead)       ║`);
  console.log(`║  SEC Financials: ${RESULTS.sec_edgar?.length || '?'} companies with real 10-K data    ║`);
  console.log(`║  Wikidata:       ${RESULTS.wikidata?.length || '?'} companies with structured data    ║`);
  console.log(`║  Hacker News:    ${RESULTS.hacker_news?.length || '?'} companies with traction data    ║`);
  console.log(`║  World Bank:     ${Object.keys(RESULTS.world_bank||{}).length || '?'} macro indicators (US 2015-2025) ║`);
  console.log(`║  GitHub:         ${RESULTS.github?.length || '?'} repos with star/fork metrics     ║`);
  console.log(`║  Wikipedia:      ${RESULTS.wikipedia?.length || '?'} company descriptions             ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  Output: opengravity_encyclopedia.json                      ║");
  console.log("║  Cost:   $0.00 (all free APIs, no keys needed)              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

main().catch(console.error);

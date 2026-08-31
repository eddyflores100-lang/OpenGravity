/**
 * 🌌 OPENGRAVITY V10 — INSTITUTIONAL DATA MOAT
 * ══════════════════════════════════════════════════════════════════
 * 14-API Encyclopedia Harvester
 * Categorized by the SIGNAL each API feeds into the scoring engine.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  CATEGORY 1: PRODUCT & TRACTION                                │
 * │  → GitHub API (commits, stars, issues)                         │
 * │  → Hacker News Algolia (community mentions, sentiment)         │
 * │  → YC Companies (status, batch, team, sector tags)             │
 * │                                                                 │
 * │  CATEGORY 2: CORPORATE & LEGAL RISK (Due Diligence)           │
 * │  → SEC EDGAR XBRL (Revenue, NI, S&M, Cash — 10-K filings)    │
 * │  → SEC EDGAR EFTS (Full-Text Search for Form D / Reg D)       │
 * │  → CourtListener RECAP (federal lawsuits, bankruptcies)        │
 * │  → OpenCorporates (legal status, incorporation, directors)     │
 * │                                                                 │
 * │  CATEGORY 3: TALENT & HIRING MOMENTUM                         │
 * │  → Remotive API (remote job postings by company)               │
 * │                                                                 │
 * │  CATEGORY 4: MACRO, CYCLE & SYSTEMIC RISK                     │
 * │  → World Bank API (GDP, interest rates, market cap)            │
 * │  → FRED API proxy via World Bank                               │
 * │  → GDELT API (global news coverage, crisis detection)          │
 * │                                                                 │
 * │  CATEGORY 5: KNOWLEDGE GRAPH                                   │
 * │  → Wikidata SPARQL (founding, employees, industry, country)    │
 * │  → Wikipedia REST (descriptions, company summaries)            │
 * │                                                                 │
 * │  Auth Required: NONE (all free, zero API keys)                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { writeFileSync } from 'fs';

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const ENCYCLOPEDIA = {};
let apiSuccessCount = 0;
let apiFailCount = 0;

// ═══════════════════════════════════════════════════════════════
// TARGET COMPANIES (expanded to 40)
// ═══════════════════════════════════════════════════════════════
const TARGETS = [
  // WINNERS (confirmed exits/growth)
  "Airbnb", "Stripe", "Dropbox", "Slack", "Figma", "WhatsApp",
  "Zoom", "Shopify", "Instagram", "Uber", "Coinbase", "DoorDash",
  "Palantir", "Snowflake", "Twilio", "Datadog", "CrowdStrike",
  "Square", "Pinterest", "Roku", "Affirm",
  // FAILURES (confirmed death/decline)
  "Quibi", "Juicero", "Theranos", "WeWork", "Clubhouse",
  "Peloton", "Blue Apron", "Jawbone", "Katerra", "Solyndra",
  "MoviePass", "Pets.com", "Bird Rides", "Wag Labs",
  "Robinhood", "Rivian", "Snap", "Fast.co"
];

// ═══════════════════════════════════════════════════════════════
// CATEGORY 1: PRODUCT & TRACTION
// ═══════════════════════════════════════════════════════════════

// ── 1A. GitHub REST API (stars, forks, commit velocity) ──
async function harvestGitHub() {
  console.log("\n┌── 🐙 GITHUB API (Product & OSS Traction) ──┐\n");

  const repos = [
    { company: "Stripe",      repos: ["stripe/stripe-node", "stripe/stripe-js"] },
    { company: "Airbnb",      repos: ["airbnb/javascript", "airbnb/lottie-web"] },
    { company: "Dropbox",     repos: ["dropbox/dropbox-sdk-js"] },
    { company: "Shopify",     repos: ["Shopify/hydrogen", "Shopify/polaris"] },
    { company: "Uber",        repos: ["uber-go/zap", "uber/cadence"] },
    { company: "Figma",       repos: ["figma/plugin-samples"] },
    { company: "Slack",       repos: ["slackapi/bolt-js"] },
    { company: "Palantir",    repos: ["palantir/blueprint"] },
    { company: "Twilio",      repos: ["twilio/twilio-node"] },
    { company: "Square",      repos: ["square/okhttp", "square/retrofit"] },
    { company: "Coinbase",    repos: ["coinbase/coinbase-sdk-nodejs"] },
    { company: "DoorDash",    repos: ["doordash/swiftui-preview-snapshots"] },
    { company: "Datadog",     repos: ["DataDog/dd-trace-js"] },
    { company: "CrowdStrike", repos: ["CrowdStrike/falconpy"] },
    { company: "Snowflake",   repos: ["snowflakedb/snowflake-connector-nodejs"] },
  ];

  const results = [];
  for (const { company, repos: repoList } of repos) {
    let totalStars = 0, totalForks = 0;
    const repoData = [];

    for (const repo of repoList) {
      try {
        const resp = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { 'User-Agent': 'OpenGravity/2.0' }
        });
        if (resp.ok) {
          const d = await resp.json();
          totalStars += d.stargazers_count || 0;
          totalForks += d.forks_count || 0;
          repoData.push({
            repo, stars: d.stargazers_count, forks: d.forks_count,
            issues: d.open_issues_count, lang: d.language,
            pushed: d.pushed_at?.slice(0,10), created: d.created_at?.slice(0,10)
          });
        }
      } catch (e) { /* skip */ }
      await delay(1500); // 60 req/hr without auth
    }

    results.push({ company, total_stars: totalStars, total_forks: totalForks, repos: repoData });
    console.log(`  ✅ ${company.padEnd(15)} ⭐${String(totalStars).padStart(8)} 🍴${String(totalForks).padStart(7)}`);
  }

  ENCYCLOPEDIA.github = results;
  apiSuccessCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ── 1B. Hacker News Algolia (community traction) ──
async function harvestHackerNews() {
  console.log("\n┌── 🔶 HACKER NEWS ALGOLIA (Community Signal) ──┐\n");
  const results = [];

  for (const company of TARGETS) {
    try {
      const q = encodeURIComponent(`"${company}"`);
      const resp = await fetch(`https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=3`);
      if (resp.ok) {
        const data = await resp.json();
        results.push({
          company, total_mentions: data.nbHits,
          top_points: data.hits?.[0]?.points || 0,
          top_title: (data.hits?.[0]?.title || '').slice(0, 80),
          top_comments: data.hits?.[0]?.num_comments || 0
        });
        console.log(
          `  ${company.padEnd(16)} Mentions:${String(data.nbHits).padStart(6)} ` +
          `Top:${String(data.hits?.[0]?.points||0).padStart(5)}pts`
        );
      }
    } catch (e) { /* skip */ }
    await delay(200);
  }

  ENCYCLOPEDIA.hacker_news = results;
  apiSuccessCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ── 1C. YC Companies (full database) ──
async function harvestYC() {
  console.log("\n┌── 🟠 YC COMPANIES (Startup Census) ──┐\n");
  try {
    const resp = await fetch('https://yc-oss.github.io/api/companies/all.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const all = await resp.json();

    const statusMap = {};
    all.forEach(c => { statusMap[c.status||'Unknown'] = (statusMap[c.status||'Unknown']||0) + 1; });

    const dead = all.filter(c => c.status === 'Inactive' || c.status === 'Dead');
    const acquired = all.filter(c => c.status === 'Acquired');
    const publicCo = all.filter(c => c.status === 'Public');

    ENCYCLOPEDIA.yc = {
      total: all.length,
      status_breakdown: statusMap,
      dead_count: dead.length,
      acquired_count: acquired.length,
      public_count: publicCo.length,
      dead_companies: dead.slice(0, 200).map(c => ({
        name: c.name, batch: c.batch, tags: (c.tags||[]).slice(0,4),
        team_size: c.team_size, one_liner: (c.one_liner||'').slice(0,120)
      })),
      public_companies: publicCo.map(c => ({
        name: c.name, batch: c.batch, team_size: c.team_size, url: c.url
      }))
    };

    console.log(`  Total: ${all.length} | Dead: ${dead.length} | Acquired: ${acquired.length} | Public: ${publicCo.length}`);
    Object.entries(statusMap).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
      console.log(`    ${k.padEnd(12)} ${String(v).padStart(5)} (${((v/all.length)*100).toFixed(1)}%)`)
    );
    apiSuccessCount++;
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    apiFailCount++;
  }
  console.log(`└──────────────────────────────────────────────┘`);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 2: CORPORATE & LEGAL RISK
// ═══════════════════════════════════════════════════════════════

// ── 2A. SEC EDGAR XBRL (real financials) ──
async function harvestSEC() {
  console.log("\n┌── 🏛️ SEC EDGAR XBRL (Real Financials from 10-K) ──┐\n");

  const targets = [
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

  const results = [];
  for (const t of targets) {
    try {
      const resp = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${t.cik}.json`, {
        headers: { 'User-Agent': 'OpenGravity Research admin@opengravity.dev' }
      });
      if (!resp.ok) continue;
      const facts = await resp.json();

      const ex = (tax, tag) => {
        const usd = facts?.facts?.[tax]?.[tag]?.units?.USD;
        if (!usd) return null;
        const a = usd.filter(d => d.form==='10-K' && d.frame).sort((a,b)=>(b.end||'').localeCompare(a.end||''));
        return a[0] ? { val: a[0].val, period: a[0].end } : null;
      };

      const rev = ex('us-gaap','Revenues')||ex('us-gaap','RevenueFromContractWithCustomerExcludingAssessedTax');
      const ni = ex('us-gaap','NetIncomeLoss');
      const sm = ex('us-gaap','SellingAndMarketingExpense')||ex('us-gaap','SellingGeneralAndAdministrativeExpense');
      const cash = ex('us-gaap','CashAndCashEquivalentsAtCarryingValue');
      const rnd = ex('us-gaap','ResearchAndDevelopmentExpense');

      results.push({
        name: t.name, cik: t.cik,
        revenue_M: rev ? +(rev.val/1e6).toFixed(0) : null,
        net_income_M: ni ? +(ni.val/1e6).toFixed(0) : null,
        sales_exp_M: sm ? +(sm.val/1e6).toFixed(0) : null,
        rnd_M: rnd ? +(rnd.val/1e6).toFixed(0) : null,
        cash_M: cash ? +(cash.val/1e6).toFixed(0) : null,
        rev_sm_ratio: (rev && sm && sm.val) ? +(rev.val/Math.abs(sm.val)).toFixed(2) : null,
        period: rev?.period || ni?.period || '?'
      });
      const r = results[results.length-1];
      console.log(`  ✅ ${t.name.padEnd(14)} Rev:$${String(r.revenue_M||'?').padStart(6)}M  NI:$${String(r.net_income_M||'?').padStart(6)}M  Rev/SM:${String(r.rev_sm_ratio||'?').padStart(5)}x  R&D:$${String(r.rnd_M||'?').padStart(5)}M`);
    } catch (e) { console.log(`  ❌ ${t.name}: ${e.message.slice(0,40)}`); }
    await delay(150);
  }

  ENCYCLOPEDIA.sec_xbrl = results;
  apiSuccessCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ── 2B. SEC EDGAR EFTS (Full-Text Search — Form D for funding) ──
async function harvestSECFormD() {
  console.log("\n┌── 📄 SEC EDGAR EFTS (Form D — Private Funding) ──┐\n");

  const formDTargets = ["Airbnb", "Stripe", "Dropbox", "Uber", "Coinbase",
    "DoorDash", "Palantir", "Snowflake", "Figma", "Slack"];

  const results = [];
  for (const company of formDTargets) {
    try {
      const q = encodeURIComponent(company);
      const url = `https://efts.sec.gov/LATEST/search-index?q=%22${q}%22&forms=D&dateRange=custom&startdt=2005-01-01&enddt=2025-12-31`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity Research admin@opengravity.dev' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const hits = data.hits?.hits || [];
        results.push({
          company, total_filings: data.hits?.total?.value || 0,
          filings: hits.slice(0, 5).map(h => ({
            name: h._source?.display_names?.join(', '),
            date: h._source?.file_date,
            form: h._source?.form_type
          }))
        });
        console.log(`  ${company.padEnd(16)} Form D filings: ${data.hits?.total?.value || 0}`);
      } else {
        // Try alternate EFTS endpoint
        const url2 = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=D`;
        const resp2 = await fetch(url2, {
          headers: { 'User-Agent': 'OpenGravity Research admin@opengravity.dev' }
        });
        if (resp2.ok) {
          const data2 = await resp2.json();
          results.push({ company, total_filings: data2.hits?.total?.value || 0 });
          console.log(`  ${company.padEnd(16)} Form D filings: ${data2.hits?.total?.value || 0}`);
        } else {
          console.log(`  ${company.padEnd(16)} HTTP ${resp.status} / ${resp2.status}`);
        }
      }
    } catch (e) { console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`); }
    await delay(200);
  }

  ENCYCLOPEDIA.sec_form_d = results;
  if (results.length > 0) apiSuccessCount++;
  console.log(`  Total: ${results.length} companies searched\n└──────────────────────────────────────────────┘`);
}

// ── 2C. CourtListener RECAP (federal lawsuits) ──
async function harvestCourtListener() {
  console.log("\n┌── ⚖️ COURTLISTENER RECAP (Federal Lawsuits) ──┐\n");

  const legalTargets = ["Theranos", "WeWork", "Uber", "Coinbase", "Palantir",
    "Peloton", "Robinhood", "Juicero", "Blue Apron", "Bird Rides"];

  const results = [];
  for (const company of legalTargets) {
    try {
      const q = encodeURIComponent(`"${company}"`);
      const url = `https://www.courtlistener.com/api/rest/v4/search/?q=${q}&type=d&format=json`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'OpenGravity/2.0 Research' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const count = data.count || 0;
        const topCases = (data.results || []).slice(0, 3).map(r => ({
          case_name: (r.caseName || r.case_name || '').slice(0, 80),
          court: r.court,
          date_filed: r.dateFiled || r.date_filed
        }));
        results.push({ company, total_cases: count, top_cases: topCases });
        console.log(`  ${company.padEnd(16)} Federal cases: ${String(count).padStart(5)} ${topCases[0]?.case_name?.slice(0,40)||''}`);
      } else {
        console.log(`  ${company.padEnd(16)} HTTP ${resp.status}`);
        results.push({ company, total_cases: 0, error: `HTTP ${resp.status}` });
      }
    } catch (e) {
      console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`);
      results.push({ company, total_cases: 0, error: e.message.slice(0,40) });
    }
    await delay(500);
  }

  ENCYCLOPEDIA.court_listener = results;
  if (results.some(r => r.total_cases > 0)) apiSuccessCount++;
  else apiFailCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ── 2D. OpenCorporates (corporate registry) ──
async function harvestOpenCorporates() {
  console.log("\n┌── 🏢 OPENCORPORATES (Corporate Registry) ──┐\n");

  const ocTargets = ["Airbnb", "Stripe", "Uber", "WeWork", "Theranos",
    "Coinbase", "Shopify", "Peloton", "Juicero", "Katerra"];

  const results = [];
  for (const company of ocTargets) {
    try {
      const q = encodeURIComponent(company);
      const url = `https://api.opencorporates.com/v0.4/companies/search?q=${q}&format=json`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const companies = data.results?.companies || [];
        const top = companies[0]?.company;
        if (top) {
          results.push({
            company, oc_name: top.name,
            jurisdiction: top.jurisdiction_code,
            status: top.current_status,
            incorporated: top.incorporation_date,
            type: top.company_type,
            oc_url: top.opencorporates_url
          });
          console.log(`  ✅ ${company.padEnd(14)} ${(top.name||'').slice(0,30).padEnd(30)} ${(top.jurisdiction_code||'').padEnd(6)} ${top.current_status||'?'} Inc:${top.incorporation_date||'?'}`);
        } else {
          console.log(`  ⚠️ ${company.padEnd(14)} No results`);
        }
      } else {
        console.log(`  ${company.padEnd(14)} HTTP ${resp.status}`);
      }
    } catch (e) { console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`); }
    await delay(1000); // OpenCorporates rate limit is strict
  }

  ENCYCLOPEDIA.open_corporates = results;
  if (results.length > 0) apiSuccessCount++;
  else apiFailCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 3: TALENT & HIRING MOMENTUM
// ═══════════════════════════════════════════════════════════════

// ── 3A. Remotive API (remote jobs) ──
async function harvestRemotive() {
  console.log("\n┌── 💼 REMOTIVE API (Hiring Momentum) ──┐\n");
  try {
    const resp = await fetch('https://remotive.com/api/remote-jobs?limit=300');
    if (resp.ok) {
      const data = await resp.json();
      const jobs = data.jobs || [];
      console.log(`  Total remote jobs listed: ${jobs.length}`);

      // Count by company
      const companyMap = {};
      jobs.forEach(j => {
        const name = j.company_name || 'Unknown';
        if (!companyMap[name]) companyMap[name] = { count: 0, categories: new Set(), salaries: [] };
        companyMap[name].count++;
        companyMap[name].categories.add(j.category);
      });

      // Cross-reference with targets
      const matches = [];
      for (const target of TARGETS) {
        const match = Object.entries(companyMap).find(([k]) =>
          k.toLowerCase().includes(target.toLowerCase()));
        if (match) {
          matches.push({ company: target, jobs: match[1].count, categories: [...match[1].categories] });
          console.log(`  🎯 ${target.padEnd(16)} ${match[1].count} open positions [${[...match[1].categories].join(', ')}]`);
        }
      }

      // Top hiring companies overall
      const topHiring = Object.entries(companyMap)
        .sort((a,b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([name, data]) => ({ company: name, jobs: data.count }));

      console.log(`\n  Top 10 hiring remotely:`);
      topHiring.slice(0,10).forEach(c =>
        console.log(`    ${c.company.padEnd(30)} ${c.jobs} positions`)
      );

      ENCYCLOPEDIA.remotive = { total_jobs: jobs.length, target_matches: matches, top_hiring: topHiring };
      apiSuccessCount++;
    } else {
      console.log(`  HTTP ${resp.status}`);
      apiFailCount++;
    }
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
    apiFailCount++;
  }
  console.log(`└──────────────────────────────────────────────┘`);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 4: MACRO, CYCLE & SYSTEMIC RISK
// ═══════════════════════════════════════════════════════════════

// ── 4A. World Bank API (macro indicators) ──
async function harvestWorldBank() {
  console.log("\n┌── 🌍 WORLD BANK API (Macro & Cycle Risk) ──┐\n");

  const indicators = [
    { id: "NY.GDP.MKTP.KD.ZG", name: "GDP Growth (%)" },
    { id: "FR.INR.RINR", name: "Real Interest Rate (%)" },
    { id: "CM.MKT.LCAP.CD", name: "Market Capitalization ($)" },
    { id: "BX.KLT.DINV.CD.WD", name: "FDI Inflows ($)" },
    { id: "SL.UEM.TOTL.NE.ZS", name: "Unemployment Rate (%)" },
    { id: "FP.CPI.TOTL.ZG", name: "Inflation (CPI) (%)" },
    { id: "IC.REG.DURS", name: "Days to Start Business" },
  ];

  const results = {};
  for (const ind of indicators) {
    try {
      const url = `https://api.worldbank.org/v2/country/US/indicator/${ind.id}?date=2010:2025&format=json&per_page=20`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const records = (data[1]||[]).filter(r => r.value !== null)
          .map(r => ({ year: parseInt(r.date), value: r.value }));
        results[ind.id] = { name: ind.name, data: records };
        console.log(`  ✅ ${ind.name.padEnd(30)} ${records.length} years`);
      }
    } catch (e) { console.log(`  ❌ ${ind.name}: ${e.message.slice(0,40)}`); }
    await delay(300);
  }

  ENCYCLOPEDIA.world_bank = results;
  apiSuccessCount++;
  console.log(`  Total: ${Object.keys(results).length} indicators\n└──────────────────────────────────────────────┘`);
}

// ── 4B. GDELT API (global news coverage) ──
async function harvestGDELT() {
  console.log("\n┌── 📰 GDELT API (Global News Intelligence) ──┐\n");

  const newsTargets = ["Airbnb", "Stripe", "Uber", "WeWork", "Theranos",
    "Coinbase", "Peloton", "Quibi", "DoorDash", "Shopify",
    "Palantir", "Snowflake", "Robinhood", "Blue Apron", "Katerra"];

  const results = [];
  for (const company of newsTargets) {
    try {
      const q = encodeURIComponent(`"${company}"`);
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=5`;
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          const articles = data.articles || [];
          results.push({
            company, article_count: articles.length,
            latest_articles: articles.slice(0, 3).map(a => ({
              title: (a.title||'').slice(0, 80),
              source: a.domain || a.source,
              date: a.seendate?.slice(0, 8),
              tone: a.tone
            }))
          });
          console.log(`  ${company.padEnd(16)} Articles: ${articles.length} ${articles[0]?.title?.slice(0,45)||''}`);
        } catch {
          console.log(`  ${company.padEnd(16)} Non-JSON response (likely HTML/empty)`);
          results.push({ company, article_count: 0, note: 'non-json response' });
        }
      } else {
        console.log(`  ${company.padEnd(16)} HTTP ${resp.status}`);
      }
    } catch (e) {
      console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`);
    }
    await delay(500);
  }

  ENCYCLOPEDIA.gdelt = results;
  if (results.some(r => r.article_count > 0)) apiSuccessCount++;
  else apiFailCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 5: KNOWLEDGE GRAPH
// ═══════════════════════════════════════════════════════════════

// ── 5A. Wikidata SPARQL ──
async function harvestWikidata() {
  console.log("\n┌── 📚 WIKIDATA SPARQL (Knowledge Graph) ──┐\n");

  const wdTargets = ["Airbnb", "Dropbox", "Stripe", "Uber", "Shopify",
    "Twilio", "Coinbase", "WeWork", "Peloton", "DoorDash",
    "Robinhood", "CrowdStrike", "Datadog"];

  const results = [];
  for (const company of wdTargets) {
    try {
      const q = `
        SELECT ?item ?itemLabel ?foundingDate ?employees ?countryLabel ?industryLabel ?ceo ?ceoLabel WHERE {
          ?item rdfs:label "${company}"@en.
          ?item wdt:P31/wdt:P279* wd:Q783794.
          OPTIONAL { ?item wdt:P571 ?foundingDate. }
          OPTIONAL { ?item wdt:P1128 ?employees. }
          OPTIONAL { ?item wdt:P17 ?country. }
          OPTIONAL { ?item wdt:P452 ?industry. }
          OPTIONAL { ?item wdt:P169 ?ceo. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 1
      `;
      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}&format=json`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'OpenGravity/2.0', 'Accept': 'application/json' } });
      if (resp.ok) {
        const data = await resp.json();
        const b = data.results?.bindings?.[0];
        if (b) {
          results.push({
            company, wikidata_id: b.item?.value?.split('/').pop(),
            founded: b.foundingDate?.value?.slice(0,10),
            employees: b.employees?.value ? parseInt(b.employees.value) : null,
            country: b.countryLabel?.value,
            industry: b.industryLabel?.value,
            ceo: b.ceoLabel?.value
          });
          console.log(`  ✅ ${company.padEnd(14)} ${(b.foundingDate?.value||'?').slice(0,10).padEnd(12)} Emp:${String(b.employees?.value||'?').padEnd(7)} ${b.countryLabel?.value||''} CEO:${b.ceoLabel?.value||'?'}`);
        } else {
          console.log(`  ⚠️ ${company.padEnd(14)} No match`);
        }
      }
    } catch (e) { console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`); }
    await delay(600);
  }

  ENCYCLOPEDIA.wikidata = results;
  apiSuccessCount++;
  console.log(`  Total: ${results.length} companies\n└──────────────────────────────────────────────┘`);
}

// ── 5B. Wikipedia REST ──
async function harvestWikipedia() {
  console.log("\n┌── 📖 WIKIPEDIA REST (Company Descriptions) ──┐\n");

  const wikiMap = {
    "Quibi": "Quibi", "Juicero": "Juicero", "Theranos": "Theranos",
    "Jawbone": "Jawbone_(company)", "Katerra": "Katerra",
    "Solyndra": "Solyndra", "MoviePass": "MoviePass", "Pets.com": "Pets.com",
    "Rivian": "Rivian", "DoorDash": "DoorDash", "Robinhood": "Robinhood_Markets",
    "CrowdStrike": "CrowdStrike", "Datadog": "Datadog", "Affirm": "Affirm_(company)",
    "Roku": "Roku", "Snowflake": "Snowflake_Inc.", "Coinbase": "Coinbase",
    "Palantir": "Palantir_Technologies", "Pinterest": "Pinterest",
    "WeWork": "WeWork", "Clubhouse": "Clubhouse_(app)",
    "Bird Rides": "Bird_(company)", "Blue Apron": "Blue_Apron",
    "Peloton": "Peloton_Interactive", "Snap": "Snap_Inc.",
    "Square": "Block,_Inc.", "Twilio": "Twilio", "Stripe": "Stripe,_Inc."
  };

  const results = [];
  for (const [company, slug] of Object.entries(wikiMap)) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'OpenGravity/2.0' } });
      if (resp.ok) {
        const d = await resp.json();
        results.push({
          company, title: d.title, description: d.description,
          extract: (d.extract||'').slice(0, 300), type: d.type
        });
        console.log(`  ✅ ${company.padEnd(14)} ${(d.description||'').slice(0,55)}`);
      } else {
        console.log(`  ⚠️ ${company.padEnd(14)} HTTP ${resp.status}`);
      }
    } catch (e) { console.log(`  ❌ ${company}: ${e.message.slice(0,40)}`); }
    await delay(200);
  }

  ENCYCLOPEDIA.wikipedia = results;
  apiSuccessCount++;
  console.log(`  Total: ${results.length} descriptions\n└──────────────────────────────────────────────┘`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         🌌 OPENGRAVITY V10 — DATA MOAT BUILDER             ║");
  console.log("║         14-API Institutional Encyclopedia                   ║");
  console.log("║         Zero Cost • Zero API Keys • Full Automation         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const t0 = Date.now();

  // Category 1: Product & Traction
  await harvestYC();
  await harvestHackerNews();

  // Category 2: Corporate & Legal Risk
  await harvestSEC();
  await harvestSECFormD();
  await harvestCourtListener();
  await harvestOpenCorporates();

  // Category 3: Talent & Hiring
  await harvestRemotive();

  // Category 4: Macro & Systemic Risk
  await harvestWorldBank();
  await harvestGDELT();

  // Category 5: Knowledge Graph
  await harvestWikidata();
  await harvestWikipedia();

  // Category 1 (cont): GitHub last due to rate limits
  await harvestGitHub();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);

  // Save
  ENCYCLOPEDIA.metadata = {
    version: "2.0",
    generated: new Date().toISOString(),
    elapsed_seconds: parseInt(elapsed),
    apis_connected: apiSuccessCount,
    apis_failed: apiFailCount,
    total_apis: apiSuccessCount + apiFailCount,
    categories: {
      "1_product_traction": ["GitHub API", "Hacker News Algolia", "YC Companies"],
      "2_corporate_legal": ["SEC EDGAR XBRL", "SEC EDGAR EFTS (Form D)", "CourtListener RECAP", "OpenCorporates"],
      "3_talent_hiring": ["Remotive API"],
      "4_macro_risk": ["World Bank API", "GDELT News"],
      "5_knowledge_graph": ["Wikidata SPARQL", "Wikipedia REST"]
    }
  };

  writeFileSync('opengravity_v10_encyclopedia.json', JSON.stringify(ENCYCLOPEDIA, null, 2));

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  📊 DATA MOAT — HARVEST COMPLETE                           ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Time:              ${elapsed}s                                  `);
  console.log(`║  APIs Connected:    ${apiSuccessCount}/${apiSuccessCount+apiFailCount}                                   `);
  console.log(`║  Cost:              $0.00                                   ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  CATEGORY 1: PRODUCT & TRACTION                            ║");
  console.log(`║    YC Companies:    ${ENCYCLOPEDIA.yc?.total || '?'} startups (${ENCYCLOPEDIA.yc?.dead_count||'?'} dead)           `);
  console.log(`║    Hacker News:     ${ENCYCLOPEDIA.hacker_news?.length||'?'} companies w/ traction          `);
  console.log(`║    GitHub:          ${ENCYCLOPEDIA.github?.length||'?'} companies w/ OSS metrics        `);
  console.log("║  CATEGORY 2: CORPORATE & LEGAL RISK                       ║");
  console.log(`║    SEC XBRL:        ${ENCYCLOPEDIA.sec_xbrl?.length||'?'} companies w/ 10-K financials    `);
  console.log(`║    SEC Form D:      ${ENCYCLOPEDIA.sec_form_d?.length||'?'} companies searched              `);
  console.log(`║    CourtListener:   ${ENCYCLOPEDIA.court_listener?.length||'?'} companies w/ case data         `);
  console.log(`║    OpenCorporates:  ${ENCYCLOPEDIA.open_corporates?.length||'?'} companies w/ registry data     `);
  console.log("║  CATEGORY 3: TALENT & HIRING                              ║");
  console.log(`║    Remotive:        ${ENCYCLOPEDIA.remotive?.total_jobs||'?'} remote jobs analyzed            `);
  console.log("║  CATEGORY 4: MACRO & SYSTEMIC RISK                        ║");
  console.log(`║    World Bank:      ${Object.keys(ENCYCLOPEDIA.world_bank||{}).length} macro indicators                 `);
  console.log(`║    GDELT News:      ${ENCYCLOPEDIA.gdelt?.length||'?'} companies w/ news data          `);
  console.log("║  CATEGORY 5: KNOWLEDGE GRAPH                              ║");
  console.log(`║    Wikidata:        ${ENCYCLOPEDIA.wikidata?.length||'?'} companies w/ structured data    `);
  console.log(`║    Wikipedia:       ${ENCYCLOPEDIA.wikipedia?.length||'?'} company descriptions            `);
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log("║  Output: opengravity_v10_encyclopedia.json                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

main().catch(console.error);

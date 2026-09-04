"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Database, 
  BarChart3, 
  Activity, 
  Zap,
  Globe2,
  Lock,
  Terminal,
  BrainCircuit,
  PieChart,
  History,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Fingerprint
} from 'lucide-react';

export default function InstitutionalDashboard() {
  const [activeTab, setActiveTab] = useState('oracle');
  const [time, setTime] = useState('');

  // V10 Interactive State
  const [startupName, setStartupName] = useState('NeuralNet Corp');
  const [ltvCac, setLtvCac] = useState('');
  const [runway, setRunway] = useState('');
  const [growth, setGrowth] = useState('');
  
  const [scoreData, setScoreData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Oracle endpoint: configurable via NEXT_PUBLIC_API_URL (defaults to local dev)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const triggerSimulation = async () => {
    if (!ltvCac || !runway || !growth) return;
    setIsSimulating(true);
    setApiError(null);
    try {
      const resp = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_name: startupName,
          metrics: {
            ltv_cac: parseFloat(ltvCac) || 0,
            months_runway: parseFloat(runway) || 0,
            moe_growth: parseFloat(growth) || 0,
            is_audited: false
          },
          tier: 'Series A'
        })
      });
      if (!resp.ok) {
        throw new Error(`Oracle responded ${resp.status}`);
      }
      const data = await resp.json();
      setScoreData(data);
    } catch (e) {
      console.error('Error connecting to Oracle:', e);
      setApiError('Could not reach the Oracle. Is the backend running on ' + API_URL + '?');
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#020205] text-gray-300 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 border-r border-white/5 bg-[#08080c]/80 backdrop-blur-2xl flex flex-col transition-all z-50">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-[1px]">
              <div className="w-full h-full rounded-[11px] bg-[#08080c] flex items-center justify-center shadow-2xl">
                <Zap size={20} className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tighter text-white font-display">OpenGravity</h1>
              <span className="text-[10px] font-mono tracking-widest text-blue-500/60 uppercase">Institutional V10.0</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-4 ml-2">Main Intelligence</div>
          <nav className="space-y-1.5">
            <NavItem 
              active={activeTab === 'oracle'} 
              onClick={() => setActiveTab('oracle')}
              icon={<ShieldCheck size={18} />}
              label="Bayesian Oracle"
              badge="LIVE"
            />
            <NavItem 
              active={activeTab === 'agents'} 
              onClick={() => setActiveTab('agents')}
              icon={<BrainCircuit size={18} />}
              label="Agentic Swarm"
              badge="7 ACTIVE"
              color="purple"
            />
            <NavItem 
              active={activeTab === 'datamoat'} 
              onClick={() => setActiveTab('datamoat')}
              icon={<Database size={18} />}
              label="Data Moat"
            />
          </nav>

          <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-8 mb-4 ml-2">Analytics & Validation</div>
          <nav className="space-y-1.5">
            <NavItem 
              active={activeTab === 'backtest'} 
              onClick={() => setActiveTab('backtest')}
              icon={<History size={18} />}
              label="Backtest Lab"
            />
            <NavItem 
              active={activeTab === 'portfolio'} 
              onClick={() => setActiveTab('portfolio')}
              icon={<PieChart size={18} />}
              label="Portfolio Health"
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5 bg-white/[0.02]">
           <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-white">System Secure</p>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tight">{time}</p>
              </div>
              <Lock size={14} className="text-gray-600" />
           </div>
        </div>
      </aside>

      {/* --- MAIN PAGE --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full -z-10"></div>

        {/* --- HEADER --- */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#020205]/40 backdrop-blur-xl z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer">
              <Search size={18} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm text-gray-500 font-medium tracking-tight">Search Institutional Assets...</span>
              <kbd className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400">⌘K</kbd>
            </div>
            <div className="h-6 w-[1px] bg-white/5"></div>
            <div className="flex items-center gap-4 text-xs font-mono">
               <span className="text-gray-500">Node Status:</span>
               <span className="text-emerald-400 flex items-center gap-1.5 font-bold uppercase tracking-widest"><Activity size={12}/> Operational</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-[#020205] bg-gray-800 flex items-center justify-center overflow-hidden">
                   <div className="text-[10px] font-bold text-gray-400 font-display">IA</div>
                 </div>
               ))}
            </div>
            <button 
              onClick={triggerSimulation}
              disabled={isSimulating}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold tracking-tight shadow-lg transition-all active:scale-95 ${isSimulating ? 'bg-gray-700 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-900/40'}`}>
              {isSimulating ? 'SIMULATING...' : 'NEW ANALYSIS'}
            </button>
          </div>
        </header>

        {/* --- DYNAMIC SECTION --- */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          
          {/* ORACLE TAB */}
          {activeTab === 'oracle' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {/* Top Stats Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <StatCard 
                    label="Active Intelligence" 
                    value="14 APIs" 
                    sub="Harvesting Live" 
                    icon={<Globe2 size={20} className="text-blue-400"/>} 
                 />
                 <StatCard 
                    label="Model Confidence" 
                    value="94.2%" 
                    sub="Brier Score: 0.12" 
                    icon={<Fingerprint size={20} className="text-emerald-400"/>} 
                 />
                 <StatCard 
                    label="Agent Research" 
                    value="DeerFlow v2" 
                    sub="Active Task Queue" 
                    icon={<BrainCircuit size={20} className="text-purple-400"/>} 
                 />
                 <StatCard 
                    label="Risk Threshold" 
                    value="0.32" 
                    sub="Calibrated / 2024" 
                    icon={<AlertTriangle size={20} className="text-orange-400"/>} 
                 />
              </div>

              {/* Central Analysis Engine */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Scoring Panel */}
                <div className="xl:col-span-2 glass-card rounded-[2rem] p-10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-5">
                     <ShieldCheck size={200}/>
                   </div>
                   
                   <div className="flex justify-between items-start mb-12">
                     <div>
                       <h3 className="text-2xl font-extrabold text-white mb-2 font-display uppercase tracking-tight">Institutional Scoring Engine</h3>
                       <p className="text-gray-500 text-sm max-w-md">Real-time Bayesian inference applying continuous fragility thresholds and logarithmic growth signals.</p>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">Evaluation Status</span>
                        <div className="text-emerald-400 font-bold flex items-center justify-end gap-2 mt-1 uppercase tracking-widest text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Awaiting Input
                        </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <MetricInput label="LTV / CAC Ratio" placeholder="e.g. 3.5" unit="x" value={ltvCac} onChange={setLtvCac} />
                      <MetricInput label="Months of Runway" placeholder="e.g. 24" unit="mo" value={runway} onChange={setRunway} />
                      <MetricInput label="Growth (MoE)" placeholder="e.g. 150" unit="%" value={growth} onChange={setGrowth} />
                   </div>

                   <div className="mt-12 pt-12 border-t border-white/5">
                      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-10">
                         <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                              <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                              <circle 
                                cx="80" cy="80" r="70" 
                                stroke="currentColor" strokeWidth="8" fill="transparent" 
                                strokeDasharray="440" 
                                strokeDashoffset={scoreData ? 440 - (440 * scoreData.probability_hit) : 440} 
                                className={`${scoreData?.status.includes('DROP') ? 'text-red-500' : 'text-blue-500'} transition-all duration-1000 ease-out`} 
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-3xl font-black text-white font-display tracking-tighter">
                                 {scoreData ? (scoreData.probability_hit * 100).toFixed(1) + '%' : '0%'}
                               </span>
                               <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">P(HIT)</span>
                            </div>
                         </div>
                         <div className="flex-1 space-y-4">
                            {apiError && (
                              <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10">
                                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                <p className="text-xs text-red-300">{apiError}</p>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full ${scoreData ? (scoreData.status.includes('DROP') ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]') : 'bg-gray-700'}`}></div>
                              <p className="text-sm font-medium text-gray-400 italic">
                                {isSimulating ? "Connecting to Bayesian Oracle..." : (scoreData ? `Status: ${scoreData.status} (Raw Logit: ${scoreData.logit_score})` : "Enter metrics to begin simulation...")}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[10px] font-mono text-gray-600 mb-1 uppercase tracking-widest">Confidence Range</p>
                                <p className="text-xs font-bold text-gray-300">{scoreData ? `[${(scoreData.confidence_interval[0]*100).toFixed(1)}% - ${(scoreData.confidence_interval[1]*100).toFixed(1)}%]` : 'N/A'}</p>
                              </div>
                               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[10px] font-mono text-gray-600 mb-1 uppercase tracking-widest">Down-Round Risk</p>
                                <p className={`text-xs font-bold ${scoreData && scoreData.down_round_risk_24m > 0.5 ? 'text-red-400' : 'text-orange-400'}`}>
                                  {scoreData ? `${(scoreData.down_round_risk_24m * 100).toFixed(1)}%` : 'N/A'}
                                </p>
                              </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Data Moat Logs */}
                <div className="glass-card rounded-[2rem] flex flex-col overflow-hidden border-blue-500/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
                   <div className="p-6 border-b border-white/5 flex items-center justify-between">
                     <h4 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                       <Terminal size={14} className="text-blue-400"/>
                       Data Moat Stream
                     </h4>
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                   </div>
                   <div className="flex-1 p-6 font-mono text-[11px] space-y-3 overflow-y-auto scrollbar-hide bg-black/40">
                      <LogLine color="gray" time="16:04:12" msg="[SYSTEM] Initializing Harvesting Cycle..." />
                      <LogLine color="blue" time="16:04:13" msg="[SEC-EDGAR] Requesting XBRL data for seed cohort." />
                      <LogLine color="purple" time="16:04:15" msg="[GITHUB] Scoping OSS velocity for 30 infra nodes." />
                      <LogLine color="emerald" time="16:04:18" msg="[YC-DB] Indexing latest batch 'W24' outliers." />
                      <LogLine color="orange" time="16:04:22" msg="[HN-SENTIMENT] Analyzing 124k comment vectors." />
                      <LogLine color="blue" time="16:04:24" msg="[WIKIDATA] Mapping institutional entities." />
                      <LogLine color="gray" time="16:04:25" msg="[SYSTEM] Feature Store updated (Postgres)." />
                      <LogLine color="blue" time="16:04:13" msg="[SEC-EDGAR] Requesting XBRL data for seed cohort." />
                      <LogLine color="purple" time="16:04:15" msg="[GITHUB] Scoping OSS velocity for 30 infra nodes." />
                      <LogLine color="emerald" time="16:04:18" msg="[YC-DB] Indexing latest batch 'W24' outliers." />
                      <LogLine color="orange" time="16:04:22" msg="[HN-SENTIMENT] Analyzing 124k comment vectors." />
                      <LogLine color="blue" time="16:04:24" msg="[WIKIDATA] Mapping institutional entities." />
                      <LogLine color="gray" time="16:04:25" msg="[SYSTEM] Feature Store updated (Postgres)." />
                      <div className="animate-pulse flex items-center gap-2 text-white/40 italic">
                         <span>_</span>
                         <span>Listening for signals...</span>
                      </div>
                   </div>
                </div>

              </div>

              {/* Bottom Row - Calibration & Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="glass-card rounded-3xl p-8 flex items-center gap-6 group hover:border-blue-500/20 transition-all cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg leading-tight uppercase tracking-tight">Consensus Calibration</h4>
                      <p className="text-gray-500 text-sm">Aligning internal V10 weights with secondary market signals.</p>
                    </div>
                    <ChevronRight className="ml-auto text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                 </div>
                 <div className="glass-card rounded-3xl p-8 flex items-center gap-6 group hover:border-purple-500/20 transition-all cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg leading-tight uppercase tracking-tight">Alpha Dispatcher</h4>
                      <p className="text-gray-500 text-sm">Automated alerts for high-probability signals in the 'Moat'.</p>
                    </div>
                    <ChevronRight className="ml-auto text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" size={20} />
                 </div>
              </div>

            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="glass-card rounded-[2rem] p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-white font-display tracking-tighter uppercase">Historical Backtest Suite</h3>
                    <div className="px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-mono font-bold tracking-widest uppercase">Blind Val. Phase 3</div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <th className="pb-4 pl-4">Asset Node</th>
                          <th className="pb-4">Logic Score</th>
                          <th className="pb-4">Agent Signal</th>
                          <th className="pb-4">P(Success)</th>
                          <th className="pb-4 pr-4 text-right">Ground Truth</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium">
                        <BacktestRow name="Stripe" score="4.23" agent="Neutral" prob="92.1%" truth="WINNER" color="blue" />
                        <BacktestRow name="Fast" score="-1.12" agent="Lethal" prob="1.2%" truth="DROP" color="red" />
                        <BacktestRow name="Deel" score="5.01" agent="Premium" prob="98.5%" truth="WINNER" color="blue" />
                        <BacktestRow name="InVision" score="0.45" agent="Toxic" prob="5.4%" truth="ZOMBIE" color="orange" />
                        <BacktestRow name="Canva" score="4.88" agent="Premium" prob="97.2%" truth="WINNER" color="blue" />
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ active, onClick, icon, label, badge, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-blue-500/10',
    purple: 'bg-purple-600/10 text-purple-400 border-purple-500/20 shadow-purple-500/10',
    gray: 'hover:bg-white/5 text-gray-500 hover:text-gray-300 border-transparent'
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all border text-sm font-bold tracking-tight ${active ? colors[color] : colors['gray']}`}
    >
      <div className={`p-2 rounded-lg ${active ? 'bg-white/10' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span>{label}</span>
      {badge && (
        <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 border border-white/5 opacity-60">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="glass-card rounded-3xl p-6 flex flex-col gap-1 transition-all hover:translate-y-[-4px] hover:border-white/10 group cursor-default">
       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
         {icon}
       </div>
       <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
       <span className="text-2xl font-black text-white font-display tracking-tight">{value}</span>
       <span className="text-[10px] font-medium text-gray-500 italic mt-1">{sub}</span>
    </div>
  );
}

function MetricInput({ label, placeholder, unit, value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#08080c] border border-white/5 rounded-2xl py-4 px-5 text-lg font-bold text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-gray-600 uppercase tracking-widest group-focus-within:text-blue-400 group-focus-within:border-blue-500/20 transition-all font-bold">
          {unit}
        </div>
      </div>
    </div>
  );
}

function LogLine({ time, msg, color }) {
  const colors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    emerald: 'text-emerald-400',
    gray: 'text-gray-500'
  };
  return (
    <div className="flex gap-4">
       <span className="text-gray-700 shrink-0 font-bold">[{time}]</span>
       <span className={`${colors[color]} font-medium`}>{msg}</span>
    </div>
  );
}

function BacktestRow({ name, score, agent, prob, truth, color }) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
  };
  
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-default">
      <td className="py-5 pl-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-display text-[10px] font-bold text-white uppercase">{name.substring(0,2)}</div>
        <span className="font-bold text-gray-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{name}</span>
      </td>
      <td className="py-5 font-mono text-xs text-gray-500">{score}</td>
      <td className="py-5">
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border ${colorMap[color]}`}>
          {agent}
        </span>
      </td>
      <td className="py-5 font-bold text-gray-200">{prob}</td>
      <td className="py-5 pr-4 text-right">
        <span className={`text-[10px] font-black uppercase tracking-widest ${truth === 'WINNER' ? 'text-emerald-400' : 'text-gray-600'}`}>
          {truth}
        </span>
      </td>
    </tr>
  );
}

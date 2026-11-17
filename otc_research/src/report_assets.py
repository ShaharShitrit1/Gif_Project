CSS = r"""
/* Layout: one reading column (RTL) with wide figure bands; ledger-like tables. Pink Sheets were literally printed on pink paper - the accent nods to that. */
:root{
  --bg:#fbfaf8; --surface:#ffffff; --ink:#15161a; --ink-2:#4d4e55; --muted:#86878f; --rule:#e4e2dc; --rule-2:#cfccc3;
  --accent:#b8325e; --accent-wash:#f7e6ec; --chip:#f1efea;
  --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a; --s4:#eda100;
  --pos:#1c5cab; --neg:#c23b3b; --good:#006300; --bad:#c23b3b; --warn-bg:#fdf3dc; --warn-ink:#6b4b00;
  --f-display:"Rubik","Heebo",system-ui,sans-serif; --f-body:"Heebo","Assistant",system-ui,sans-serif; --f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#121317; --surface:#1a1b20; --ink:#efeee9; --ink-2:#c3c2ba; --muted:#8d8e95; --rule:#2c2d33; --rule-2:#3b3c43;
  --accent:#e9779c; --accent-wash:#3a1f2a; --chip:#24252b;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500;
  --pos:#5598e7; --neg:#e66767; --good:#0ca30c; --bad:#e66767; --warn-bg:#3a3018; --warn-ink:#f2d58a; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#121317; --surface:#1a1b20; --ink:#efeee9; --ink-2:#c3c2ba; --muted:#8d8e95; --rule:#2c2d33; --rule-2:#3b3c43;
  --accent:#e9779c; --accent-wash:#3a1f2a; --chip:#24252b;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500;
  --pos:#5598e7; --neg:#e66767; --good:#0ca30c; --bad:#e66767; --warn-bg:#3a3018; --warn-ink:#f2d58a; color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:16.5px;line-height:1.7;direction:rtl;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0 64px}
.wrap{max-width:860px;margin:0 auto}
.prose{max-width:680px}
h1,h2,h3{font-family:var(--f-display);text-wrap:balance;line-height:1.25;margin:0}
h1{font-size:clamp(30px,5vw,46px);font-weight:700;letter-spacing:-.01em}
h2{font-size:clamp(22px,3.2vw,28px);font-weight:700;margin-top:8px}
h3{font-size:18px;font-weight:600}
p{margin:0}
section{display:flex;flex-direction:column;gap:16px;padding-block:40px;border-top:1px solid var(--rule)}
.eyebrow{font-family:var(--f-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);direction:ltr;text-align:right}
header.hero{display:flex;flex-direction:column;gap:18px;padding-block:48px 36px}
.lede{font-size:19px;color:var(--ink-2);max-width:680px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.kpi{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0}
.kpi .v{font-family:var(--f-display);font-size:30px;font-weight:700;direction:ltr;text-align:right}
.kpi .v.sm{font-size:24px;white-space:nowrap}
.kpi .l{font-size:14px;color:var(--ink-2);line-height:1.45}
.kpi.neg .v{color:var(--bad)} .kpi.pos .v{color:var(--good)}
.num,.mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.callout{background:var(--accent-wash);border-radius:10px;padding:14px 18px;max-width:680px}
.warn{background:var(--warn-bg);color:var(--warn-ink);border-radius:10px;padding:14px 18px;max-width:680px}
.tablewrap{overflow-x:auto;border:1px solid var(--rule);border-radius:10px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:14.5px}
th,td{padding:9px 12px;text-align:right;border-bottom:1px solid var(--rule);white-space:nowrap}
th{font-weight:600;color:var(--ink-2);font-size:13px;background:var(--chip)}
tr:last-child td{border-bottom:0}
td.n{font-family:var(--f-mono);font-variant-numeric:tabular-nums;direction:ltr;text-align:left}
tr.hl td{background:var(--accent-wash);font-weight:600}
.pos-t{color:var(--good)} .neg-t{color:var(--bad)}
ol.rules,ul.plain{margin:0;padding-inline-start:22px;display:flex;flex-direction:column;gap:8px;max-width:680px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.grid2>*{min-width:0}
.fig{background:var(--surface);border:1px solid var(--rule);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}
.fig .cap{font-size:13.5px;color:var(--muted)}
.fig h3{font-size:16px}
/* HTML bar rows */
.bars{display:flex;flex-direction:column;gap:6px}
.bar-row{display:grid;grid-template-columns:minmax(90px,34%) 1fr 64px;align-items:center;gap:10px;font-size:14px;position:relative}
.bar-row .lab{color:var(--ink-2);overflow-wrap:anywhere;line-height:1.3}
.bar-row .track{position:relative;height:18px;direction:ltr}
.bar-row .zero{position:absolute;top:-3px;bottom:-3px;width:1px;background:var(--rule-2)}
.bar-row .b{position:absolute;top:2px;height:14px;border-radius:0 4px 4px 0}
.bar-row .b.neg{border-radius:4px 0 0 4px}
.bar-row .val{font-family:var(--f-mono);font-size:13px;direction:ltr;text-align:left;color:var(--ink)}
.bar-row:hover .lab{color:var(--ink)}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13.5px;color:var(--ink-2)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i{width:14px;height:3px;border-radius:2px;display:inline-block}
.chart{position:relative;direction:ltr}
.chart svg{display:block;width:100%;height:auto;overflow:visible}
.chart text{fill:var(--muted);font-family:var(--f-mono);font-size:11px}
.chart .grid{stroke:var(--rule);stroke-width:1}
.chart .lbl{fill:var(--ink);font-family:var(--f-body);font-size:12px;font-weight:600}
.tip{position:absolute;pointer-events:none;background:var(--surface);color:var(--ink);border:1px solid var(--rule-2);border-radius:8px;padding:8px 10px;font-size:12.5px;line-height:1.5;box-shadow:0 4px 16px rgba(0,0,0,.12);direction:rtl;min-width:150px;z-index:5}
.tip b{font-family:var(--f-mono);direction:ltr;unicode-bidi:isolate}
.tip .row{display:flex;justify-content:space-between;gap:12px;align-items:center}
.tip i{width:10px;height:3px;display:inline-block;border-radius:2px;margin-inline-end:6px}
.pill{display:inline-block;font-size:12px;padding:1px 8px;border-radius:99px;background:var(--chip);color:var(--ink-2)}
.pill.bad{background:var(--warn-bg);color:var(--warn-ink)}
details{border:1px solid var(--rule);border-radius:10px;background:var(--surface);padding:10px 14px}
details summary{cursor:pointer;font-weight:600}
details[open] summary{margin-bottom:8px}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.foot{font-size:13px;color:var(--muted)}
@media (max-width:520px){.bar-row{grid-template-columns:minmax(80px,38%) 1fr 54px}.kpi .v{font-size:26px}}
"""

JS = r"""
(function(){
const D = window.__DATA__;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const pct = (v,d=0) => (v==null||isNaN(v)) ? '–' : ((v>0?'+':'') + (v*100).toFixed(d) + '%');
const pctu = (v,d=0) => (v==null||isNaN(v)) ? '–' : ((v*100).toFixed(d) + '%');

// ---------- horizontal bar rows (diverging around zero) ----------
function bars(el){
  const rows = JSON.parse(el.dataset.rows);
  const fmt = el.dataset.fmt === 'u' ? pctu : pct;
  const color = el.dataset.color || '--pos';
  let lo = Math.min(0, ...rows.map(r=>r.v)), hi = Math.max(0, ...rows.map(r=>r.v));
  if (hi - lo === 0) hi = 1;
  const span = hi - lo, z = (-lo/span)*100;
  el.innerHTML = '';
  rows.forEach(r=>{
    const row = document.createElement('div'); row.className='bar-row';
    const w = Math.abs(r.v)/span*100;
    const neg = r.v < 0;
    const c = neg ? css('--neg') : css(color);
    const left = neg ? (z - w) : z;
    row.innerHTML = `<div class="lab">${r.l}</div><div class="track"><div class="zero" style="left:${z}%"></div>`+
      `<div class="b ${neg?'neg':''}" style="left:${left}%;width:${Math.max(w,0.6)}%;background:${c}"></div></div>`+
      `<div class="val">${fmt(r.v, r.d||0)}</div>`;
    if (r.t) row.title = r.t;
    el.appendChild(row);
  });
}

// ---------- line chart (log y) with crosshair tooltip ----------
function lines(el){
  const spec = D.charts[el.dataset.chart];
  const W = 820, H = 380, m = {l:46, r:118, t:12, b:28};
  const series = spec.series;
  const dates = series[0].pts.map(p=>p[0]);
  const all = series.flatMap(s=>s.pts.map(p=>p[1])).filter(v=>v>0);
  const ymin = Math.min(...all)*0.9, ymax = Math.max(...all)*1.1;
  const ly = v => Math.log(v);
  const X = i => m.l + (W-m.l-m.r)*i/(dates.length-1);
  const Y = v => m.t + (H-m.t-m.b)*(1-(ly(v)-ly(ymin))/(ly(ymax)-ly(ymin)));
  const ticks = [0.0625,0.125,0.25,0.5,1,2,4,8,16].filter(t=>t>=ymin&&t<=ymax);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${spec.aria}">`;
  ticks.forEach(t=>{ svg += `<line class="grid" x1="${m.l}" x2="${W-m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${m.l-6}" y="${Y(t)+4}" text-anchor="end">${t<1?(+t.toFixed(3)):t}x</text>`;});
  const years = [...new Set(dates.map(d=>d.slice(0,4)))];
  years.forEach(y=>{ const i = dates.findIndex(d=>d.startsWith(y)); if(i>=0 && (+y)%2===0) svg += `<text x="${X(i)}" y="${H-8}" text-anchor="middle">${y}</text>`;});
  const ends = [];
  series.forEach(s=>{
    const d = s.pts.map((p,i)=>(i?'L':'M')+X(i).toFixed(1)+','+Y(p[1]).toFixed(1)).join('');
    svg += `<path d="${d}" fill="none" stroke="${css(s.c)}" stroke-width="${s.w||2}" stroke-linejoin="round" stroke-linecap="round" ${s.dash?'stroke-dasharray="4 4"':''}/>`;
    const last = s.pts[s.pts.length-1];
    ends.push({y:Y(last[1]), s, v:last[1]});
  });
  // end labels with simple collision avoidance + leader lines
  ends.sort((a,b)=>a.y-b.y);
  for (let i=1;i<ends.length;i++){ if (ends[i].y - ends[i-1].y < 15) ends[i].ly = (ends[i-1].ly||ends[i-1].y)+15; }
  ends.forEach(e=>{ const ly2 = e.ly||e.y; const x = W-m.r;
    svg += `<circle cx="${x}" cy="${e.y}" r="4" fill="${css(e.s.c)}" stroke="${css('--surface')}" stroke-width="2"/>`;
    if (Math.abs(ly2-e.y)>1) svg += `<line x1="${x+5}" y1="${e.y}" x2="${x+12}" y2="${ly2}" stroke="${css('--rule-2')}"/>`;
    svg += `<text class="lbl" x="${x+14}" y="${ly2+4}">${e.v.toFixed(1)}x ${e.s.short}</text>`; });
  svg += `<line id="xh" x1="0" x2="0" y1="${m.t}" y2="${H-m.b}" stroke="${css('--rule-2')}" visibility="hidden"/>`;
  svg += `<rect x="${m.l}" y="${m.t}" width="${W-m.l-m.r}" height="${H-m.t-m.b}" fill="transparent" class="hit"/></svg>`;
  el.innerHTML = svg + '<div class="tip" hidden></div>';
  const sv = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('#xh');
  const move = ev => {
    const r = sv.getBoundingClientRect(); const px = (ev.clientX - r.left)/r.width*W;
    let i = Math.round((px-m.l)/(W-m.l-m.r)*(dates.length-1)); i = Math.max(0,Math.min(dates.length-1,i));
    xh.setAttribute('x1',X(i)); xh.setAttribute('x2',X(i)); xh.setAttribute('visibility','visible');
    tip.hidden=false;
    tip.innerHTML = `<div style="color:var(--muted)">${dates[i].slice(0,7)}</div>` + series.map(s=>`<div class="row"><span><i style="background:${css(s.c)}"></i>${s.name}</span><b>${s.pts[i][1].toFixed(2)}x</b></div>`).join('');
    const tx = (X(i)/W)*r.width; tip.style.left = (tx > r.width/2 ? tx - tip.offsetWidth - 12 : tx + 12) + 'px'; tip.style.top = '10px';
  };
  sv.addEventListener('pointermove', move); sv.addEventListener('pointerleave', ()=>{tip.hidden=true; xh.setAttribute('visibility','hidden');});
}

function render(){ document.querySelectorAll('[data-bars]').forEach(bars); document.querySelectorAll('[data-chart]').forEach(lines); }
render();
const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', render);
new MutationObserver(render).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
})();
"""

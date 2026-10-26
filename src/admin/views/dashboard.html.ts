import { ADMIN_STYLES, LOGO_SVG } from './admin.styles';

export function renderDashboardPage(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield Admin</title><style nonce="${nonce}">${ADMIN_STYLES}</style></head>
<body>
<div class="bar"><div class="in">
  <div class="brand">${LOGO_SVG}<div><h1>Shield</h1><small class="mono" id="meta">connecting...</small></div></div>
  <div class="chips">
    <span class="chip" id="pShield"><i class="dot"></i><b>Shield</b></span>
    <span class="chip" id="pAttack"><i class="dot"></i><b>Normal</b></span>
    <button class="ghost icon-btn" id="theme" title="Toggle theme" aria-label="Toggle theme"><svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg></button>
    <button class="ghost" id="logout">Log out</button>
  </div>
</div>
<div class="tabs" role="tablist">
  <button class="tab" role="tab" data-tab="overview" aria-selected="true">Overview</button>
  <button class="tab" role="tab" data-tab="controls" aria-selected="false">Controls</button>
  <button class="tab" role="tab" data-tab="traffic" aria-selected="false">Live traffic<span class="count" id="tabCount">0</span></button>
</div></div>

<div class="wrap">

<section class="view on" id="v-overview">
  <div class="kpis">
    <div class="card kpi"><div class="lbl">Requests seen</div><div class="val" id="kTotal">0</div><div class="hint" id="kTotalH">since start</div><svg class="spark" id="sTotal" preserveAspectRatio="none"></svg></div>
    <div class="card kpi"><div class="lbl">Block rate</div><div class="val" id="kRate">0<small>%</small></div><div class="hint" id="kRateH">0 blocked</div><svg class="spark" id="sBlock" preserveAspectRatio="none"></svg></div>
    <div class="card kpi"><div class="lbl">Requests / min</div><div class="val" id="kRpm">0</div><div class="hint" id="kRpmH">last full minute</div><svg class="spark" id="sRpm" preserveAspectRatio="none"></svg></div>
    <div class="card kpi"><div class="lbl">Latency p95</div><div class="val" id="kP95">0<small>ms</small></div><div class="hint" id="kP95H">avg 0 ms</div><svg class="spark" id="sLat" preserveAspectRatio="none"></svg></div>
    <div class="card kpi"><div class="lbl">Active bans</div><div class="val" id="kBans">0</div><div class="hint" id="kBansH">auto and manual</div></div>
  </div>

  <div class="row2">
    <div class="card">
      <header><h2>Traffic, last 30 minutes</h2><div class="legend"><span><i class="lg-ok"></i>Allowed</span><span><i class="lg-bad"></i>Blocked</span></div></header>
      <div class="chartbox" id="chartBox"><svg id="chart" role="img" aria-label="Requests per minute"></svg><div class="tip" id="tip"></div></div>
    </div>
    <div class="card">
      <header><h2>Blocked by layer</h2><span class="sub" id="layerSub"></span></header>
      <div class="hbars" id="layers"></div>
    </div>
  </div>

  <div class="grid g3 mb">
    <div class="card">
      <header><h2>Response status</h2></header>
      <div class="donutwrap"><svg id="donut" viewBox="0 0 132 132" role="img" aria-label="Response status mix"></svg><div class="dlegend" id="donutLegend"></div></div>
    </div>
    <div class="card">
      <header><h2>Top paths</h2><span class="sub">last requests</span></header>
      <div class="toplist" id="topPaths"></div>
    </div>
    <div class="card">
      <header><h2>Top clients</h2><span class="sub">last requests</span></header>
      <div class="toplist" id="topIps"></div>
    </div>
  </div>
</section>

<section class="view" id="v-controls">
  <div class="grid g2 mb">
    <div class="card">
      <header><h2>Protection</h2></header>
      <label class="switch"><span class="tx"><b>Shield enabled</b><small>Master switch for every layer</small></span><span class="tgl"><input type="checkbox" id="swEnabled"><span></span></span></label>
      <label class="switch"><span class="tx"><b>Under attack mode</b><small id="attackHint">Stricter limits, bot user-agents blocked</small></span><span class="tgl warn"><input type="checkbox" id="swAttack"><span></span></span></label>
    </div>
    <div class="card">
      <header><h2>Overrides</h2></header>
      <p class="note">Changes made here are stored in shield storage and override your <span class="mono">forRoot</span> config. Every instance picks them up within a couple of seconds. Reset returns to the code defaults.</p>
      <button class="danger" id="reset">Reset all overrides</button>
    </div>
  </div>

  <div class="grid g3 mb">
    <div class="card">
      <header><h2>Rate limit</h2></header>
      <label class="switch"><span class="tx"><b>Enabled</b></span><span class="tgl"><input type="checkbox" id="rlOn"><span></span></span></label>
      <div class="row"><label for="rlLimit">Requests</label><input id="rlLimit" type="number" min="1"></div>
      <div class="row"><label for="rlTtl">Window (sec)</label><input id="rlTtl" type="number" min="1"></div>
      <div class="row"><label for="rlAlgo">Algorithm</label><select id="rlAlgo">
        <option value="">default</option><option>token-bucket</option><option>sliding-window</option><option>sliding-window-log</option><option>fixed-window</option><option>leaky-bucket</option></select></div>
      <div class="actions"><button id="rlSave">Save</button></div>
    </div>
    <div class="card">
      <header><h2>Auto-ban</h2></header>
      <label class="switch"><span class="tx"><b>Enabled</b></span><span class="tgl"><input type="checkbox" id="abOn"><span></span></span></label>
      <div class="row"><label for="abThreshold">Violations</label><input id="abThreshold" type="number" min="1"></div>
      <div class="row"><label for="abWindow">Window (sec)</label><input id="abWindow" type="number" min="1"></div>
      <div class="row"><label for="abBan">Ban (sec)</label><input id="abBan" type="number" min="1"></div>
      <div class="actions"><button id="abSave">Save</button></div>
    </div>
    <div class="card">
      <header><h2>IP rules</h2></header>
      <div class="field"><label for="wl">Whitelist (IP or CIDR per line)</label><textarea id="wl" spellcheck="false"></textarea></div>
      <div class="field"><label for="bl">Blacklist (IP or CIDR per line)</label><textarea id="bl" spellcheck="false"></textarea></div>
      <div class="actions"><button id="ipSave">Save</button></div>
    </div>
  </div>

  <div class="card">
    <header><h2>Bans</h2><span class="sub" id="banSub"></span></header>
    <div class="banform"><input id="banIp" placeholder="IP address" aria-label="IP address"><input id="banMin" type="number" min="1" value="60" aria-label="Minutes" title="Minutes"><button id="banAdd">Ban</button></div>
    <ul class="bans" id="bans"></ul>
  </div>
</section>

<section class="view" id="v-traffic">
  <div class="tools">
    <input class="grow" id="fText" placeholder="Filter by IP, path, layer or status" aria-label="Filter">
    <div class="seg" id="fKind"><button data-k="all" aria-pressed="true">All</button><button data-k="rej" aria-pressed="false">Blocked</button><button data-k="ok" aria-pressed="false">Allowed</button></div>
    <button class="ghost" id="pause">Pause</button><button class="ghost" id="clear">Clear</button>
    <span class="tiny" id="liveState"></span>
  </div>
  <div class="tablewrap"><table><thead><tr><th>Time</th><th>IP</th><th>Method</th><th>Path</th><th>Result</th><th>Layer</th><th>Status</th><th>ms</th><th>User-Agent</th></tr></thead><tbody id="rows"></tbody></table></div>
  <p class="tiny" id="emptyRows">Waiting for traffic...</p>
</section>

</div>
<div class="toasts" id="toasts"></div>

<script nonce="${nonce}">
const BASE=location.pathname.replace(/\\/$/,'');
const NS='http://www.w3.org/2000/svg';
const $=(id)=>document.getElementById(id);
const MAX_ROWS=300;
let rows=[],lastId=0,paused=false,filled=false,kind='all',lastStats=null;

try{const t=localStorage.getItem('shield-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}
$('theme').addEventListener('click',()=>{
  const cur=document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('shield-theme',next)}catch(e){}
  if(lastStats)renderCharts(lastStats);
});

async function api(path,method,body){
  const r=await fetch(BASE+path,{method:method||'GET',credentials:'same-origin',headers:{'content-type':'application/json','x-shield-admin':'1'},body:body===undefined?undefined:JSON.stringify(body)});
  if(r.status===401){location.reload();return null}
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):(j.message||('HTTP '+r.status)));
  return j;
}
function toast(text,err){
  const el=document.createElement('div');el.className='toast'+(err?' err':'');el.textContent=text;
  $('toasts').appendChild(el);setTimeout(()=>el.remove(),err?5000:2600);
}
async function run(fn,okText,refill){
  try{await fn();toast(okText||'Saved');if(refill!==false)filled=false;await loadState()}
  catch(e){toast(e.message,true)}
}
function lines(id){return $(id).value.split(/\\r?\\n/).map((s)=>s.trim()).filter(Boolean)}
function splitList(id){const all=lines(id);return{ips:all.filter((s)=>!s.includes('/')),cidrs:all.filter((s)=>s.includes('/'))}}
function joinList(l){return[].concat((l&&l.ips)||[],(l&&l.cidrs)||[]).join('\\n')}
function fmt(n){return Number(n).toLocaleString()}
function el(tag,attrs,text){
  const e=document.createElementNS(NS,tag);
  for(const k in attrs)e.setAttribute(k,attrs[k]);
  if(text!=null)e.textContent=text;
  return e;
}
function hm(minute){const d=new Date(minute*60000);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function niceMax(v){
  if(v<=4)return 4;
  const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;
  return(n<=1?1:n<=2?2:n<=5?5:10)*p;
}

document.querySelectorAll('.tab').forEach((t)=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach((x)=>x.setAttribute('aria-selected',String(x===t)));
  document.querySelectorAll('.view').forEach((v)=>v.classList.toggle('on',v.id==='v-'+t.dataset.tab));
  if(t.dataset.tab==='overview'&&lastStats)renderCharts(lastStats);
  try{history.replaceState(null,'','#'+t.dataset.tab)}catch(e){}
}));
const startTab=(location.hash||'').slice(1);
if(startTab){const t=document.querySelector('.tab[data-tab="'+startTab+'"]');if(t)t.click()}

function chipState(node,cls,label){node.className='chip '+cls;node.lastElementChild.textContent=label}

function renderState(s){
  $('meta').textContent='v'+s.version+'  |  '+s.storage+'  |  up '+uptime(s.uptimeSec);
  chipState($('pShield'),s.enabled?'ok':'bad',s.enabled?'Protected':'Shield off');
  chipState($('pAttack'),s.attackMode?'warn':'','' +(s.attackMode?'Under attack':'Normal'));
  if(document.activeElement!==$('swEnabled'))$('swEnabled').checked=s.enabled;
  if(document.activeElement!==$('swAttack'))$('swAttack').checked=s.attackMode;
  $('attackHint').textContent='Limit divided by '+s.attackModeFactor+(s.effective.rateLimit?' (now '+s.effective.rateLimit.limit+' per '+Math.round(s.effective.rateLimit.ttl/1000)+'s)':'')+', bot user-agents blocked, auto-ban tightened';
  lastStats=s.stats;
  renderCharts(s.stats);
  if(!filled){fillForms(s.settings);filled=true}
}
function uptime(sec){
  if(sec<3600)return Math.floor(sec/60)+'m';
  if(sec<86400)return Math.floor(sec/3600)+'h '+Math.floor(sec%3600/60)+'m';
  return Math.floor(sec/86400)+'d '+Math.floor(sec%86400/3600)+'h';
}

function renderCharts(st){
  const m=st.minutes,full=m.length>1?m[m.length-2]:m[m.length-1]||{total:0};
  $('kTotal').textContent=fmt(st.total);
  $('kTotalH').textContent=fmt(st.allowed)+' allowed';
  const rate=st.total?Math.round(st.rejected/st.total*1000)/10:0;
  $('kRate').firstChild.textContent=String(rate);
  $('kRateH').textContent=fmt(st.rejected)+' blocked';
  $('kRpm').textContent=fmt(full.total);
  $('kRpmH').textContent='peak '+fmt(Math.max(0,...m.map((x)=>x.total)))+' in 30 min';
  $('kP95').firstChild.textContent=String(st.latency.p95);
  $('kP95H').textContent='avg '+st.latency.avg+' ms, max '+st.latency.max+' ms';
  $('tabCount').textContent=fmt(st.total);
  sparkline('sTotal',m.map((x)=>x.total),'ok');
  sparkline('sBlock',m.map((x)=>x.rejected),'bad');
  sparkline('sRpm',m.map((x)=>x.total),'info');
  sparkline('sLat',m.map((x)=>x.latencyCount?x.latencySum/x.latencyCount:0),'violet');
  timeChart(m);
  layerBars(st.byLayer);
  donut(st.byStatusClass);
  topList('topPaths',st.topPaths,false);
  topList('topIps',st.topIps,true);
}

function sparkline(id,data,color){
  const svg=$(id);if(!svg)return;
  svg.textContent='';
  const w=200,h=34,max=Math.max(1,...data),n=data.length;
  if(n<2)return;
  const pts=data.map((v,i)=>[i/(n-1)*w,h-2-(v/max)*(h-6)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  svg.setAttribute('viewBox','0 0 '+w+' '+h);
  svg.appendChild(el('path',{d:line+' L'+w+' '+h+' L0 '+h+' Z',class:'f-'+color,opacity:'.14'}));
  svg.appendChild(el('path',{d:line,class:'st-'+color,fill:'none','stroke-width':'1.8','stroke-linejoin':'round','stroke-linecap':'round','vector-effect':'non-scaling-stroke'}));
}

function timeChart(m){
  const svg=$('chart'),box=$('chartBox'),tip=$('tip');
  svg.textContent='';
  const W=Math.max(320,box.clientWidth),H=250,L=34,R=6,T=8,B=22;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('height',String(H));
  const max=niceMax(Math.max(1,...m.map((x)=>x.total)));
  const pw=W-L-R,ph=H-T-B,bw=pw/m.length;
  for(let i=0;i<=4;i++){
    const y=T+ph-(i/4)*ph;
    svg.appendChild(el('line',{x1:L,x2:W-R,y1:y,y2:y,class:'grid-line'}));
    svg.appendChild(el('text',{x:L-6,y:y+3.5,'text-anchor':'end',class:'axis'},fmt(Math.round(max*i/4))));
  }
  m.forEach((b,i)=>{
    const x=L+i*bw,gap=Math.min(3,bw*.22);
    const allowed=b.total-b.rejected,ha=allowed/max*ph,hr=b.rejected/max*ph;
    if(ha>0)svg.appendChild(el('rect',{x:x+gap/2,y:T+ph-ha-hr,width:Math.max(1,bw-gap),height:ha,rx:2,class:'f-ok',opacity:'.85'}));
    if(hr>0)svg.appendChild(el('rect',{x:x+gap/2,y:T+ph-hr,width:Math.max(1,bw-gap),height:hr,rx:2,class:'f-bad'}));
    if(i%5===0||i===m.length-1)svg.appendChild(el('text',{x:x+bw/2,y:H-6,'text-anchor':'middle',class:'axis'},hm(b.minute)));
    const hit=el('rect',{x:x,y:T,width:bw,height:ph,class:'hover-col'});
    hit.addEventListener('mousemove',()=>showTip(b,x+bw/2,W));
    hit.addEventListener('mouseleave',()=>tip.classList.remove('on'));
    svg.appendChild(hit);
  });
  function showTip(b,cx,width){
    tip.textContent='';
    const head=document.createElement('b');head.textContent=hm(b.minute);tip.appendChild(head);
    const add=(k,v)=>{const d=document.createElement('div'),a=document.createElement('span'),c=document.createElement('span');a.textContent=k;c.textContent=v;d.appendChild(a);d.appendChild(c);tip.appendChild(d)};
    add('Requests',fmt(b.total));add('Blocked',fmt(b.rejected));
    if(b.clientErrors||b.serverErrors)add('4xx / 5xx',b.clientErrors+' / '+b.serverErrors);
    if(b.latencyCount)add('Avg latency',Math.round(b.latencySum/b.latencyCount)+' ms');
    tip.classList.add('on');
    const tw=tip.offsetWidth,left=Math.min(Math.max(0,cx-tw/2),width-tw);
    tip.style.left=left+'px';tip.style.top='6px';
  }
}

const LAYER_LABELS={'whitelist':'Whitelist','blacklist':'Blacklist','auto-ban':'Auto-ban','user-agent':'User-Agent','payload':'Payload size','burst':'Burst limit','rate-limit':'Rate limit','slow-down':'Slow-down'};
function layerBars(byLayer){
  const box=$('layers');box.textContent='';
  const entries=Object.keys(byLayer).map((k)=>[k,byLayer[k]]).sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((s,e)=>s+e[1],0);
  $('layerSub').textContent=total?fmt(total)+' total':'';
  if(!entries.length){const d=document.createElement('div');d.className='empty';d.textContent='Nothing blocked yet';box.appendChild(d);return}
  const max=entries[0][1];
  for(const e of entries){
    const row=document.createElement('div');row.className='hbar';
    const t=document.createElement('div');t.className='t';
    const a=document.createElement('span');a.textContent=LAYER_LABELS[e[0]]||e[0];
    const b=document.createElement('span');b.textContent=fmt(e[1])+' ('+Math.round(e[1]/total*100)+'%)';
    t.appendChild(a);t.appendChild(b);
    const track=document.createElement('div');track.className='track';
    const bar=document.createElement('i');bar.className='r';bar.style.width=Math.max(3,e[1]/max*100)+'%';
    track.appendChild(bar);row.appendChild(t);row.appendChild(track);box.appendChild(row);
  }
}

const STATUS_DEFS=[['2xx','Success','ok'],['3xx','Redirect','info'],['4xx','Client error','warn'],['5xx','Server error','bad']];
function donut(byClass){
  const svg=$('donut'),legend=$('donutLegend');
  svg.textContent='';legend.textContent='';
  const total=STATUS_DEFS.reduce((s,d)=>s+(byClass[d[0]]||0),0);
  const r=50,c=2*Math.PI*r;
  svg.appendChild(el('circle',{cx:66,cy:66,r:r,fill:'none','stroke-width':14,class:'st-faint',opacity:'.5'}));
  let offset=0;
  if(total){
    for(const d of STATUS_DEFS){
      const n=byClass[d[0]]||0;if(!n)continue;
      const len=n/total*c;
      svg.appendChild(el('circle',{cx:66,cy:66,r:r,fill:'none','stroke-width':14,class:'st-'+d[2],'stroke-dasharray':Math.max(0,len-2).toFixed(2)+' '+c.toFixed(2),'stroke-dashoffset':(-offset).toFixed(2),transform:'rotate(-90 66 66)'}));
      offset+=len;
    }
  }
  svg.appendChild(el('text',{x:66,y:68,class:'donut-n'},total?fmt(total):'0'));
  svg.appendChild(el('text',{x:66,y:83,class:'donut-l'},'responses'));
  for(const d of STATUS_DEFS){
    const n=byClass[d[0]]||0;
    const row=document.createElement('div');
    const sw=document.createElement('i');sw.style.background='var(--'+d[2]+')';
    const a=document.createElement('span');a.textContent=d[0]+'  '+d[1];
    const b=document.createElement('span');b.textContent=total?fmt(n)+'  ('+Math.round(n/total*100)+'%)':'0';
    row.appendChild(sw);row.appendChild(a);row.appendChild(b);legend.appendChild(row);
  }
}

function topList(id,items,withBan){
  const box=$(id);box.textContent='';
  if(!items.length){const d=document.createElement('div');d.className='empty';d.textContent='No traffic yet';box.appendChild(d);return}
  for(const it of items){
    const row=document.createElement('div');row.className='toprow';
    const k=document.createElement('span');k.className='k mono';k.textContent=it.key;k.title=it.key;
    const n=document.createElement('span');n.className='n';n.textContent=fmt(it.count);
    const r=document.createElement('span');r.className='rj';r.textContent=it.rejected?fmt(it.rejected)+' blk':'';
    row.appendChild(k);row.appendChild(n);row.appendChild(r);
    if(withBan){
      row.style.gridTemplateColumns='minmax(0,1fr) auto auto auto';
      const btn=document.createElement('button');btn.className='ghost sm';btn.textContent='Ban';
      btn.addEventListener('click',()=>{if(confirm('Ban '+it.key+' for 60 minutes?'))run(()=>api('/api/bans','POST',{ip:it.key,minutes:60}),'Banned '+it.key,false).then(loadBans)});
      row.appendChild(btn);
    }
    box.appendChild(row);
  }
}

function fillForms(s){
  const rl=s.rateLimit;
  $('rlOn').checked=!!rl;$('rlLimit').value=rl?rl.limit:60;$('rlTtl').value=rl?Math.round(rl.ttl/1000):60;$('rlAlgo').value=(rl&&rl.algorithm)||'';
  const ab=s.autoBan;
  $('abOn').checked=!!ab;$('abThreshold').value=ab?ab.threshold:5;$('abWindow').value=ab?Math.round(ab.window/1000):60;$('abBan').value=ab?Math.round(ab.banDuration/1000):300;
  $('wl').value=joinList(s.whitelist);$('bl').value=joinList(s.blacklist);
}
async function loadState(){
  try{const s=await api('/api/state');if(s)renderState(s)}catch(e){$('meta').textContent=e.message}
}

function statusClass(s){if(!s)return'';return s>=500?'s-bad':s>=400?'s-warn':'s-ok'}
function cell(tr,text,cls){const td=document.createElement('td');td.textContent=text==null?'':String(text);if(cls)td.className=cls;tr.appendChild(td);return td}
function badge(td,text,cls){td.textContent='';const b=document.createElement('span');b.className='badge '+cls;b.textContent=text;td.appendChild(b)}
function renderRows(freshFrom){
  const text=$('fText').value.trim().toLowerCase();
  const body=$('rows');body.textContent='';
  let shown=0;
  for(let i=rows.length-1;i>=0;i--){
    const e=rows[i];
    if(kind==='rej'&&e.allowed)continue;
    if(kind==='ok'&&!e.allowed)continue;
    if(text&&!(e.ip+' '+e.path+' '+(e.layer||'')+' '+(e.status||'')).toLowerCase().includes(text))continue;
    const tr=document.createElement('tr');tr.className=(e.allowed?'':'rej')+(freshFrom&&e.id>freshFrom?' fresh':'');
    cell(tr,new Date(e.at).toLocaleTimeString(),'mono');cell(tr,e.ip,'mono');
    badge(cell(tr,''),e.method,'b-mute');
    cell(tr,e.path,'mono');
    badge(cell(tr,''),e.allowed?'allowed':'blocked',e.allowed?'b-ok':'b-bad');
    const lt=cell(tr,'');if(e.layer)badge(lt,e.layer,'b-info');
    cell(tr,e.status||'',statusClass(e.status)+' mono');cell(tr,e.durationMs==null?'':e.durationMs,'mono');
    const ua=cell(tr,e.userAgent);ua.title=e.userAgent+(e.reason?' | '+e.reason:'');
    body.appendChild(tr);
    if(++shown>=MAX_ROWS)break;
  }
  $('emptyRows').style.display=shown?'none':'block';
  $('emptyRows').textContent=rows.length?'No requests match this filter.':'Waiting for traffic...';
}
async function pollEvents(){
  if(paused)return;
  try{
    const j=await api('/api/events?since='+lastId);
    if(j&&j.events.length){
      const before=lastId;
      for(const e of j.events){rows.push(e);lastId=Math.max(lastId,e.id)}
      if(rows.length>MAX_ROWS)rows=rows.slice(-MAX_ROWS);
      renderRows(before);
    }
    $('liveState').textContent='';
  }catch(e){$('liveState').textContent='connection problem'}
}
async function loadBans(){
  try{
    const j=await api('/api/bans');if(!j)return;
    const ul=$('bans');ul.textContent='';
    $('kBans').textContent=j.supported?fmt(j.bans.length):'n/a';
    $('kBansH').textContent=j.supported?(j.bans.length?'currently blocked':'none right now'):'storage cannot list bans';
    $('banSub').textContent=j.supported&&j.bans.length?fmt(j.bans.length)+' active':'';
    if(!j.supported){const li=document.createElement('li');li.textContent='This storage cannot list bans.';ul.appendChild(li);return}
    if(!j.bans.length){const li=document.createElement('li');li.textContent='No active bans';ul.appendChild(li);return}
    for(const b of j.bans){
      const li=document.createElement('li');
      const left=document.createElement('div');
      const label=document.createElement('span');label.className='mono';label.textContent=b.ip;
      const sub=document.createElement('span');sub.className='sub';sub.textContent='until '+new Date(b.expiresAt).toLocaleString();
      left.appendChild(label);left.appendChild(sub);
      const btn=document.createElement('button');btn.className='ghost sm';btn.textContent='Unban';
      btn.addEventListener('click',()=>run(()=>api('/api/bans/'+encodeURIComponent(b.ip),'DELETE'),'Unbanned',false).then(loadBans));
      li.appendChild(left);li.appendChild(btn);ul.appendChild(li);
    }
  }catch(e){toast(e.message,true)}
}

$('swEnabled').addEventListener('change',(ev)=>run(()=>api('/api/settings','PATCH',{enabled:ev.target.checked}),ev.target.checked?'Shield enabled':'Shield disabled',false));
$('swAttack').addEventListener('change',(ev)=>run(()=>api('/api/settings','PATCH',{attackMode:ev.target.checked}),ev.target.checked?'Under attack mode on':'Back to normal',false));
$('rlSave').addEventListener('click',()=>run(()=>{
  if(!$('rlOn').checked)return api('/api/settings','PATCH',{rateLimit:null});
  const rl={limit:Number($('rlLimit').value),ttl:Number($('rlTtl').value)*1000};
  if($('rlAlgo').value)rl.algorithm=$('rlAlgo').value;
  return api('/api/settings','PATCH',{rateLimit:rl});
},'Rate limit saved'));
$('abSave').addEventListener('click',()=>run(()=>{
  if(!$('abOn').checked)return api('/api/settings','PATCH',{autoBan:null});
  return api('/api/settings','PATCH',{autoBan:{threshold:Number($('abThreshold').value),window:Number($('abWindow').value)*1000,banDuration:Number($('abBan').value)*1000}});
},'Auto-ban saved'));
$('ipSave').addEventListener('click',()=>run(()=>api('/api/settings','PATCH',{whitelist:splitList('wl'),blacklist:splitList('bl')}),'IP rules saved'));
$('banAdd').addEventListener('click',()=>run(()=>api('/api/bans','POST',{ip:$('banIp').value.trim(),minutes:Number($('banMin').value)}),'Banned',false).then(()=>{$('banIp').value='';loadBans()}));
$('reset').addEventListener('click',()=>{if(confirm('Reset all dashboard overrides?'))run(()=>api('/api/settings','DELETE'),'Overrides reset')});
$('logout').addEventListener('click',async()=>{try{await api('/logout','POST')}catch(e){}location.reload()});
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';$('liveState').textContent=paused?'paused':''});
$('clear').addEventListener('click',()=>{rows=[];renderRows()});
$('fText').addEventListener('input',()=>renderRows());
$('fKind').addEventListener('click',(ev)=>{
  const b=ev.target.closest('button');if(!b)return;
  kind=b.dataset.k;
  document.querySelectorAll('#fKind button').forEach((x)=>x.setAttribute('aria-pressed',String(x===b)));
  renderRows();
});
let resizeTimer=0;
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(lastStats)timeChart(lastStats.minutes)},120)});

loadState();loadBans();pollEvents();
setInterval(pollEvents,1000);
setInterval(loadState,3000);
setInterval(loadBans,10000);
</script></body></html>`;
}

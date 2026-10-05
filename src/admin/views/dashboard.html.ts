import { ADMIN_STYLES } from './admin.styles';

export function renderDashboardPage(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield Admin</title><style nonce="${nonce}">${ADMIN_STYLES}</style></head>
<body><div class="wrap">
<div class="top">
  <div><h1>Shield admin</h1><span class="mono" id="meta" style="color:var(--muted);font-size:12px"></span></div>
  <div class="pills"><span class="pill" id="pShield">shield</span><span class="pill" id="pAttack">attack mode</span><button class="ghost" id="logout">Log out</button></div>
</div>

<div class="tiles">
  <div class="card tile"><div class="n" id="tTotal">0</div><div class="l">Requests seen</div></div>
  <div class="card tile"><div class="n s-ok" id="tAllowed">0</div><div class="l">Allowed</div></div>
  <div class="card tile"><div class="n s-bad" id="tRejected">0</div><div class="l">Blocked</div></div>
  <div class="card tile"><div class="n" id="tRpm">0</div><div class="l">Last minute</div></div>
  <div class="card tile"><div class="n" id="tStatus">-</div><div class="l">Responses 2xx / 4xx / 5xx</div></div>
</div>

<div class="grid">
  <div class="card">
    <h2>Protection</h2>
    <label class="switch"><span>Shield enabled<small>Master switch for every layer</small></span><input type="checkbox" id="swEnabled"></label>
    <label class="switch"><span>Under attack mode<small id="attackHint">Stricter limits, bot user-agents blocked</small></span><input type="checkbox" id="swAttack"></label>
    <div class="msg" id="mProtect"></div>
    <h2 style="margin-top:12px">Traffic, last 30 min</h2>
    <div class="chart" id="chart" aria-label="Requests per minute"></div>
  </div>

  <div class="card">
    <h2>Rate limit</h2>
    <label class="switch"><span>Enabled</span><input type="checkbox" id="rlOn"></label>
    <div class="row"><label for="rlLimit">Requests</label><input id="rlLimit" type="number" min="1"></div>
    <div class="row"><label for="rlTtl">Window (sec)</label><input id="rlTtl" type="number" min="1"></div>
    <div class="row"><label for="rlAlgo">Algorithm</label><select id="rlAlgo">
      <option value="">default</option><option>token-bucket</option><option>sliding-window</option><option>sliding-window-log</option><option>fixed-window</option><option>leaky-bucket</option></select></div>
    <button id="rlSave">Save</button><div class="msg" id="mRl"></div>
  </div>

  <div class="card">
    <h2>Auto-ban</h2>
    <label class="switch"><span>Enabled</span><input type="checkbox" id="abOn"></label>
    <div class="row"><label for="abThreshold">Violations</label><input id="abThreshold" type="number" min="1"></div>
    <div class="row"><label for="abWindow">Window (sec)</label><input id="abWindow" type="number" min="1"></div>
    <div class="row"><label for="abBan">Ban (sec)</label><input id="abBan" type="number" min="1"></div>
    <button id="abSave">Save</button><div class="msg" id="mAb"></div>
  </div>

  <div class="card">
    <h2>IP rules</h2>
    <div class="field"><label for="wl">Whitelist (IP or CIDR per line)</label><textarea id="wl" spellcheck="false"></textarea></div>
    <div class="field"><label for="bl">Blacklist (IP or CIDR per line)</label><textarea id="bl" spellcheck="false"></textarea></div>
    <button id="ipSave">Save</button><div class="msg" id="mIp"></div>
  </div>

  <div class="card">
    <h2>Bans</h2>
    <div class="row"><input id="banIp" placeholder="IP address"><input id="banMin" type="number" min="1" value="60" style="max-width:90px" aria-label="Minutes"><button id="banAdd">Ban</button></div>
    <ul class="bans" id="bans"></ul>
    <div class="msg" id="mBan"></div>
  </div>

  <div class="card">
    <h2>Overrides</h2>
    <p style="color:var(--muted);margin-top:0">Changes made here are stored in shield storage and override your forRoot config. Reset returns to the code defaults.</p>
    <button class="danger" id="reset">Reset all overrides</button><div class="msg" id="mReset"></div>
  </div>
</div>

<div class="card wide">
  <h2>Live traffic <span id="liveState" style="text-transform:none;letter-spacing:0"></span></h2>
  <div class="tools">
    <input id="fText" placeholder="Filter by IP, path, layer" aria-label="Filter">
    <select id="fKind" aria-label="Show"><option value="all">All</option><option value="rej">Blocked</option><option value="ok">Allowed</option></select>
    <button class="ghost" id="pause">Pause</button><button class="ghost" id="clear">Clear</button>
  </div>
  <div class="tablewrap"><table><thead><tr><th>Time</th><th>IP</th><th>Method</th><th>Path</th><th>Result</th><th>Layer</th><th>Status</th><th>ms</th><th>User-Agent</th></tr></thead><tbody id="rows"></tbody></table></div>
</div>
</div>

<script nonce="${nonce}">
const BASE=location.pathname.replace(/\\/$/,'');
const $=(id)=>document.getElementById(id);
const MAX_ROWS=300;
let rows=[],lastId=0,paused=false,filled=false;

async function api(path,method,body){
  const r=await fetch(BASE+path,{method:method||'GET',credentials:'same-origin',headers:{'content-type':'application/json','x-shield-admin':'1'},body:body===undefined?undefined:JSON.stringify(body)});
  if(r.status===401){location.reload();return null}
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(Array.isArray(j.message)?j.message.join(', '):(j.message||('HTTP '+r.status)));
  return j;
}
function say(id,text,err){const el=$(id);el.textContent=text;el.className='msg'+(err?' err':'')}
async function run(msgId,fn,okText,refill){
  say(msgId,'Saving...');
  try{await fn();say(msgId,okText||'Saved');if(refill!==false)filled=false;await loadState()}
  catch(e){say(msgId,e.message,true)}
}
function lines(id){return $(id).value.split(/\\r?\\n/).map((s)=>s.trim()).filter(Boolean)}
function splitList(id){const all=lines(id);return{ips:all.filter((s)=>!s.includes('/')),cidrs:all.filter((s)=>s.includes('/'))}}
function joinList(l){return[].concat((l&&l.ips)||[],(l&&l.cidrs)||[]).join('\\n')}
function fmt(n){return Number(n).toLocaleString()}

function renderState(s){
  $('meta').textContent='v'+s.version+' | storage: '+s.storage+' | up '+Math.floor(s.uptimeSec/60)+'m';
  const pS=$('pShield');pS.textContent=s.enabled?'shield on':'shield off';pS.className='pill '+(s.enabled?'ok':'bad');
  const pA=$('pAttack');pA.textContent=s.attackMode?'under attack':'normal';pA.className='pill '+(s.attackMode?'warn':'');
  if(document.activeElement!==$('swEnabled'))$('swEnabled').checked=s.enabled;
  if(document.activeElement!==$('swAttack'))$('swAttack').checked=s.attackMode;
  $('attackHint').textContent='Limit divided by '+s.attackModeFactor+(s.effective.rateLimit?' (now '+s.effective.rateLimit.limit+' per '+Math.round(s.effective.rateLimit.ttl/1000)+'s)':'')+', bot user-agents blocked, auto-ban tightened';
  const st=s.stats;
  $('tTotal').textContent=fmt(st.total);$('tAllowed').textContent=fmt(st.allowed);$('tRejected').textContent=fmt(st.rejected);
  const last=st.minutes[st.minutes.length-1];$('tRpm').textContent=fmt(last?last.total:0);
  const c=st.byStatusClass;$('tStatus').textContent=(c['2xx']||0)+' / '+(c['4xx']||0)+' / '+(c['5xx']||0);
  renderChart(st.minutes);
  if(!filled){fillForms(s.settings);filled=true}
}
function renderChart(minutes){
  const chart=$('chart');chart.textContent='';
  const max=Math.max(1,...minutes.map((m)=>m.total));
  for(const m of minutes){
    const b=document.createElement('div');b.className='b';b.style.height=Math.max(2,Math.round(m.total/max*100))+'%';
    b.title=new Date(m.minute*60000).toLocaleTimeString()+': '+m.total+' requests, '+m.rejected+' blocked';
    if(m.rejected){const i=document.createElement('i');i.style.height=Math.round(m.rejected/m.total*100)+'%';b.appendChild(i)}
    chart.appendChild(b);
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
  try{const s=await api('/api/state');if(s)renderState(s)}catch(e){say('mProtect',e.message,true)}
}

function statusClass(s){if(!s)return'';return s>=500?'s-bad':s>=400?'s-warn':'s-ok'}
function cell(tr,text,cls){const td=document.createElement('td');td.textContent=text==null?'':String(text);if(cls)td.className=cls;tr.appendChild(td)}
function renderRows(){
  const text=$('fText').value.trim().toLowerCase(),kind=$('fKind').value;
  const body=$('rows');body.textContent='';
  for(let i=rows.length-1;i>=0;i--){
    const e=rows[i];
    if(kind==='rej'&&e.allowed)continue;
    if(kind==='ok'&&!e.allowed)continue;
    if(text&&!(e.ip+' '+e.path+' '+(e.layer||'')).toLowerCase().includes(text))continue;
    const tr=document.createElement('tr');if(!e.allowed)tr.className='rej';
    cell(tr,new Date(e.at).toLocaleTimeString(),'mono');cell(tr,e.ip,'mono');cell(tr,e.method);cell(tr,e.path,'mono');
    cell(tr,e.allowed?'allowed':'blocked',e.allowed?'s-ok':'s-bad');cell(tr,e.layer||'');
    cell(tr,e.status||'',statusClass(e.status));cell(tr,e.durationMs==null?'':e.durationMs);
    cell(tr,e.userAgent);tr.lastChild.title=e.userAgent+(e.reason?' | '+e.reason:'');
    body.appendChild(tr);
  }
}
async function pollEvents(){
  if(paused)return;
  try{
    const j=await api('/api/events?since='+lastId);
    if(j&&j.events.length){
      for(const e of j.events){rows.push(e);lastId=Math.max(lastId,e.id)}
      if(rows.length>MAX_ROWS)rows=rows.slice(-MAX_ROWS);
      renderRows();
    }
    $('liveState').textContent='';
  }catch(e){$('liveState').textContent='(connection problem)'}
}
async function loadBans(){
  try{
    const j=await api('/api/bans');if(!j)return;
    const ul=$('bans');ul.textContent='';
    if(!j.supported){say('mBan','This storage cannot list bans.');return}
    if(!j.bans.length){const li=document.createElement('li');li.textContent='No active bans';ul.appendChild(li);return}
    for(const b of j.bans){
      const li=document.createElement('li');
      const label=document.createElement('span');label.className='mono';
      label.textContent=b.ip+' (until '+new Date(b.expiresAt).toLocaleString()+')';
      const btn=document.createElement('button');btn.className='ghost';btn.textContent='Unban';
      btn.addEventListener('click',()=>run('mBan',()=>api('/api/bans/'+encodeURIComponent(b.ip),'DELETE'),'Unbanned').then(loadBans));
      li.appendChild(label);li.appendChild(btn);ul.appendChild(li);
    }
  }catch(e){say('mBan',e.message,true)}
}

$('swEnabled').addEventListener('change',(ev)=>run('mProtect',()=>api('/api/settings','PATCH',{enabled:ev.target.checked}),undefined,false));
$('swAttack').addEventListener('change',(ev)=>run('mProtect',()=>api('/api/settings','PATCH',{attackMode:ev.target.checked}),undefined,false));
$('rlSave').addEventListener('click',()=>run('mRl',()=>{
  if(!$('rlOn').checked)return api('/api/settings','PATCH',{rateLimit:null});
  const rl={limit:Number($('rlLimit').value),ttl:Number($('rlTtl').value)*1000};
  if($('rlAlgo').value)rl.algorithm=$('rlAlgo').value;
  return api('/api/settings','PATCH',{rateLimit:rl});
}));
$('abSave').addEventListener('click',()=>run('mAb',()=>{
  if(!$('abOn').checked)return api('/api/settings','PATCH',{autoBan:null});
  return api('/api/settings','PATCH',{autoBan:{threshold:Number($('abThreshold').value),window:Number($('abWindow').value)*1000,banDuration:Number($('abBan').value)*1000}});
}));
$('ipSave').addEventListener('click',()=>run('mIp',()=>api('/api/settings','PATCH',{whitelist:splitList('wl'),blacklist:splitList('bl')})));
$('banAdd').addEventListener('click',()=>run('mBan',()=>api('/api/bans','POST',{ip:$('banIp').value.trim(),minutes:Number($('banMin').value)}),'Banned').then(()=>{$('banIp').value='';loadBans()}));
$('reset').addEventListener('click',()=>{if(confirm('Reset all dashboard overrides?'))run('mReset',()=>api('/api/settings','DELETE'),'Reset')});
$('logout').addEventListener('click',async()=>{try{await api('/logout','POST')}catch{}location.reload()});
$('pause').addEventListener('click',()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';$('liveState').textContent=paused?'(paused)':''});
$('clear').addEventListener('click',()=>{rows=[];renderRows()});
$('fText').addEventListener('input',renderRows);
$('fKind').addEventListener('change',renderRows);

loadState();loadBans();pollEvents();
setInterval(pollEvents,1000);
setInterval(loadState,3000);
setInterval(loadBans,10000);
</script></body></html>`;
}

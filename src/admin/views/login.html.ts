import { ADMIN_STYLES } from './admin.styles';

export function renderLoginPage(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shield Admin</title><style nonce="${nonce}">${ADMIN_STYLES}</style></head>
<body><div class="center"><form class="card box" id="f" autocomplete="on">
<h1>Shield admin</h1><p style="color:var(--muted)">Sign in to manage shielding.</p>
<div class="field"><label for="u">Username</label><input id="u" name="username" autocomplete="username" required autofocus></div>
<div class="field"><label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required></div>
<div class="err-text" id="e" role="alert"></div>
<button type="submit" id="b" style="width:100%">Sign in</button>
</form></div>
<script nonce="${nonce}">
const f=document.getElementById('f'),e=document.getElementById('e'),b=document.getElementById('b');
f.addEventListener('submit',async(ev)=>{
  ev.preventDefault();e.textContent='';b.disabled=true;
  try{
    const r=await fetch(location.pathname.replace(/\\/$/,'')+'/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-shield-admin':'1'},body:JSON.stringify({username:f.username.value,password:f.password.value})});
    if(r.ok){location.reload();return}
    const j=await r.json().catch(()=>({}));
    e.textContent=Array.isArray(j.message)?j.message.join(', '):(j.message||'Login failed');
  }catch{e.textContent='Network error'}
  b.disabled=false;
});
</script></body></html>`;
}

export const ADMIN_STYLES = `
:root{--bg:#f4f5f7;--card:#fff;--text:#16181d;--muted:#5d6472;--line:#dfe2e8;--accent:#2457d6;--accent-text:#fff;--ok:#157a43;--bad:#b42318;--warn:#a35a00;--bar:#9db4ee;--bar-bad:#e5736a;--input:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#171a21;--text:#e8eaee;--muted:#9aa2b1;--line:#2a2f3a;--accent:#6b93f5;--accent-text:#0b1020;--ok:#4cc38a;--bad:#ff8a7e;--warn:#f0b34a;--bar:#34508f;--bar-bad:#c2564d;--input:#10131a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
h1{font-size:18px;margin:0}
h2{font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
button,input,select,textarea{font:inherit;color:inherit}
input,select,textarea{background:var(--input);border:1px solid var(--line);border-radius:6px;padding:7px 9px;width:100%}
textarea{min-height:86px;resize:vertical;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
button{background:var(--accent);color:var(--accent-text);border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:600}
button.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
button.danger{background:var(--bad);color:#fff}
button:disabled{opacity:.5;cursor:default}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:1200px;margin:0 auto;padding:16px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:12px;background:var(--card)}
.pill.ok{color:var(--ok)}.pill.bad{color:var(--bad)}.pill.warn{color:var(--warn)}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}
.tile .n{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums}
.tile .l{color:var(--muted);font-size:12px}
.row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.row>label{flex:0 0 90px;color:var(--muted);font-size:12px}
.switch{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0}
.switch small{display:block;color:var(--muted)}
.switch input{width:auto;height:18px;width:18px}
.msg{min-height:18px;font-size:12px;color:var(--muted);margin-top:6px}
.msg.err{color:var(--bad)}
.chart{display:flex;align-items:flex-end;gap:2px;height:70px;margin-top:6px}
.chart .b{flex:1;min-width:2px;background:var(--bar);position:relative;display:flex;align-items:flex-end}
.chart .b i{display:block;width:100%;background:var(--bar-bad)}
.tablewrap{overflow:auto;max-height:420px;border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:12px}
th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
th{position:sticky;top:0;background:var(--card);color:var(--muted)}
td.mono,.mono{font-family:ui-monospace,Menlo,Consolas,monospace}
tr.rej td:first-child{box-shadow:inset 3px 0 0 var(--bad)}
.s-ok{color:var(--ok)}.s-bad{color:var(--bad)}.s-warn{color:var(--warn)}
.tools{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.tools input{max-width:260px}.tools select{max-width:150px}
.wide{margin-top:12px}
.center{min-height:100vh;display:grid;place-items:center;padding:16px}
.box{width:100%;max-width:380px}
.field{margin-bottom:12px}
.field label{display:block;margin-bottom:4px;color:var(--muted);font-size:12px}
.err-text{color:var(--bad);min-height:20px;margin:8px 0}
ul.plain{padding-left:18px;margin:8px 0}
.bans li{display:flex;justify-content:space-between;align-items:center;gap:8px;list-style:none;padding:4px 0;border-bottom:1px solid var(--line)}
.bans{padding:0;margin:8px 0}
`;

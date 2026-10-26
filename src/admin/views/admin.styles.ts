export const ADMIN_STYLES = `
:root{color-scheme:dark;--bg:#080b10;--bg2:#0c1118;--card:#10161f;--card2:#141c27;--text:#e7ecf3;--muted:#8793a6;--faint:#566074;--line:#1e2835;--line2:#2a3647;--accent:#34d399;--accent2:#10b981;--accent-ink:#04120c;--ok:#34d399;--bad:#f87171;--warn:#fbbf24;--info:#60a5fa;--violet:#a78bfa;--input:#0b1017;--shadow:0 1px 0 rgba(255,255,255,.03) inset,0 10px 30px -12px rgba(0,0,0,.6);--glow:rgba(52,211,153,.14)}
:root[data-theme=light]{color-scheme:light;--bg:#f3f5f9;--bg2:#eaeef4;--card:#fff;--card2:#f7f9fc;--text:#0e1520;--muted:#5b6678;--faint:#8b95a6;--line:#e2e7ef;--line2:#cfd7e3;--accent:#0f9d6e;--accent2:#0b7f58;--accent-ink:#fff;--ok:#0f9d6e;--bad:#d92d20;--warn:#b86a00;--info:#2563eb;--violet:#7c3aed;--input:#fff;--shadow:0 1px 2px rgba(16,24,40,.06),0 8px 24px -14px rgba(16,24,40,.18);--glow:rgba(15,157,110,.1)}
@media (prefers-color-scheme:light){:root:not([data-theme=dark]){color-scheme:light;--bg:#f3f5f9;--bg2:#eaeef4;--card:#fff;--card2:#f7f9fc;--text:#0e1520;--muted:#5b6678;--faint:#8b95a6;--line:#e2e7ef;--line2:#cfd7e3;--accent:#0f9d6e;--accent2:#0b7f58;--accent-ink:#fff;--ok:#0f9d6e;--bad:#d92d20;--warn:#b86a00;--info:#2563eb;--violet:#7c3aed;--input:#fff;--shadow:0 1px 2px rgba(16,24,40,.06),0 8px 24px -14px rgba(16,24,40,.18);--glow:rgba(15,157,110,.1)}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased;background-image:radial-gradient(1200px 500px at 85% -10%,var(--glow),transparent 60%)}
h1,h2,h3{margin:0;font-weight:650}
h1{font-size:17px;letter-spacing:-.01em}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:600}
button,input,select,textarea{font:inherit;color:inherit}
input,select,textarea{background:var(--input);border:1px solid var(--line2);border-radius:8px;padding:8px 10px;width:100%;transition:border-color .15s,box-shadow .15s}
input:hover,select:hover,textarea:hover{border-color:var(--faint)}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--glow)}
textarea{min-height:92px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
button{background:var(--accent);color:var(--accent-ink);border:1px solid transparent;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:600;transition:filter .15s,transform .05s,background .15s}
button:hover{filter:brightness(1.08)}
button:active{transform:translateY(1px)}
button.ghost{background:transparent;color:var(--text);border-color:var(--line2)}
button.ghost:hover{background:var(--card2);filter:none}
button.danger{background:transparent;color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,transparent)}
button.danger:hover{background:color-mix(in srgb,var(--bad) 12%,transparent);filter:none}
button.sm{padding:4px 9px;font-size:12px;border-radius:6px}
button.wide{width:100%}
button:disabled{opacity:.5;cursor:default}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mono,td.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.wrap{max-width:1240px;margin:0 auto;padding:0 20px 40px}

.bar{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--line)}
.bar .in{max-width:1240px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;margin-right:auto}
.brand svg{width:30px;height:30px;flex:none}
.brand small{display:block;color:var(--muted);font-size:11.5px;margin-top:1px}
.chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line2);border-radius:999px;padding:4px 11px;font-size:12px;background:var(--card);color:var(--muted);white-space:nowrap}
.chip b{color:var(--text);font-weight:600}
.dot{width:8px;height:8px;border-radius:50%;background:var(--faint);flex:none}
.chip.ok{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 40%,transparent);background:color-mix(in srgb,var(--ok) 9%,var(--card))}
.chip.ok .dot{background:var(--ok);box-shadow:0 0 0 0 var(--ok);animation:pulse 2.2s infinite}
.chip.bad{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 40%,transparent);background:color-mix(in srgb,var(--bad) 9%,var(--card))}
.chip.bad .dot{background:var(--bad)}
.chip.warn{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 45%,transparent);background:color-mix(in srgb,var(--warn) 10%,var(--card))}
.chip.warn .dot{background:var(--warn);animation:pulse 1.2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,currentColor 55%,transparent)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
.icon-btn{width:34px;height:34px;padding:0;display:grid;place-items:center;border-radius:9px}
.icon-btn svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tabs{max-width:1240px;margin:0 auto;padding:0 20px;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{background:transparent;color:var(--muted);border:0;border-bottom:2px solid transparent;border-radius:0;padding:10px 14px;font-weight:550;white-space:nowrap}
.tab:hover{color:var(--text);filter:none}
.tab[aria-selected=true]{color:var(--text);border-bottom-color:var(--accent)}
.tab .count{margin-left:6px;font-size:11px;padding:1px 7px;border-radius:999px;background:var(--card2);border:1px solid var(--line);color:var(--muted)}
.tab .count.hot{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 40%,transparent)}
.view{display:none;padding-top:20px}
.view.on{display:block;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
.card>header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.card>header .sub{color:var(--faint);font-size:12px;text-transform:none;letter-spacing:0;font-weight:400}
.kpis{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:14px}
.kpi{position:relative;overflow:hidden;padding:16px 16px 12px}
.kpi .lbl{color:var(--muted);font-size:12px;font-weight:550;display:flex;align-items:center;gap:6px}
.kpi .val{font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.15;margin-top:6px;font-variant-numeric:tabular-nums}
.kpi .val small{font-size:14px;color:var(--muted);font-weight:500;margin-left:3px}
.kpi .hint{color:var(--faint);font-size:12px;margin-top:2px;min-height:18px}
.kpi svg.spark{display:block;width:100%;height:34px;margin-top:8px}
.grid{display:grid;gap:14px}
.g2{grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.row2{display:grid;gap:14px;grid-template-columns:minmax(0,2fr) minmax(0,1fr);margin-bottom:14px}
@media (max-width:900px){.row2{grid-template-columns:1fr}}
.mb{margin-bottom:14px}

.chartbox{position:relative}
.chartbox svg{display:block;width:100%;overflow:visible}
.tip{position:absolute;pointer-events:none;z-index:5;min-width:150px;background:var(--card2);border:1px solid var(--line2);border-radius:10px;padding:9px 11px;font-size:12px;box-shadow:0 14px 34px -10px rgba(0,0,0,.55);opacity:0;transition:opacity .08s}
.tip.on{opacity:1}
.tip b{display:block;margin-bottom:5px;font-weight:600}
.tip div{display:flex;justify-content:space-between;gap:16px;color:var(--muted)}
.tip div span:last-child{color:var(--text);font-variant-numeric:tabular-nums}
.legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:12px}
.legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:baseline}
.lg-ok{background:var(--ok)}.lg-bad{background:var(--bad)}
.axis{fill:var(--faint);font-size:10.5px}
.grid-line{stroke:var(--line);stroke-width:1}
.f-ok{fill:var(--ok)}.f-bad{fill:var(--bad)}.f-warn{fill:var(--warn)}.f-info{fill:var(--info)}.f-violet{fill:var(--violet)}
.st-ok{stroke:var(--ok)}.st-bad{stroke:var(--bad)}.st-warn{stroke:var(--warn)}.st-info{stroke:var(--info)}.st-violet{stroke:var(--violet)}.st-faint{stroke:var(--line2)}
.hover-col{fill:transparent}
.hover-col:hover{fill:color-mix(in srgb,var(--text) 6%,transparent)}
.donutwrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.donutwrap svg{width:132px;height:132px;flex:none}
.donut-n{fill:var(--text);font-size:19px;font-weight:700;text-anchor:middle}
.donut-l{fill:var(--muted);font-size:10px;text-anchor:middle}
.dlegend{display:grid;gap:7px;flex:1;min-width:130px}
.dlegend div{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.dlegend i{width:9px;height:9px;border-radius:3px;flex:none}
.dlegend span:last-child{margin-left:auto;color:var(--text);font-variant-numeric:tabular-nums}
.empty{color:var(--faint);text-align:center;padding:22px 8px;font-size:13px}
.hbars{display:grid;gap:11px}
.hbar .t{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:5px}
.hbar .t span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.hbar .t span:last-child{color:var(--muted);font-variant-numeric:tabular-nums;flex:none}
.track{height:7px;border-radius:99px;background:var(--card2);border:1px solid var(--line);overflow:hidden;display:flex}
.track i{display:block;height:100%}
.track .a{background:var(--accent)}.track .r{background:var(--bad)}
.toplist{display:grid;gap:2px}
.toprow{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:7px 8px;border-radius:8px;font-size:12.5px;position:relative}
.toprow:hover{background:var(--card2)}
.toprow .k{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.toprow .n{color:var(--muted);font-variant-numeric:tabular-nums}
.toprow .rj{color:var(--bad);font-variant-numeric:tabular-nums;min-width:44px;text-align:right}

.switch{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--line);cursor:pointer}
.switch:last-of-type{border-bottom:0}
.switch .tx{min-width:0}
.switch .tx b{font-weight:600;display:block}
.switch .tx small{display:block;color:var(--muted);font-size:12px;margin-top:1px}
.tgl{position:relative;flex:none;width:42px;height:24px}
.tgl input{position:absolute;inset:0;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:1}
.tgl span{position:absolute;inset:0;border-radius:99px;background:var(--line2);transition:background .18s}
.tgl span::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .18s}
.tgl input:checked+span{background:var(--accent)}
.tgl input:checked+span::after{transform:translateX(18px)}
.tgl input:focus-visible+span{outline:2px solid var(--accent);outline-offset:2px}
.tgl.warn input:checked+span{background:var(--warn)}
.field{margin-bottom:14px}
.field label,.row>label{display:block;margin-bottom:5px;color:var(--muted);font-size:12px;font-weight:550}
.row{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;margin-bottom:10px}
.row>label{margin:0}
.actions{display:flex;gap:10px;align-items:center;margin-top:4px}
.banform{display:grid;grid-template-columns:1fr 86px auto;gap:8px;margin-bottom:12px}
.bans{padding:0;margin:0;list-style:none;display:grid;gap:6px;max-height:260px;overflow:auto}
.bans li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--card2)}
.bans li .sub{display:block;color:var(--faint);font-size:11.5px}
.note{color:var(--muted);font-size:12.5px;margin:0 0 12px}

.tools{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.tools .grow{flex:1;min-width:200px}
.seg{display:inline-flex;border:1px solid var(--line2);border-radius:9px;overflow:hidden;background:var(--card)}
.seg button{background:transparent;color:var(--muted);border:0;border-radius:0;padding:7px 13px;font-weight:550}
.seg button:hover{filter:none;color:var(--text)}
.seg button[aria-pressed=true]{background:var(--card2);color:var(--text);box-shadow:inset 0 -2px 0 var(--accent)}
.tablewrap{overflow:auto;max-height:560px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);white-space:nowrap;max-width:340px;overflow:hidden;text-overflow:ellipsis}
th{position:sticky;top:0;background:var(--card2);color:var(--muted);font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;z-index:1}
tbody tr:hover td{background:var(--card2)}
tr.rej td:first-child{box-shadow:inset 3px 0 0 var(--bad)}
tr.fresh td{animation:flash 1.4s ease-out}
@keyframes flash{from{background:color-mix(in srgb,var(--accent) 16%,transparent)}to{background:transparent}}
.badge{display:inline-block;border-radius:6px;padding:1px 8px;font-size:11.5px;font-weight:600;border:1px solid transparent}
.b-ok{color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
.b-bad{color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent)}
.b-warn{color:var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent)}
.b-info{color:var(--info);background:color-mix(in srgb,var(--info) 12%,transparent)}
.b-mute{color:var(--muted);background:var(--card2);border-color:var(--line)}
.s-ok{color:var(--ok)}.s-bad{color:var(--bad)}.s-warn{color:var(--warn)}
.tiny{color:var(--faint);font-size:12px}

.toasts{position:fixed;right:18px;bottom:18px;display:grid;gap:8px;z-index:50}
.toast{background:var(--card2);border:1px solid var(--line2);border-left:3px solid var(--ok);border-radius:10px;padding:10px 14px;font-size:13px;box-shadow:0 18px 40px -12px rgba(0,0,0,.6);animation:fade .2s ease;max-width:320px}
.toast.err{border-left-color:var(--bad)}

.center{min-height:100vh;display:grid;place-items:center;padding:20px}
.box{width:100%;max-width:400px;padding:28px}
.box .mark{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.box .mark svg{width:42px;height:42px}
.box p{color:var(--muted);margin:4px 0 0}
.err-text{color:var(--bad);min-height:20px;margin:8px 0;font-size:13px}
@media (max-width:640px){.wrap,.bar .in,.tabs{padding-left:14px;padding-right:14px}.row{grid-template-columns:1fr}.banform{grid-template-columns:1fr 80px}.banform button{grid-column:1/-1}.kpi .val{font-size:24px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

export const LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><defs><linearGradient id="lg" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse"><stop stop-color="#34d399"/><stop offset="1" stop-color="#0ea5a4"/></linearGradient></defs><path d="M16 2.5 5 6.6v8.2c0 7 4.6 12.2 11 14.7 6.4-2.5 11-7.7 11-14.7V6.6L16 2.5Z" fill="url(#lg)"/><path d="m11 16.2 3.6 3.6 6.6-7.2" stroke="#04120c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

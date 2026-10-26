// 구글 문서(사회 대본) HTML 내보내기 → 페이지. 페이지는 열릴 때·1분마다 구글 문서를 다시 읽어 바로 반영하고,
// 이 빌드 결과(저장본)는 문서를 못 읽을 때 보여 주는 대비용이다.
// 사용: node tools/build.cjs <doc.html> <out/index.html>
const fs = require('fs');
const path = require('path');
const MC = require('./convert.js');

const DOC_ID = process.env.DOC_ID || '1gViSvvPBAZDhuslVFNseBgi5CNN0xlYiHd7gb2Ngmh0';
const [inFile, outFile] = process.argv.slice(2);
const lines = MC.docToLines(fs.readFileSync(inFile, 'utf8'));
if (lines.length < 5) { console.error('구글 문서를 제대로 읽지 못했습니다'); process.exit(1); }
const hash = MC.hash(lines);
const p = MC.build(lines);
const esc = MC.esc;
const kst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="doc-hash" content="${hash}">
<title>${esc(p.title)}</title>
<style>
:root{--bg:#faf8f5;--card:#fff;--ink:#1e1e1e;--sub:#6b6b6b;--call:#b0322e;--line:#e8e2da;--accent:#7a5c3e;--ok:#2f7d4a;--fs:18px}
@media (prefers-color-scheme:dark){:root{--bg:#161514;--card:#201f1d;--ink:#eeeae4;--sub:#a59e95;--call:#ff7a72;--line:#34312d;--accent:#d2b48c;--ok:#7fd39b}}
*{box-sizing:border-box}html{scroll-padding-top:120px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;font-size:var(--fs);line-height:1.75;word-break:keep-all}
header{padding:20px 16px 8px;max-width:760px;margin:0 auto}
h1{font-size:1.35em;line-height:1.35;margin:0 0 6px}.meta{color:var(--sub);font-size:.85em;margin:0}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
.bar .in{max-width:760px;margin:0 auto;padding:8px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tab,.btn,.chip{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:6px 14px;font:inherit;font-size:15px;cursor:pointer;text-decoration:none;white-space:nowrap}
.tab[aria-selected=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.tools{margin-left:auto;display:flex;gap:6px}
.jump{max-width:760px;margin:0 auto;padding:0 16px 8px;display:flex;gap:6px;overflow-x:auto}
.live{max-width:760px;margin:0 auto;padding:0 16px 6px;font-size:13px;color:var(--sub)}.live.ok{color:var(--ok)}
main{max-width:760px;margin:0 auto;padding:8px 16px 80px}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 18px 14px;margin:14px 0}
h2{font-size:1.15em;margin:14px 0 4px;color:var(--accent)}h3{font-size:1.02em;margin:22px 0 6px;padding-top:14px;border-top:1px dashed var(--line)}
section h3:first-of-type{border-top:0;padding-top:0}
p{margin:.45em 0}.cue{color:var(--sub);font-style:italic;font-size:.88em}.call{color:var(--call);font-weight:800;font-size:1.08em}
.li{margin:.2em 0}ul{padding-left:1.2em}li{margin:.3em 0}
.hide-cue .cue{display:none}.legend,.foot{color:var(--sub);font-size:.85em}
@media (max-width:420px){.tools{margin-left:0}}
</style></head><body>
<header><h1 id="title">${esc(p.title)}</h1><div id="meta">${p.metaHtml}</div><p class="legend"><span style="font-style:italic">회색 기울임</span> = 진행 안내(읽지 않음) · <span style="color:var(--call);font-weight:800">빨간 굵은 글씨</span> = 힘주어 외치는 구령</p></header>
<div class="bar"><div class="in">
<button class="tab" role="tab" id="t-order" aria-selected="false">식순</button>
<button class="tab" role="tab" id="t-script" aria-selected="true">대본</button>
<div class="tools"><button class="btn" id="cueBtn">진행 안내 숨기기</button><button class="btn" id="fsDown" aria-label="글자 작게">가−</button><button class="btn" id="fsUp" aria-label="글자 크게">가+</button></div>
</div><nav class="jump" id="jump" aria-label="대본 구간 이동">${p.chipsHtml}</nav><div class="live" id="live">구글 문서 최신 내용을 확인하는 중…</div></div>
<main>
<div id="order" hidden>${p.orderHtml}</div>
<div id="script">${p.scriptHtml}</div>
<div id="notes">${p.notesHtml}</div>
<p class="foot">저장본 ${kst} (한국 시간) · 페이지를 열면 구글 문서의 최신 내용을 바로 가져오고, 열어 둔 동안 1분마다 다시 확인합니다.</p>
</main>
<script src="convert.js"></script>
<script>
(function(){
var st={};try{st=JSON.parse(localStorage.getItem('mc-view')||'{}')}catch(e){}
function save(){try{localStorage.setItem('mc-view',JSON.stringify(st))}catch(e){}}
var root=document.documentElement,body=document.body;
function fs(v){st.fs=Math.max(14,Math.min(30,v));root.style.setProperty('--fs',st.fs+'px');save()}
if(st.fs)fs(st.fs);
document.getElementById('fsUp').onclick=function(){fs((st.fs||18)+2)};
document.getElementById('fsDown').onclick=function(){fs((st.fs||18)-2)};
var cueBtn=document.getElementById('cueBtn');
function cue(h){st.hide=h;body.classList.toggle('hide-cue',h);cueBtn.textContent=h?'진행 안내 보이기':'진행 안내 숨기기';save()}
cue(!!st.hide);cueBtn.onclick=function(){cue(!st.hide)};
var tO=document.getElementById('t-order'),tS=document.getElementById('t-script'),o=document.getElementById('order'),s=document.getElementById('script'),j=document.getElementById('jump');
function tab(which){var isO=which==='order';o.hidden=!isO;s.hidden=isO;j.hidden=isO;tO.setAttribute('aria-selected',isO);tS.setAttribute('aria-selected',!isO)}
tO.onclick=function(){tab('order');history.replaceState(null,'','#order')};tS.onclick=function(){tab('script');history.replaceState(null,'','#script')};
tab(location.hash==='#order'?'order':'script');

// 구글 문서 바로 읽기 (열 때, 1분마다, 화면으로 돌아올 때)
var DOC_ID='${DOC_ID}',HASH='${hash}',live=document.getElementById('live');
function hhmm(){var d=new Date();return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function status(t,ok){live.textContent=t;live.className='live'+(ok?' ok':'')}
function apply(p){document.getElementById('title').textContent=p.title;document.title=p.title;document.getElementById('meta').innerHTML=p.metaHtml;o.innerHTML=p.orderHtml;s.innerHTML=p.scriptHtml;j.innerHTML=p.chipsHtml;document.getElementById('notes').innerHTML=p.notesHtml}
var busy=false;
function pull(){
  if(busy||!window.MC||!window.fetch)return;busy=true;
  fetch('https://docs.google.com/document/d/'+DOC_ID+'/export?format=html',{cache:'no-store'})
  .then(function(r){if(!r.ok)throw new Error(r.status);return r.text()})
  .then(function(h){var lines=MC.docToLines(h);if(lines.length<5)throw new Error('empty');var hs=MC.hash(lines);if(hs!==HASH){HASH=hs;apply(MC.build(lines))}status('구글 문서 최신 내용 · '+hhmm()+' 확인',true)})
  .catch(function(){status('구글 문서를 지금 불러오지 못해 저장본을 보여 주고 있습니다 ('+hhmm()+')',false)})
  .then(function(){busy=false});
}
pull();setInterval(function(){if(!document.hidden)pull()},60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden)pull()});
})();
</script></body></html>
`;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
fs.copyFileSync(path.join(__dirname, 'convert.js'), path.join(path.dirname(outFile), 'convert.js'));
console.log(`hash=${hash}`);
console.log(`lines=${lines.length} sections=${p.sections.join('|')}`);

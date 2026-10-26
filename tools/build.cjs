// 구글 문서(사회 대본) HTML 내보내기 → 보기 좋은 한 장짜리 페이지.
// 사용: node tools/build.cjs <doc.html> <out/index.html>
// 회색 기울임(#6b6b6b) = 진행 안내, 빨간 굵게(#b0322e) = 구령. 문서 서식을 그대로 읽는다.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [inFile, outFile] = process.argv.slice(2);
const doc = fs.readFileSync(inFile, 'utf8');

const NAMED = { nbsp: ' ', middot: '·', hearts: '♥', amp: '&', quot: '"', lt: '<', gt: '>', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', apos: "'" };
const dec = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n] ?? m);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 클래스 → 서식
const css = (doc.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || '';
const cls = {};
for (const m of css.matchAll(/\.(c\d+)\{([^}]*)\}/g)) cls[m[1]] = m[2];
const styleOf = (attrs) => {
  const names = ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);
  const all = names.map((n) => cls[n] || '').join(';') + ';' + ((attrs.match(/style="([^"]*)"/) || [])[1] || '');
  const color = ((all.match(/color:(#[0-9a-f]{6})/i) || [])[1] || '').toLowerCase();
  return { gray: color === '#6b6b6b', red: color === '#b0322e', bold: /font-weight:700/.test(all) };
};

// 문서 → 줄 표시(#, ##, ###, G:, R:, - , **굵게**)
const body = doc.slice(doc.indexOf('<body'));
const lines = [];
for (const b of body.matchAll(/<(h1|h2|h3|p|li)([^>]*)>([\s\S]*?)<\/\1>/g)) {
  const tag = b[1];
  const spans = [...b[3].matchAll(/<span([^>]*)>([\s\S]*?)<\/span>/g)]
    .map((s) => ({ ...styleOf(s[1]), text: dec(s[2]) }))
    .filter((s) => s.text.length);
  const text = spans.map((s) => s.text).join('').trim();
  if (!text) continue;
  if (tag === 'h1') { lines.push('# ' + text); continue; }
  if (tag === 'h2') { lines.push('## ' + text); continue; }
  if (tag === 'h3') { lines.push('### ' + text); continue; }
  const solid = spans.filter((s) => s.text.trim());
  if (solid.every((s) => s.gray)) { lines.push('G:' + text); continue; }
  if (solid.every((s) => s.red)) { lines.push('R:' + text); continue; }
  const inline = spans.map((s) => (s.bold && s.text.trim() ? `**${s.text}**` : s.text)).join('').trim();
  lines.push((tag === 'li' ? '- ' : '') + inline);
}
const hash = crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);

// 페이지
const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const startIdx = Math.max(0, lines.findIndex((l) => l.startsWith('# ')));
const title = (lines[startIdx] || '# 사회 대본').replace(/^# /, '');
const pre = [];
const secs = [];
let cur = null;
for (const l of lines.slice(startIdx + 1)) {
  if (l.startsWith('## ')) { cur = { name: l.slice(3), body: [] }; secs.push(cur); }
  else if (cur) cur.body.push(l);
  else pre.push(l);
}
const render = (bodyLines) => {
  const out = [];
  let list = false;
  const close = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const l of bodyLines) {
    if (l.startsWith('- ')) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inl(l.slice(2))}</li>`); continue; }
    close();
    if (l.startsWith('### ')) out.push(`<h3>${esc(l.slice(4))}</h3>`);
    else if (l.startsWith('G:')) out.push(`<p class="cue">${esc(l.slice(2))}</p>`);
    else if (l.startsWith('R:')) out.push(`<p class="call">${esc(l.slice(2))}</p>`);
    else if (/^(·|\d+\.)\s/.test(l)) out.push(`<p class="li">${inl(l)}</p>`);
    else out.push(`<p>${inl(l)}</p>`);
  }
  close();
  return out.join('\n');
};
const order = secs.find((s) => s.name.trim() === '식순');
const script = secs.filter((s) => s !== order);
const short = (n) => n.replace(/\s*\(.*\)\s*$/, '').replace(/아율이\s*/, '');
const chips = script.map((s, i) => `<a class="chip" href="#s${i + 1}">${esc(short(s.name))}</a>`).join('');
const sectionsHtml = script.map((s, i) => `<section id="s${i + 1}"><h2>${esc(s.name)}</h2>\n${render(s.body)}</section>`).join('\n');
const meta = pre.filter((l) => !l.startsWith('G:'));
const notes = pre.filter((l) => l.startsWith('G:')).map((l) => l.slice(2));
const kst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="doc-hash" content="${hash}">
<title>${esc(title)}</title>
<style>
:root{--bg:#faf8f5;--card:#fff;--ink:#1e1e1e;--sub:#6b6b6b;--call:#b0322e;--line:#e8e2da;--accent:#7a5c3e;--fs:18px}
@media (prefers-color-scheme:dark){:root{--bg:#161514;--card:#201f1d;--ink:#eeeae4;--sub:#a59e95;--call:#ff7a72;--line:#34312d;--accent:#d2b48c}}
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
main{max-width:760px;margin:0 auto;padding:8px 16px 80px}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:6px 18px 14px;margin:14px 0}
h2{font-size:1.15em;margin:14px 0 4px;color:var(--accent)}h3{font-size:1.02em;margin:22px 0 6px;padding-top:14px;border-top:1px dashed var(--line)}
section h3:first-of-type{border-top:0;padding-top:0}
p{margin:.45em 0}.cue{color:var(--sub);font-style:italic;font-size:.88em}.call{color:var(--call);font-weight:800;font-size:1.08em}
.li{margin:.2em 0}ul{padding-left:1.2em}li{margin:.3em 0}
.hide-cue .cue{display:none}.legend,.foot{color:var(--sub);font-size:.85em}
@media (max-width:420px){.tools{margin-left:0}}
</style></head><body>
<header><h1>${esc(title)}</h1>${meta.map((m) => `<p class="meta">${inl(m)}</p>`).join('')}<p class="legend"><span style="font-style:italic">회색 기울임</span> = 진행 안내(읽지 않음) · <span style="color:var(--call);font-weight:800">빨간 굵은 글씨</span> = 힘주어 외치는 구령</p></header>
<div class="bar"><div class="in">
<button class="tab" role="tab" id="t-order" aria-selected="false">식순</button>
<button class="tab" role="tab" id="t-script" aria-selected="true">대본</button>
<div class="tools"><button class="btn" id="cueBtn">진행 안내 숨기기</button><button class="btn" id="fsDown" aria-label="글자 작게">가−</button><button class="btn" id="fsUp" aria-label="글자 크게">가+</button></div>
</div><nav class="jump" id="jump" aria-label="대본 구간 이동">${chips}</nav></div>
<main>
<div id="order" hidden><section><h2>식순</h2>
${order ? render(order.body) : ''}</section></div>
<div id="script">${sectionsHtml}</div>
${notes.map((n) => `<p class="foot">${esc(n)}</p>`).join('')}
<p class="foot">구글 문서에서 자동으로 가져옵니다 · 마지막 반영 ${kst} (한국 시간)</p>
</main>
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
})();
</script></body></html>
`;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
console.log(`hash=${hash}`);
console.log(`lines=${lines.length} sections=${script.map((s) => short(s.name)).join('|')}`);

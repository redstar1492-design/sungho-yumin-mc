// 구글 문서 HTML 내보내기 → 대본 페이지 조각. 빌드(node)와 페이지(브라우저)가 같은 코드를 쓴다.
// 회색 기울임(#6b6b6b) = 진행 안내, 빨간 굵게(#b0322e) = 구령. 문서 서식을 그대로 읽는다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var NAMED = { nbsp: ' ', middot: '·', hearts: '♥', amp: '&', quot: '"', lt: '<', gt: '>', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', apos: "'" };
  function dec(s) {
    return s
      .replace(/<[^>]+>/g, '')
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(+n); })
      .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCodePoint(parseInt(n, 16)); })
      .replace(/&([a-z]+);/gi, function (m, n) { return NAMED[n] !== undefined ? NAMED[n] : m; });
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inl(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

  // 문서 → 줄 표시(#, ##, ###, G:, R:, - , **굵게**)
  function docToLines(doc) {
    var css = (doc.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [])[1] || '';
    var cls = {};
    var m, re = /\.(c\d+)\{([^}]*)\}/g;
    while ((m = re.exec(css))) cls[m[1]] = m[2];
    function styleOf(attrs) {
      var names = ((attrs.match(/class="([^"]*)"/) || [])[1] || '').split(/\s+/);
      var all = names.map(function (n) { return cls[n] || ''; }).join(';') + ';' + ((attrs.match(/style="([^"]*)"/) || [])[1] || '');
      var color = ((all.match(/color:(#[0-9a-f]{6})/i) || [])[1] || '').toLowerCase();
      return { gray: color === '#6b6b6b', red: color === '#b0322e', bold: /font-weight:700/.test(all) };
    }
    var body = doc.slice(Math.max(0, doc.indexOf('<body')));
    var lines = [];
    var b, bre = /<(h1|h2|h3|p|li)([^>]*)>([\s\S]*?)<\/\1>/g;
    while ((b = bre.exec(body))) {
      var tag = b[1];
      var spans = [], s, sre = /<span([^>]*)>([\s\S]*?)<\/span>/g;
      while ((s = sre.exec(b[3]))) {
        var st = styleOf(s[1]);
        st.text = dec(s[2]);
        if (st.text.length) spans.push(st);
      }
      var text = spans.map(function (x) { return x.text; }).join('').trim();
      if (!text) continue;
      if (tag === 'h1') { lines.push('# ' + text); continue; }
      if (tag === 'h2') { lines.push('## ' + text); continue; }
      if (tag === 'h3') { lines.push('### ' + text); continue; }
      var solid = spans.filter(function (x) { return x.text.trim(); });
      if (solid.every(function (x) { return x.gray; })) { lines.push('G:' + text); continue; }
      if (solid.every(function (x) { return x.red; })) { lines.push('R:' + text); continue; }
      var inline = spans.map(function (x) { return x.bold && x.text.trim() ? '**' + x.text + '**' : x.text; }).join('').trim();
      lines.push((tag === 'li' ? '- ' : '') + inline);
    }
    return lines;
  }

  // FNV-1a 두 번 → 16자리. 빌드와 페이지가 같은 값을 낸다(바뀌었는지 비교용).
  function hash(lines) {
    var str = lines.join('\n');
    function fnv(seed) {
      var h = seed >>> 0;
      for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return ('0000000' + h.toString(16)).slice(-8);
    }
    return fnv(2166136261) + fnv(84696351);
  }

  function renderBody(bodyLines) {
    var out = [], list = false;
    function close() { if (list) { out.push('</ul>'); list = false; } }
    bodyLines.forEach(function (l) {
      if (l.indexOf('- ') === 0) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + inl(l.slice(2)) + '</li>'); return; }
      close();
      if (l.indexOf('### ') === 0) out.push('<h3>' + esc(l.slice(4)) + '</h3>');
      else if (l.indexOf('G:') === 0) out.push('<p class="cue">' + esc(l.slice(2)) + '</p>');
      else if (l.indexOf('R:') === 0) out.push('<p class="call">' + esc(l.slice(2)) + '</p>');
      else if (/^(·|\d+\.)\s/.test(l)) out.push('<p class="li">' + inl(l) + '</p>');
      else out.push('<p>' + inl(l) + '</p>');
    });
    close();
    return out.join('\n');
  }

  // 줄 → 페이지 조각
  function build(lines) {
    var startIdx = Math.max(0, lines.findIndex(function (l) { return l.indexOf('# ') === 0; }));
    var title = (lines[startIdx] || '# 사회 대본').replace(/^# /, '');
    var pre = [], secs = [], cur = null;
    lines.slice(startIdx + 1).forEach(function (l) {
      if (l.indexOf('## ') === 0) { cur = { name: l.slice(3), body: [] }; secs.push(cur); }
      else if (cur) cur.body.push(l);
      else pre.push(l);
    });
    var order = secs.filter(function (s) { return s.name.trim() === '식순'; })[0];
    var script = secs.filter(function (s) { return s !== order; });
    function short(n) { return n.replace(/\s*\(.*\)\s*$/, '').replace(/아율이\s*/, ''); }
    return {
      title: title,
      metaHtml: pre.filter(function (l) { return l.indexOf('G:') !== 0; }).map(function (l) { return '<p class="meta">' + inl(l) + '</p>'; }).join(''),
      notesHtml: pre.filter(function (l) { return l.indexOf('G:') === 0; }).map(function (l) { return '<p class="foot">' + esc(l.slice(2)) + '</p>'; }).join(''),
      orderHtml: '<section><h2>식순</h2>\n' + (order ? renderBody(order.body) : '') + '</section>',
      scriptHtml: script.map(function (s, i) { return '<section id="s' + (i + 1) + '"><h2>' + esc(s.name) + '</h2>\n' + renderBody(s.body) + '</section>'; }).join('\n'),
      chipsHtml: script.map(function (s, i) { return '<a class="chip" href="#s' + (i + 1) + '">' + esc(short(s.name)) + '</a>'; }).join(''),
      sections: script.map(function (s) { return short(s.name); }),
    };
  }

  return { docToLines: docToLines, build: build, hash: hash, esc: esc };
});

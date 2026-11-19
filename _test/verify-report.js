'use strict';
/* ═══════════════════ verify-report.js — headless regression oracle (SC01–SC12) ═══════════════════
   methodica-science-strange-discovery-01, type mafmar-moodle. NEVER DEPLOYED (the package allowlist
   excludes every `_` path). Modelled on methodica-science-movo-01/_test/verify-report.js. Every check
   targets a SILENT failure: the lomda keeps working and the data is wrong or missing.

   Run from the component folder, with jsdom installed OUTSIDE the OneDrive tree:
     NODE_PATH=C:/Users/<you>/AppData/Local/Temp/lomda-test/node_modules node _test/verify-report.js [componentDir]
   Exit code 1 on any failure. VERBOSE=1 forwards the page console. */

const fs = require('fs');
const path = require('path');

const compDir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const COMP = 'methodica-science-strange-discovery-01';
const UNIT = 'methodica-science-strange-discovery';
const PREFIX = 'https://lomdot.education.gov.il/metodica/720/science/mafmar/';
const read = (p) => fs.readFileSync(p, 'utf8');

let passed = 0, failed = 0, skipped = 0;
function ok(group, name, cond, detail) {
  if (cond) { passed++; return; }
  failed++;
  console.log('  FAIL [' + group + '] ' + name + (detail ? '  — ' + detail : ''));
}

const html = read(path.join(compDir, 'index.html'));
const jsc = read(path.join(compDir, 'script.js'));
const css = read(path.join(compDir, 'styles.css'));
const reg = read(path.join(compDir, 'registry.js'));
const idn = read(path.join(compDir, 'unit-js/10-identity.js'));
const compMeta = JSON.parse(read(path.join(compDir, 'metadata', COMP + '.json')));
const unitMeta = JSON.parse(read(path.join(compDir, 'metadata', UNIT + '_unit.json')));
const norm = (s) => String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim();
const jsLive = jsc.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── The MBZ facts this build must match (questions.xml / quiz.xml of
      backup-moodle2-activity-1814117-quiz1814117-20261112-1030-nu.mbz) ── */
const MBZ = {
  '002': { screen: 'SC02', marks: 12, ids: ['4733194', '4733195', '4733196'], key: '4733194' },
  '004': { screen: 'SC04', marks: 12, ids: ['4733197', '4733198', '4733199', '4733200'], key: '4733197' },
  '006': { screen: 'SC06', marks: 12, ids: ['4733201', '4733202', '4733203', '4733204'], key: '4733201' },
  '007': { screen: 'SC07', marks: 12, ids: ['4730468', '4730469', '4730470', '4730471'], key: '4730469' },
  '008': { screen: 'SC08', marks: 13, ids: ['4733209', '4733210', '4733211', '4733212'], key: '4733209' },
  '009': { screen: 'SC09', marks: 13, dd: true },
  '010': { screen: 'SC10', marks: 13, ids: ['4730851', '4730852', '4730853', '4730854'], key: '4730851' },
  '011': { screen: 'SC11', marks: 12, ids: ['4730456', '4730457', '4730458', '4730459'], key: '4730456' },
};
const INFO_ITEMS = ['001', '003', '005', '012'];
const SUMGRADES = 99, GRADEPASS = 0.7;
/* ddimageortext 876870: drop no → the drag no it takes (choice) */
const DD_KEY = { 5: 5, 4: 4, 2: 2, 1: 1, 3: 3 };
const DD_GROUP_ITEM = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 1 };

/* ═══ 1. Identity ═══ */
{
  const g = 'identity';
  ok(g, 'unit id is the bare slug', unitMeta.id === UNIT, unitMeta.id);
  ok(g, 'component learningUnitId = unit id', compMeta.learningUnitId === UNIT);
  ok(g, 'component id = prefix + slug + "/"', compMeta.id === PREFIX + COMP + '/', compMeta.id);
  ok(g, '10-identity.js prefix', idn.includes("var XAPI_ID_PREFIX = '" + PREFIX + "';"));
  ok(g, '10-identity.js unit id', idn.includes("window.XAPI_UNIT_ID = '" + UNIT + "';"));
  ok(g, 'script.js XAPI_COMP_SLUG', jsc.includes("var XAPI_COMP_SLUG = '" + COMP + "';"));
  ok(g, 'RESUME_ENABLED = false (library -i)', /var RESUME_ENABLED = false;/.test(idn));
  const want = Array.from({ length: 12 }, (_, i) => compMeta.id + COMP + '-' + String(i + 1).padStart(3, '0') + '/');
  ok(g, 'catalogue holds items 001–012, in order', JSON.stringify(compMeta.subContent.map((s) => s.id)) === JSON.stringify(want));
  for (const s of compMeta.subContent) {
    const n = s.id.slice(-4, -1);
    if (INFO_ITEMS.includes(n)) ok(g, 'item ' + n + ' (description) carries no question', s.questions.length === 0);
    else ok(g, 'item ' + n + ' carries one question q1', s.questions.length === 1 && s.questions[0].questionId === s.id + 'q1');
  }
  const qids = compMeta.subContent.flatMap((s) => s.questions.map((x) => x.questionId));
  ok(g, '8 questions, every question id unique', qids.length === 8 && new Set(qids).size === 8);
  ok(g, 'no reserved delimiter ([,] [.] [:]) in any metadata string', !/\[,\]|\[\.\]|\[:\]/.test(JSON.stringify(compMeta)));
}

/* ═══ 2. Wiring ═══ */
{
  const g = 'wiring';
  const tags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  const want = ['unit-js/10-identity.js', 'unit-js/20-xapi.js', 'unit-js/40-ledger.js', 'unit-js/50-loader.js', 'motion.js', 'registry.js', 'script.js', 'unit-js/90-boot.js'];
  ok(g, 'the eight script tags, in order (motion.js before the part\'s scripts), 90-boot last', JSON.stringify(tags.map((t) => t.replace(/\?.*$/, ''))) === JSON.stringify(want), tags.join(', '));
  ok(g, 'one ?v= on every script tag', new Set(tags.map((t) => (t.match(/\?v=(\w+)/) || [])[1])).size === 1);
  ok(g, 'no parent-relative path', !/(src|href)="\.\.\//.test(html));
  const live = html.replace(/<!--[\s\S]*?-->/g, '');
  const locals = [...live.matchAll(/\b(?:src|href|data-zoom-src)="([^"#:]+?)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((s) => !/^data:/.test(s));
  for (const f of new Set(locals)) {
    const p = path.join(compDir, f);
    const exists = fs.existsSync(p) && fs.readdirSync(path.dirname(p)).includes(path.basename(p));
    ok(g, 'local file exists with exact case: ' + f, exists);
    ok(g, 'local path is ASCII: ' + f, /^[\x20-\x7e]+$/.test(f));
  }
  ok(g, 'flag button hidden', /<button[^>]*class="flag-btn"[^>]*\bhidden\b/.test(html));
  const liveAll = live + css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const deco of ['banner1', 'Q%202', 'Q 2', 'Rectangle_', 'Paper.png', 'שאלה1.png', 'idiea', 'ernesto', 'Pic%20Frame3%20(2)'])
    ok(g, 'no Moodle decorative / Arabic picture: ' + deco, !liveAll.includes(deco));
  ok(g, 'no Moodle placeholder (@@PLUGINFILE@@) or multilang span', !/@@PLUGINFILE@@|class="multilang"/.test(html));
  ok(g, 'every picture in assets/img is used', fs.readdirSync(path.join(compDir, 'assets/img')).every((f) => liveAll.includes('assets/img/' + f)));
  ok(g, '#sc12-continue = "סיימתי", the only "סיימתי"', (live.match(/סיימתי/g) || []).length === 2 && /id="sc12-continue"><span class="nav-label" data-label="סיימתי">סיימתי</.test(live));
  ok(g, 'one finishComponent call site, on #sc12-continue', (jsLive.match(/finishComponent\(this\)/g) || []).length === 1 && /getElementById\('sc12-continue'\)\.addEventListener\('click', function \(\) \{ finishComponent\(this\); \}\)/.test(jsLive));
  ok(g, 'no other component completion call', (jsLive.match(/xapiEndComponent\(|xapiCompleteComponent\(/g) || []).length === 1);
  ok(g, 'XAPI_END_BTN = sc12-continue', /var XAPI_END_BTN = 'sc12-continue';/.test(jsc));
  /* motion (720 animation-system) */
  const skillEngine = 'C:/Users/user/.claude/skills/animation-system/engine/';
  if (fs.existsSync(skillEngine + 'motion.js')) {
    ok(g, 'motion.js / motion.css = the skill engine, verbatim', read(path.join(compDir, 'motion.js')) === read(skillEngine + 'motion.js') && read(path.join(compDir, 'motion.css')) === read(skillEngine + 'motion.css'));
  }
  ok(g, 'motion.css linked after styles.css', html.indexOf('href="motion.css') > html.indexOf('href="styles.css'));
  for (const sid of Array.from({ length: 12 }, (_, i) => 'SC' + String(i + 1).padStart(2, '0'))) {
    const sec = (live.split('id="' + sid + '"')[1] || '').split('</section>')[0];
    const groups = [...sec.matchAll(/data-reveal="(\d)"/g)].map((m) => +m[1]);
    ok(g, sid + ': reveal groups in reading order (1 title, 2 right column, 3 left column)', groups[0] === 1 && groups.includes(2) && groups.every((n, i) => i === 0 || n >= groups[i - 1]), groups.join(','));
    ok(g, sid + ': no reveal mark on the bar, an option, or a feedback box', !/class="scq-(bar|opt|check|back)[^"]*"[^>]*data-reveal|class="btn-continue[^"]*"[^>]*data-reveal|sc-feedback[^"]*"[^>]*data-reveal/.test(sec));
  }
  const s9 = (live.split('id="SC09"')[1] || '').split('</section>')[0];
  ok(g, 'SC09: the groups holding the tray and the board are fade-only', /class="sc-text-col" data-reveal="2" data-reveal-fade/.test(s9) && /class="sc-media-col" data-reveal="3" data-reveal-fade/.test(s9));
  ok(g, 'every feedback box carries .m-popup', (live.match(/class="sc-feedback m-popup hidden"/g) || []).length === 8);
  ok(g, 'showFeedback keeps .m-popup (classList, not className)', !/box\.className\s*=/.test(jsLive));
  ok(g, 'goToScreen wires Motion.cancel / Motion.reveal; initial reveal in script.js', /Motion\.cancel\(prev\)/.test(reg) && /Motion\.reveal\(document\.getElementById\(id\)\)/.test(reg) && /Motion\.reveal\(document\.querySelector\('\.screen\.active'\)\)/.test(jsLive));
  ok(g, 'nothing reports on page leave; no window.close', !/beforeunload|pagehide|visibilitychange|window\.close/.test(jsLive));
}

/* ═══ 3. Config — screen map = registry = DOM; answer keys = MBZ = metadata ═══ */
const SCREENS = [...reg.matchAll(/\{ id: '(SC\d\d)'/g)].map((m) => m[1]);
{
  const g = 'config';
  const dom = [...html.matchAll(/<section class="screen[^"]*" id="(SC\d\d)"/g)].map((m) => m[1]);
  const map = [...jsc.matchAll(/'(SC\d\d)': \['(\d{3})'/g)].map((m) => m[1] + '=' + m[2]);
  const want = Array.from({ length: 12 }, (_, i) => 'SC' + String(i + 1).padStart(2, '0'));
  ok(g, 'registry = DOM screens = SC01–SC12', JSON.stringify(SCREENS) === JSON.stringify(want) && JSON.stringify(dom) === JSON.stringify(want));
  ok(g, 'SCREEN_TO_SUBCONTENT = SCnn → 0nn', JSON.stringify(map) === JSON.stringify(want.map((s) => s + '=0' + s.slice(2))), map.join(','));
  ok(g, 'XAPI_EVAL_ITEMS = the 8 question items', JSON.stringify(Object.keys(MBZ)) === JSON.stringify([...(jsc.match(/var XAPI_EVAL_ITEMS = \{([^}]*)\}/) || ['', ''])[1].matchAll(/'(\d{3})'/g)].map((m) => m[1])));
  const iw = {}; [...(jsc.match(/var XAPI_ITEM_WEIGHT = \{([^}]*)\}/) || ['', ''])[1].matchAll(/'(\d{3})': (\d+)/g)].forEach((m) => { iw[m[1]] = +m[2]; });
  const qw = {}; [...(jsc.match(/var XAPI_Q_WEIGHT = \{([^}]*)\}/) || ['', ''])[1].matchAll(/'(\d{3})\/q1': (\d+)/g)].forEach((m) => { qw[m[1]] = +m[2]; });
  for (const n of Object.keys(MBZ)) {
    ok(g, n + ': item weight = slot maxmark ' + MBZ[n].marks, iw[n] === MBZ[n].marks, String(iw[n]));
    ok(g, n + ': question weight = slot maxmark', qw[n] === MBZ[n].marks, String(qw[n]));
  }
  ok(g, 'Σ weights = sumgrades 99', Object.values(iw).reduce((a, b) => a + b, 0) === SUMGRADES);
  ok(g, 'XAPI_PASS_THRESHOLD = 0.7 (gradepass 70 of 100)', /var XAPI_PASS_THRESHOLD = 0\.7;/.test(jsc));
  ok(g, 'XAPI_METADATA_FILE points at metadata/', jsc.includes("var XAPI_METADATA_FILE = 'metadata/" + COMP + ".json';"));

  const calls = {};
  for (const m of jsc.matchAll(/makeChoiceScreen\(\{ id: '(SC\d\d)', item: '(\d{3})', correct: '(\d+)' \}\)/g)) calls[m[2]] = { screen: m[1], key: m[3] };
  ok(g, 'one choice-engine call per choice item', JSON.stringify(Object.keys(calls).sort()) === JSON.stringify(Object.keys(MBZ).filter((n) => !MBZ[n].dd)));
  for (const n of Object.keys(MBZ)) {
    if (MBZ[n].dd) continue;
    const f = MBZ[n], c = calls[n] || {};
    const q = compMeta.subContent[+n - 1].questions[0];
    const sec = (html.split('id="' + f.screen + '"')[1] || '').split('</section>')[0];
    const opts = [...sec.matchAll(/<button type="button" class="scq-opt" data-id="(\d+)"[^>]*><span class="scq-opt-text">([^<]+)<\/span>/g)].map((m) => ({ id: m[1], text: norm(m[2]) }));
    ok(g, n + ': engine on ' + f.screen, c.screen === f.screen);
    ok(g, n + ': answer key = MBZ fraction-1 answer ' + f.key, c.key === f.key, c.key);
    ok(g, n + ': on-screen answers = the MBZ answers', JSON.stringify(opts.map((o) => o.id)) === JSON.stringify(f.ids));
    ok(g, n + ': questionType choice', q.questionType === 'choice');
    ok(g, n + ': on-screen options = metadata answers (strings, order)', JSON.stringify(opts.map((o) => o.text)) === JSON.stringify(q.answers.map(norm)));
    const key = opts.find((o) => o.id === c.key);
    ok(g, n + ': metadata correct answer = the key option', !!key && q.correctAnswers.length === 1 && norm(q.correctAnswers[0]) === key.text);
    ok(g, n + ': options carry no trailing period', opts.every((o) => !/\.$/.test(o.text)));
    ok(g, n + ': metadata questionText = the on-screen prompt', norm(sec.match(/id="sc\d\d-prompt">([\s\S]*?)<\/p>/)[1].replace(/<br>/g, ' ')) === norm(q.questionText));
  }
  /* SC09 */
  const q9 = compMeta.subContent[8].questions[0];
  ok(g, '009: questionType matching', q9.questionType === 'matching');
  const zones = [...jsc.matchAll(/\{ no: (\d), group: (\d), accept: (\d), name: '([^']+)'/g)].map((m) => ({ no: +m[1], group: +m[2], accept: +m[3], name: m[4] }));
  const items = {}; [...jsc.matchAll(/\{ no: (\d), group: (\d), label: '([^']+)'/g)].forEach((m) => { items[m[1]] = { group: +m[2], label: m[3] }; });
  ok(g, '009: 5 zones, each takes the MBZ drag (drop → choice)', zones.length === 5 && zones.every((z) => DD_KEY[z.no] === z.accept));
  ok(g, '009: zone groups = the MBZ groups of their right items', zones.every((z) => z.group === DD_GROUP_ITEM[z.accept]));
  ok(g, '009: item groups = MBZ draggroups', Object.keys(DD_GROUP_ITEM).every((k) => items[k] && items[k].group === DD_GROUP_ITEM[k]));
  ok(g, '009: zone names = metadata answers.source (order)', JSON.stringify(zones.map((z) => z.name)) === JSON.stringify(q9.answers.source));
  ok(g, '009: metadata targets = the item labels', JSON.stringify(q9.answers.target.slice().sort()) === JSON.stringify(Object.values(items).map((i) => i.label).sort()));
  ok(g, '009: metadata correctAnswers = zone → its right item', JSON.stringify(q9.correctAnswers) === JSON.stringify(zones.map((z) => ({ source: z.name, target: items[z.accept].label }))));
}

/* ═══ 4. Runtime — jsdom, real clicks, an inline recorder in place of the library ═══ */
(async function runtime() {
  let JSDOM = null, VirtualConsole = null;
  try { ({ JSDOM, VirtualConsole } = require('jsdom')); } catch (e) { /* reported below */ }
  const g = 'runtime';
  if (!JSDOM) { skipped++; console.log('  runtime: SKIPPED - jsdom not resolvable (set NODE_PATH).'); return summary(); }

  function boot() {
    const errs = [];
    const vc = new VirtualConsole();
    if (process.env.VERBOSE) vc.sendTo(console, { omitJSDOMErrors: true });
    vc.on('jsdomError', (e) => errs.push(e.message || String(e)));
    vc.on('warn', (m) => { if (/\[xAPI\]/.test(m)) errs.push('warn: ' + m); });
    const dom = new JSDOM(html, {
      url: 'http://localhost:5555/' + COMP + '/index.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        w.fetch = () => new Promise(() => {});
        w.requestAnimationFrame = (cb) => { cb(0); return 0; };
        w.Element.prototype.scrollIntoView = () => {};
        w.addEventListener('error', (e) => errs.push(e.message || String(e.error)));
      },
    });
    const w = dom.window, d = w.document;
    const inject = (code) => { const el = d.createElement('script'); el.textContent = code; d.body.appendChild(el); };
    const srcs = [...html.matchAll(/<script\b[^>]*?\bsrc="([^"]+)"/g)].map((m) => m[1].replace(/\?.*$/, '')).filter((s) => s !== 'unit-js/90-boot.js');
    for (const s of srcs) inject(read(path.join(compDir, s)));
    const run = (expr) => { inject('window.__V = ' + expr + ';'); return w.__V; };
    const click = (sel) => { const el = d.querySelector(sel); if (!el) throw new Error('no ' + sel); el.click(); };
    return { w, d, run, errs, click, active: () => d.querySelector('.screen.active').id };
  }
  const RECORDER = '(function(){ window.__log = []; window.XAPI_USING_G = true; window.METADATA = ' + JSON.stringify(compMeta) + ';' +
    ' window.xapiItemAnswered = {};' +
    ' window.sendStatement720 = function (v, t, r, o) {' +
    '   var st = String(v).split(".")[0];' +
    '   if (st === "answered" && o && o.parentId) window.xapiItemAnswered[o.parentId] = true;' +
    '   if (st === "completed" && o && o.expectsAnswer && !window.xapiItemAnswered[o.objectId]) return;' +
    '   window.__log.push({ v: v, t: t, id: (o && (o.objectId || o.questionId)) || (t === "onlinelesson" ? "COMPONENT" : null), r: r || null }); };' +
    ' sendStatement720("initialized", "onlinelesson"); xapiOnScreen(xapiLandingScreen()); return 1; })()';
  const item = (n) => compMeta.id + COMP + '-' + n + '/';
  const log = (P) => JSON.parse(P.run('JSON.stringify(window.__log)'));
  /* SC09 by the click path: pick an item, then a zone */
  const dd = (P, plan) => { for (const [zone, it] of Object.entries(plan)) { P.click('#sc09-tray .dd-chip[data-no="' + it + '"]'); P.click('#sc09-board .dd-zone[data-zone="' + zone + '"]'); } };

  /* 4a. off-platform: no library — nothing thrown, the score still recorded, the finish still disables */
  {
    const P = boot();
    ok(g, 'every local script executes without throwing', P.errs.length === 0, P.errs.join(' | '));
    ok(g, 'one .active screen at boot, SC01; its "חזרה" disabled', P.d.querySelectorAll('.screen.active').length === 1 && P.active() === 'SC01' && P.d.getElementById('sc01-back').disabled);
    ok(g, 'off-platform: sendStatement720 absent', P.run('typeof sendStatement720') === 'undefined');
    ok(g, 'a sweep over every screen throws nothing', P.run('(function(){ try { for (var i = 0; i < 12; i++) goTo(i); goTo(0); return "ok"; } catch (e) { return e.message; } })()') === 'ok');
    P.run('(function(){ var b = document.getElementById("sc12-continue"); finishComponent(b); return 1; })()');
    ok(g, 'off-platform: "סיימתי" still disables itself', P.d.getElementById('sc12-continue').disabled === true);
  }

  /* 4b. the full walk — every question right, then a mixed walk — with the exact statement stream */
  const walks = {
    right: { choice: {}, dd: DD_KEY, expectFrac: { '002': 1, '004': 1, '006': 1, '007': 1, '008': 1, '009': 1, '010': 1, '011': 1 } },
    mixed: { choice: { '002': '4733196', '006': '4733203', '011': '4730458' }, dd: { 5: 5, 4: 2, 2: 4, 1: 1, 3: 3 },
             expectFrac: { '002': 0, '004': 1, '006': 0, '007': 1, '008': 1, '009': 0.6, '010': 1, '011': 0 } },
  };
  for (const [name, wk] of Object.entries(walks)) {
    const P = boot();
    P.run(RECORDER);
    for (let i = 1; i <= 12; i++) {
      const sid = 'SC' + String(i).padStart(2, '0'), p = sid.toLowerCase(), n = '0' + sid.slice(2);
      ok(g, '[' + name + '] reached ' + sid, P.active() === sid, P.active());
      if (MBZ[n] && !MBZ[n].dd) {
        ok(g, '[' + name + '] ' + sid + ' "צדקתי?" disabled before a choice', P.d.getElementById(p + '-check').disabled);
        P.click('#' + p + '-answers .scq-opt[data-id="' + (wk.choice[n] || MBZ[n].key) + '"]');
        P.click('#' + p + '-check');
      }
      if (MBZ[n] && MBZ[n].dd) {
        dd(P, Object.fromEntries(Object.entries(wk.dd).slice(0, 4)));
        ok(g, '[' + name + '] SC09 "צדקתי?" disabled with 4 of 5 zones', P.d.getElementById('sc09-check').disabled);
        dd(P, Object.fromEntries(Object.entries(wk.dd).slice(4)));
        P.click('#sc09-check');
        if (name === 'mixed') {
          const before = log(P).length;
          P.click('#sc09-reveal-btn');
          const shown = P.d.querySelector('#sc09-board .dd-zone[data-zone="4"]').textContent.trim();
          P.click('#sc09-reveal-btn');
          ok(g, '[mixed] SC09 reveal shows the right label, sends nothing, toggles back', shown === 'משך זמן ההתמצקות' && log(P).length === before &&
            P.d.querySelector('#sc09-board .dd-zone[data-zone="4"]').textContent.trim() === 'דקות');
        }
      }
      if (MBZ[n]) ok(g, '[' + name + '] ' + sid + ' "המשך" shown after the check', !P.d.getElementById(p + '-continue').classList.contains('hidden'));
      P.click('#' + p + '-continue');
    }
    P.click('#sc12-continue');   // a second click on "סיימתי": the button is disabled and the ledger dedupes
    const L = log(P);
    for (const n of Object.keys(MBZ)) {
      const a = L.filter((s) => s.v.indexOf('answered') === 0 && s.id === item(n) + 'q1');
      const want = wk.expectFrac[n];
      ok(g, '[' + name + '] ' + n + ': exactly one answered.last, scaled ' + want, a.length === 1 && a[0].v === 'answered.last' && a[0].r.score.scaled === want && a[0].r.success === (want === 1), JSON.stringify(a.map((x) => x.r && x.r.score)));
      const q = compMeta.subContent[+n - 1].questions[0];
      if (!MBZ[n].dd) {
        const picked = wk.choice[n] || MBZ[n].key;
        ok(g, '[' + name + '] ' + n + ': response = the metadata string of the pick', a[0] && a[0].r.response === q.answers[MBZ[n].ids.indexOf(picked)], a[0] && a[0].r.response);
      } else {
        const lab = {}; [...jsc.matchAll(/\{ no: (\d), group: \d, label: '([^']+)'/g)].forEach((m) => { lab[m[1]] = m[2]; });
        const zoneNo = { 'כותרת הגרף': 5, 'שם הציר האנכי': 4, 'יחידות הציר האנכי': 2, 'שם הציר האופקי': 1, 'יחידות הציר האופקי': 3 };
        const want9 = q.answers.source.map((s) => s + '[.]' + lab[wk.dd[zoneNo[s]]]).join('[,]');
        ok(g, '[' + name + '] 009: matching response, metadata strings, source order', a[0] && a[0].r.response === want9, a[0] && a[0].r.response);
      }
      const c = L.filter((s) => s.v === 'completed' && s.id === item(n));
      ok(g, '[' + name + '] ' + n + ': item completed once, result = the fraction', c.length === 1 && c[0].r.score.scaled === want);
    }
    for (const n of INFO_ITEMS) {
      ok(g, '[' + name + '] ' + n + ': initialized + completed once, no result, no answered', L.filter((s) => s.id === item(n) && s.v === 'completed').length === 1 &&
        L.filter((s) => s.id === item(n) && s.v === 'initialized').length === 1 && !L.some((s) => s.v.indexOf('answered') === 0 && s.id.indexOf(item(n)) === 0));
    }
    const comp = L.filter((s) => s.v === 'completed' && s.id === 'COMPONENT');
    const earned = Object.keys(MBZ).reduce((a, n) => a + MBZ[n].marks * wk.expectFrac[n], 0);
    const scaled = earned / SUMGRADES;
    ok(g, '[' + name + '] exactly one component completed, the LAST statement', comp.length === 1 && L[L.length - 1] === L.find((s) => s.v === 'completed' && s.id === 'COMPONENT') || (comp.length === 1 && L[L.length - 1].id === 'COMPONENT'));
    ok(g, '[' + name + '] component score = Σ marks × fraction / 99 = ' + scaled.toFixed(4), comp[0] && Math.abs(comp[0].r.score.scaled - scaled) < 1e-9, comp[0] && JSON.stringify(comp[0].r));
    ok(g, '[' + name + '] component success = score ≥ 0.7', comp[0] && comp[0].r.success === (scaled >= GRADEPASS));
    ok(g, '[' + name + '] "סיימתי" disabled after the click', P.d.getElementById('sc12-continue').disabled);
    ok(g, '[' + name + '] every statement id is in the catalogue', L.every((s) => s.id === 'COMPONENT' || compMeta.subContent.some((x) => s.id === x.id || x.questions.some((q) => q.questionId === s.id))));
    ok(g, '[' + name + '] no page error, no [xAPI] warning', P.errs.length === 0, P.errs.join(' | '));
  }

  /* 4c. the board's rules */
  {
    const P = boot();
    P.run(RECORDER);
    P.run('goTo(8)');
    const zoneText = (z) => P.d.querySelector('#sc09-board .dd-zone[data-zone="' + z + '"]').textContent.trim();
    P.click('#sc09-tray .dd-chip[data-no="1"]'); P.click('#sc09-board .dd-zone[data-zone="5"]');
    ok(g, 'SC09: a group-3 item is refused by the title zone (group 1)', zoneText(5) === '');
    P.click('#sc09-board .dd-zone[data-zone="4"]');
    ok(g, 'SC09: …and placed in a group-3 zone', zoneText(4) === 'טמפרטורה');
    P.click('#sc09-tray .dd-chip[data-no="2"]'); P.click('#sc09-board .dd-zone[data-zone="4"]');
    ok(g, 'SC09: dropping on a filled zone evicts its item to the tray', zoneText(4) === 'דקות' && !P.d.querySelector('#sc09-tray .dd-chip[data-no="1"]').classList.contains('is-placed'));
    P.click('#sc09-board .dd-zone[data-zone="4"]');
    ok(g, 'SC09: activating a filled zone with nothing picked returns its item', zoneText(4) === '' && !P.d.querySelector('#sc09-tray .dd-chip[data-no="2"]').classList.contains('is-placed'));
    ok(g, 'SC09: nothing reported while placing', !log(P).some((s) => s.v.indexOf('answered') === 0));
  }

  /* 4d. B-1: an evaluated screen left unanswered by "חזרה" → no completed for it */
  {
    const P = boot();
    P.run(RECORDER);
    P.click('#sc01-continue'); P.click('#sc02-back');
    ok(g, 'B-1: unanswered 002 left by "חזרה" → no completed for 002', !log(P).some((s) => s.v === 'completed' && s.id === item('002')));
  }
  summary();
})();

function summary() {
  console.log('\nverify-report: ' + passed + ' passed, ' + failed + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
  process.exitCode = failed ? 1 : 0;
}

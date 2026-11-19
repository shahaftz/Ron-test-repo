/* ===========================================================
   הילד שגילה (מחדש) תופעה מוזרה — script.js
   (methodica-science-strange-discovery-01, type mafmar-moodle)

   Engine: methodica-science-movo-01/script.js (the family's newest
   mafmar-moodle component): navigation, scroll hint, single-choice
   engine, image zoom, the finish button and the xAPI configuration.
   New here: a drag-and-drop-on-a-picture engine for the Moodle
   ddimageortext question (SC09), built to the 720 DragAndDropQuestion
   rules (pointer events only, capture on a stable element, placed items
   stay draggable, a click/keyboard path beside the drag).
   Behaviour, as in every mafmar-moodle unit:
     - one valid attempt per question (Moodle deferredfeedback: one
       submitted answer per question): "צדקתי?" stays disabled until the
       answer is complete, judges once, locks, and gives way to "המשך";
     - feedback "תשובתך נכונה." / "תשובתך נכונה חלקית." / "תשובתך אינה
       נכונה." (the Hebrew of the MBZ's Moodle-default combined feedback);
     - after a wrong answer the right one is shown: single-choice marks
       the right option next to the learner's; the board gets the reveal
       toggle, which never re-grades;
     - single-choice options shuffled once per page load (shuffleanswers 1);
       the board's items keep the MBZ order (its shuffleanswers is 0).
   The component 'completed' is the learner's last click: "סיימתי" on SC12.
   =========================================================== */

/* ---------- Canvas scaling — full-frame fill (science-8th / gaming-app / movo) ---------- */
function scaleApp() {
  const app = document.getElementById('app');
  const viewport = document.getElementById('viewport');
  const availW = viewport.clientWidth;
  const availH = viewport.clientHeight;
  const scale = Math.min(availW / 1280, availH / 710);
  app.style.width = (availW / scale) + 'px';
  app.style.height = (availH / scale) + 'px';
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px';
  app.style.top = '0px';
  /* Readable text below the reference size (2026-11-15): the canvas never re-flows, it only scales,
     so on a smaller viewport the reading text grows by 1/scale (max 1.2) — 22px stays ~22px on
     screen down to ~1070px wide. 1 at 1280 × 710 and above: the reference layout is unchanged. */
  app.style.setProperty('--read-k', scale < 1 ? Math.min(1.2, 1 / scale).toFixed(3) : '1');
  /* The reserved scrollbar strip (styles.css, scrollbar-gutter) is taken out of the right margin. */
  const pane = document.querySelector('.screen.active .scq-screen-content--scroll');
  if (pane && pane.offsetWidth) app.style.setProperty('--sbw', (pane.offsetWidth - pane.clientWidth) + 'px');
}
window.addEventListener('resize', scaleApp);
window.addEventListener('DOMContentLoaded', scaleApp);
scaleApp();

const FEEDBACK = {
  correct: 'תשובתך נכונה.',
  partial: 'תשובתך נכונה חלקית.',
  incorrect: 'תשובתך אינה נכונה.'
};
const REVEAL = { show: 'הצג תשובה נכונה', back: 'הצג את התשובה שלי' };

/* 720 Type 1 verdict icons (16px, bare) — the canonical vectors (720-design-guidelines) */
const ICON = {
  correct: '<svg width="16" height="14" viewBox="0 0 14 12" fill="none" aria-hidden="true"><path d="M4.52036 12C4.12296 12.0002 3.74183 11.8126 3.46106 11.4787L0.258452 7.67744C-0.0861507 7.26814 -0.0861507 6.60467 0.258452 6.19536C0.603165 5.78619 1.16194 5.78619 1.50666 6.19536L4.52036 9.77374L12.4933 0.306878C12.8381 -0.102293 13.3968 -0.102293 13.7415 0.306878C14.0862 0.716179 14.0862 1.37966 13.7415 1.78896L5.57966 11.4787C5.29889 11.8126 4.91776 12.0002 4.52036 12Z" fill="#609E12"/></svg>',
  wrong: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M13.6743 0.325691C13.4657 0.117151 13.1828 0 12.8879 0C12.5929 0 12.31 0.117151 12.1014 0.325691L7 5.42709L1.8986 0.325691C1.69 0.117151 1.40711 0 1.11215 0C0.817183 0 0.534294 0.117151 0.325691 0.325691C0.117151 0.534294 0 0.817183 0 1.11215C0 1.40711 0.117151 1.69 0.325691 1.8986L5.42709 7L0.325691 12.1014C0.117151 12.31 0 12.5929 0 12.8879C0 13.1828 0.117151 13.4657 0.325691 13.6743C0.534294 13.8829 0.817183 14 1.11215 14C1.40711 14 1.69 13.8829 1.8986 13.6743L7 8.57291L12.1014 13.6743C12.31 13.8829 12.5929 14 12.8879 14C13.1828 14 13.4657 13.8829 13.6743 13.6743C13.8829 13.4657 14 13.1828 14 12.8879C14 12.5929 13.8829 12.31 13.6743 12.1014L8.57291 7L13.6743 1.8986C13.8829 1.69 14 1.40711 14 1.11215C14 0.817183 13.8829 0.534294 13.6743 0.325691Z" fill="#B20010"/></svg>'
};

function outcomeOf(fraction) {
  if (fraction >= 0.9999999) return 'correct';
  if (fraction > 0) return 'partial';
  return 'incorrect';
}
function normText(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

/* ---------- Navigation ---------- */
const SCREEN_ORDER = SCREEN_REGISTRY.map(function (s) { return s.id; });
let currentIndex = Math.max(0, SCREEN_ORDER.indexOf((document.querySelector('.screen.active') || {}).id));

function goTo(n) {
  if (n < 0 || n >= SCREEN_ORDER.length) return;
  currentIndex = n;
  goToScreen(SCREEN_ORDER[n]);
}
function advanceScreen() { goTo(currentIndex + 1); }
function goBackFromScreen(id) { goTo(SCREEN_ORDER.indexOf(id) - 1); }

SCREEN_ORDER.forEach(function (id, i) {
  const p = id.toLowerCase();
  const back = document.getElementById(p + '-back');
  if (back) {
    if (i === 0) back.disabled = true;   // no predecessor
    else back.addEventListener('click', function () { goBackFromScreen(id); });
  }
  const cont = document.getElementById(p + '-continue');
  if (cont && i < SCREEN_ORDER.length - 1) cont.addEventListener('click', advanceScreen);
});

/* Dev bridge for index_dev.html — only on a local walk (DEV_NAV: ?dev=1 and no ?registration,
   10-identity.js), so nothing can steer the component by postMessage on the platform. */
if (typeof DEV_NAV !== 'undefined' && DEV_NAV) {
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'DEV_GOTO') return;
    const idx = SCREEN_ORDER.indexOf(e.data.screen);
    if (idx >= 0) goTo(idx);
  });
  if (window.parent !== window) window.parent.postMessage({ type: 'DEV_READY', registry: SCREEN_REGISTRY }, '*');
}

/* ---------- Scroll hint: shown only while the active screen really scrolls ---------- */
function updateScrollHint(id) {
  const p = id.toLowerCase();
  const pane = document.getElementById(p + '-content');
  const hint = document.getElementById(p + '-scroll-hint');
  if (!pane || !hint || hint.classList.contains('is-dismissed')) return;
  hint.classList.toggle('is-visible', pane.scrollHeight - pane.clientHeight > 8 && pane.scrollTop === 0);
}
SCREEN_ORDER.forEach(function (id) {
  const p = id.toLowerCase();
  const pane = document.getElementById(p + '-content');
  const hint = document.getElementById(p + '-scroll-hint');
  if (!pane || !hint) return;
  pane.addEventListener('scroll', function () {
    if (pane.scrollTop > 0) { hint.classList.add('is-dismissed'); hint.classList.remove('is-visible'); }
  }, { passive: true });
});
document.addEventListener('screenchange', function (e) {
  requestAnimationFrame(function () { updateScrollHint(e.detail.id); });
  /* the entrance float (translateY 16px) briefly adds overflow: decide again once the reveal has settled */
  setTimeout(function () { if (SCREEN_ORDER[currentIndex] === e.detail.id) updateScrollHint(e.detail.id); }, 1100);
});

/* ---------- Drag hint (SC09 only): a hand carries the first free chip onto an empty drop zone ----------
   Shown once the screen reveal has settled, while nothing has been touched yet; the first press on a
   chip or a zone (pointer, click or keyboard) dismisses it for good. The target zone comes from the
   drag engine (board.dragHintTarget) and is never the chip's right zone, so it gives no answer away. */
function updateDragHint(id) {
  const p = id.toLowerCase();
  const hint = document.getElementById(p + '-drag-hint');
  if (!hint || hint.classList.contains('is-dismissed')) return;
  const pane = document.getElementById(p + '-content');
  const board = document.getElementById(p + '-board');
  const t = board && board.dragHintTarget ? board.dragHintTarget() : null;
  if (!pane || !t) { hint.classList.remove('is-visible'); return; }
  const pr = pane.getBoundingClientRect(), cr = t.chip.getBoundingClientRect(), ir = t.zone.getBoundingClientRect();
  const k = pr.width / pane.offsetWidth || 1;                  // #app is scaled: back to canvas px
  const x0 = (cr.left + cr.width / 2 - pr.left) / k + pane.scrollLeft;
  const y0 = (cr.top + cr.height / 2 - pr.top) / k + pane.scrollTop;
  const x1 = (ir.left + ir.width / 2 - pr.left) / k + pane.scrollLeft;
  const y1 = (ir.top + ir.height / 2 - pr.top) / k + pane.scrollTop;
  hint.style.left = Math.round(x0) + 'px';
  hint.style.top = Math.round(y0) + 'px';
  hint.style.setProperty('--dx', Math.round(x1 - x0) + 'px');
  hint.style.setProperty('--dy', Math.round(y1 - y0) + 'px');
  hint.classList.add('is-visible');
}
SCREEN_ORDER.forEach(function (id) {
  const p = id.toLowerCase();
  const hint = document.getElementById(p + '-drag-hint');
  if (!hint) return;
  function dismiss() { hint.classList.add('is-dismissed'); hint.classList.remove('is-visible'); }
  [p + '-tray', p + '-board'].forEach(function (elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.addEventListener('pointerdown', dismiss);
    el.addEventListener('click', dismiss);
  });
});
document.addEventListener('screenchange', function (e) {
  SCREEN_ORDER.forEach(function (id) {
    const h = document.getElementById(id.toLowerCase() + '-drag-hint');
    if (h && id !== e.detail.id) h.classList.remove('is-visible');
  });
  whenRevealed(e.detail.id, updateDragHint);
});
/* the canvas is fluid: a resize moves the chips, so the hand is re-aimed */
window.addEventListener('resize', function () {
  const id = SCREEN_ORDER[currentIndex];
  const h = document.getElementById(id.toLowerCase() + '-drag-hint');
  if (h && h.classList.contains('is-visible')) requestAnimationFrame(function () { updateDragHint(id); });
});
/* Run fn(id) once the screen's entrance reveal has ended (motion.js drops m-animate / m-hold), so the
   hand appears with the content and starts on the chip's final, un-floated position. */
function whenRevealed(id, fn) {
  const screen = document.getElementById(id);
  let tries = 0;
  (function poll() {
    if (SCREEN_ORDER[currentIndex] !== id || !screen) return;
    const busy = screen.classList.contains('m-animate') || screen.classList.contains('m-hold');
    if (busy && ++tries < 20) { setTimeout(poll, 150); return; }
    setTimeout(function () { if (SCREEN_ORDER[currentIndex] === id) fn(id); }, 250);
  })();
}

/* ---------- Image zoom (720 global component; media-responsive, enlarges small sources) ---------- */
let imageZoomTrigger = null;
function openImageZoom(src, alt) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = modal.querySelector('.img-zoom-modal-stage');
  imageZoomTrigger = document.activeElement;
  stage.innerHTML = '';
  const img = document.createElement('img');
  img.alt = alt || '';
  img.onload = function () {   // fit the media viewport (1200 × 690 envelope − 72/24 padding), never clamp at 1
    const k = Math.min(1056 / img.naturalWidth, 642 / img.naturalHeight);
    img.style.width = Math.round(img.naturalWidth * k) + 'px';
    img.style.height = Math.round(img.naturalHeight * k) + 'px';
  };
  img.src = src;
  stage.appendChild(img);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.img-zoom-modal-close').focus();
}
function closeImageZoom() {
  const modal = document.getElementById('img-zoom-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (imageZoomTrigger && typeof imageZoomTrigger.focus === 'function') imageZoomTrigger.focus();
  imageZoomTrigger = null;
}
document.addEventListener('click', function (e) {
  const zoomBtn = e.target.closest('[data-zoom-src]');
  if (zoomBtn) { openImageZoom(zoomBtn.getAttribute('data-zoom-src'), zoomBtn.getAttribute('data-zoom-alt')); return; }
  if (e.target.closest('[data-zoom-close="true"]')) closeImageZoom();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeImageZoom(); });
document.addEventListener('screenchange', closeImageZoom);   // overlays never outlive their screen

/* ---------- Shared screen helpers ---------- */
function screenEls(id) {
  const p = id.toLowerCase();
  const el = function (s) { return document.getElementById(p + '-' + s); };
  return { root: document.getElementById(id), el: el };
}
function showFeedback(id, outcome) {
  const e = screenEls(id).el;
  const box = e('feedback');
  box.classList.remove('state-correct', 'state-incorrect');   // classList, never className: keeps .m-popup
  box.classList.add('state-' + (outcome === 'correct' ? 'correct' : 'incorrect'));
  e('feedback-title').textContent = FEEDBACK[outcome];
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function swapCheckToContinue(id) {
  const e = screenEls(id).el;
  e('check').classList.add('hidden');
  e('continue').classList.remove('hidden');
  e('continue').focus();
}
/* One catalogue question per screen (metadata/ q1). Guarded: the lomda runs unchanged without the
   shared layer. Called after grading and locking, never before a guard. */
function xapiReport(item, fraction, spec) {
  try { if (typeof xapiAnswered === 'function') xapiAnswered(item, 'q1', fraction, true, spec); } catch (e) {}
}

/* ---------- Single-choice engine (movo makeChoiceScreen: single attempt + right-answer mark) ---------- */
function shuffleChildren(container) {
  const kids = Array.prototype.slice.call(container.children);
  for (let i = kids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = kids[i]; kids[i] = kids[j]; kids[j] = t;
  }
  kids.forEach(function (k) { container.appendChild(k); });
}

/* Answer-capsule width: every choice screen starts at the SC02 width set in CSS. Widen only if an option
   exceeds two lines. Grid rows keep all capsules on a screen as tall as its tallest choice. Measure on
   entry, resize, and font load; a hidden screen (width 0) is fitted on entry. */
function fitAnswers(list) {
  if (!list || !list.offsetWidth) return;
  const texts = Array.prototype.slice.call(list.querySelectorAll('.scq-opt-text'));
  if (!texts.length) return;
  const cs = getComputedStyle(texts[0]);
  let lh = parseFloat(cs.lineHeight);
  if (!(lh > 5)) lh = parseFloat(cs.fontSize) * 1.318;
  const maxLines = function () {
    return Math.max.apply(null, texts.map(function (t) { return Math.round(t.offsetHeight / lh); }));
  };
  list.removeAttribute('data-fit');
  list.style.width = '';
  const colW = list.parentElement.clientWidth;
  let w = list.offsetWidth;
  if (maxLines() > 2) {
    while (w < colW && maxLines() > 2) {
      w = Math.min(colW, w + 8);
      list.style.width = w + 'px';
    }
  }
}
function fitActiveAnswers() {
  const a = document.querySelector('.screen.active');
  if (a) a.querySelectorAll('.scq-answers').forEach(fitAnswers);
}
document.addEventListener('screenchange', function () { requestAnimationFrame(fitActiveAnswers); });
window.addEventListener('resize', fitActiveAnswers);
window.addEventListener('load', fitActiveAnswers);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitActiveAnswers);

function makeChoiceScreen(cfg) {
  const s = screenEls(cfg.id), e = s.el;
  const list = e('answers');
  shuffleChildren(list);   // Moodle shuffleanswers=1: one order per page load
  const opts = Array.prototype.slice.call(list.querySelectorAll('.scq-opt'));
  const state = { selected: null, done: false };

  function render() {
    opts.forEach(function (btn) {
      const id = btn.getAttribute('data-id');
      const chosen = state.selected === id;
      btn.setAttribute('aria-checked', String(chosen));
      btn.disabled = state.done;
      btn.classList.toggle('selected', chosen && !state.done);
    });
    e('check').disabled = state.done || state.selected === null;
  }
  function check() {
    if (state.done || state.selected === null) return;
    state.done = true;
    const fraction = state.selected === cfg.correct ? 1 : 0;   // MBZ fractions: 1 for the key, 0 otherwise
    opts.forEach(function (btn) {
      const id = btn.getAttribute('data-id');
      if (id === state.selected) btn.classList.add(fraction === 1 ? 'correct' : 'wrong');
      else if (fraction === 0 && id === cfg.correct) {
        btn.classList.add('correct');
        const sr = document.createElement('span');
        sr.className = 'visually-hidden';
        sr.textContent = ' (התשובה הנכונה)';
        btn.appendChild(sr);   // on the button, NOT inside the text: it must never touch the line breaks (S2)
      }
    });
    render();
    fitAnswers(list);
    const picked = opts.filter(function (b) { return b.getAttribute('data-id') === state.selected; })[0];
    xapiReport(cfg.item, fraction, { type: 'choice', choices: [normText(picked.querySelector('.scq-opt-text').firstChild.textContent)] });
    showFeedback(cfg.id, outcomeOf(fraction));
    swapCheckToContinue(cfg.id);
  }
  opts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (state.done) return;
      state.selected = btn.getAttribute('data-id');
      render();
    });
  });
  e('check').addEventListener('click', check);
  render();
}

/* ---------- Drag-and-drop on a picture (Moodle ddimageortext) ----------
   cfg: { id, item, items:[{no, group, label}], zones:[{no, group, accept (the right item no), name,
          x, top, anchor}], source order = items order }.
   Zone geometry (producer 2026-11-15): every EMPTY zone has the same neutral width (CSS --dd-w), so its
   size never gives the answer away; a zone holding text fits that text. 'anchor' says which point stays
   put while it grows: 'center' (x = its centre), 'right' (x = its right edge, next to the plot). The
   result is clamped inside the board, so a grown zone never leaves it or covers the plot.
   One item per zone; a zone takes only items of its group; dropping on a filled zone sends its item
   back to the tray; a placed item can be dragged out again; release outside → back to the tray.
   Click path (keyboard / no drag): activate an item to pick it up, then activate a zone. */
function makeDragScreen(cfg) {
  const s = screenEls(cfg.id), e = s.el;
  const tray = e('tray'), board = e('board'), app = document.getElementById('app');
  const byNo = {};
  cfg.items.forEach(function (it) { byNo[it.no] = it; });
  const state = { place: {}, selected: null, done: false, marks: {}, revealed: false };
  cfg.zones.forEach(function (z) { state.place[z.no] = null; });

  /* tray chips (MBZ order) */
  const chips = {};
  cfg.items.forEach(function (it) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dd-chip' + (it.wide ? ' dd-chip--title' : '');
    b.textContent = it.label;
    b.setAttribute('data-no', it.no);
    b.setAttribute('aria-pressed', 'false');
    tray.appendChild(b);
    chips[it.no] = b;
  });
  /* zones on the board */
  const zones = {};
  cfg.zones.forEach(function (z) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dd-zone';
    b.setAttribute('data-zone', z.no);
    b.style.top = z.top + 'px';
    b.innerHTML = '<span class="dd-zone-text"></span><span class="dd-zone-ico" aria-hidden="true"></span>';
    board.appendChild(b);
    zones[z.no] = b;
  });

  function zoneOf(itemNo) {
    for (const k in state.place) if (state.place[k] === itemNo) return +k;
    return null;
  }
  function complete() { return cfg.zones.every(function (z) { return state.place[z.no] !== null; }); }
  function anchorZone(z) {
    const b = zones[z.no];
    const w = b.offsetWidth || 170;                               // hidden screen (no layout): the empty width
    const boardW = board.offsetWidth || 748;
    let left = z.anchor === 'center' ? z.x - w / 2 : z.anchor === 'right' ? z.x - w : z.x;
    left = Math.max(0, Math.min(boardW - w, left));
    b.style.left = Math.round(left) + 'px';
  }

  function render() {
    cfg.items.forEach(function (it) {
      const c = chips[it.no];
      c.classList.toggle('is-placed', zoneOf(it.no) !== null);
      c.setAttribute('aria-pressed', String(state.selected === it.no));
      c.disabled = state.done;
    });
    cfg.zones.forEach(function (z) {
      const b = zones[z.no], here = state.place[z.no];
      const showRight = state.revealed && state.marks[z.no] === false;
      const text = showRight ? byNo[z.accept].label : (here ? byNo[here].label : '');
      b.querySelector('.dd-zone-text').textContent = text;
      b.classList.toggle('has-text', !!text);
      b.classList.toggle('is-filled', !!here && !state.done);
      let mark = null;
      if (state.done) mark = showRight ? 'correct' : (state.marks[z.no] ? 'correct' : 'wrong');
      b.classList.toggle('is-correct', mark === 'correct');
      b.classList.toggle('is-wrong', mark === 'wrong');
      b.querySelector('.dd-zone-ico').innerHTML = mark ? ICON[mark] : '';
      b.disabled = state.done;
      b.setAttribute('aria-label', z.name + ': ' + (text || 'ריק') + (mark === 'correct' ? ' (נכון)' : mark === 'wrong' ? ' (שגוי)' : ''));
      anchorZone(z);
    });
    e('check').disabled = state.done || !complete();
    tray.hidden = state.done;   // every item sits on the board once checked: the empty tray would only leave a gap
    const rb = e('reveal-btn');
    rb.textContent = state.revealed ? REVEAL.back : REVEAL.show;
    rb.setAttribute('aria-pressed', String(state.revealed));
  }
  function place(itemNo, zoneNo) {
    if (state.done) return;
    const z = cfg.zones.filter(function (x) { return x.no === zoneNo; })[0];
    if (!z || byNo[itemNo].group !== z.group) return;               // Moodle: a zone takes its own group only
    const from = zoneOf(itemNo);
    if (from !== null) state.place[from] = null;
    state.place[zoneNo] = itemNo;                                  // an occupant is evicted to the tray
    state.selected = null;
    render();
  }
  function unplace(itemNo) {
    const from = zoneOf(itemNo);
    if (from !== null) state.place[from] = null;
    state.selected = null;
    render();
  }

  /* click / keyboard path */
  let suppressClick = false;
  tray.addEventListener('click', function (ev) {
    const c = ev.target.closest('.dd-chip');
    if (!c || state.done || suppressClick) return;
    const no = +c.getAttribute('data-no');
    state.selected = state.selected === no ? null : no;
    render();
  });
  board.addEventListener('click', function (ev) {
    const b = ev.target.closest('.dd-zone');
    if (!b || state.done || suppressClick) return;
    const zno = +b.getAttribute('data-zone');
    if (state.selected !== null) place(state.selected, zno);
    else if (state.place[zno] !== null) { const it = state.place[zno]; unplace(it); chips[it].focus(); }
  });

  /* pointer drag (720 DragAndDropQuestion: pointer events only; capture on the documentElement) */
  let drag = null;
  function scale() { return app.getBoundingClientRect().width / app.offsetWidth || 1; }
  function toApp(x, y) { const r = app.getBoundingClientRect(), k = scale(); return { x: (x - r.left) / k, y: (y - r.top) / k }; }
  function zoneAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest ? el.closest('#' + cfg.id + ' .dd-zone') : null;
    return b ? +b.getAttribute('data-zone') : null;
  }
  function endDrag(ev, cancelled) {
    if (!drag) return;
    const d = drag; drag = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    try { document.documentElement.releasePointerCapture(d.pointerId); } catch (_) {}
    if (d.ghost) d.ghost.remove();
    Object.keys(zones).forEach(function (k) { zones[k].classList.remove('is-over'); });
    if (chips[d.item]) chips[d.item].classList.remove('is-dragging');
    if (!d.moved) return;                                          // a tap: the click handlers decide
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
    if (cancelled) { render(); return; }
    const z = zoneAt(ev.clientX, ev.clientY);
    if (z !== null) place(d.item, z);
    else if (d.fromZone) unplace(d.item);                          // dragged out of a zone, released outside
    else render();
  }
  function onMove(ev) {
    if (!drag) return;
    if (ev.buttons === 0 && ev.pointerType === 'mouse') { endDrag(ev, true); return; }
    if (!drag.moved) {
      if (Math.abs(ev.clientX - drag.x0) + Math.abs(ev.clientY - drag.y0) < 6) return;
      drag.moved = true;
      /* capture only once it IS a drag: capturing on pointerdown would take the click from a tap */
      try { document.documentElement.setPointerCapture(drag.pointerId); } catch (_) {}
      const g = document.createElement('div');
      g.className = 'dd-chip dd-ghost' + (byNo[drag.item].wide ? ' dd-chip--title' : '');
      g.textContent = byNo[drag.item].label;
      g.style.width = drag.w + 'px';
      app.appendChild(g);
      drag.ghost = g;
      chips[drag.item].classList.add('is-dragging');
    }
    const p = toApp(ev.clientX, ev.clientY);
    drag.ghost.style.left = (p.x - drag.w / 2) + 'px';
    drag.ghost.style.top = (p.y - 18) + 'px';
    const z = zoneAt(ev.clientX, ev.clientY);
    Object.keys(zones).forEach(function (k) {
      const zz = cfg.zones.filter(function (x) { return x.no === +k; })[0];
      zones[k].classList.toggle('is-over', +k === z && zz.group === byNo[drag.item].group);
    });
  }
  function onUp(ev) { endDrag(ev, false); }
  function onCancel(ev) { endDrag(ev, true); }
  function startDrag(ev, item, fromZone, w) {
    if (state.done || ev.button > 0) return;
    if (drag) endDrag(ev, true);                                   // a lost pointerup never leaves an orphan
    drag = { item: item, fromZone: fromZone, x0: ev.clientX, y0: ev.clientY, moved: false, ghost: null, pointerId: ev.pointerId, w: w };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
  }
  tray.addEventListener('pointerdown', function (ev) {
    const c = ev.target.closest('.dd-chip');
    if (!c || c.classList.contains('is-placed')) return;
    startDrag(ev, +c.getAttribute('data-no'), false, c.offsetWidth);
  });
  board.addEventListener('pointerdown', function (ev) {
    const b = ev.target.closest('.dd-zone');
    if (!b) return;
    const it = state.place[+b.getAttribute('data-zone')];
    if (it !== null) startDrag(ev, it, true, b.offsetWidth);
  });
  document.addEventListener('screenchange', function () { if (drag) endDrag({ clientX: 0, clientY: 0 }, true); });

  /* For the drag hint: the first free chip and an empty zone that takes its group. The zone is never
     the chip's right one (a same-group decoy when there is one), so the hint shows the gesture only. */
  board.dragHintTarget = function () {
    if (state.done) return null;
    const it = cfg.items.filter(function (x) { return zoneOf(x.no) === null; })[0];
    if (!it) return null;
    const open = cfg.zones.filter(function (z) { return z.group === it.group && state.place[z.no] === null; });
    const z = open.filter(function (x) { return x.accept !== it.no; })[0] || open[0];
    return z ? { chip: chips[it.no], zone: zones[z.no] } : null;
  };

  function check() {
    if (state.done || !complete()) return;
    state.done = true;
    state.selected = null;
    cfg.zones.forEach(function (z) { state.marks[z.no] = state.place[z.no] === z.accept; });
    const right = cfg.zones.filter(function (z) { return state.marks[z.no]; }).length;
    const fraction = right / cfg.zones.length;                    // Moodle ddimageortext: right places / places
    render();
    xapiReport(cfg.item, fraction, { type: 'matching', pairs: cfg.zones.map(function (z) {
      return { source: z.name, target: byNo[state.place[z.no]].label };
    }) });
    const outcome = outcomeOf(fraction);
    showFeedback(cfg.id, outcome);
    if (outcome !== 'correct') e('reveal-btn').classList.remove('hidden');
    swapCheckToContinue(cfg.id);
  }
  e('reveal-btn').addEventListener('click', function () { state.revealed = !state.revealed; render(); });
  e('check').addEventListener('click', check);
  render();
}

/* ---------- The screens ---------- */
/* Answer keys: MBZ questions.xml — the answer with fraction 1.0 (docs/STAGE-1-REPORT.md §1). */
makeChoiceScreen({ id: 'SC02', item: '002', correct: '4733194' });
makeChoiceScreen({ id: 'SC04', item: '004', correct: '4733197' });
makeChoiceScreen({ id: 'SC06', item: '006', correct: '4733201' });
makeChoiceScreen({ id: 'SC07', item: '007', correct: '4730469' });
makeChoiceScreen({ id: 'SC08', item: '008', correct: '4733209' });
/* SC09 — qbe 876870, ddimageortext. Drop no ← drag no (choice) in the MBZ: 5←5, 4←4, 2←2, 1←1, 3←3.
   Zone geometry on the 748 × 488 board (picture 528 wide at x 220, y 44; plot centre x 484): see the
   SC09 comment in index.html. Zone order = the metadata answers.source order (title, y name, y unit,
   x name, x unit). */
makeDragScreen({
  id: 'SC09', item: '009',
  items: [
    { no: 1, group: 3, label: 'טמפרטורה' },
    { no: 2, group: 3, label: 'דקות' },
    { no: 3, group: 3, label: 'מעלות צלזיוס' },
    { no: 4, group: 3, label: 'משך זמן ההתמצקות' },
    { no: 5, group: 1, label: 'השפעת טמפרטורת הג׳לי ההתחלתית על משך זמן ההתמצקות במקפיא', wide: true }
  ],
  zones: [
    { no: 5, group: 1, accept: 5, name: 'כותרת הגרף',          x: 484, top: 0,   anchor: 'center' },
    { no: 4, group: 3, accept: 4, name: 'שם הציר האנכי',       x: 214, top: 182, anchor: 'right' },
    { no: 2, group: 3, accept: 2, name: 'יחידות הציר האנכי',   x: 214, top: 226, anchor: 'right' },
    { no: 1, group: 3, accept: 1, name: 'שם הציר האופקי',      x: 493, top: 410, anchor: 'center' },
    { no: 3, group: 3, accept: 3, name: 'יחידות הציר האופקי',  x: 493, top: 452, anchor: 'center' }
  ]
});
makeChoiceScreen({ id: 'SC10', item: '010', correct: '4730851' });
makeChoiceScreen({ id: 'SC11', item: '011', correct: '4730456' });

document.getElementById('sc12-continue').addEventListener('click', function () { finishComponent(this); });

requestAnimationFrame(function () { updateScrollHint(SCREEN_ORDER[currentIndex]); });
whenRevealed(SCREEN_ORDER[currentIndex], updateDragHint);

/* 720 animation-system: the initial screen's reveal (held by motion.js until the page has loaded). */
if (window.Motion) Motion.reveal(document.querySelector('.screen.active'));

/* ═══════════════════ xAPI (720) — the part's configuration ═══════════════════
   Data and pure helpers only, read by the shared layer (unit-js/) at CALL time — which is why
   this block may sit at the bottom of the file, after the code that uses it.

   ── Screen → catalogue item ──
   Keyed by the screen element id — the value registry.js's goToScreen passes to xapiOnScreen —
   and must hold exactly the SCREEN_REGISTRY ids. Values: [item suffix (3 digits, quoted — it is
   concatenated into ids), page within the item (documentation only)]. One item per Moodle SLOT;
   the description slots (001, 003, 005, 012) report initialized/completed only and carry no question. */
var SCREEN_TO_SUBCONTENT = {
  'SC01': ['001', 1],   /* slot 1  — פתיחה (ללא ציון, ללא שאלה) */
  'SC02': ['002', 1],   /* slot 2  — שאלה 1: מדוע אפקט מפמבה לא הגיוני לכאורה (choice) */
  'SC03': ['003', 1],   /* slot 3  — אפקט מפמבה (ללא ציון, ללא שאלה) */
  'SC04': ['004', 1],   /* slot 4  — שאלה 2: תוצאה המעידה על תנאים מיוחדים (choice) */
  'SC05': ['005', 1],   /* slot 5  — ניסוי: ג'לי למאכל (ללא ציון, ללא שאלה) */
  'SC06': ['006', 1],   /* slot 6  — שאלה 3: ניסוח השערה (choice) */
  'SC07': ['007', 1],   /* slot 7  — שאלה 4: תכנון הניסוי (choice) */
  'SC08': ['008', 1],   /* slot 8  — שאלה 5: בקרת עמיתים (choice) */
  'SC09': ['009', 1],   /* slot 9  — שאלה 6: רכיבי הגרף (matching, גרירה) */
  'SC10': ['010', 1],   /* slot 10 — שאלה 7: מסקנה מהגרף (choice) */
  'SC11': ['011', 1],   /* slot 11 — שאלה 8: מתאים או סותר (choice) */
  'SC12': ['012', 1]    /* slot 12 — סיכום (ללא ציון, ללא שאלה); "סיימתי" */
};

var XAPI_COMP_SLUG = 'methodica-science-strange-discovery-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   /* ⚠️ must end with '/' */

/* Items that carry a code-graded question — the ones whose 'completed' needs an 'answered' first. */
var XAPI_EVAL_ITEMS = { '002': 1, '004': 1, '006': 1, '007': 1, '008': 1, '009': 1, '010': 1, '011': 1 };

/* Same folder as the page: in the mafmar-moodle type metadata/ sits inside the component. */
var XAPI_METADATA_FILE = 'metadata/methodica-science-strange-discovery-01.json';

/* The part's last button — "סיימתי" on SC12. */
var XAPI_END_BTN = 'sc12-continue';

/* The component 'completed' verdict: the quiz's own pass grade — grades.xml gradepass 70 of grade 100. */
var XAPI_PASS_THRESHOLD = 0.7;

/* ── Weights: the Moodle quiz's SLOT marks (quiz.xml <maxmark>), Σ = <sumgrades> = 99 ──
   One catalogue question per slot, so each question takes its whole slot. */
var XAPI_ITEM_WEIGHT = { '002': 12, '004': 12, '006': 12, '007': 12, '008': 13, '009': 13, '010': 13, '011': 12 };
var XAPI_Q_WEIGHT = {
  '002/q1': 12, '004/q1': 12, '006/q1': 12, '007/q1': 12,
  '008/q1': 13, '009/q1': 13, '010/q1': 13, '011/q1': 12
};

/* The SCREEN_TO_SUBCONTENT key of the screen active at boot (50-loader.js opens its item). */
function xapiLandingScreen() {
  var a = document.querySelector('.screen.active');
  return a ? a.id : null;
}

/* An item's fraction in [0,1]: weighted mean of its answered questions' fractions
   (XAPI_Q_SCALED, written by xapiAnswered); an unanswered question counts 0. */
function xapiItemScaled(item) {
  var earned = 0, weight = 0;
  Object.keys(XAPI_Q_WEIGHT).forEach(function (k) {
    if (k.indexOf(item + '/') !== 0) return;
    weight += XAPI_Q_WEIGHT[k];
    var s = (typeof XAPI_Q_SCALED !== 'undefined') ? XAPI_Q_SCALED[k] : undefined;
    if (typeof s === 'number') earned += s * XAPI_Q_WEIGHT[k];
  });
  return weight ? earned / weight : 0;
}

/* Explicit result for each evaluated item's 'completed' (the library's own aggregation is an AND
   of "all answers correct", which would report success:false on every partial score). */
function xapiItemResultFor(item) {
  return function () {
    var s = xapiItemScaled(item);
    return { success: s >= 1, score: { scaled: s } };
  };
}
var XAPI_ITEM_RESULT = {};
Object.keys(XAPI_EVAL_ITEMS).forEach(function (item) { XAPI_ITEM_RESULT[item] = xapiItemResultFor(item); });

/* The component result: Σ slot weight × item fraction ÷ Σ slot weights (99 = sumgrades, i.e. the
   Moodle grade as a fraction), success at XAPI_PASS_THRESHOLD. Only ever computed on the last click. */
function partResult() {
  var earned = 0, total = 0;
  Object.keys(XAPI_ITEM_WEIGHT).forEach(function (item) {
    total  += XAPI_ITEM_WEIGHT[item];
    earned += XAPI_ITEM_WEIGHT[item] * xapiItemScaled(item);
  });
  var scaled = total ? earned / total : 0;
  return { success: scaled >= XAPI_PASS_THRESHOLD, score: { scaled: scaled } };
}

/* "סיימתי" — the learner's LAST click: closes item 012, sends the component 'completed' through
   the ledger (once), and disables the button. Nothing else: no window.close, no postMessage —
   the platform removes the component on 'completed'. */
function finishComponent(btn) {
  try {
    if (typeof xapiEndComponent === 'function') { xapiEndComponent(partResult(), btn); return; }
  } catch (e) { console.error('[xAPI] finish', e); }
  /* Off-platform (no shared layer): still disable, so the click has a visible effect. */
  if (btn) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
}

/* ===========================================================
   QA-tool contract compliance (added 2026-11-19)
   - Rule 2.1: expose a navigation function on `window` that the QA
     snippet's ← → arrows can call. `goTo(n)` above takes a numeric
     INDEX; the snippet passes the raw `data-screen` value (an id like
     "SC04"). Wrap the original so BOTH shapes work — number → index,
     string → id lookup → index. The applet's own call sites still
     pass numbers, so they go through unchanged.
   - Rule 4.1: honor `window.__qaReviewMode`. In review mode, reveal
     all per-screen continue buttons so a reviewer who prefers the
     in-applet nav (rather than the QA tool's ← → arrows) can still
     advance without having to answer the quiz correctly.
   See docs/APPLET-CONTRACT.md in Metodika-QA-Tool for rule details.
   =========================================================== */
(function () {
  if (typeof goTo !== 'function' || typeof SCREEN_ORDER === 'undefined') return;

  // Rule 2.1 — wrap goTo so it accepts an id too.
  var _goToByIndex = goTo;
  window.goTo = function (target) {
    if (target == null) return;
    var s = String(target);
    if (/^-?\d+$/.test(s)) { _goToByIndex(Number(s)); return; }
    var idx = SCREEN_ORDER.indexOf(s);
    if (idx >= 0) _goToByIndex(idx);
  };
  // Alias so the snippet's `goToScreen`/`showScreen` probes also match.
  window.goToScreen = function (id) { window.goTo(id); };
  window.showScreen = function (id) { window.goTo(id); };

  // Rule 4.1 — unhide the continue buttons in review mode so the
  // reviewer can advance without clearing the quiz gate.
  if (window.__qaReviewMode) {
    SCREEN_ORDER.forEach(function (id) {
      var cont = document.getElementById(id.toLowerCase() + '-continue');
      if (cont) cont.classList.remove('hidden');
      // The "check / correct / continue" state machine also swaps check→continue
      // via swapCheckToContinue(); reveal the "check" button's sibling "continue"
      // on EVERY screen so order doesn't depend on answer-first.
      var check = document.getElementById(id.toLowerCase() + '-check');
      if (check) check.classList.add('hidden');  // hide the check button since it's irrelevant in review
    });
  }
})();

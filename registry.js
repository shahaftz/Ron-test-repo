/* ===========================================================
   Shared screen registry — single source of truth consumed by
   both learner-facing navigation (script.js) and index_dev.html.

   Source: backup-moodle2-activity-1814117-quiz1814117-20261112-1030-nu.mbz
   (mod_quiz 88613, "הילד שגילה (מחדש) תופעה מוזרה", 12 slots on 8 pages,
   sumgrades 99, grade 100, gradepass 70). One screen per Moodle SLOT
   (= catalogue item 0nn), in slot order — as in methodica-science-movo-01:

     SC01 = slot 1   page 1  qbe 876862  description "פתיחה", 0
     SC02 = slot 2   page 2  qbe 876874  multichoice "שאלה 1", 12
     SC03 = slot 3   page 3  qbe 876871  description "אפקט מפמבה", 0
     SC04 = slot 4   page 3  qbe 876863  multichoice "שאלה 2", 12
     SC05 = slot 5   page 4  qbe 876868  description "ניסוי", 0
     SC06 = slot 6   page 4  qbe 876864  multichoice "שאלה 3", 12
     SC07 = slot 7   page 4  qbe 876865  multichoice "שאלה 4", 12
     SC08 = slot 8   page 5  qbe 876872  multichoice "שאלה 5", 13
     SC09 = slot 9   page 6  qbe 876870  ddimageortext "שאלה 6", 13
     SC10 = slot 10  page 6  qbe 876873  multichoice "שאלה 7", 13
     SC11 = slot 11  page 7  qbe 876867  multichoice "שאלה 8", 12
     SC12 = slot 12  page 8  qbe 882177  description "סיכום", 0 — "סיימתי"

   2026-11-12: stage 1 = SC01–SC02, stage 2 = SC03–SC12.
   =========================================================== */

const SCREEN_REGISTRY = [
  { id: 'SC01', title: 'פתיחה — הילד שגילה (מחדש) תופעה מוזרה', type: 'TextWithImage', status: 'implemented' },
  { id: 'SC02', title: 'שאלה 1 — מדוע אפקט מפמבה לא הגיוני לכאורה', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC03', title: 'אפקט מפמבה — רק בתנאים מיוחדים', type: 'TextWithImage', status: 'implemented' },
  { id: 'SC04', title: 'שאלה 2 — תוצאה המעידה על תנאים מיוחדים', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC05', title: 'ניסוי — ג\'לי למאכל', type: 'TextWithImage', status: 'implemented' },
  { id: 'SC06', title: 'שאלה 3 — ניסוח השערה', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC07', title: 'שאלה 4 — תכנון הניסוי', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC08', title: 'שאלה 5 — בקרת עמיתים', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC09', title: 'שאלה 6 — רכיבי הגרף (גרירה)', type: 'DragAndDropQuestion', status: 'implemented' },
  { id: 'SC10', title: 'שאלה 7 — מסקנה מהגרף', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC11', title: 'שאלה 8 — מתאים או סותר', type: 'SingleChoiceQuestion', status: 'implemented' },
  { id: 'SC12', title: 'סיכום', type: 'TextWithImage', status: 'implemented' },
];

function goToScreen(id) {
  /* 720 animation-system hooks: cancel the leaving screen's reveal, reveal the entering one
     (first visit per session only — motion.js keeps the seen-set). */
  const prev = document.querySelector('.screen.active');
  if (prev && prev.id !== id && window.Motion) Motion.cancel(prev);
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.toggle('active', el.id === id);
  });
  if (window.Motion) Motion.reveal(document.getElementById(id));
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(id); } catch (e) {}
  document.dispatchEvent(new CustomEvent('screenchange', { detail: { id: id } }));
}

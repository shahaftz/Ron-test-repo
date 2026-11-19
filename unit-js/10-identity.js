'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   methodica-science-strange-discovery — one component (methodica-science-strange-discovery-01),
   type "mafmar-moodle". Loaded first. Source: methodica-science-movo-01/unit-js/10-identity.js
   (itself the type's reference methodica-math-gaming-app-01), copied 2026-11-12, values replaced
   for this unit. Everything below the values is the reference's, unchanged.

   Every id the lomda reports is built from these values and must match metadata/*.json byte for
   byte — including the trailing slash, which the catalogue carries on the component and item ids
   (not on question ids, and not on the unit id, which is a bare slug — see below).
   50-loader.js compares XAPI_COMP_ID with window.METADATA.id on every load and shouts on a
   mismatch; _test/verify-report.js asserts it against metadata/.

   ⚠️ The prefix is the CONTENT base (/metodica/720/…), as for every mafmar-moodle unit: the one
   component sits directly under …/720/<subject>/mafmar/<component>/ on the CDN, with no unit
   folder, so the component id and its launch URL share one base.

   Lowercase everywhere (ids, folder names): Kata derives a uniqueKey from the last id segment, and
   currentPartSlug() (40-ledger.js) derives the ledger key from location.pathname. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720/science/mafmar/';

/* The unit id — a bare SLUG, not an IRI, equal to metadata/methodica-science-strange-discovery_unit.json
   `id` and to `learningUnitId` in the component JSON.
   ⚠️ Never replace it with the prefix alone: Kata would take the last prefix segment ("mafmar") as
   the uniqueKey and collide with every mafmar unit of the subject. */
window.XAPI_UNIT_ID = 'methodica-science-strange-discovery';

/* The last segment of a canonical id — the short slug (kept for the issue-report layer, which this
   type does not carry yet). */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume — OFF for the mafmar-moodle type (single-attempt assessment, nothing to restore).
   unit-js/40-ledger.js provides the in-memory ledger the reporting layer still needs.
   ⚠️ This flag also selects the library: with it false, 50-loader.js loads xapi-720-i.js. */
var RESUME_ENABLED = false;

/* DEV_NAV is true only for a local walk (?dev=1 and NO ?registration) — the platform (Kata)
   launches the component with its own ?registration. */
var DEV_NAV = false;
try {
  var _devQ = new URLSearchParams(location.search);
  DEV_NAV = _devQ.get('dev') === '1' && !_devQ.has('registration');
} catch (e) {}

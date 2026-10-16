// streets/names.js - the street names of Vasilievsky Island that need more than a string compare (pure data + functions, no imports: plates.js and the audit tools use it).
// The numbered LINES come in PAIRS that share one street: Kadetskaya + 1st, 2-3, 4-5 ... 28-29; one carriageway (or two close ones), the EVEN line on the east side (nearer the Spit), the ODD line on
// the west side. OSM spells the district two ways ('В.О.' and 'Васильевского острова') and maps a pair either as ONE name ('4-5-я линии В.О.') or as carriageways that each carry one of the
// numbers ('14-я линия' + '15-я линия', '22-я линии' + '23-я линии'): a way name says little about the SIDE of a wall, so the plate of a wall always shows the line of ITS side.
// Evidence for "even = east": the baked addresses (docs/research/streets-vo.md): the houses of '2-я линия В.О.' lie 124 m along the prospects, those of '3-я линия В.О.' 221 m (the street between,
// the numbers grow westwards), and tools/streets-plates (the audit in docs) finds every even-numbered house plate on an east wall, every odd one on a west wall.
const LINE_PAIR = /^(\d+)-(\d+)-я линии( В\.О\.| Васильевского острова)$/, LINE_ONE = /^(\d+)-я (?:линия|линии)( В\.О\.| Васильевского острова)$/;
const KADET = 'Кадетская линия В.О.';
const lines = (n) => [`${n}-я линия В.О.`, `${n}-я линия Васильевского острова`];
/** the lower (even) number of the pair that line n belongs to; 0 for the 1st line (its pair is the Kadetskaya line) */
const evenOf = (n) => (n < 2 ? 0 : n - (n % 2));

/** the name a plate shows on the wall of one side of a street: the line of the side (east = nearer the Spit = the even line), the other spellings normalised ('линия В.О.') */
export function plateName(full, east) {
  if (full === KADET) return east ? KADET : '1-я линия В.О.';
  let m = LINE_PAIR.exec(full); if (m) return `${east ? m[1] : m[2]}-я линия В.О.`;
  m = LINE_ONE.exec(full);
  if (m) { const n = +m[1], e = evenOf(n); return e ? `${east ? e : e + 1}-я линия В.О.` : (east ? KADET : '1-я линия В.О.'); }
  return full;
}
/** the BUILDINGS addr.street spellings that belong to a way name (the way name itself first): the whole pair; with `east` given only the line of that side */
export function addrNames(full, east) {
  let out = [full], m = LINE_PAIR.exec(full);
  if (full === KADET) out = east === undefined ? [KADET, ...lines(1)] : east ? [KADET] : lines(1);
  else if (m) out = east === undefined ? [...lines(m[1]), ...lines(m[2])] : lines(east ? m[1] : m[2]);
  else if ((m = LINE_ONE.exec(full))) {
    const n = +m[1], e = evenOf(n);
    if (!e) out = east === undefined ? [...lines(1), KADET] : east ? [KADET] : lines(1);
    else out = east === undefined ? [...lines(e), ...lines(e + 1)] : lines(east ? e : e + 1);
  }
  return [...new Set([full, ...out])];
}

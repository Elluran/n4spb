// Which landmark groups are really built by their specialist module? (shared by environment / streets / city)
//
// layout.GROUPS claims buildings and OSM objects for landmarksA / B / C. Until a specialist has implemented its module, the generic modules
// must keep drawing the claimed objects as a blockout, otherwise the landmark would simply be missing from the scene. A landmark module
// announces that it draws its groups with a static export:
//
//     export const OWNS_GROUPS = true;                   // every sub-group of the module
//     export const OWNS_GROUPS = ['theatre', 'azimut'];  // only these sub-groups (the rest stays a blockout)
//
// Usage in a generic module:   const owned = await ownedGroups(ctx);   ...   if (owned.has(L.groupOf(b.id))) continue;   // the owner draws it
// `ctx.buildList` (set by main.js / tools/check.mjs) limits the lookup to the modules that are really being built (?only=...).
// ?allcity in the URL makes city / streets / environment ignore all claims (draw everything as a blockout).
import * as L from '../layout.js';
import { OWNS_TABLE } from './owns-table.js';

const ALL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('allcity');

export async function ownedGroups(ctx) {
  if (ctx._ownedGroups) return ctx._ownedGroups;
  const owned = new Set();
  if (!ALL) {
    const list = ctx.buildList || L.MODULE_KEYS;
    for (const m of L.MODULE_KEYS) {
      if (!list.includes(m)) continue;
      try {
        // the generated table (tools/owns-table.mjs) answers without importing the module: importing all 40 landmark modules (44 MB of code and data) before the first
        // module could build cost ~5 s of every load; a module missing from the table is imported as before
        const o = m in OWNS_TABLE ? OWNS_TABLE[m] : (await import(`../${m}.js`)).OWNS_GROUPS;
        if (o === true) for (const g of L.GROUPS[m]) owned.add(g.key);
        else if (Array.isArray(o)) for (const k of o) owned.add(k);
      } catch (e) { console.warn(`[claims] ${m}:`, e && e.message); }
    }
  }
  ctx._ownedGroups = owned;
  return owned;
}

/** True when the specialist module that claims this OSM id is built and owns its sub-group (the generic modules then skip the object). */
export const isOwned = (owned, id) => { const g = L.groupOf(id); return !!g && owned.has(g); };

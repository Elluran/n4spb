// The 12 acceptance camera poses of the Tauride Garden remake (plan section 5, "Acceptance"), CORRECTED from the data, and the two corrected North VIEWS poses (Digit5, Digit6).
//   node tools/tauride-cams.mjs [--json]          prints the table (CAMS) or its JSON
//   node tools/tauride-cams-check.mjs             proves every pose (dry, outside buildings, off the roadway, off bridge decks, reachable on foot, with a line of sight to its target)
// Pose fields: id, name, kind; x, z (metres, the frame of the whole project: +X east, +Z south); yaw (degrees, 0 = north, 90 = west, -90 = east, 180 = south: the VIEWS convention);
// pitch (degrees, + looks up); flight / y for the aerial; target { x, z, y, what } (the thing the photo is about; y = the height of the point aimed at); standOn (the garden way or the ground);
// ref (what the reference photo must show: docs/research/tauride-reference.md lists public sources, the user's own photos or a satellite screenshot are the acceptance material); plan (the pose of the plan and what was wrong with it).
// Why the poses moved: the plan gave the position of the THING (the bridge, the memorial, the gate) and called it a camera. 6 of the 12 plan poses stand on a bridge deck or on the object itself, one is
// inside the palace footprint, one at a second dam position. Every pose here stands on dry land 3 m or more from the shore, so it stays valid once the ponds, banks and hills exist.
// The eye height is the player's (1.7 m); the pitch aims at target.y from there.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EYE = 1.7;
export const CAMS = [
  { id: 'T01', name: 'South gate', kind: 'gate', x: 1226, z: -1278, yaw: -180, pitch: 4.5, target: { of: 'gate:n828488069', x: 1226, z: -1267.8, y: 2.5, what: 'the stone south gate (OSM gate n828488069) seen from 10 m inside, with the fence and the central alley behind the camera' }, standOn: 'w419263230 (main alley, 1 m)',
    ref: 'Gate piers and leaves, the cast-iron fence to both sides, the street beyond; ground = pale gravel alley, old limes either side.',
    plan: { x: 1226, z: -1268, problem: 'stands IN the gate opening on the fence line (the fence is a collider); moved 10 m inside, looking at the gate' } },
  { id: 'T02', name: 'Iron bridge No.3', kind: 'bridge', x: 1404.5, z: -1438, yaw: 24.5, pitch: -0.5, target: { of: 'bridge:No.3', x: 1394, z: -1461, y: 1.5, what: 'the iron arch bridge No.3 to the Pioneers island (OSM chain w81524417 + w882132271 + w882132272, 21.8 m)' }, standOn: 'the island bank, 3 m from the shore',
    ref: 'The cast-iron arch on granite abutments seen side-on across the arm, lake behind it; plan span 13.15 m.',
    plan: { x: 1390, z: -1457, problem: 'on the deck of w81524417 (0.3 m from its axis), where the camera would stand IN the object' } },
  { id: 'T03', name: 'Pioneers-heroes memorial', kind: 'monument', x: 1384, z: -1439, yaw: 44.8, pitch: 5.7, target: { of: 'monument:n4186236011', x: 1371.2, z: -1451.9, y: 3.5, what: 'the memorial n4186236011 (OSM start_date 1962, the plan says 1975) on its high point at the north tip of the island' }, standOn: 'w420650666 (side way, 4 m)',
    ref: 'The memorial and its granite descent against the lake; viewed from the south-east, 18 m.',
    plan: { x: 1371, z: -1452, problem: 'valid as a place, but the camera would stand ON the subject (the memorial and its platform); moved 18 m south-east so the memorial is in view' } },
  { id: 'T04', name: 'Wooden bridge No.1', kind: 'bridge', x: 1113.5, z: -1605.5, yaw: 152.5, pitch: -0.5, target: { of: 'bridge:No.1', x: 1103.4, z: -1586.1, y: 1.5, what: 'the humped wooden bridge No.1 (OSM w112853204, surface=wood, 15.3 m) over the west pond' }, standOn: 'w112853208 (main alley, 3 m)',
    ref: 'The humped timber deck with railings, side-on, the pond edge and reeds in front.',
    plan: { x: 1103, z: -1586, problem: 'on the deck of w112853204' } },
  { id: 'T05', name: 'Dam', kind: 'weir', x: 1265, z: -1653.5, yaw: -18.9, pitch: -2.4, target: { of: 'dam', x: 1272.1, z: -1674.2, y: 0.8, what: 'the dam / weir at the head of the west pond (OSM w112880645): the AUTHORITATIVE dam position, see bridges.js DAM' }, standOn: 'the bank at the mouth of the channel, 3.4 m from the shore',
    ref: 'The low stone weir with the footbridge on it, the channel running away north-west, from the lake side.',
    plan: { x: 1272, z: -1674, problem: 'on the deck of w112880645; and the plan text puts the dam at (1269,-1655), 19 m away (the corner of an estimated canal strip): rejected, the way w112880645 is authoritative' } },
  { id: 'T06', name: 'Iron bridge No.4', kind: 'bridge', x: 1330.5, z: -1405, yaw: -7.7, pitch: -0.5, target: { of: 'bridge:No.4', x: 1333.5, z: -1427.1, y: 1.5, what: 'the iron arch bridge No.4 (OSM w882128034, 16.4 m) over the east arm' }, standOn: 'w86283676 (main alley, 1.3 m)',
    ref: 'The second cast-iron arch, side-on from the south bank; plan span 10.6 m.',
    plan: { x: 1334, z: -1427, problem: 'on the deck of w882128034' } },
  { id: 'T07', name: 'Football pitch', kind: 'lawn', x: 1353, z: -1356.5, yaw: -91, pitch: -2.3, target: { of: 'green:w81524430', x: 1383, z: -1356, y: 0.5, what: 'the pitch w81524430 (3,917 m2, closed fence with 5 openings) in the south-east of the garden' }, standOn: 'w427110426 (side way, 2.7 m), 1.7 m outside the pitch fence',
    ref: 'The marked pitch behind its fence, goals, the surrounding alleys and trees.',
    plan: { x: 1383, z: -1356, problem: 'the pitch centre: the camera would stand inside the fenced pitch (closed fence w81524430, a collider in the old module); moved 30 m west to the alley' } },
  { id: 'T08', name: 'Fountain "Boy with a duck"', kind: 'monument', x: 1279.5, z: -1392, yaw: -20, pitch: -1.3, target: { of: 'fountain:n950150577', x: 1282.6, z: -1400.5, y: 1.5, what: 'the fountain n950150577 (1910)' }, standOn: 'w112729986 (side way, 2.2 m)',
    ref: 'The bronze boy with the duck on its basin, 9 m, from the north-west.',
    plan: { x: 1283, z: -1401, problem: 'the fountain position itself (the camera would stand in the basin); moved 9 m' } },
  { id: 'T09', name: 'West gate', kind: 'gate', x: 934, z: -1412, yaw: 89.4, pitch: 4.6, target: { of: 'gate:n950150459', x: 924.1, z: -1412.1, y: 2.5, what: 'the west gate (OSM gate n950150459) seen from 10 m inside' }, standOn: 'w81524425 (main alley, 0.3 m)',
    ref: 'The gate piers and the iron leaves, the alley leading to it.',
    plan: { x: 924, z: -1412, problem: 'stands in the gate opening on the fence line; moved 10 m inside' } },
  { id: 'T10', name: 'Open meadow', kind: 'lawn', x: 1100, z: -1350, yaw: -3.3, pitch: 2, target: { of: 'green:w1458068124', x: 1104, z: -1440, y: 4, what: 'the far edge of the open lawn: the wooded belt w1458068124 90 m north' }, standOn: 'open lawn, 6 m from w112880634 (side way)',
    ref: 'Mown lawn in the foreground, a tree belt on the far side, no building in view; the plan: "open lawns in the middle".',
    plan: { x: 1100, z: -1350, problem: 'none: valid as given; the look direction was missing' } },
  { id: 'T11', name: 'Palace garden facade', kind: 'palace', x: 1442, z: -1556, yaw: 35.5, pitch: 3.4, target: { of: 'building:r3801092', x: 1379.9, z: -1643, y: 8, what: 'the south (garden) front of the Tauride Palace r3801092, centre of the central block, across the lake' }, standOn: 'east bank of the lake, 7 m from the shore, 10 m south of the foot of the mound E (T5: moved from (1456.5, -1578.5) yaw 49.9, where the building w1274934136 north of the outline stood 10 m to the right of the frame and the palace front was at its edge; from here the whole front, x 1347 .. 1420 at z -1642 .. -1652, spans 32 degrees round the look axis and the lake lies in front; fix round 1: the palace side is the OSM wood w1274934137 and the engine planted it up to the facade, so HOOKS.treeCleared clears the palace parterre in front of the central bow (hooks/keep-out.js PALACE_PARTERRE) and the sight line is free)',
    ref: 'The palace front across the water, 107 m; the lake in the foreground, the lake island to the left of the axis.',
    plan: { x: 1380, z: -1700, problem: 'INSIDE the palace footprint r3801092 (it spans z -1811 .. -1643); the garden front is at z -1643 and the lake lies between it and the garden, so the pose moved to the east bank' } },
  { id: 'T12', name: 'Aerial', kind: 'aerial', flight: true, x: 1200, z: -1250, y: 230, yaw: 0, pitch: -65, target: { of: 'ground', x: 1200, z: -1357, y: 0, what: 'the garden from 230 m south of the south fence; the centre of the view is the ground 107 m ahead' }, standOn: 'air (flight mode)',
    ref: 'Oblique overview: with fov 58 it shows the southern half of the garden (z -1260 .. -1580): the south alleys, the lake and the island, the pitch. The northern half is T11.',
    plan: { x: 1200, z: -1250, problem: 'none: outside the garden polygon over Tavricheskaya street, inside the play area; coverage note added' } },
];

/** The corrected North VIEWS poses for area.js (NOT applied: src/areas/north/area.js is not part of the Tauride data work). Both stay valid now (generic North) and once ponds, banks and hills exist. */
export const VIEWS_PROPOSAL = [
  { key: 'Digit5', label: 'Таврический сад', x: 1368, z: -1471, yaw: -4, pitch: 2, target: { x: 1380, z: -1643, what: 'the lake and the palace across it, from the north end of the memorial island (the granite descent)' },
    was: { x: 1390, z: -1457, yaw: 0, pitch: 0, problem: 'on the deck of bridge w81524417 (0.3 m from the axis)' } },
  { key: 'Digit6', label: 'Таврический дворец', x: 1379, z: -1800, yaw: 180, pitch: 8, target: { x: 1379, z: -1757.5, what: 'the north front of the palace: the six-column portico and the dome, from the front court' },
    was: { x: 1379, z: -1600, yaw: 0, pitch: 6, problem: 'IN the lake (14 m from the shore)' } },
];

/** the poses of the plan, as the plan lists them (for `tauride-cams-check.mjs --plan`, which reports what is wrong with each) */
export const PLAN_POSES = CAMS.map((c) => ({ id: c.id, name: c.name, ...c.plan, flight: !!c.flight, y: c.flight ? 230 : undefined, yaw: c.yaw, pitch: c.pitch }));
export const VIEWS_WAS = VIEWS_PROPOSAL.map((v) => ({ key: v.key, ...v.was }));

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--json')) console.log(JSON.stringify({ CAMS, VIEWS_PROPOSAL }, null, 1));
  else {
    console.log('id   x        z         yaw     pitch  name');
    for (const c of CAMS) console.log(`${c.id}  ${String(c.x).padEnd(8)} ${String(c.z).padEnd(9)} ${String(c.yaw).padEnd(7)} ${String(c.pitch).padEnd(6)} ${c.name}${c.flight ? ' (flight y ' + c.y + ')' : ''}`);
    console.log('\nVIEWS proposals (not applied):');
    for (const v of VIEWS_PROPOSAL) console.log(`${v.key}  ${v.x}, ${v.z}  yaw ${v.yaw} pitch ${v.pitch}  (was ${v.was.x}, ${v.was.z}: ${v.was.problem})`);
  }
}

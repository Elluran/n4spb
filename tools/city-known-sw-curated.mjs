// city-known-sw-curated.mjs - hand-written KNOWN records of the south-west extension (input of tools/city-known-mars.mjs --block sw).
// Most rows of mariinsky- / yusupov- / new-holland- / nikolsky-houses.json carry style, colours, roof and notes: the generator converts them directly (applyRow in city-known-mars.mjs).
// Only houses whose reading needs a human decision are listed here. Fields as in city-known-mars-curated.mjs; c = confidence H / M / L.
export const CURATED = {
  // Vege house (Kryukov emb. 14 / Rimsky-Korsakov 41, Ovsyannikov-Stavitsky 1912-14) [V nikolsky photo 057, mariinsky photo 73]: dark graphite terrazite plaster, rusticated floors 1-2,
  // rounded corner, tall erkers. nikolsky.md (H) wins over the rose-brown of mariinsky-houses.json (the photo shows graphite).
  w68906118: { a: 'ECLECTIC', f: 6, H: 23.5, hex: '#5d5e64', tr: 2, rust: 1, er: 1, rich: 1, ms: 0, tu: 1, rf: '#4f5358', c: 'H' },
};

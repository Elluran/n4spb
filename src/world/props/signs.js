// props/signs.js - canvas textures of the props module: kiosk fascias, café chalk boards, the lit poster wraps of the round advertising pillars (афишные тумбы), the
// 1.2 x 1.8 m city-light boxes, brown tourist wayfinding plates, street-clock dials, ATM and ticket-window panels. Real generic Russian texts (no brands, no logos, no flags);
// posters advertise the things Saint Petersburg really advertises in summer: philharmonic, river rides, white nights, bridges at night, excursions, museums, ice cream.
export function signTextures(ctx) {
  const FO = ctx.tex.FONTS, draw = (w, h, fn, key) => ctx.tex.draw(w, h, fn, { key: 'spbpr|' + key });
  const rr = (g, x, y, w, h, r) => ctx.tex.roundRect(g, x, y, w, h, r);
  const fit = (g, text, x, y, w, size, font, weight) => ctx.tex.fitText(g, text, x, y, w, size, font, weight);
  const T = {};

  /** shop / kiosk fascia: coloured band with a wordmark (+ optional small subline); 512 x 128 */
  T.fascia = (text, bg, fg = '#ffffff', sub = null, font = FO.round) => draw(512, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, w, 6); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h - 6, w, 6);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sub) { fit(g, text, w / 2, h * 0.4, w * 0.9, 66, font, 700); g.globalAlpha = 0.9; fit(g, sub, w / 2, h * 0.8, w * 0.84, 28, FO.sans, 500); g.globalAlpha = 1; } else fit(g, text, w / 2, h * 0.52, w * 0.9, 76, font, 700);
  }, `fascia|${text}|${bg}|${fg}|${sub}`);

  /** chalk board for a café A-frame: a title + menu lines; 256 x 384 */
  T.chalk = (title, lines) => draw(256, 384, (g, w, h) => {
    g.fillStyle = '#1f2a24'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(240,235,220,0.5)'; g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#f3eedf'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, title, w / 2, 58, w - 40, 44, FO.hand, 700);
    g.fillStyle = '#e6c46a'; g.fillRect(40, 92, w - 80, 3);
    lines.forEach((t, i) => { g.fillStyle = i % 2 ? '#bfe0c8' : '#f3eedf'; fit(g, t, w / 2, 140 + i * 56, w - 40, 36, FO.hand, 600); });
    g.strokeStyle = '#e6c46a'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, h - 36); g.bezierCurveTo(100, h - 52, 160, h - 20, w - 60, h - 38); g.stroke();
  }, `chalk|${title}|${lines.join('|')}`);

  // a shared poster painter: gradient field + big title + subline (+ a small pictogram), sized w x h
  const poster = (g, w, h, o) => {
    const gr = g.createLinearGradient(0, 0, w * 0.4, h); gr.addColorStop(0, o.a); gr.addColorStop(1, o.b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (o.icon) o.icon(g, w, h);
    g.fillStyle = o.fg || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const vert = h > w;
    fit(g, o.title, w / 2, vert ? h * 0.2 : h * 0.3, w * 0.9, vert ? 84 : 92, o.font || FO.round, 800);
    if (o.title2) fit(g, o.title2, w / 2, vert ? h * 0.3 : h * 0.5, w * 0.9, vert ? 72 : 70, o.font || FO.round, 800);
    g.globalAlpha = 0.92; fit(g, o.sub, w / 2, vert ? h * 0.88 : h * 0.8, w * 0.88, vert ? 40 : 38, FO.sans, 600); g.globalAlpha = 1;
  };
  const moon = (g, w, h) => { g.fillStyle = 'rgba(255,240,200,0.85)'; g.beginPath(); g.arc(w * 0.78, h * 0.28, Math.min(w, h) * 0.12, 0, 6.3); g.fill(); g.fillStyle = 'rgba(30,40,90,0.7)'; g.beginPath(); g.arc(w * 0.82, h * 0.26, Math.min(w, h) * 0.1, 0, 6.3); g.fill(); };
  const waves = (g, w, h, c) => { g.strokeStyle = c; g.lineWidth = Math.max(3, h * 0.012); for (let k = 0; k < 4; k++) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * (0.62 + k * 0.045) + Math.sin(x / 26 + k) * h * 0.012); g.stroke(); } };
  const ship = (g, w, h) => { g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.moveTo(w * 0.3, h * 0.6); g.lineTo(w * 0.7, h * 0.6); g.lineTo(w * 0.64, h * 0.68); g.lineTo(w * 0.36, h * 0.68); g.closePath(); g.fill(); g.fillRect(w * 0.4, h * 0.52, w * 0.2, h * 0.08); };
  const note = (g, w, h) => { g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(w * 0.7, h * 0.62, w * 0.07, h * 0.05, -0.4, 0, 6.3); g.fill(); g.fillRect(w * 0.75, h * 0.3, w * 0.012, h * 0.32); g.fillRect(w * 0.75, h * 0.3, w * 0.07, h * 0.03); };
  const cone = (g, w, h) => { g.fillStyle = '#f6e3b4'; g.beginPath(); g.arc(w * 0.74, h * 0.5, Math.min(w, h) * 0.11, 0, 6.3); g.fill(); g.fillStyle = '#d98a3a'; g.beginPath(); g.moveTo(w * 0.74 - Math.min(w, h) * 0.08, h * 0.54); g.lineTo(w * 0.74 + Math.min(w, h) * 0.08, h * 0.54); g.lineTo(w * 0.74, h * 0.74); g.closePath(); g.fill(); };
  const cross = (g, w, h) => { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(w * 0.7, h * 0.4, w * 0.1, h * 0.3); g.fillRect(w * 0.6, h * 0.5, w * 0.3, h * 0.1); };
  const cup = (g, w, h) => { g.fillStyle = '#f3eedf'; g.fillRect(w * 0.62, h * 0.44, w * 0.2, h * 0.2); g.strokeStyle = '#f3eedf'; g.lineWidth = 8; g.beginPath(); g.arc(w * 0.84, h * 0.53, h * 0.06, -1.2, 1.2); g.stroke(); };
  const star = (g, w, h) => { g.fillStyle = 'rgba(255,230,160,0.9)'; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.2832; g.beginPath(); g.arc(w * 0.5 + Math.cos(a) * w * 0.3, h * 0.55 + Math.sin(a) * h * 0.2, 4, 0, 6.3); g.fill(); } };
  const SET = [
    { k: 'phil', a: '#2a1f4a', b: '#6a3f8a', title: 'ФИЛАРМОНИЯ', sub: 'Летний сезон · билеты на сайте', icon: note, fg: '#f2d98a', font: FO.serif },
    { k: 'river', a: '#2a6fb0', b: '#8fc5e8', title: 'РЕЧНЫЕ', title2: 'ПРОГУЛКИ', sub: 'по Фонтанке и каналам · каждые 30 минут', icon: (g, w, h) => { ship(g, w, h); waves(g, w, h, 'rgba(255,255,255,0.55)'); } },
    { k: 'white', a: '#1d2c58', b: '#e0a060', title: 'БЕЛЫЕ НОЧИ', sub: 'Фестиваль · июнь – июль', icon: moon },
    { k: 'bridges', a: '#162040', b: '#3a5fa0', title: 'РАЗВОД', title2: 'МОСТОВ', sub: 'ночные экскурсии по Неве', icon: (g, w, h) => { moon(g, w, h); star(g, w, h); } },
    { k: 'ice', a: '#ffd9a8', b: '#ffb3b3', title: 'МОРОЖЕНОЕ', sub: 'в вафельном стаканчике · лето!', icon: cone, fg: '#c8453c' },
    { k: 'apt', a: '#f4f7f4', b: '#cfe8d8', title: 'АПТЕКА', sub: 'круглосуточно · рядом с метро', icon: cross, fg: '#2f8f5b' },
    { k: 'coffee', a: '#3a2a22', b: '#6a4a3a', title: 'КОФЕ', sub: 'с собой · свежая выпечка', icon: cup, fg: '#e6c46a' },
    { k: 'museum', a: '#efe6d2', b: '#d9c9a6', title: 'МУЗЕЙ', sub: 'выставка · билеты на сайте', icon: null, fg: '#8a3a2a', font: FO.serif },
    { k: 'tour', a: '#2f6b45', b: '#8fc59a', title: 'ЭКСКУРСИИ', sub: 'по центру города · пешие и на автобусе', icon: null },
    { k: 'theatre', a: '#5a1a2a', b: '#a0405a', title: 'ТЕАТР', sub: 'премьера сезона · касса работает', icon: star, fg: '#f2d98a', font: FO.serif },
  ];
  /** wrap of a round advertising pillar: 1024 x 384 */
  T.wrap = (i) => { const o = SET[i % SET.length]; return draw(768, 288, (g, w, h) => poster(g, w, h, o), 'wrap|' + o.k); };
  /** city-light box: 512 x 768 (1.2 x 1.8 m) */
  T.cityLight = (i) => { const o = SET[i % SET.length]; return draw(384, 576, (g, w, h) => poster(g, w, h, o), 'cl|' + o.k); };
  T.posterCount = SET.length;
  /** roadside billboard poster (2:1, 576 x 288: 100 px per metre on the 5.8 m face; the same generic posters, no brands) */
  T.board = (i) => { const o = SET[i % SET.length]; return draw(576, 288, (g, w, h) => poster(g, w, h, o), 'board|' + o.k); };
  /** shop totem face (vertical, 192 x 432): a coloured field, a big plain word, a rule and a subline */
  T.totem = (text, bg, fg = '#ffffff', sub = null) => draw(192, 432, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, w, 10); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, h - 10, w, 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    fit(g, text, w / 2, h * 0.3, w * 0.88, 48, FO.round, 800); g.fillRect(w * 0.18, h * 0.43, w * 0.64, 4);
    if (sub) { g.globalAlpha = 0.92; fit(g, sub, w / 2, h * 0.53, w * 0.84, 24, FO.sans, 600); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(w / 2, h * 0.79, w * 0.2, 0, 6.3); g.fill();
  }, `totem|${text}|${bg}|${fg}|${sub}`);
  /** street banner (растяжка) across the road, a plain horizontal strip 768 x 108 (7.11:1): a coloured field, a white rule at each edge, the text and a small subline; never flag-shaped */
  T.banner = (text, bg, fg = '#ffffff', sub = null) => draw(768, 108, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, bg); gr.addColorStop(1, bg); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 5, w, 4); g.fillRect(0, h - 9, w, 4);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (sub) { fit(g, text, w / 2, h * 0.42, w * 0.92, 56, FO.round, 800); g.globalAlpha = 0.92; fit(g, sub, w / 2, h * 0.78, w * 0.88, 24, FO.sans, 600); g.globalAlpha = 1; } else fit(g, text, w / 2, h * 0.52, w * 0.92, 64, FO.round, 800);
  }, `banner|${text}|${bg}|${fg}|${sub}`);
  /** a memorial plaque with the REAL inscription (word-wrapped, the largest size that fits): granite (dark, pale letters), marble (pale, dark letters) or bronze; pw x ph pixels, `key` = a stable id */
  T.plaque = (text, mat, pw, ph, key) => draw(pw, ph, (g, w, h) => {
    const sty = mat === 'marble' ? ['#e9e5da', '#2c2c2c', '#b9b3a4'] : mat === 'bronze' || mat === 'brass' || mat === 'metal' ? ['#4b3a26', '#e3c883', '#8a6d3c'] : ['#43474b', '#e8e5da', '#7b8085'];
    g.fillStyle = sty[0]; g.fillRect(0, 0, w, h); g.strokeStyle = sty[2]; g.lineWidth = Math.max(2, w * 0.018); g.strokeRect(w * 0.035, h * 0.045, w * 0.93, h * 0.91);
    g.fillStyle = sty[1]; g.textAlign = 'center'; g.textBaseline = 'middle';
    const maxW = w * 0.84, maxH = h * 0.78;
    let size = Math.min(34, Math.floor(h / 4.2)), lines = [];
    for (; size >= 7; size--) {
      g.font = `600 ${size}px ${FO.serif}`; lines = []; let cur = '';
      for (const word of String(text).split(/\s+/)) { const t = cur ? cur + ' ' + word : word; if (cur && g.measureText(t).width > maxW) { lines.push(cur); cur = word; } else cur = t; }
      if (cur) lines.push(cur);
      if (lines.length * size * 1.18 <= maxH) break;
    }
    const lh = size * 1.18, y0 = h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => g.fillText(ln, w / 2, y0 + i * lh, maxW));
  }, `plq|${key}`);

  /** brown tourist wayfinding plate (white text + an arrow): 512 x 128 */
  T.way = (text, right = true, sub = null) => draw(512, 128, (g, w, h) => {
    g.fillStyle = '#5b3a29'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f3eedf'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f3eedf'; g.textAlign = right ? 'left' : 'right'; g.textBaseline = 'middle';
    const ax = right ? w - 64 : 64, s = right ? 1 : -1;
    g.beginPath(); g.moveTo(ax - 34 * s, h / 2 - 8); g.lineTo(ax + 4 * s, h / 2 - 8); g.lineTo(ax + 4 * s, h / 2 - 26); g.lineTo(ax + 36 * s, h / 2); g.lineTo(ax + 4 * s, h / 2 + 26); g.lineTo(ax + 4 * s, h / 2 + 8); g.lineTo(ax - 34 * s, h / 2 + 8); g.closePath(); g.fill();
    const x0 = right ? 24 : w - 24, mw = w - 150;
    g.textAlign = right ? 'left' : 'right';
    if (sub) { fit(g, text, x0, h * 0.4, mw, 46, FO.sans, 700); g.globalAlpha = 0.85; fit(g, sub, x0, h * 0.76, mw, 26, FO.sans, 500); g.globalAlpha = 1; } else fit(g, text, x0, h * 0.5, mw, 54, FO.sans, 700);
  }, `way|${text}|${right}|${sub}`);

  /** street clock dial: white face, black ring, hour ticks (hands are geometry); 256 x 256 */
  T.dial = () => draw(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f1e6'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, 6.3); g.fill();
    g.strokeStyle = '#1c1e1d'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 8, 0, 6.3); g.stroke();
    g.fillStyle = '#1c1e1d';
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.fillRect(-4, -w / 2 + 18, 8, i % 3 === 0 ? 26 : 14); g.restore(); }
  }, 'dial');

  /** ATM wall panel (lit): blue frame, screen, card slot; 256 x 384 */
  T.atm = () => draw(256, 384, (g, w, h) => {
    g.fillStyle = '#2b4a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9ecee'; g.fillRect(10, 10, w - 20, 70); g.fillStyle = '#2b4a7a'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, 'БАНКОМАТ', w / 2, 44, w - 40, 42, FO.round, 800);
    g.fillStyle = '#10213f'; g.fillRect(24, 100, w - 48, 120); g.fillStyle = '#8fe0a6'; fit(g, 'Вставьте карту', w / 2, 160, w - 70, 26, FO.sans, 600);
    g.fillStyle = '#dfe5ea'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) g.fillRect(40 + j * 60, 240 + i * 34, 48, 24);
  }, 'atm');

  /** ticket window board for the river-boat kiosks: 512 x 192 */
  T.boats = () => draw(512, 192, (g, w, h) => {
    g.fillStyle = '#1f56a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    fit(g, 'РЕЧНЫЕ ПРОГУЛКИ', w / 2, 56, w - 40, 62, FO.round, 800); g.globalAlpha = 0.92; fit(g, 'билеты · отправление от причала', w / 2, 112, w - 50, 32, FO.sans, 600); fit(g, '1 час · по Фонтанке', w / 2, 154, w - 50, 30, FO.sans, 500); g.globalAlpha = 1;
  }, 'boats');

  /** a small blue "scooter parking" tab: 128 x 128 */
  T.park = () => draw(128, 128, (g, w, h) => { g.fillStyle = '#2f64b5'; rr(g, 4, 4, w - 8, h - 8, 14); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, 'P', w / 2, 52, 60, 70, FO.sans, 800); fit(g, 'самокаты', w / 2, 100, w - 14, 20, FO.sans, 700); }, 'park');
  /** black wrought-iron picket railing, 0.6 m x 0.92 m per tile (4 pickets with spear tips, a top rail at 0.86 m, a low rail at 0.2 m, nothing below it), alpha-tested, repeat-wrapped: the café terraces
   *  draw their railing runs as ONE quad per run (u from 0 to run / 0.6) instead of 20 geometry pickets; 128 x 256 */
  T.railing = () => ctx.tex.draw(128, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#1c1e1d';
    g.fillRect(0, 22, w, 9); g.fillRect(0, 197, w, 7);                         // top rail, low rail
    for (const x of [16, 48, 80, 112]) { g.fillRect(x - 3, 20, 6, 184); g.beginPath(); g.moveTo(x - 6, 20); g.lineTo(x, 2); g.lineTo(x + 6, 20); g.closePath(); g.fill(); }   // pickets + spear tips
    g.fillRect(0, 34, w, 0);
  }, { key: 'spbpr|railing', repeat: [1, 1] });
  return T;
}

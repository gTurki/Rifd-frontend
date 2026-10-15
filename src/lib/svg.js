// extracted from the UI/UX index.html (icons + logo), unchanged
export const I = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  map:'<path d="M12 17.4s-5.6-5-5.6-9.4a5.6 5.6 0 0 1 11.2 0c0 4.4-5.6 9.4-5.6 9.4z"/><circle cx="12" cy="8" r="2.2"/><path d="M8.2 16.1c-2.9.5-4.7 1.4-4.7 2.5 0 1.5 3.8 2.7 8.5 2.7s8.5-1.2 8.5-2.7c0-1.1-1.8-2-4.7-2.5"/>',
  alert:'<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.2M12 17.2h.01"/>',
  inbox:'<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6H3v-6l2.5-8z"/>',
  users:'<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.4 3.3-5.4 6.2-5.4s5.4 2 6.2 5.4"/><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M18 14.9c1.7.8 2.8 2.5 3.3 5"/>',
  access:'<circle cx="12.5" cy="4.3" r="1.8"/><path d="M12.5 7.6v5.9h4.8l2.2 5.2"/><path d="M12.5 10.4H17"/><path d="M9 10.6a5.6 5.6 0 1 0 7.4 7.4"/>',
  chart:'<path d="M3 20h18"/><path d="M6.5 16v-5M11.5 16V6M16.5 16v-8"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  // 8-tooth cog with a round hub, drawn as one outline
  gear: (() => {
    const pts = [], P = (deg, r) => { const a = deg * Math.PI / 180; return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`; };
    for (let k = 0; k < 8; k++) {
      const c = k * 45 - 90;
      pts.push(P(c - 22.5 + 6, 7.2), P(c - 10, 7.4), P(c - 8, 9.6), P(c + 8, 9.6), P(c + 10, 7.4));
    }
    return `<path d="M${pts.join('L')}Z"/><circle cx="12" cy="12" r="3.1"/>`;
  })(),
  bell:'<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  back:'<path d="m15 6-6 6 6 6"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
  cctv:'<rect x="3" y="7" width="12.5" height="10" rx="2"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
  bms:'<rect x="5" y="3" width="14" height="18" rx="1.6"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  fire:'<path d="M12 21c3.9 0 7-2.6 7-6.4 0-3.4-2.4-5.4-3.4-8.4-1.5 2-2.5 3-4 3 0-2.5-1-4.5-3-6 .3 3-3.6 5.5-3.6 10.4C5 18.4 8.1 21 12 21z"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 18.3h2"/>',
  service:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 10h6M9 14h4"/>',
  badge:'<rect x="4" y="3" width="16" height="18" rx="2.6"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17c.7-1.8 2.2-2.8 4-2.8s3.3 1 4 2.8"/>',
  ticket:'<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2z"/><path d="M14 6.5v11" stroke-dasharray="2 2.2"/>',
  walkie:'<rect x="7" y="7" width="10" height="14" rx="2"/><path d="M10 7V2.5M10 11h4M10 14h4"/>',
  spark:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  merge:'<path d="M5 4c0 6 7 6 7 12v4M19 4c0 6-7 6-7 12"/><path d="M12 4v8"/>',
  route:'<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"/>',
  reset:'<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  shield:'<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m9 12 2 2 4-4"/>',
  elev:'<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="m9 9.5 3-3 3 3M9 14.5l3 3 3-3"/>',
  analytics:'<path d="M3.5 3v17.5H21"/><path d="M7 20.5v-5M10.6 20.5v-7.5M14.2 20.5v-5.5M17.8 20.5v-8" stroke-width="2.4" stroke-linecap="butt"/><path d="M7 11.2 10.6 7.6 14.2 9.8 17.8 5.6"/><g fill="currentColor" stroke="none"><circle cx="7" cy="11.2" r="1.3"/><circle cx="10.6" cy="7.6" r="1.3"/><circle cx="14.2" cy="9.8" r="1.3"/><circle cx="17.8" cy="5.6" r="1.3"/></g>',
  docsearch:'<path d="M17.5 9V7.4L13.6 3H5.4A1.4 1.4 0 0 0 4 4.4v15.2A1.4 1.4 0 0 0 5.4 21h9.2a1.4 1.4 0 0 0 1.4-1.4v-.9"/><path d="M13.4 3v3.4a1 1 0 0 0 1 1h3.1"/><path d="M7 9.5h3.6M7 12.5h2.6M7 15.5h2.6M7 18.5h3.2"/><circle cx="14.6" cy="13.9" r="3.4"/><path d="m17.1 16.4 3.4 3.4"/>',
  info:'<circle cx="12" cy="12" r="9.3"/><circle cx="12.2" cy="7.6" r="1.25" fill="currentColor" stroke="none"/><path d="M10.2 11.3c.9-.7 2-.9 2 .2v4.6c0 1 .8 1.2 1.9.3" stroke-width="2"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8.5 7V5.2a1.7 1.7 0 0 1 1.7-1.7h3.6a1.7 1.7 0 0 1 1.7 1.7V7M3 12.5h18M10.5 12.5v1.8h3v-1.8"/>',
  userplus:'<circle cx="10" cy="8" r="3.6"/><path d="M3.5 20c.8-3.6 3.4-5.6 6.5-5.6 1.6 0 3 .5 4.1 1.3"/><path d="M18.5 13.5v6M15.5 16.5h6"/>',
  copy:'<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  trash:'<path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16.5 6.5l2 2M14.5 8.5l1.5 1.5"/>',
  expand:'<path d="M9.5 3.5h-6v6M3.5 3.5l6.2 6.2M14.5 3.5h6v6M20.5 3.5l-6.2 6.2M9.5 20.5h-6v-6M3.5 20.5l6.2-6.2M14.5 20.5h6v-6M20.5 20.5l-6.2-6.2"/>',
  globe:'<circle cx="12" cy="12" r="9.3"/><ellipse cx="12" cy="12" rx="4.3" ry="9.3"/><path d="M12 2.7v18.6M2.7 12h18.6M4.4 6.7c2 1.3 4.6 2 7.6 2s5.6-.7 7.6-2M4.4 17.3c2-1.3 4.6-2 7.6-2s5.6.7 7.6 2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  eye:'<path d="M2.5 12C3.6 10.1 7 6 12 6s8.4 4.1 9.5 6c-1.1 1.9-4.5 6-9.5 6s-8.4-4.1-9.5-6z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.4 4.1 9.5 6-.5.9-1.4 2.1-2.6 3.3M6.6 7.6C4.6 9 3.1 10.9 2.5 12c1.1 1.9 4.5 6 9.5 6 1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.3-6 8-6s7 2 8 6"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  edit:'<path d="M11 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V13"/><path d="M17.6 3.6a2.1 2.1 0 0 1 3 3L12 15.2l-4 1 1-4z"/>',
  escal:'<path d="M3 19h5l8-10h5"/><path d="M3 15h3l8-10h4"/><circle cx="8.5" cy="5" r="1.4"/>',
  broom:'<path d="M5.5 2.8 10.6 12"/><path d="M8.4 13.4 13.8 10.5l3.5 6.3-6.3 3.4c-1-.7-2.2-3-2.6-6.8z"/><path d="M11.4 19.6l-1-2.1M14 18.2l-1.1-2M16.4 16.9l-1.3-1.8"/><circle cx="18.9" cy="11.4" r="1.1"/><circle cx="20.6" cy="14" r=".8"/><circle cx="18.6" cy="15.2" r=".7"/>',
  siren:'<path d="M7 18v-5.5a5 5 0 0 1 10 0V18"/><path d="M4.5 18h15v3h-15z"/><path d="M10 11.5a2.5 2.5 0 0 1 2-2.4"/><path d="M12 2.5V5M4.6 5.4l1.8 1.7M19.4 5.4l-1.8 1.7M2 11.5h2.4M19.6 11.5H22"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/><path d="M9 12h2l1-2 1.5 4 1-2H16"/>',
  child:'<circle cx="12" cy="5" r="2.3"/><path d="M7 10.5h10M12 10.5v4.5M9 21l3-6 3 6"/>',
  dots:'<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  camera:'<path d="M4 8h3.2l1.8-2.6h6L16.8 8H20v11H4z"/><circle cx="12" cy="13.3" r="3.4"/>',
  mic:'<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
  stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  qr:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h2M19.5 14v2"/>',
  chat:'<path d="M4.5 5h15v10.5H10L5.5 19.5V15.5h-1z"/><path d="M8.5 9.3h7M8.5 12h4.5"/>',
  home:'<path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4z"/>',
  locate:'<circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.8v2.7M12 19.5v2.7M1.8 12h2.7M19.5 12h2.7"/>',
  bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.8" cy="6" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="18" r=".9"/>',
};

export const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

// Drawn in a 1932-unit square (the source artwork's grid) and cropped to the mark; crossings get soft under-shadows.
let LOGO_N = 0;
const LOGO_SHAPES = [
  'M615 501A351 351 0 0 1 1317 501L1078 501A112.5 112.5 0 0 0 853 501Z',          // top loop
  'M1317 1431A351 351 0 0 1 615 1431L853 1431A112.5 112.5 0 0 0 1078 1431Z',      // bottom loop
  'M501 615A351 351 0 0 0 501 1317L501 1078A112.5 112.5 0 0 1 501 853Z',          // left loop
  'M1431 1317A351 351 0 0 0 1431 615L1431 853A112.5 112.5 0 0 1 1431 1078Z',      // right loop
  'M615 500h238v116H615Z', 'M1078 500h239v201h-239Z',                              // top legs
  'M853 1432h-238v-202h238Z', 'M1317 1316h-239v116h239Z',                          // bottom legs
  'M500 615h817v238H500Z', 'M615 1078h817v239H615Z',                               // the two bands
  'M500 1078h116v239H500Z', 'M1316 615h116v238h-116Z',                             // side legs
  'M905 853C760 893 615 1020 615 1230L853 1230L853 1078L1027 1078C1172 1038 1317 912 1317 700L1078 700L1078 853Z', // the S
];
export const LOGO = (s = 38) => {
  const n = ++LOGO_N, g = `lg${n}`;
  const shade = (id, x1, y1, x2, y2) => `<linearGradient id="${id}${n}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#021009" stop-opacity=".82"/><stop offset=".35" stop-color="#021009" stop-opacity=".38"/><stop offset="1" stop-color="#021009" stop-opacity="0"/></linearGradient>`;
  return `<svg class="logo" width="${s}" height="${s}" viewBox="130 130 1672 1672" aria-hidden="true">
  <defs>
    <radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="966" cy="966" r="830">
      <stop offset="0" style="stop-color:var(--logo-c0,#E6FDF4)"/><stop offset=".2" style="stop-color:var(--logo-c1,#B2EEDA)"/>
      <stop offset=".46" style="stop-color:var(--logo-c2,#55CAAB)"/><stop offset=".74" style="stop-color:var(--logo-c3,#32A688)"/>
      <stop offset="1" style="stop-color:var(--logo-c4,#1D7C63)"/>
    </radialGradient>
    ${shade('sa', 0, 615, 0, 505)}${shade('sb', 1317, 0, 1428, 0)}${shade('sc', 0, 1317, 0, 1427)}${shade('sd', 615, 0, 504, 0)}
  </defs>
  <g fill="url(#${g})" stroke="url(#${g})" stroke-width="3" stroke-linejoin="round">${LOGO_SHAPES.map(d => `<path d="${d}"/>`).join('')}</g>
  <rect x="615" y="500" width="238" height="115" fill="url(#sa${n})"/>
  <rect x="1317" y="615" width="114" height="238" fill="url(#sb${n})"/>
  <rect x="1078" y="1317" width="239" height="114" fill="url(#sc${n})"/>
  <rect x="501" y="1078" width="114" height="239" fill="url(#sd${n})"/>
</svg>`;
};
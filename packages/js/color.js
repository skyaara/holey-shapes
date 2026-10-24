// Colors are chosen in OKLCH, where equal lightness looks equally bright. Every
// seeded hue then reads as one family, and every extrusion darkens by the same
// perceived amount. Swift and Kotlin repeat these steps exactly; results are
// rounded to sRGB hex.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function oklabToLinear(L, a, b) {
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l * l * l, m3 = m * m * m, s3 = s * s * s;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0001 && v <= 1.0001);
const hex = (rgb) => `#${rgb.map((v) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// Keeps lightness and hue, and reduces chroma until the color fits in sRGB.
function oklabHex(L, a, b) {
  if (inGamut(oklabToLinear(L, a, b))) return hex(oklabToLinear(L, a, b));
  let low = 0, high = 1;
  for (let pass = 0; pass < 24; pass++) {
    const mid = (low + high) / 2;
    if (inGamut(oklabToLinear(L, a * mid, b * mid))) low = mid;
    else high = mid;
  }
  return hex(oklabToLinear(L, a * low, b * low));
}

/** Face color for a hue in degrees. Yellows only look clean when lighter, so lightness rises around 100°. */
export function hueColor(hue) {
  const distance = Math.abs(((hue - 100) % 360 + 540) % 360 - 180);
  const lift = distance < 60 ? Math.pow(Math.cos((distance / 60) * (Math.PI / 2)), 2) : 0;
  const angle = (hue * Math.PI) / 180;
  return oklabHex(0.74 + 0.12 * lift, 0.19 * Math.cos(angle), 0.19 * Math.sin(angle));
}

/** Extrusion color for a face: the same hue at 56% of its lightness and 70% of its chroma. */
export function extrusionColor(face) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(face.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return oklabHex(L * 0.56, A * 0.7, B * 0.7);
}

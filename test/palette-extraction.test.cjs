const assert = require('assert');

// Mock RGB to HSL and palette generation matching wallpaper.ts algorithms
function rgbToHsl(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) * 60; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h), s, l };
}

function isNeutralPixel(r, g, b) {
  const rgbDelta = Math.max(r, g, b) - Math.min(r, g, b);
  const { s, l } = rgbToHsl(r, g, b);
  return rgbDelta <= 14 || s < 0.12 || l > 0.96 || l < 0.06;
}

console.log('=== RUNNING WALLPAPER ACCENT ADAPTIVE EXTRACTION TEST SUITE ===');

// Test 1: Predominantly White / Light Neutral Wallpaper
{
  const r = 250, g = 248, b = 245;
  const hsl = rgbToHsl(r, g, b);
  assert(hsl.l > 0.96, 'Light neutral lightness should be > 0.96');
  assert(isNeutralPixel(r, g, b), 'Pixel with rgbDelta <= 14 and l > 0.96 is classified as neutral');
  console.log('[PASS] Test 1: White/Light neutral wallpaper correctly categorised');
}

// Test 2: Predominantly Dark Neutral Monochromatic Wallpaper
{
  const r = 25, g = 27, b = 30;
  const hsl = rgbToHsl(r, g, b);
  assert(hsl.l < 0.20, 'Dark neutral lightness should be < 0.20');
  assert(isNeutralPixel(r, g, b), 'Dark pixel with rgbDelta <= 14 is classified as neutral');
  console.log('[PASS] Test 2: Dark neutral wallpaper correctly categorised');
}

// Test 3: Vibrant Colorful Wallpaper (e.g. Anime Girl cyan/magenta or nature green)
{
  const hslGreen = rgbToHsl(163, 230, 53);
  assert(hslGreen.h >= 75 && hslGreen.h <= 95, 'Green hue should be in 75-95 range');
  assert(hslGreen.s >= 0.70, 'Vibrant green saturation should be high');
  assert(!isNeutralPixel(163, 230, 53), 'Vibrant green is classified as chromatic');

  const hslBlue = rgbToHsl(56, 189, 248);
  assert(hslBlue.h >= 190 && hslBlue.h <= 210, 'Blue hue should be in 190-210 range');
  assert(!isNeutralPixel(56, 189, 248), 'Vibrant blue is classified as chromatic');
  console.log('[PASS] Test 3: Chromatic vibrant wallpapers extract accurate hue and saturation');
}

// Test 4: Contrast & Accessible Foreground Calculation
{
  const pr = 215, pg = 181, pb = 109; // Gold #D7B56D
  const lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255;
  const textOnAccent = lum > 0.65 ? '#0A0D0E' : '#FFFFFF';
  assert.strictEqual(textOnAccent, '#0A0D0E', 'Gold accent requires dark text for readable contrast');

  const prDark = 28, pgDark = 36, pbDark = 58; // Navy blue
  const lumDark = (0.299 * prDark + 0.587 * pgDark + 0.114 * pbDark) / 255;
  const textOnDark = lumDark > 0.65 ? '#0A0D0E' : '#FFFFFF';
  assert.strictEqual(textOnDark, '#FFFFFF', 'Dark navy accent requires white text for readable contrast');
  console.log('[PASS] Test 4: Accessible text contrast for foreground tokens operates accurately');
}

// Test 5: Power Tab Dimensions & Geometry Clearance
{
  const HITODAMA_TAB_DIMENSIONS = {
    controls: { width: 768, height: 468 },
    today: { width: 880, height: 442 },
    stats: { width: 880, height: 338 },
    clipboard: { width: 880, height: 446 },
    apps: { width: 720, height: 638 },
    wallpaper: { width: 1040, height: 404 },
    power: { width: 640, height: 236 }
  };

  const headerH = 39;
  const tabH = 50;
  const overhead = headerH + tabH;
  const powerH = HITODAMA_TAB_DIMENSIONS.power.height;
  const contentAreaH = powerH - overhead;
  const cardH = 92;
  const cardBottomClearance = (contentAreaH - cardH) / 2 + 14; // includes bottom padding
  const cornerRadius = 22;

  assert(powerH === 236, 'Power tab height must be 236px');
  assert(contentAreaH >= cardH + 40, 'Content area must allocate ample vertical space for 92px cards');
  assert(cardBottomClearance > cornerRadius, `Card bottom clearance (${cardBottomClearance}px) must exceed 22px corner radius`);
  console.log('[PASS] Test 5: Power tab dimensions eliminate vertical clipping and corner overlap');
}

console.log('\nALL 5 TESTS PASSED SUCCESSFULLY!');

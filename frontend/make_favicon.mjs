/**
 * Creates logo.png with ONLY the goblin head (no GOBLINSPOT text).
 * The GOBLIN SPOT text is already rendered in HTML separately.
 * This removes the circuit board background AND crops to just the head.
 */

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, 'public');

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max, d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s, v };
}

/**
 * Returns an alpha value 0..255 for this pixel.
 * greenOnly = true → keep only neon green (goblin) and discard pink (text)
 */
function getNeonAlpha(r, g, b, greenOnly = false) {
    const { h, s, v } = rgbToHsv(r, g, b);

    // Neon green core
    const isGreenCore = h >= 85 && h <= 160 && s > 0.55 && v > 0.40;
    // Neon green glow
    const isGreenGlow = h >= 75 && h <= 165 && s > 0.35 && v > 0.25;
    // White hot-spot
    const isWhite = s < 0.25 && v > 0.85;

    if (!greenOnly) {
        // Also include pink/magenta for the text
        const isPinkCore = h >= 265 && h <= 340 && s > 0.5 && v > 0.40;
        const isPinkGlow = h >= 255 && h <= 350 && s > 0.30 && v > 0.20;
        if (isPinkCore) return 255;
        if (isPinkGlow) return Math.round(v * 160);
    }

    if (isGreenCore || isWhite) return 255;
    if (isGreenGlow) return Math.round(Math.min(1, (v - 0.25) / 0.30) * 200);
    return 0;
}

async function processLogo() {
    console.log('Loading source...');
    const img = await loadImage(path.join(pub, 'logo_source.png'));
    const W = img.width, H = img.height;
    console.log(`Source: ${W}×${H}`);

    const full = createCanvas(W, H);
    full.getContext('2d').drawImage(img, 0, 0);
    const fd = full.getContext('2d').getImageData(0, 0, W, H).data;

    // ── Crop bounds ─────────────────────────────────────────────────────────
    // Full logo (goblin + text): y 0..H, x ~10%..90%
    // Goblin only:               y 0..67%, x 20%..80%
    const headY2 = Math.floor(H * 0.68);
    const headX1 = Math.floor(W * 0.18);
    const headX2 = Math.floor(W * 0.82);
    const headW = headX2 - headX1;
    const headH = headY2;

    // Make square (add padding)
    const side = Math.max(headW, headH);
    const ox = Math.floor((side - headW) / 2);
    const oy = Math.floor((side - headH) / 2);

    // ── Build transparent square logo (goblin head only) ────────────────────
    const logoCanvas = createCanvas(side, side);
    const ld = logoCanvas.getContext('2d').getImageData(0, 0, side, side);
    const lb = ld.data;

    for (let sy = 0; sy < headH; sy++) {
        for (let sx = 0; sx < headW; sx++) {
            const si = ((sy) * W + (headX1 + sx)) * 4;
            const di = ((sy + oy) * side + (sx + ox)) * 4;
            const r = fd[si], g = fd[si + 1], b = fd[si + 2];
            const a = getNeonAlpha(r, g, b, true); // green only
            lb[di] = r; lb[di + 1] = g; lb[di + 2] = b; lb[di + 3] = a;
        }
    }
    logoCanvas.getContext('2d').putImageData(ld, 0, 0);
    writeFileSync(path.join(pub, 'logo.png'), logoCanvas.toBuffer('image/png'));
    console.log('✓ logo.png — goblin head only, transparent bg');

    // ── Favicon: same goblin head at 64×64 ──────────────────────────────────
    const fav = createCanvas(64, 64);
    fav.getContext('2d').clearRect(0, 0, 64, 64);
    fav.getContext('2d').drawImage(logoCanvas, 0, 0, side, side, 0, 0, 64, 64);
    writeFileSync(path.join(pub, 'favicon.png'), fav.toBuffer('image/png'));
    console.log('✓ favicon.png — 64×64');

    // ── favicon-256 for high DPI ─────────────────────────────────────────────
    const fav256 = createCanvas(256, 256);
    fav256.getContext('2d').clearRect(0, 0, 256, 256);
    fav256.getContext('2d').drawImage(logoCanvas, 0, 0, side, side, 0, 0, 256, 256);
    writeFileSync(path.join(pub, 'favicon-256.png'), fav256.toBuffer('image/png'));
    console.log('✓ favicon-256.png — 256×256');

    console.log('All done!');
}

processLogo().catch(e => { console.error(e); process.exit(1); });

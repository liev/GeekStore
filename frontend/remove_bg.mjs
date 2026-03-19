/**
 * Precision background removal for circuit-board neon sign photo.
 * Uses HSV color analysis to isolate only vivid neon (green + pink/magenta) pixels.
 * The circuit board background is dark/medium green with low brightness.
 * Neon tubes are extremely bright and saturated.
 */

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, 'public');

const srcFile = path.join(pub, 'logo_source.png');
const dstFile = path.join(pub, 'logo.png');

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s, v };
}

async function removeBackground() {
    console.log('Loading:', srcFile);
    const img = await loadImage(srcFile);
    const W = img.width, H = img.height;
    console.log(`Image: ${W}×${H}`);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    const N = W * H;
    const keepMask = new Float32Array(N); // 0.0..1.0 desired alpha

    // ── Pass 1: Classify every pixel ────────────────────────────────────────
    for (let i = 0; i < N; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const { h, s, v } = rgbToHsv(r, g, b);

        // Neon GREEN tube core: H ~100-145°, high S, high V
        const isGreenCore = h >= 90 && h <= 155 && s > 0.65 && v > 0.55;
        // Neon GREEN soft glow: same hue range, moderate S/V
        const isGreenGlow = h >= 80 && h <= 165 && s > 0.4 && v > 0.30;

        // Neon PINK/MAGENTA tube core: H ~270-330°, high S, high V
        const isPinkCore = h >= 265 && h <= 335 && s > 0.55 && v > 0.45;
        // Neon PINK soft glow
        const isPinkGlow = h >= 255 && h <= 345 && s > 0.35 && v > 0.25;

        // White/near-white hot-spot at center of neon tube
        const isWhiteHot = s < 0.25 && v > 0.88;

        if (isGreenCore || isPinkCore || isWhiteHot) {
            keepMask[i] = 1.0;          // full opacity
        } else if (isGreenGlow) {
            // Fade based on V — brighter = more opaque
            keepMask[i] = Math.min(1, (v - 0.30) / 0.25) * 0.9;
        } else if (isPinkGlow) {
            keepMask[i] = Math.min(1, (v - 0.25) / 0.20) * 0.9;
        } else {
            keepMask[i] = 0.0;          // background → transparent
        }
    }

    // ── Pass 2: Dilate / expand the glow by 4px to capture halo edges ───────
    const GLOW_RADIUS = 4;
    const expanded = new Float32Array(N);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const pi = y * W + x;
            if (keepMask[pi] < 0.01) continue;
            for (let dy = -GLOW_RADIUS; dy <= GLOW_RADIUS; dy++) {
                for (let dx = -GLOW_RADIUS; dx <= GLOW_RADIUS; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > GLOW_RADIUS) continue;
                    const np = ny * W + nx;
                    const contribution = keepMask[pi] * (1 - dist / GLOW_RADIUS) * 0.5;
                    if (contribution > expanded[np]) expanded[np] = contribution;
                }
            }
        }
    }

    // ── Pass 3: Merge original mask with expanded glow ───────────────────────
    let removed = 0;
    for (let i = 0; i < N; i++) {
        const finalAlpha = Math.min(1, keepMask[i] + expanded[i]);
        const a = Math.round(finalAlpha * 255);
        data[i * 4 + 3] = a;
        if (a === 0) removed++;
    }

    const pct = Math.round(removed * 100 / N);
    console.log(`Background removed: ${removed} pixels (${pct}%)`);
    console.log(`Foreground kept: ${N - removed} pixels`);

    ctx.putImageData(imageData, 0, 0);
    writeFileSync(dstFile, canvas.toBuffer('image/png'));
    console.log(`✓ Saved → ${dstFile}`);
}

removeBackground().then(() => console.log('Done!')).catch(e => { console.error(e); process.exit(1); });

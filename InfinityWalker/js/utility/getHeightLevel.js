import {
    HEIGHT_LEVELS,
    HEIGHT_NOISE_SCALE,
    HEIGHT_NOISE_OCTAVES,
    HEIGHT_SEED
} from '../config.js';

// TODO: Understand this noise function
export function getHeightLevel(worldX, worldY) {
    let amplitude = 1;
    let scale = HEIGHT_NOISE_SCALE;
    let total = 0;
    let max = 0;

    for (let i = 0; i < HEIGHT_NOISE_OCTAVES; i++) {
        total += valueNoise2D(worldX, worldY, scale) * amplitude;
        max += amplitude;
        amplitude *= 0.5;
        scale *= 0.5;
    }

    const normalized = max > 0 ? total / max : 0;
    let level = Math.floor(normalized * HEIGHT_LEVELS);
    if (level >= HEIGHT_LEVELS) level = HEIGHT_LEVELS - 1;
    if (level < 0) level = 0;
    return level;
}

export function isCliff(worldX, worldY) {
    const currentLevel = getHeightLevel(worldX, worldY);
    const adjacentOffsets = [
        { dx: 1, dy: 0 }, // w
        { dx: -1, dy: 0 }, // e
        { dx: 0, dy: 1 }, // n
        { dx: 0, dy: -1 }, // s
        { dx: -1, dy: -1 }, // nw
        { dx: -1, dy: 1 }, // sw
        { dx: 1, dy: -1 }, // ne
        { dx: 1, dy: 1 }, // se
    ];
    for (const offset of adjacentOffsets) {
        const neighborLevel = getHeightLevel(worldX + offset.dx, worldY + offset.dy);
        if (neighborLevel - currentLevel >= 1) {
            return true;
        }
    }
    return false;
}

function valueNoise2D(wx, wy, scale) {
    const sx = wx / scale;
    const sy = wy / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const tx = smoothstep(sx - x0);
    const ty = smoothstep(sy - y0);

    const n00 = hash2D(x0, y0);
    const n10 = hash2D(x1, y0);
    const n01 = hash2D(x0, y1);
    const n11 = hash2D(x1, y1);

    const nx0 = lerp(n00, n10, tx);
    const nx1 = lerp(n01, n11, tx);
    return lerp(nx0, nx1, ty);
}

function hash2D(x, y) {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(HEIGHT_SEED, 1442695041);
    n = (n ^ (n >> 13)) | 0;
    n = Math.imul(n, 1274126177);
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}
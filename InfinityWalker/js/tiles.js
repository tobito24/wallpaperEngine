import {
    TILE_SIZE,
    TILESET,
    DIRECTION,
    LAYER,
    CLIFF_TYPES,
    RARITY
} from './config.js';
// TODO: check unique Tile names across all layers
const tilesetImage = new Image();
tilesetImage.src = TILESET.sheet;

class Tile {
    constructor(name, sprites, weight, layer, walkable = false) {
        this.name = name;
        this.sprites = sprites; // array of { x: int, y: int, weight: int }
        this.weight = weight;
        this.layer = layer;
        this.walkable = walkable;

        this.rules = [];
        this.edgeMasks = [0n, 0n, 0n, 0n]; // BigInt[4] like [0b1010n, 0b1111000n, 0b101n, 0b1n] (OR of all edge masks in rules)

        this.allowedBases = new Set();
        this.allowedOverlays = new Set();

        // TODO: biomes
        this.biomes = [];
    }

    addRule(rule) {
        if (!(rule instanceof Rule)) return;
        this.rules.push(rule);
    }

    addAllowedBases(bases) {
        bases.forEach(base => {
            if (!(base instanceof Tile)) return;
            this.allowedBases.add(base.name);
        });
    }

    addAllowedOverlays(overlays) {
        overlays.forEach(overlay => {
            if (!(overlay instanceof Tile)) return;
            this.allowedOverlays.add(overlay.name);
        });
    }

    isUndergroundAllowed(tileBase, tileOverlay) {
        switch (this.layer) {
            case LAYER.BASE:
                return true;
            case LAYER.OVERLAY:
                return tileBase instanceof Tile
                    && this.allowedBases.has(tileBase.name);
            case LAYER.DECO:
                return tileBase instanceof Tile
                    && tileOverlay instanceof Tile
                    && this.allowedBases.has(tileBase.name)
                    && this.allowedOverlays.has(tileOverlay.name);
            default:
                return false;
        }
    }

    getSpriteIndex() {
        if (!Array.isArray(this.sprites)) return -1;

        const totalWeight = this.sprites.reduce((sum, sprite) => sum + sprite.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        for (let i = 0; i < this.sprites.length; i++) {
            randomWeight -= this.sprites[i].weight;
            if (randomWeight <= 0) {
                return i;
            }
        }
        return 0;
    }

    draw(context, dx, dy, size = TILE_SIZE, spriteIdex = 0) {
        const { x, y } = this.sprites[spriteIdex];
        const sx = x * TILESET.tileSize;
        const sy = y * TILESET.tileSize;
        const sw = TILESET.tileSize;
        const sh = TILESET.tileSize;
        context.drawImage(tilesetImage, sx, sy, sw, sh, dx, dy, size, size);
    }
}

class Rule {
    constructor(north, east, south, west, base = null) {
        this.north = north; //String edge condition
        this.east = east;
        this.south = south;
        this.west = west;

        this.edgeIds = null; // int[4] like [3, 5, 2, 0]
        this.edgeMasks = null; // BigInt[4] like [0b1000n, 0b100000n, 0b100n, 0b1n] (just 1 << edgeId)
    }

    getEdgeId(direction) {
        if (!this.edgeIds) return -1;
        if (!direction in DIRECTION) return -1;
        return this.edgeIds[direction];
    }

    getEdgeMask(direction) {
        if (!this.edgeMasks) return 0n;
        if (!direction in DIRECTION) return 0n;
        return this.edgeMasks[direction];
    }
}

export let transparentMasks = [1n, 1n, 1n, 1n];
export let allAllowedEdgeMasks = [0n, 0n, 0n, 0n];

function buildEdgeRegistryAndMasks(tiles) {
    const stringToEdgeIdMap = new Map();

    function getEdgeId(edgeStr) {
        let id = stringToEdgeIdMap.get(edgeStr);
        if (id === undefined) {
            id = stringToEdgeIdMap.size;
            stringToEdgeIdMap.set(edgeStr, id);
        }
        return id;
    }

    function getEdgeMaskById(id) {
        return 1n << BigInt(id);
    }

    tiles.forEach(tile => {
        tile.edgeMasks = [0n, 0n, 0n, 0n];
        const rules = tile.rules;
        rules.forEach(rule => {
            const ids = [
                getEdgeId(rule.north),
                getEdgeId(rule.east),
                getEdgeId(rule.south),
                getEdgeId(rule.west)
            ];
            rule.edgeIds = ids;
            rule.edgeMasks = [
                getEdgeMaskById(ids[DIRECTION.NORTH]),
                getEdgeMaskById(ids[DIRECTION.EAST]),
                getEdgeMaskById(ids[DIRECTION.SOUTH]),
                getEdgeMaskById(ids[DIRECTION.WEST])
            ];
            tile.edgeMasks[DIRECTION.NORTH] |= rule.edgeMasks[DIRECTION.NORTH];
            tile.edgeMasks[DIRECTION.EAST] |= rule.edgeMasks[DIRECTION.EAST];
            tile.edgeMasks[DIRECTION.SOUTH] |= rule.edgeMasks[DIRECTION.SOUTH];
            tile.edgeMasks[DIRECTION.WEST] |= rule.edgeMasks[DIRECTION.WEST];
        });
    });

    // Build transparent masks and all allowed edge masks
    const transparentId = getEdgeMaskById(getEdgeId(TRANSPARENT));
    transparentMasks = [transparentId, transparentId, transparentId, transparentId];

    allAllowedEdgeMasks = [0n, 0n, 0n, 0n];
    tiles.forEach(tile => {
        allAllowedEdgeMasks[DIRECTION.NORTH] |= tile.edgeMasks[DIRECTION.NORTH];
        allAllowedEdgeMasks[DIRECTION.EAST] |= tile.edgeMasks[DIRECTION.EAST];
        allAllowedEdgeMasks[DIRECTION.SOUTH] |= tile.edgeMasks[DIRECTION.SOUTH];
        allAllowedEdgeMasks[DIRECTION.WEST] |= tile.edgeMasks[DIRECTION.WEST];
    });
}

const TRANSPARENT = 'TRANSPARENT';
const fullTransparentRule = new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT);
const IS_WALKABLE = true;

//Frequencies multiplier
let DECO_FREQ_MULTI = 1;
let BRIDGE_FREQ_MULTI = 1;
let STONE_FREQ_MULTI = 1;
let TREE_FREQ_MULTI = 1;
let WATER_FREQ_MULTI = 1;
let BASE_FREQ_MULTI = 1;
let BASE_T_FREQ_MULTI = 1;

//function to apply rules for classic X-X tiles
//transitionTiles is order sensitive [n, e, s, w, nw, ne, se, sw, c_nw, c_ne, c_se, c_sw, d0, d1]
function addTransitionRules(scourceName, destinationName, transitionTiles) {
    const trans0 = scourceName;
    const trans1 = destinationName;
    const north = transitionTiles[0].name;
    const east = transitionTiles[1].name;
    const south = transitionTiles[2].name;
    const west = transitionTiles[3].name;

    transitionTiles[0].addRule(new Rule(trans0, north, trans1, north));//n
    transitionTiles[1].addRule(new Rule(east, trans0, east, trans1));//e
    transitionTiles[2].addRule(new Rule(trans1, south, trans0, south));//s
    transitionTiles[3].addRule(new Rule(west, trans1, west, trans0));//w

    transitionTiles[4].addRule(new Rule(trans0, north, west, trans0));//nw
    transitionTiles[5].addRule(new Rule(trans0, trans0, east, north));//ne
    transitionTiles[6].addRule(new Rule(east, trans0, trans0, south));//se
    transitionTiles[7].addRule(new Rule(west, south, trans0, trans0));//sw

    if (transitionTiles[8] != undefined) {
        transitionTiles[8].addRule(new Rule(west, trans1, trans1, north));//c_nw
        transitionTiles[9].addRule(new Rule(east, north, trans1, trans1));//c_ne
        transitionTiles[10].addRule(new Rule(trans1, south, east, trans1));//c_se
        transitionTiles[11].addRule(new Rule(trans1, trans1, west, south));//c_sw
    }

    if (transitionTiles[12] != undefined) {
        transitionTiles[12].addRule(new Rule(east, north, west, south));//d0
        transitionTiles[13].addRule(new Rule(west, south, east, north));//d1
    }
}


export let allTiles = [];

export let baseTiles = [];
export let overlayTiles = [];
export let decoTiles = [];

let cliffTileGroups = [];
export function getCliffOverlayTile(cliffType, heightLevel) {
    if (cliffType === null || cliffType === undefined || cliffTileGroups.length === 0) return null;
    const groupCount = cliffTileGroups.length;
    const group = cliffTileGroups[heightLevel % groupCount];
    return group ? group[cliffType] || null : null;
}

makeAllTiles();

function makeAllTiles() {

    allTiles = [];
    baseTiles = [];
    let transitionTiles = [];
    overlayTiles = [];
    decoTiles = [];
    cliffTileGroups = [];

    // # Full transparent tiles (for overlays and decos)
    const transparentOverlay = new Tile("transparentOverlay", [{ x: 1, y: 0, weight: 1 }], RARITY.RARE_11 * BASE_FREQ_MULTI, LAYER.OVERLAY, IS_WALKABLE);
    const transparentDeco = new Tile("transparentDeco", [{ x: 1, y: 0, weight: 1 }], RARITY.RARE_10 * BASE_FREQ_MULTI, LAYER.DECO, IS_WALKABLE);
    transparentOverlay.addRule(fullTransparentRule);
    transparentDeco.addRule(fullTransparentRule);
    allTiles.push(transparentDeco, transparentOverlay);
    overlayTiles.push(transparentOverlay);
    decoTiles.push(transparentDeco);

    // # Simple base tiles
    const grass = new Tile("grass", [{ x: 0, y: 5, weight: 1 }], RARITY.RARE_11 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirt = new Tile("dirt", [{ x: 1, y: 7, weight: 1 }], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDry = new Tile("grassDry", [{ x: 1, y: 13, weight: 1 }], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassLight = new Tile("grassLight", [
        { x: 0, y: 11, weight: 2 },
        { x: 1, y: 11, weight: 1 },
    ], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDark = new Tile("grassDark", [
        { x: 2, y: 17, weight: 2 },
        { x: 0, y: 17, weight: 1 },
    ], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mud = new Tile("mud", [
        { x: 1, y: 19, weight: 4 },
        { x: 1, y: 17, weight: 1 },
    ], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const beach = new Tile("beach", [{ x: 5, y: 29, weight: 1 }], RARITY.RARE_9 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWater = new Tile("beachWater", [{ x: 4, y: 31, weight: 1 }], RARITY.RARE_8 * BASE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const stone0 = new Tile("stone0", [{ x: 4, y: 9, weight: 1 }], RARITY.RARE_5 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone1 = new Tile("stone1", [{ x: 4, y: 15, weight: 1 }], RARITY.RARE_5 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone2 = new Tile("stone2", [{ x: 4, y: 21, weight: 1 }], RARITY.RARE_5 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const simpleTiles = [grass, dirt, grassLight, grassDry, grassDark, mud, beach, beachWater, stone0, stone1, stone2];
    simpleTiles.forEach(tile => {
        tile.addRule(new Rule(tile.name, tile.name, tile.name, tile.name));
    });
    baseTiles.push(...simpleTiles);

    // # Base transition tiles
    // ## grass to dirth
    const dirtN = new Tile("dirtN", [{ x: 1, y: 6, weight: 1 }], RARITY.RARE_8 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtE = new Tile("dirtE", [{ x: 2, y: 7, weight: 1 }], RARITY.RARE_8 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtS = new Tile("dirtS", [{ x: 1, y: 8, weight: 1 }], RARITY.RARE_8 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtW = new Tile("dirtW", [{ x: 0, y: 7, weight: 1 }], RARITY.RARE_8 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtNW = new Tile("dirtNW", [{ x: 0, y: 6, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtNE = new Tile("dirtNE", [{ x: 2, y: 6, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtSE = new Tile("dirtSE", [{ x: 2, y: 8, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtSW = new Tile("dirtSW", [{ x: 0, y: 8, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveNW = new Tile("dirtCurveNW", [{ x: 0, y: 9, weight: 1 }], RARITY.RARE_1 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveNE = new Tile("dirtCurveNE", [{ x: 1, y: 9, weight: 1 }], RARITY.RARE_1 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveSE = new Tile("dirtCurveSE", [{ x: 1, y: 10, weight: 1 }], RARITY.RARE_1 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveSW = new Tile("dirtCurveSW", [{ x: 0, y: 10, weight: 1 }], RARITY.RARE_1 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveD0 = new Tile("dirtCurveD0", [{ x: 2, y: 9, weight: 1 }], RARITY.RARE_0 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const dirtCurveD1 = new Tile("dirtCurveD1", [{ x: 2, y: 10, weight: 1 }], RARITY.RARE_0 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassDirtTrans = [dirtN, dirtE, dirtS, dirtW, dirtNW, dirtNE, dirtSE, dirtSW, dirtCurveNW, dirtCurveNE, dirtCurveSE, dirtCurveSW, dirtCurveD0, dirtCurveD1];
    addTransitionRules(grass.name, dirt.name, grassDirtTrans);
    baseTiles.push(...grassDirtTrans);
    transitionTiles.push(...grassDirtTrans);

    // ## grassLight to grassDry
    const grassDN = new Tile("grassDN", [{ x: 1, y: 12, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDE = new Tile("grassDE", [{ x: 2, y: 13, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDS = new Tile("grassDS", [{ x: 1, y: 14, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDW = new Tile("grassDW", [{ x: 0, y: 13, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDNW = new Tile("grassDNW", [{ x: 0, y: 12, weight: 1 }], RARITY.RARE_5 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDNE = new Tile("grassDNE", [{ x: 2, y: 12, weight: 1 }], RARITY.RARE_5 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDSE = new Tile("grassDSE", [{ x: 2, y: 14, weight: 1 }], RARITY.RARE_5 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDSW = new Tile("grassDSW", [{ x: 0, y: 14, weight: 1 }], RARITY.RARE_5 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveNW = new Tile("grassDCurveNW", [{ x: 0, y: 15, weight: 1 }], RARITY.RARE_0 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveNE = new Tile("grassDCurveNE", [{ x: 1, y: 15, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveSE = new Tile("grassDCurveSE", [{ x: 1, y: 16, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveSW = new Tile("grassDCurveSW", [{ x: 0, y: 16, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveD0 = new Tile("grassDCurveD0", [{ x: 2, y: 15, weight: 1 }], RARITY.RARE_0 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grassDCurveD1 = new Tile("grassDCurveD1", [{ x: 2, y: 16, weight: 1 }], RARITY.RARE_0 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassLgrassDryTrans = [grassDN, grassDE, grassDS, grassDW, grassDNW, grassDNE, grassDSE, grassDSW, grassDCurveNW, grassDCurveNE, grassDCurveSE, grassDCurveSW, grassDCurveD0, grassDCurveD1];
    addTransitionRules(grassLight.name, grassDry.name, grassLgrassDryTrans);
    baseTiles.push(...grassLgrassDryTrans);
    transitionTiles.push(...grassLgrassDryTrans);

    // ## grassDark to mud
    const mudN = new Tile("mudN", [{ x: 1, y: 18, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudE = new Tile("mudE", [{ x: 2, y: 19, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudS = new Tile("mudS", [{ x: 1, y: 20, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudW = new Tile("mudW", [{ x: 0, y: 19, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudNW = new Tile("mudNW", [{ x: 0, y: 18, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudNE = new Tile("mudNE", [{ x: 2, y: 18, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudSE = new Tile("mudSE", [{ x: 2, y: 20, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudSW = new Tile("mudSW", [{ x: 0, y: 20, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveNW = new Tile("mudCurveNW", [{ x: 0, y: 21, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveNE = new Tile("mudCurveNE", [{ x: 1, y: 21, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveSE = new Tile("mudCurveSE", [{ x: 1, y: 22, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveSW = new Tile("mudCurveSW", [{ x: 0, y: 22, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveD0 = new Tile("mudCurveD0", [{ x: 2, y: 21, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const mudCurveD1 = new Tile("mudCurveD1", [{ x: 2, y: 22, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassDaMudTrans = [mudN, mudE, mudS, mudW, mudNW, mudNE, mudSE, mudSW, mudCurveNW, mudCurveNE, mudCurveSE, mudCurveSW, mudCurveD0, mudCurveD1];
    addTransitionRules(grassDark.name, mud.name, grassDaMudTrans);
    baseTiles.push(...grassDaMudTrans);
    transitionTiles.push(...grassDaMudTrans);

    // ## grassDark to grass
    const grass0N = new Tile("grass0N", [{ x: 1, y: 30, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0E = new Tile("grass0E", [{ x: 2, y: 31, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0S = new Tile("grass0S", [{ x: 1, y: 32, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0W = new Tile("grass0W", [{ x: 0, y: 31, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0NW = new Tile("grass0NW", [{ x: 0, y: 30, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0NE = new Tile("grass0NE", [{ x: 2, y: 30, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0SE = new Tile("grass0SE", [{ x: 2, y: 32, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0SW = new Tile("grass0SW", [{ x: 0, y: 32, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveNW = new Tile("grass0CurveNW", [{ x: 0, y: 33, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveNE = new Tile("grass0CurveNE", [{ x: 1, y: 33, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveSE = new Tile("grass0CurveSE", [{ x: 1, y: 34, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveSW = new Tile("grass0CurveSW", [{ x: 0, y: 34, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveD0 = new Tile("grass0CurveD0", [{ x: 2, y: 33, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const grass0CurveD1 = new Tile("grass0CurveD1", [{ x: 2, y: 34, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassDarkGrassTrans = [grass0N, grass0E, grass0S, grass0W, grass0NW, grass0NE, grass0SE, grass0SW, grass0CurveNW, grass0CurveNE, grass0CurveSE, grass0CurveSW, grass0CurveD0, grass0CurveD1];
    addTransitionRules(grassDark.name, grass.name, grassDarkGrassTrans);
    baseTiles.push(...grassDarkGrassTrans);
    transitionTiles.push(...grassDarkGrassTrans);

    // ## beach to beachWater
    const beachWaterN = new Tile("beachWaterN", [{ x: 4, y: 30, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterE = new Tile("beachWaterE", [{ x: 5, y: 31, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterS = new Tile("beachWaterS", [{ x: 4, y: 32, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterW = new Tile("beachWaterW", [{ x: 3, y: 31, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterNW = new Tile("beachWaterNW", [{ x: 3, y: 30, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterNE = new Tile("beachWaterNE", [{ x: 5, y: 30, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterSE = new Tile("beachWaterSE", [{ x: 5, y: 32, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterSW = new Tile("beachWaterSW", [{ x: 3, y: 32, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveNW = new Tile("beachWaterCurveNW", [{ x: 3, y: 33, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveNE = new Tile("beachWaterCurveNE", [{ x: 4, y: 33, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveSE = new Tile("beachWaterCurveSE", [{ x: 4, y: 34, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveSW = new Tile("beachWaterCurveSW", [{ x: 3, y: 34, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveD0 = new Tile("beachWaterCurveD0", [{ x: 5, y: 33, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachWaterCurveD1 = new Tile("beachWaterCurveD1", [{ x: 5, y: 34, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const beachWaterTrans = [beachWaterN, beachWaterE, beachWaterS, beachWaterW, beachWaterNW, beachWaterNE, beachWaterSE, beachWaterSW, beachWaterCurveNW, beachWaterCurveNE, beachWaterCurveSE, beachWaterCurveSW, beachWaterCurveD0, beachWaterCurveD1];
    addTransitionRules(beach.name, beachWater.name, beachWaterTrans);
    baseTiles.push(...beachWaterTrans);
    transitionTiles.push(...beachWaterTrans);

    // ## grass to beach
    const beachN = new Tile("beachN", [{ x: 1, y: 42, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachE = new Tile("beachE", [{ x: 2, y: 43, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachS = new Tile("beachS", [{ x: 1, y: 44, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachW = new Tile("beachW", [{ x: 0, y: 43, weight: 1 }], RARITY.RARE_6 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachNW = new Tile("beachNW", [{ x: 0, y: 42, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachNE = new Tile("beachNE", [{ x: 2, y: 42, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachSE = new Tile("beachSE", [{ x: 2, y: 44, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachSW = new Tile("beachSW", [{ x: 0, y: 44, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveNW = new Tile("beachCurveNW", [{ x: 0, y: 45, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveNE = new Tile("beachCurveNE", [{ x: 1, y: 45, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveSE = new Tile("beachCurveSE", [{ x: 1, y: 46, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveSW = new Tile("beachCurveSW", [{ x: 0, y: 46, weight: 1 }], RARITY.RARE_2 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveD0 = new Tile("beachCurveD0", [{ x: 2, y: 45, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const beachCurveD1 = new Tile("beachCurveD1", [{ x: 2, y: 46, weight: 1 }], RARITY.RARE_3 * BASE_T_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);

    const grassBeachTrans = [beachN, beachE, beachS, beachW, beachNW, beachNE, beachSE, beachSW, beachCurveNW, beachCurveNE, beachCurveSE, beachCurveSW, beachCurveD0, beachCurveD1];
    addTransitionRules(grass.name, beach.name, grassBeachTrans);
    baseTiles.push(...grassBeachTrans);
    transitionTiles.push(...grassBeachTrans);

    // ## stone0 to dirt
    const stone0DirtN = new Tile("stone0DirtN", [{ x: 4, y: 42, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtE = new Tile("stone0DirtE", [{ x: 5, y: 43, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtS = new Tile("stone0DirtS", [{ x: 4, y: 44, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtW = new Tile("stone0DirtW", [{ x: 3, y: 43, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtNW = new Tile("stone0DirtNW", [{ x: 3, y: 42, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtNE = new Tile("stone0DirtNE", [{ x: 5, y: 42, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtSE = new Tile("stone0DirtSE", [{ x: 5, y: 44, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtSW = new Tile("stone0DirtSW", [{ x: 3, y: 44, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveNW = new Tile("stone0DirtCurveNW", [{ x: 3, y: 45, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveNE = new Tile("stone0DirtCurveNE", [{ x: 4, y: 45, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveSE = new Tile("stone0DirtCurveSE", [{ x: 4, y: 46, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveSW = new Tile("stone0DirtCurveSW", [{ x: 3, y: 46, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveD0 = new Tile("stone0DirtCurveD0", [{ x: 5, y: 45, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtCurveD1 = new Tile("stone0DirtCurveD1", [{ x: 5, y: 46, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0DirtTrans = [stone0DirtN, stone0DirtE, stone0DirtS, stone0DirtW, stone0DirtNW, stone0DirtNE, stone0DirtSE, stone0DirtSW, stone0DirtCurveNW, stone0DirtCurveNE, stone0DirtCurveSE, stone0DirtCurveSW, stone0DirtCurveD0, stone0DirtCurveD1];
    addTransitionRules(stone0.name, dirt.name, stone0DirtTrans);
    baseTiles.push(...stone0DirtTrans);
    transitionTiles.push(...stone0DirtTrans);

    // ## stone0 to stone1
    const stone0Stone1N = new Tile("stone0Stone1N", [{ x: 1, y: 47, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1E = new Tile("stone0Stone1E", [{ x: 2, y: 48, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1S = new Tile("stone0Stone1S", [{ x: 1, y: 49, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1W = new Tile("stone0Stone1W", [{ x: 0, y: 48, weight: 1 }], RARITY.RARE_4 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1NW = new Tile("stone0Stone1NW", [{ x: 0, y: 47, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1NE = new Tile("stone0Stone1NE", [{ x: 2, y: 47, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1SE = new Tile("stone0Stone1SE", [{ x: 2, y: 49, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1SW = new Tile("stone0Stone1SW", [{ x: 0, y: 49, weight: 1 }], RARITY.RARE_2 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveNW = new Tile("stone0Stone1CurveNW", [{ x: 0, y: 50, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveNE = new Tile("stone0Stone1CurveNE", [{ x: 1, y: 50, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveSE = new Tile("stone0Stone1CurveSE", [{ x: 1, y: 51, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveSW = new Tile("stone0Stone1CurveSW", [{ x: 0, y: 51, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveD0 = new Tile("stone0Stone1CurveD0", [{ x: 2, y: 50, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1CurveD1 = new Tile("stone0Stone1CurveD1", [{ x: 2, y: 51, weight: 1 }], RARITY.RARE_0 * STONE_FREQ_MULTI, LAYER.BASE, IS_WALKABLE);
    const stone0Stone1Trans = [stone0Stone1N, stone0Stone1E, stone0Stone1S, stone0Stone1W, stone0Stone1NW, stone0Stone1NE, stone0Stone1SE, stone0Stone1SW, stone0Stone1CurveNW, stone0Stone1CurveNE, stone0Stone1CurveSE, stone0Stone1CurveSW, stone0Stone1CurveD0, stone0Stone1CurveD1];
    addTransitionRules(stone1.name, stone0.name, stone0Stone1Trans);
    baseTiles.push(...stone0Stone1Trans);
    transitionTiles.push(...stone0Stone1Trans);

    allTiles.push(...baseTiles);

    // # Cliffs (Stone transition tiles) are used as overlays and are deterministic (so no rules needed)
    // ## stone0
    const stone0N = new Tile("stone0N", [{ x: 4, y: 8, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0E = new Tile("stone0E", [{ x: 5, y: 9, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0S = new Tile("stone0S", [{ x: 4, y: 10, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0W = new Tile("stone0W", [{ x: 3, y: 9, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0NW = new Tile("stone0NW", [{ x: 3, y: 8, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0NE = new Tile("stone0NE", [{ x: 5, y: 8, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0SE = new Tile("stone0SE", [{ x: 5, y: 10, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0SW = new Tile("stone0SW", [{ x: 3, y: 10, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0CurveNW = new Tile("stone0CurveNW", [{ x: 7, y: 9, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0CurveNE = new Tile("stone0CurveNE", [{ x: 6, y: 9, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0CurveSE = new Tile("stone0CurveSE", [{ x: 6, y: 8, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0CurveSW = new Tile("stone0CurveSW", [{ x: 7, y: 8, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone0_all = [stone0N, stone0E, stone0S, stone0W, stone0NW, stone0NE, stone0SE, stone0SW, stone0CurveNW, stone0CurveNE, stone0CurveSE, stone0CurveSW];

    // ## stone1
    const stone1N = new Tile("stone1N", [{ x: 4, y: 14, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1E = new Tile("stone1E", [{ x: 5, y: 15, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1S = new Tile("stone1S", [{ x: 4, y: 16, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1W = new Tile("stone1W", [{ x: 3, y: 15, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1NW = new Tile("stone1NW", [{ x: 3, y: 14, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1NE = new Tile("stone1NE", [{ x: 5, y: 14, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1SE = new Tile("stone1SE", [{ x: 5, y: 16, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1SW = new Tile("stone1SW", [{ x: 3, y: 16, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1CurveNW = new Tile("stone1CurveNW", [{ x: 6, y: 14, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1CurveNE = new Tile("stone1CurveNE", [{ x: 7, y: 14, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1CurveSE = new Tile("stone1CurveSE", [{ x: 7, y: 15, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1CurveSW = new Tile("stone1CurveSW", [{ x: 6, y: 15, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone1_all = [stone1N, stone1E, stone1S, stone1W, stone1NW, stone1NE, stone1SE, stone1SW, stone1CurveNW, stone1CurveNE, stone1CurveSE, stone1CurveSW];

    // ## stone2
    const stone2N = new Tile("stone2N", [{ x: 4, y: 20, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2E = new Tile("stone2E", [{ x: 5, y: 21, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2S = new Tile("stone2S", [{ x: 4, y: 22, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2W = new Tile("stone2W", [{ x: 3, y: 21, weight: 1 }], RARITY.RARE_6 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2NW = new Tile("stone2NW", [{ x: 3, y: 20, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2NE = new Tile("stone2NE", [{ x: 5, y: 20, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2SE = new Tile("stone2SE", [{ x: 5, y: 22, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2SW = new Tile("stone2SW", [{ x: 3, y: 22, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2CurveNW = new Tile("stone2CurveNW", [{ x: 7, y: 21, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2CurveNE = new Tile("stone2CurveNE", [{ x: 6, y: 21, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2CurveSE = new Tile("stone2CurveSE", [{ x: 6, y: 20, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2CurveSW = new Tile("stone2CurveSW", [{ x: 7, y: 20, weight: 1 }], RARITY.RARE_3 * STONE_FREQ_MULTI, LAYER.OVERLAY);
    const stone2_all = [stone2N, stone2E, stone2S, stone2W, stone2NW, stone2NE, stone2SE, stone2SW, stone2CurveNW, stone2CurveNE, stone2CurveSE, stone2CurveSW];

    const cliffMap0 = {
        [CLIFF_TYPES.NORTH_EDGE]: stone0N,
        [CLIFF_TYPES.EAST_EDGE]: stone0E,
        [CLIFF_TYPES.SOUTH_EDGE]: stone0S,
        [CLIFF_TYPES.WEST_EDGE]: stone0W,
        [CLIFF_TYPES.NORTH_WEST_OUTER_CORNER]: stone0NW,
        [CLIFF_TYPES.NORTH_EAST_OUTER_CORNER]: stone0NE,
        [CLIFF_TYPES.SOUTH_EAST_OUTER_CORNER]: stone0SE,
        [CLIFF_TYPES.SOUTH_WEST_OUTER_CORNER]: stone0SW,
        [CLIFF_TYPES.NORTH_WEST_INNER_CORNER]: stone0CurveNW,
        [CLIFF_TYPES.NORTH_EAST_INNER_CORNER]: stone0CurveNE,
        [CLIFF_TYPES.SOUTH_EAST_INNER_CORNER]: stone0CurveSE,
        [CLIFF_TYPES.SOUTH_WEST_INNER_CORNER]: stone0CurveSW
    };
    const cliffMap1 = {
        [CLIFF_TYPES.NORTH_EDGE]: stone1N,
        [CLIFF_TYPES.EAST_EDGE]: stone1E,
        [CLIFF_TYPES.SOUTH_EDGE]: stone1S,
        [CLIFF_TYPES.WEST_EDGE]: stone1W,
        [CLIFF_TYPES.NORTH_WEST_OUTER_CORNER]: stone1NW,
        [CLIFF_TYPES.NORTH_EAST_OUTER_CORNER]: stone1NE,
        [CLIFF_TYPES.SOUTH_EAST_OUTER_CORNER]: stone1SE,
        [CLIFF_TYPES.SOUTH_WEST_OUTER_CORNER]: stone1SW,
        [CLIFF_TYPES.NORTH_WEST_INNER_CORNER]: stone1CurveNW,
        [CLIFF_TYPES.NORTH_EAST_INNER_CORNER]: stone1CurveNE,
        [CLIFF_TYPES.SOUTH_EAST_INNER_CORNER]: stone1CurveSE,
        [CLIFF_TYPES.SOUTH_WEST_INNER_CORNER]: stone1CurveSW
    };
    const cliffMap2 = {
        [CLIFF_TYPES.NORTH_EDGE]: stone2N,
        [CLIFF_TYPES.EAST_EDGE]: stone2E,
        [CLIFF_TYPES.SOUTH_EDGE]: stone2S,
        [CLIFF_TYPES.WEST_EDGE]: stone2W,
        [CLIFF_TYPES.NORTH_WEST_OUTER_CORNER]: stone2NW,
        [CLIFF_TYPES.NORTH_EAST_OUTER_CORNER]: stone2NE,
        [CLIFF_TYPES.SOUTH_EAST_OUTER_CORNER]: stone2SE,
        [CLIFF_TYPES.SOUTH_WEST_OUTER_CORNER]: stone2SW,
        [CLIFF_TYPES.NORTH_WEST_INNER_CORNER]: stone2CurveNW,
        [CLIFF_TYPES.NORTH_EAST_INNER_CORNER]: stone2CurveNE,
        [CLIFF_TYPES.SOUTH_EAST_INNER_CORNER]: stone2CurveSE,
        [CLIFF_TYPES.SOUTH_WEST_INNER_CORNER]: stone2CurveSW
    };
    cliffTileGroups = [cliffMap0, cliffMap1, cliffMap2];
    addTransitionRules(TRANSPARENT, stone0.name, stone0_all);
    addTransitionRules(TRANSPARENT, stone1.name, stone1_all);
    addTransitionRules(TRANSPARENT, stone2.name, stone2_all);
    allTiles.push(...stone0_all, ...stone1_all, ...stone2_all);

    // # Deco tiles
    // ## deco 1x1 full transparent
    const deco1x1_base0 = new Tile("deco1x1_base0", [
        { x: 0, y: 2, weight: 1 }, // flower0
        { x: 1, y: 2, weight: 1 }, // flower1
        { x: 2, y: 2, weight: 1 }, // flower2
        { x: 3, y: 2, weight: 1 }, // grassTuft0
        { x: 4, y: 2, weight: 1 }, // grassTuft1
        { x: 5, y: 2, weight: 1 }, // flower3
        { x: 2, y: 4, weight: 1 }, // mush
        { x: 1, y: 4, weight: 1 } // moss
    ], RARITY.RARE_7 * DECO_FREQ_MULTI, LAYER.DECO, IS_WALKABLE);
    const deco1x1_base1 = new Tile("deco1x1_base1", [
        { x: 6, y: 2, weight: 1 }, // treeStump
        { x: 5, y: 3, weight: 1 }, // rock0
        { x: 5, y: 4, weight: 1 }, // rock1
        { x: 0, y: 3, weight: 1 }, // rock2
    ], RARITY.RARE_7 * DECO_FREQ_MULTI, LAYER.DECO);
    deco1x1_base0.addAllowedBases([grass, dirt, grassLight, grassDry, grassDark, mud]);
    deco1x1_base0.addAllowedOverlays([transparentOverlay]);
    deco1x1_base0.addRule(fullTransparentRule);
    deco1x1_base1.addAllowedBases([grass, dirt, grassLight, grassDry, grassDark, mud]);
    deco1x1_base1.addAllowedOverlays([transparentOverlay]);
    deco1x1_base1.addRule(fullTransparentRule);

    const deco1x1_stone = new Tile("deco1x1_stone", [
        { x: 5, y: 3, weight: 1 }, // rock0
        { x: 5, y: 4, weight: 1 }, // rock1
        { x: 0, y: 3, weight: 1 }  // rock2
    ], RARITY.RARE_7 * DECO_FREQ_MULTI, LAYER.DECO);
    deco1x1_stone.addAllowedBases([stone0, stone1, stone2]);
    deco1x1_stone.addAllowedOverlays([transparentOverlay]);
    deco1x1_stone.addRule(fullTransparentRule);

    const deco1x1_beach = new Tile("deco1x1_beach", [
        { x: 0, y: 29, weight: 1 }, // decoBeach0
        { x: 1, y: 29, weight: 1 }, // decoBeach1
        { x: 2, y: 29, weight: 1 }, // decoBeach2
        { x: 3, y: 29, weight: 1 }, // decoBeach3
        { x: 4, y: 29, weight: 1 }  // decoBeach4
    ], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO, IS_WALKABLE);
    deco1x1_beach.addAllowedBases([beach]);
    deco1x1_beach.addAllowedOverlays([transparentOverlay]);
    deco1x1_beach.addRule(fullTransparentRule);

    decoTiles.push(deco1x1_base0, deco1x1_base1, deco1x1_stone, deco1x1_beach);
    allTiles.push(deco1x1_base0, deco1x1_base1, deco1x1_stone, deco1x1_beach);

    // ## deco 1x2
    const treeTrunk_0 = new Tile("treeTrunk_0", [{ x: 5, y: 1, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const treeTrunk_1 = new Tile("treeTrunk_1", [{ x: 6, y: 1, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const treeTrunkMossy_0 = new Tile("treeTrunkMossy_0", [{ x: 1, y: 1, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const treeTrunkMossy_1 = new Tile("treeTrunkMossy_1", [{ x: 2, y: 1, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const rock4_0 = new Tile("rock4_0", [{ x: 1, y: 3, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI, LAYER.DECO);
    const rock4_1 = new Tile("rock4_1", [{ x: 2, y: 3, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI, LAYER.DECO);

    [treeTrunkMossy_0, treeTrunkMossy_1, treeTrunk_0, treeTrunk_1].forEach(decoTile => {
        decoTile.addAllowedBases([grass, dirt, grassLight, grassDry, grassDark, mud]);
        decoTile.addAllowedBases(transitionTiles);
        decoTile.addAllowedOverlays([transparentOverlay]);
    });

    [rock4_0, rock4_1].forEach(decoTile => {
        decoTile.addAllowedBases([stone0, stone1, stone2, ...stone0DirtTrans, ...stone0Stone1Trans]);
        decoTile.addAllowedOverlays([transparentOverlay]);
    });

    treeTrunk_0.addRule(new Rule(TRANSPARENT, treeTrunk_0.name, TRANSPARENT, TRANSPARENT));
    treeTrunk_1.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, treeTrunk_0.name));
    treeTrunkMossy_0.addRule(new Rule(TRANSPARENT, treeTrunkMossy_0.name, TRANSPARENT, TRANSPARENT));
    treeTrunkMossy_1.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, treeTrunkMossy_0.name));
    rock4_0.addRule(new Rule(TRANSPARENT, rock4_0.name, TRANSPARENT, TRANSPARENT));
    rock4_1.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, rock4_0.name));

    decoTiles.push(treeTrunk_0, treeTrunk_1, treeTrunkMossy_0, treeTrunkMossy_1, rock4_0, rock4_1);
    allTiles.push(treeTrunk_0, treeTrunk_1, treeTrunkMossy_0, treeTrunkMossy_1, rock4_0, rock4_1);

    // ## deco 2x2
    const bigStone0_0 = new Tile("bigStone0_0", [{ x: 3, y: 3, weight: 1 }], RARITY.RARE_1 * DECO_FREQ_MULTI, LAYER.DECO);
    const bigStone0_1 = new Tile("bigStone0_1", [{ x: 4, y: 3, weight: 1 }], RARITY.RARE_1 * DECO_FREQ_MULTI, LAYER.DECO);
    const bigStone0_2 = new Tile("bigStone0_2", [{ x: 3, y: 4, weight: 1 }], RARITY.RARE_1 * DECO_FREQ_MULTI, LAYER.DECO);
    const bigStone0_3 = new Tile("bigStone0_3", [{ x: 4, y: 4, weight: 1 }], RARITY.RARE_1 * DECO_FREQ_MULTI, LAYER.DECO);

    [bigStone0_0, bigStone0_1, bigStone0_2, bigStone0_3].forEach(decoTile => {
        decoTile.addAllowedBases([stone0, stone1, stone2, ...stone0DirtTrans, ...stone0Stone1Trans]);
        decoTile.addAllowedOverlays([transparentOverlay]);
    });

    bigStone0_0.addRule(new Rule(TRANSPARENT, bigStone0_0.name, bigStone0_2.name, TRANSPARENT));
    bigStone0_1.addRule(new Rule(TRANSPARENT, TRANSPARENT, bigStone0_1.name, bigStone0_0.name));
    bigStone0_2.addRule(new Rule(bigStone0_2.name, bigStone0_3.name, TRANSPARENT, TRANSPARENT));
    bigStone0_3.addRule(new Rule(bigStone0_1.name, TRANSPARENT, TRANSPARENT, bigStone0_3.name));

    decoTiles.push(bigStone0_0, bigStone0_1, bigStone0_2, bigStone0_3);
    allTiles.push(bigStone0_0, bigStone0_1, bigStone0_2, bigStone0_3);

    // ## deco 1 x Infinite
    const cliff_0 = new Tile("cliff_0", [{ x: 5, y: 0, weight: 1 }], RARITY.RARE_4 * DECO_FREQ_MULTI, LAYER.DECO);
    const cliff_1 = new Tile("cliff_1", [{ x: 6, y: 0, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const cliff_2 = new Tile("cliff_2", [{ x: 7, y: 0, weight: 1 }], RARITY.RARE_4 * DECO_FREQ_MULTI, LAYER.DECO);

    [cliff_0, cliff_1, cliff_2].forEach(decoTile => {
        decoTile.addAllowedBases([stone0, stone1, stone2, grass, dirt, grassLight, grassDry, grassDark, mud]);
        decoTile.addAllowedOverlays([transparentOverlay]);
    });

    cliff_0.addRule(new Rule(TRANSPARENT, cliff_1.name, TRANSPARENT, TRANSPARENT));
    cliff_1.addRule(new Rule(TRANSPARENT, cliff_1.name, TRANSPARENT, cliff_1.name));
    cliff_2.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, cliff_1.name));

    decoTiles.push(cliff_0, cliff_1, cliff_2);
    allTiles.push(cliff_0, cliff_1, cliff_2);

    // ## deco Infinite x Infinite (tall grasses)
    const tallGrass0 = new Tile("tallGrass0", [{ x: 4, y: 6, weight: 1 }], RARITY.RARE_6 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0N = new Tile("tallGrass0N", [{ x: 4, y: 5, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0E = new Tile("tallGrass0E", [{ x: 5, y: 6, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0S = new Tile("tallGrass0S", [{ x: 4, y: 7, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0W = new Tile("tallGrass0W", [{ x: 3, y: 6, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0NW = new Tile("tallGrass0NW", [{ x: 3, y: 5, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0NE = new Tile("tallGrass0NE", [{ x: 5, y: 5, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0SE = new Tile("tallGrass0SE", [{ x: 5, y: 7, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass0SW = new Tile("tallGrass0SW", [{ x: 3, y: 7, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);

    const tallGrass1 = new Tile("tallGrass1", [{ x: 4, y: 12, weight: 1 }], RARITY.RARE_6 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1N = new Tile("tallGrass1N", [{ x: 4, y: 11, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1E = new Tile("tallGrass1E", [{ x: 5, y: 12, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1S = new Tile("tallGrass1S", [{ x: 4, y: 13, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1W = new Tile("tallGrass1W", [{ x: 3, y: 12, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1NW = new Tile("tallGrass1NW", [{ x: 3, y: 11, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1NE = new Tile("tallGrass1NE", [{ x: 5, y: 11, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1SE = new Tile("tallGrass1SE", [{ x: 5, y: 13, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass1SW = new Tile("tallGrass1SW", [{ x: 3, y: 13, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);

    const tallGrass2 = new Tile("tallGrass2", [{ x: 4, y: 18, weight: 1 }], RARITY.RARE_6 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2N = new Tile("tallGrass2N", [{ x: 4, y: 17, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2E = new Tile("tallGrass2E", [{ x: 5, y: 18, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2S = new Tile("tallGrass2S", [{ x: 4, y: 19, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2W = new Tile("tallGrass2W", [{ x: 3, y: 18, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2NW = new Tile("tallGrass2NW", [{ x: 3, y: 17, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2NE = new Tile("tallGrass2NE", [{ x: 5, y: 17, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2SE = new Tile("tallGrass2SE", [{ x: 5, y: 19, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);
    const tallGrass2SW = new Tile("tallGrass2SW", [{ x: 3, y: 19, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI, LAYER.DECO);

    [tallGrass0, tallGrass1, tallGrass2].forEach(tile => {
        tile.addRule(new Rule(tile.name, tile.name, tile.name, tile.name));
    });

    const tallGrass = [
        tallGrass0, tallGrass1, tallGrass2,
        tallGrass0N, tallGrass0E, tallGrass0S, tallGrass0W, tallGrass0NW, tallGrass0NE, tallGrass0SE, tallGrass0SW,
        tallGrass1N, tallGrass1E, tallGrass1S, tallGrass1W, tallGrass1NW, tallGrass1NE, tallGrass1SE, tallGrass1SW,
        tallGrass2N, tallGrass2E, tallGrass2S, tallGrass2W, tallGrass2NW, tallGrass2NE, tallGrass2SE, tallGrass2SW
    ];

    tallGrass.forEach(decoTile => {
        decoTile.addAllowedBases([grass, dirt, grassLight, grassDry, grassDark, mud]);
        decoTile.addAllowedOverlays([transparentOverlay]);
    });

    addTransitionRules(TRANSPARENT, tallGrass0.name, [tallGrass0N, tallGrass0E, tallGrass0S, tallGrass0W, tallGrass0NW, tallGrass0NE, tallGrass0SE, tallGrass0SW]);
    addTransitionRules(TRANSPARENT, tallGrass1.name, [tallGrass1N, tallGrass1E, tallGrass1S, tallGrass1W, tallGrass1NW, tallGrass1NE, tallGrass1SE, tallGrass1SW]);
    addTransitionRules(TRANSPARENT, tallGrass2.name, [tallGrass2N, tallGrass2E, tallGrass2S, tallGrass2W, tallGrass2NW, tallGrass2NE, tallGrass2SE, tallGrass2SW]);

    decoTiles.push(...tallGrass);
    allTiles.push(...tallGrass);

    // # Water tiles overlay
    const water0 = new Tile("water0", [{ x: 4, y: 27, weight: 1 }], RARITY.RARE_10 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1 = new Tile("water1", [{ x: 1, y: 27, weight: 1 }], RARITY.RARE_9 * WATER_FREQ_MULTI, LAYER.OVERLAY);

    [water0, water1].forEach(tile => {
        tile.addAllowedBases([beach, grass, dirt, grassLight, grassDry, grassDark, mud]);
        tile.addRule(new Rule(tile.name, tile.name, tile.name, tile.name));
    });

    const water0N = new Tile("water0N", [{ x: 4, y: 26, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0E = new Tile("water0E", [{ x: 5, y: 27, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0S = new Tile("water0S", [{ x: 4, y: 28, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0W = new Tile("water0W", [{ x: 3, y: 27, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0NW = new Tile("water0NW", [{ x: 3, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0NE = new Tile("water0NE", [{ x: 5, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0SE = new Tile("water0SE", [{ x: 5, y: 28, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0SW = new Tile("water0SW", [{ x: 3, y: 28, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveNW = new Tile("water0CurveNW", [{ x: 6, y: 28, weight: 1 }], RARITY.RARE_3 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveNE = new Tile("water0CurveNE", [{ x: 7, y: 28, weight: 1 }], RARITY.RARE_3 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveSE = new Tile("water0CurveSE", [{ x: 7, y: 29, weight: 1 }], RARITY.RARE_3 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveSW = new Tile("water0CurveSW", [{ x: 6, y: 29, weight: 1 }], RARITY.RARE_3 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveD0 = new Tile("water0CurveD0", [{ x: 6, y: 24, weight: 1 }], RARITY.RARE_0 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water0CurveD1 = new Tile("water0CurveD1", [{ x: 6, y: 25, weight: 1 }], RARITY.RARE_0 * WATER_FREQ_MULTI, LAYER.OVERLAY);

    const water0_all = [water0N, water0E, water0S, water0W, water0NW, water0NE, water0SE, water0SW, water0CurveNW, water0CurveNE, water0CurveSE, water0CurveSW, water0CurveD0, water0CurveD1];
    addTransitionRules(TRANSPARENT, water0.name, water0_all);
    water0_all.forEach(tile => {
        tile.addAllowedBases([beach, grass, dirt, grassLight, grassDry, grassDark, mud]);
    });

    const water1N = new Tile("water1N", [{ x: 1, y: 26, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1E = new Tile("water1E", [{ x: 2, y: 27, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1S = new Tile("water1S", [{ x: 1, y: 28, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1W = new Tile("water1W", [{ x: 0, y: 27, weight: 1 }], RARITY.RARE_6 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1NW = new Tile("water1NW", [{ x: 0, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1NE = new Tile("water1NE", [{ x: 2, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1SE = new Tile("water1SE", [{ x: 2, y: 28, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1SW = new Tile("water1SW", [{ x: 0, y: 28, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveNW = new Tile("water1CurveNW", [{ x: 6, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveNE = new Tile("water1CurveNE", [{ x: 7, y: 26, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveSE = new Tile("water1CurveSE", [{ x: 7, y: 27, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveSW = new Tile("water1CurveSW", [{ x: 6, y: 27, weight: 1 }], RARITY.RARE_4 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveD0 = new Tile("water1CurveD0", [{ x: 7, y: 24, weight: 1 }], RARITY.RARE_1 * WATER_FREQ_MULTI, LAYER.OVERLAY);
    const water1CurveD1 = new Tile("water1CurveD1", [{ x: 7, y: 25, weight: 1 }], RARITY.RARE_1 * WATER_FREQ_MULTI, LAYER.OVERLAY);

    const water1_all = [water1N, water1E, water1S, water1W, water1NW, water1NE, water1SE, water1SW, water1CurveNW, water1CurveNE, water1CurveSE, water1CurveSW, water1CurveD0, water1CurveD1];
    addTransitionRules(TRANSPARENT, water1.name, water1_all);
    water1_all.forEach(tile => {
        tile.addAllowedBases([beach, grass, dirt, grassLight, grassDry, grassDark, mud]);
    });

    overlayTiles.push(water0, water1, ...water0_all, ...water1_all);
    allTiles.push(water0, water1, ...water0_all, ...water1_all);

    // ## water deco tiles
    const waterLily = new Tile("waterLily0", [
        { x: 7, y: 5, weight: 1 },
        { x: 6, y: 5, weight: 1 },
        { x: 6, y: 6, weight: 1 },
        { x: 6, y: 7, weight: 1 }
    ], RARITY.RARE_8 * DECO_FREQ_MULTI, LAYER.DECO);
    waterLily.addAllowedBases([beach, grass, dirt, grassLight, grassDry, grassDark, mud]);
    waterLily.addAllowedOverlays([water0, water1]);
    waterLily.addRule(fullTransparentRule);

    decoTiles.push(waterLily);
    allTiles.push(waterLily);

    if (false) {
       
        //deco 2-2
        const bigStone1_0 = new Tile("bigStone1_0", [{ x: 6, y: 3, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI);
        const bigStone1_1 = new Tile("bigStone1_1", [{ x: 7, y: 3, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI);
        const bigStone1_2 = new Tile("bigStone1_2", [{ x: 6, y: 4, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI);
        const bigStone1_3 = new Tile("bigStone1_3", [{ x: 7, y: 4, weight: 1 }], RARITY.RARE_2 * DECO_FREQ_MULTI);

        addBasesToAll(waterBase, [bigStone1_0, bigStone1_1, bigStone1_2, bigStone1_3])
        bigStone1_0.addRule(new Rule(TRANSPARENT, bigStone1_0.name, bigStone1_2.name, TRANSPARENT));
        bigStone1_1.addRule(new Rule(TRANSPARENT, TRANSPARENT, bigStone1_1.name, bigStone1_0.name));
        bigStone1_2.addRule(new Rule(bigStone1_2.name, bigStone1_3.name, TRANSPARENT, TRANSPARENT));
        bigStone1_3.addRule(new Rule(bigStone1_1.name, TRANSPARENT, TRANSPARENT, bigStone1_3.name));
        waterDecoGroup.push(bigStone1_0, bigStone1_1, bigStone1_2, bigStone1_3);

        ///overlappable special - also deco
        //deco 2-1
        const grassTuft2_0 = new Tile("grassTuft2_0", [{ x: 3, y: 0, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI);
        const grassTuft2_1 = new Tile("grassTuft2_1", [{ x: 3, y: 1, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI);
        const grassTuft3_0 = new Tile("grassTuft3_0", [{ x: 4, y: 0, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI);
        const grassTuft3_1 = new Tile("grassTuft3_1", [{ x: 4, y: 1, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI);
        const fern_0 = new Tile("fern_0", [{ x: 7, y: 1, weight: 1 }], RARITY.RARE_3 * DECO_FREQ_MULTI);
        const fern_1 = new Tile("fern_1", [{ x: 7, y: 2, weight: 1 }], RARITY.RARE_5 * DECO_FREQ_MULTI);

        addBasesToAll(baseTiles, [grassTuft2_1, grassTuft3_1, fern_1])  
        grassTuft2_1.addRule(new Rule(grassTuft2_0.name, TRANSPARENT, TRANSPARENT, TRANSPARENT));
        grassTuft3_1.addRule(new Rule(grassTuft3_0.name, TRANSPARENT, TRANSPARENT, TRANSPARENT));
        fern_1.addRule(new Rule(fern_0.name, TRANSPARENT, TRANSPARENT, TRANSPARENT));

        addBasesToAll(baseTiles, [grassTuft2_0, grassTuft3_0, fern_0])//top end baseGroup
        addBasesToAll([grassTuft2_1, grassTuft3_1, fern_1], [grassTuft2_0, grassTuft3_0, fern_0]);//repeat
        addBasesToAll(overlappable, [grassTuft2_0, grassTuft3_0, fern_0])//top end other stuff
        grassTuft2_0.addRule(new Rule(TRANSPARENT, TRANSPARENT, grassTuft2_0.name, TRANSPARENT));
        grassTuft3_0.addRule(new Rule(TRANSPARENT, TRANSPARENT, grassTuft3_0.name, TRANSPARENT));
        fern_0.addRule(new Rule(TRANSPARENT, TRANSPARENT, fern_0.name, TRANSPARENT));

        decoGroup.push(grassTuft2_0, grassTuft2_1, grassTuft3_0, grassTuft3_1, fern_0, fern_1);

        //bridgeGroup
        const bridgeGroup = [];

        const bridgeSurHor0N = new Tile("bridgeSurHor0N", [{ x: 1, y: 23, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurHor1N = new Tile("bridgeSurHor1N", [{ x: 2, y: 23, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurHor2N = new Tile("bridgeSurHor2N", [{ x: 3, y: 23, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurHor0S = new Tile("bridgeSurHor0S", [{ x: 1, y: 24, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurHor1S = new Tile("bridgeSurHor1S", [{ x: 2, y: 24, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurHor2S = new Tile("bridgeSurHor2S", [{ x: 3, y: 24, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeSurVerW = new Tile("bridgeSurVerW", [{ x: 6, y: 23, weight: 1 }], RARITY.RARE_1 * BRIDGE_FREQ_MULTI);
        const bridgeSurVerE = new Tile("bridgeSurVerE", [{ x: 7, y: 23, weight: 1 }], RARITY.RARE_1 * BRIDGE_FREQ_MULTI);
        const bridgeEdge0 = new Tile("bridgeEdge0", [{ x: 1, y: 25, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeEdge1 = new Tile("bridgeEdge1", [{ x: 2, y: 25, weight: 1 }], RARITY.RARE_2 * BRIDGE_FREQ_MULTI);
        const bridgeEdge2 = new Tile("bridgeEdge2", [{ x: 3, y: 25, weight: 1 }], RARITY.RARE_3 * BRIDGE_FREQ_MULTI);
        const bridgeCoastW = new Tile("bridgeCoastW", [{ x: 0, y: 25, weight: 1 }], RARITY.RARE_1 * BRIDGE_FREQ_MULTI);
        const bridgeCoastE = new Tile("bridgeCoastE", [{ x: 5, y: 25, weight: 1 }], RARITY.RARE_1 * BRIDGE_FREQ_MULTI);

        const bridge_all = [bridgeSurHor0N, bridgeSurHor1N, bridgeSurHor2N, bridgeSurHor0S, bridgeSurHor1S, bridgeSurHor2S, bridgeSurVerW, bridgeSurVerE, bridgeEdge0, bridgeEdge1, bridgeEdge2, bridgeCoastW, bridgeCoastE];
        addBasesToAll(baseTiles, bridge_all);

        bridgeSurHor1N.addRule(new Rule(water0.name, bridgeSurHor1N.name, bridgeSurHor1S.name, bridgeSurHor1N.name));
        bridgeSurHor1N.addRule(new Rule(water0E.name, TRANSPARENT, bridgeSurHor1S.name, bridgeSurHor1N.name));
        bridgeSurHor1N.addRule(new Rule(water0W.name, bridgeSurHor1N.name, bridgeSurHor1S.name, TRANSPARENT));
        bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, bridgeSurHor0S.name, bridgeEdge1.name, bridgeSurHor0S.name));
        bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, TRANSPARENT, bridgeCoastE.name, bridgeSurHor0S.name));
        bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, bridgeSurHor0S.name, bridgeCoastW.name, TRANSPARENT));
        bridgeSurHor0N.addRule(new Rule(water0.name, bridgeSurHor1N.name, bridgeSurHor0N.name, water0.name));
        bridgeSurHor0S.addRule(new Rule(bridgeSurHor0N.name, bridgeSurHor0S.name, bridgeEdge0.name, water0.name));
        bridgeSurHor2N.addRule(new Rule(water0.name, water0.name, bridgeSurHor2N.name, bridgeSurHor1N.name));
        bridgeSurHor2S.addRule(new Rule(bridgeSurHor2N.name, water0.name, bridgeEdge2.name, bridgeSurHor0S.name));
        bridgeEdge0.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
        bridgeEdge0.addRule(new Rule(bridgeEdge0.name, bridgeEdge1.name, water0.name, water0.name));
        bridgeEdge1.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
        bridgeEdge2.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
        bridgeEdge2.addRule(new Rule(bridgeEdge2.name, water0.name, water0.name, bridgeEdge1.name));
        bridgeCoastW.addRule(new Rule(bridgeCoastW.name, bridgeEdge1.name, water0W.name, TRANSPARENT));
        bridgeCoastE.addRule(new Rule(bridgeCoastE.name, TRANSPARENT, water0E.name, bridgeEdge1.name));

        bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, bridgeSurVerW.name, water0.name));
        bridgeSurVerW.addRule(new Rule(TRANSPARENT, bridgeSurVerW.name, bridgeSurVerW.name, water0N.name));
        bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, TRANSPARENT, water0S.name));
        bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, bridgeEdge0.name, water0.name));
        bridgeSurVerW.addRule(new Rule(bridgeEdge1.name, bridgeSurVerW.name, bridgeSurVerW.name, bridgeEdge1.name));

        bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0.name, bridgeSurVerE.name, bridgeSurVerW.name));
        bridgeSurVerE.addRule(new Rule(TRANSPARENT, water0N.name, bridgeSurVerE.name, bridgeSurVerW.name));
        bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0S.name, TRANSPARENT, bridgeSurVerW.name));
        bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0.name, bridgeEdge2.name, bridgeSurVerW.name));
        bridgeSurVerE.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, bridgeSurVerE.name, bridgeSurVerW.name));

        bridgeGroup.push(bridgeSurHor0N, bridgeSurHor1N, bridgeSurHor2N, bridgeSurHor0S, bridgeSurHor1S, bridgeSurHor2S, bridgeSurVerW, bridgeSurVerE, bridgeEdge0, bridgeEdge1, bridgeEdge2, bridgeCoastW, bridgeCoastE);

        //treeGroup
        const treeGroup = [];
        const tree0_top_left = new Tile("tree0_top_left", [{ x: 1, y: 36, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_top_right = new Tile("tree0_top_right", [{ x: 2, y: 36, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_mid_edge_left = new Tile("tree0_mid_edge_left", [{ x: 0, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_mid_left = new Tile("tree0_mid_left", [{ x: 1, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_mid_right = new Tile("tree0_mid_right", [{ x: 2, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_mid_edge_right = new Tile("tree0_mid_edge_right", [{ x: 3, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_bot_left = new Tile("tree0_bot_left", [{ x: 1, y: 38, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_bot_right = new Tile("tree0_bot_right", [{ x: 2, y: 38, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);

        const tree0_top_left_repeat_0 = new Tile("tree0_top_left_repeat_0", [{ x: 4, y: 36, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_top_right_repeat_0 = new Tile("tree0_top_right_repeat_0", [{ x: 5, y: 36, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_top_left_repeat_1 = new Tile("tree0_top_left_repeat_1", [{ x: 4, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const tree0_top_right_repeat_1 = new Tile("tree0_top_right_repeat_1", [{ x: 5, y: 37, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);

        const tree0_all = [tree0_top_left, tree0_top_right, tree0_mid_edge_left, tree0_mid_left, tree0_mid_right, tree0_mid_edge_right, tree0_bot_left, tree0_bot_right, tree0_top_left_repeat_0, tree0_top_left_repeat_1, tree0_top_right_repeat_0, tree0_top_right_repeat_1];
        addBasesToAll(baseTiles, tree0_all);

        //self overlapping
        //addBasesToAll([tree0_bot_left, tree0_bot_right], [tree0_top_left, tree0_top_right, tree0_mid_edge_left, tree0_mid_edge_right]);

        tree0_top_left.addRule(new Rule(TRANSPARENT, "GLUE_TREE0_T", "GLUE_TREE0_TML", TRANSPARENT));
        tree0_top_right.addRule(new Rule(TRANSPARENT, TRANSPARENT, "GLUE_TREE0_TMR", "GLUE_TREE0_T"));
        tree0_mid_edge_left.addRule(new Rule(TRANSPARENT, "GLUE_TREE0_EL", TRANSPARENT, TRANSPARENT));
        tree0_mid_left.addRule(new Rule("GLUE_TREE0_TML", "GLUE_TREE0_M", "GLUE_TREE0_BML", "GLUE_TREE0_REPEAT"));
        tree0_mid_left.addRule(new Rule("GLUE_TREE0_TML", "GLUE_TREE0_M", "GLUE_TREE0_BML", "GLUE_TREE0_EL"));
        tree0_mid_right.addRule(new Rule("GLUE_TREE0_TMR", "GLUE_TREE0_REPEAT", "GLUE_TREE0_BMR", "GLUE_TREE0_M"));
        tree0_mid_right.addRule(new Rule("GLUE_TREE0_TMR", "GLUE_TREE0_ER", "GLUE_TREE0_BMR", "GLUE_TREE0_M"));
        tree0_mid_edge_right.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, "GLUE_TREE0_ER"));
        tree0_bot_left.addRule(new Rule("GLUE_TREE0_BML", "GLUE_TREE0_B", TRANSPARENT, TRANSPARENT));
        tree0_bot_right.addRule(new Rule("GLUE_TREE0_BMR", TRANSPARENT, TRANSPARENT, "GLUE_TREE0_B"));

        tree0_top_left_repeat_0.addRule(new Rule("GLUE_TREE0_TML", "GLUE_TREE0_TR0", "GLUE_TREE0_TML", "GLUE_TREE0_REPEAT"));
        tree0_top_right_repeat_0.addRule(new Rule("GLUE_TREE0_TMR", "GLUE_TREE0_REPEAT", "GLUE_TREE0_TMR", "GLUE_TREE0_TR0"));

        tree0_top_left_repeat_1.addRule(new Rule("GLUE_TREE0_TMR", "GLUE_TREE0_T", "GLUE_TREE0_TML", "GLUE_TREE0_M"));
        tree0_top_right_repeat_1.addRule(new Rule("GLUE_TREE0_TML", "GLUE_TREE0_M", "GLUE_TREE0_TMR", "GLUE_TREE0_T"));

        treeGroup.push(tree0_top_left, tree0_top_right, tree0_mid_edge_left, tree0_mid_left, tree0_mid_right, tree0_mid_edge_right, tree0_bot_left, tree0_bot_right, tree0_top_left_repeat_0, tree0_top_left_repeat_1, tree0_top_right_repeat_0, tree0_top_right_repeat_1);

        //palm
        const palm_top_left = new Tile("palm_top_left", [{ x: 1, y: 39, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_top_right = new Tile("palm_top_right", [{ x: 2, y: 39, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_mid_edge_left = new Tile("palm_mid_edge_left", [{ x: 0, y: 40, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_mid_left = new Tile("palm_mid_left", [{ x: 1, y: 40, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_mid_right = new Tile("palm_mid_right", [{ x: 2, y: 40, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_mid_edge_right = new Tile("palm_mid_edge_right", [{ x: 3, y: 40, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_bot_left = new Tile("palm_bot_left", [{ x: 1, y: 41, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);
        const palm_bot_right = new Tile("palm_bot_right", [{ x: 2, y: 41, weight: 1 }], RARITY.RARE_3 * TREE_FREQ_MULTI);

        const palm_all = [palm_top_left, palm_top_right, palm_mid_edge_left, palm_mid_left, palm_mid_right, palm_mid_edge_right, palm_bot_left, palm_bot_right];
        addBasesToAll([beach], palm_all);

        palm_top_left.addRule(new Rule(TRANSPARENT, "GLUE_PALM_T", "GLUE_PALM_TML", TRANSPARENT));
        palm_top_right.addRule(new Rule(TRANSPARENT, TRANSPARENT, "GLUE_PALM_TMR", "GLUE_PALM_T"));
        palm_mid_edge_left.addRule(new Rule(TRANSPARENT, "GLUE_PALM_EL", TRANSPARENT, TRANSPARENT));
        palm_mid_left.addRule(new Rule("GLUE_PALM_TML", "GLUE_PALM_M", "GLUE_PALM_BML", "GLUE_PALM_REPEAT"));
        palm_mid_left.addRule(new Rule("GLUE_PALM_TML", "GLUE_PALM_M", "GLUE_PALM_BML", "GLUE_PALM_EL"));
        palm_mid_right.addRule(new Rule("GLUE_PALM_TMR", "GLUE_PALM_REPEAT", "GLUE_PALM_BMR", "GLUE_PALM_M"));
        palm_mid_right.addRule(new Rule("GLUE_PALM_TMR", "GLUE_PALM_ER", "GLUE_PALM_BMR", "GLUE_PALM_M"));
        palm_mid_edge_right.addRule(new Rule(TRANSPARENT, TRANSPARENT, TRANSPARENT, "GLUE_PALM_ER"));
        palm_bot_left.addRule(new Rule("GLUE_PALM_BML", "GLUE_PALM_B", TRANSPARENT, TRANSPARENT));
        palm_bot_right.addRule(new Rule("GLUE_PALM_BMR", TRANSPARENT, TRANSPARENT, "GLUE_PALM_B"));

        treeGroup.push(palm_top_left, palm_top_right, palm_mid_edge_left, palm_mid_left, palm_mid_right, palm_mid_edge_right, palm_bot_left, palm_bot_right);
    }

    transparentOverlay.addAllowedBases(allTiles);
    transparentDeco.addAllowedBases(allTiles);
    transparentDeco.addAllowedOverlays(allTiles);

    console.log('Base');
    console.log(baseTiles);
    console.log('Overlay');
    console.log(overlayTiles);
    console.log('Deco');
    console.log(decoTiles);

    buildEdgeRegistryAndMasks(allTiles);
}

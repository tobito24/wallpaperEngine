//TileSet Image, in it are all tiles
const tilesetImage = new Image();
tilesetImage.src = "img/tileset.png";

//tilesize in px
const tilesize = 32;

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

/*
    Class for a single tile
    attribute
        name: name
        xPos, yPos: Coordinates in Image
        weight: Weighted probability
        possibleBases: array with possible bases for transparent tiles
        rules: rule set for edges
*/
class Tile {
    static numberOfTileSets = 0;

    constructor(name, xPos, yPos, weight = 0) {
        this.id = Tile.numberOfTileSets;
        Tile.numberOfTileSets++;
        this.name = name;
        this.xPos = xPos;
        this.yPos = yPos;
        this.rules = [];
        this.weight = weight;
        this.possibleBases = [];
    }

    addRule(rule, bases = this.possibleBases) {
        if (!(rule instanceof Rule)) return;

        if (bases.length === 0) this.rules.push(rule);

        for (let i = 0; i < bases.length; i++) {
            const tmpBaseRules = bases[i].rules;

            for (let j = 0; j < tmpBaseRules.length; j++) {
                const tmpBaseRule = tmpBaseRules[j];

                const north = rule.north.replace(NOTHING, tmpBaseRule.north);
                const east = rule.east.replace(NOTHING, tmpBaseRule.east);
                const south = rule.south.replace(NOTHING, tmpBaseRule.south);
                const west = rule.west.replace(NOTHING, tmpBaseRule.west);

                const newRule = new Rule(north, east, south, west, bases[i]);

                if(tmpBaseRule.hasBaseStack()){
                    newRule.addStack(tmpBaseRule.baseStack);
                }

                this.rules.push(newRule);
                
            }
        }
    }

    setPossibleBases(baseGroup) {
        this.possibleBases = baseGroup;
    }

    needBase() {
        return this.possibleBases.length != 0;
    }

    draw(context, dx, dy, size) {
        let sx = this.xPos * tilesize;
        let sy = this.yPos * tilesize;
        let sw = tilesize;
        let sh = tilesize;

        context.drawImage(tilesetImage, sx, sy, sw, sh, dx, dy, size, size);
    }
}

//class Rule: integer for each direction
class Rule {

    constructor(north, east, south, west, base = null) {
        this.north = north;
        this.east = east;
        this.south = south;
        this.west = west;
        this.baseStack = [];
        if (base != null) this.baseStack.push(base);
    }

    getBaseStack() {
        return this.baseStack;
    }

    hasBaseStack() {
        return this.baseStack.length != 0;
    }

    addStack(otherBaseStack){
        for (let i = 0; i < otherBaseStack.length; i++) {
            this.baseStack.push(otherBaseStack[i]);
        }
    }

    getEdge(direction) {
        switch (direction) {
            case NORTH:
                return this.north;
            case EAST:
                return this.east;
            case SOUTH:
                return this.south;
            case WEST:
                return this.west;
            default:
                return -1;
        }
    }
}

//Frequencies
const VERY_OFTEN_2 = 2048;
const VERY_OFTEN_1 = 1024;
const VERY_OFTEN_0 = 512;
const OFTEN_2 = 256;
const OFTEN_1 = 128;
const OFTEN_0 = 64;
const SOME_2 = 32;
const SOME_1 = 16;
const SOME_0 = 8;
const RARE_2 = 4;
const RARE_1 = 2;
const RARE_0 = 1;
const NEVER = 0;

//Frequencies multiplier
const DECO_FREQ_MULTI = 1;

//function to apply a rule to several tiles
function addRuleToAll(rule, tiles) {
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].addRule(rule);
    }
}

function setBasesToAll(baseGroup, tiles) {
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].setPossibleBases(baseGroup);
    }
}

//function to apply self rule and push
function addSelfRule(tile, pushDestination, isTransparent = false) {
    if (isTransparent)
        tile.addRule(new Rule(tile.name + NOTHING, tile.name + NOTHING, tile.name + NOTHING, tile.name + NOTHING));
    else
        tile.addRule(new Rule(tile.name, tile.name, tile.name, tile.name));

    pushDestination.push(tile);
}

//function to push a group to a other group
function groupPush(group, pushDestination) {
    for (let i = 0; i < group.length; i++) {
        pushDestination.push(group[i])
    }
}

//function to apply rules for classic X-X tiles
//tileArray is order sensitive [n, e, s, w, nw, ne, se, sw, c_nw, c_ne, c_se, c_sw, d0, d1]
function addTransitionRules(scourceName, destinationName, tileArray, pushDestination) {
    const trans0 = scourceName;
    const trans1 = destinationName;
    const north = trans0 != NOTHING ? tileArray[0].name : tileArray[0].name + NOTHING;
    const east = trans0 != NOTHING ? tileArray[1].name : tileArray[1].name + NOTHING;
    const south = trans0 != NOTHING ? tileArray[2].name : tileArray[2].name + NOTHING;
    const west = trans0 != NOTHING ? tileArray[3].name : tileArray[3].name + NOTHING;

    tileArray[0].addRule(new Rule(trans0, north, trans1, north));//n
    tileArray[1].addRule(new Rule(east, trans0, east, trans1));//e
    tileArray[2].addRule(new Rule(trans1, south, trans0, south));//s
    tileArray[3].addRule(new Rule(west, trans1, west, trans0));//w

    tileArray[4].addRule(new Rule(trans0, north, west, trans0));//nw
    tileArray[5].addRule(new Rule(trans0, trans0, east, north));//ne
    tileArray[6].addRule(new Rule(east, trans0, trans0, south));//se
    tileArray[7].addRule(new Rule(west, south, trans0, trans0));//sw

    if (tileArray[8] != undefined) {
        tileArray[8].addRule(new Rule(west, trans1, trans1, north));//c_nw
        tileArray[9].addRule(new Rule(east, north, trans1, trans1));//c_ne
        tileArray[10].addRule(new Rule(trans1, south, east, trans1));//c_se
        tileArray[11].addRule(new Rule(trans1, trans1, west, south));//c_sw
    }

    if (tileArray[12] != undefined) {
        tileArray[12].addRule(new Rule(east, north, west, south));//d0
        tileArray[13].addRule(new Rule(west, south, east, north));//d1
    }

    for (let i = 0; i < tileArray.length; i++)
        pushDestination.push(tileArray[i]);

}

//position in tilesetImage and rules
//nothing Tile 
const nothing = new Tile("NOTHING", 1, 0, NEVER)
const NOTHING = nothing.name;
const nothing_rule = new Rule(NOTHING, NOTHING, NOTHING, NOTHING);

//baseGroup
const baseGroup = [];

//grass
const grass = new Tile("grass", 0, 5, VERY_OFTEN_0);
addSelfRule(grass, baseGroup);

//dirth
const dirt = new Tile("dirt", 1, 7, VERY_OFTEN_0);
addSelfRule(dirt, baseGroup);

//grassLight
const grassLight = new Tile("grassLight", 0, 11, VERY_OFTEN_0);
addSelfRule(grassLight, baseGroup);

//grassDry
const grassDry = new Tile("grassDry", 1, 13, VERY_OFTEN_0);
addSelfRule(grassDry, baseGroup);

//grassDark
const grassDark = new Tile("grassDark", 2, 17, VERY_OFTEN_0);
addSelfRule(grassDark, baseGroup);

//mud
const mud = new Tile("mud", 1, 19, VERY_OFTEN_0);
addSelfRule(mud, baseGroup);

//TransitionGroup
const baseTransitionGroup = [];

//grass to dirth
const dirtN = new Tile("dirtN", 1, 6, OFTEN_2);
const dirtE = new Tile("dirtE", 2, 7, OFTEN_2);
const dirtS = new Tile("dirtS", 1, 8, OFTEN_2);
const dirtW = new Tile("dirtW", 0, 7, OFTEN_2);
const dirtNW = new Tile("dirtNW", 0, 6, SOME_0);
const dirtNE = new Tile("dirtNE", 2, 6, SOME_0);
const dirtSE = new Tile("dirtSE", 2, 8, SOME_0);
const dirtSW = new Tile("dirtSW", 0, 8, SOME_0);
const dirtCurveNW = new Tile("dirtCurveNW", 0, 9, RARE_1);
const dirtCurveNE = new Tile("dirtCurveNE", 1, 9, RARE_1);
const dirtCurveSE = new Tile("dirtCurveSE", 1, 10, RARE_1);
const dirtCurveSW = new Tile("dirtCurveSW", 0, 10, RARE_1);
const dirtCurveD0 = new Tile("dirtCurveD0", 2, 9, RARE_0);
const dirtCurveD1 = new Tile("dirtCurveD1", 2, 10, RARE_0);

const grassDirtTrans = [dirtN, dirtE, dirtS, dirtW, dirtNW, dirtNE, dirtSE, dirtSW, dirtCurveNW, dirtCurveNE, dirtCurveSE, dirtCurveSW, dirtCurveD0, dirtCurveD1];
addTransitionRules(grass.name, dirt.name, grassDirtTrans, baseTransitionGroup);

//grassLight to grassDry
const grassDN = new Tile("grassDN", 1, 12, OFTEN_0);
const grassDE = new Tile("grassDE", 2, 13, OFTEN_0);
const grassDS = new Tile("grassDS", 1, 14, OFTEN_0);
const grassDW = new Tile("grassDW", 0, 13, OFTEN_0);
const grassDNW = new Tile("grassDNW", 0, 12, SOME_2);
const grassDNE = new Tile("grassDNE", 2, 12, SOME_2);
const grassDSE = new Tile("grassDSE", 2, 14, SOME_2);
const grassDSW = new Tile("grassDSW", 0, 14, SOME_2);
const grassDCurveNW = new Tile("grassDCurveNW", 0, 15, RARE_0);
const grassDCurveNE = new Tile("grassDCurveNE", 1, 15, RARE_2);
const grassDCurveSE = new Tile("grassDCurveSE", 1, 16, RARE_2);
const grassDCurveSW = new Tile("grassDCurveSW", 0, 16, RARE_2);
const grassDCurveD0 = new Tile("grassDCurveD0", 2, 15, RARE_0);
const grassDCurveD1 = new Tile("grassDCurveD1", 2, 16, RARE_0);

const grassLgrassDryTrans = [grassDN, grassDE, grassDS, grassDW, grassDNW, grassDNE, grassDSE, grassDSW, grassDCurveNW, grassDCurveNE, grassDCurveSE, grassDCurveSW, grassDCurveD0, grassDCurveD1];
addTransitionRules(grassLight.name, grassDry.name, grassLgrassDryTrans, baseTransitionGroup);

//grassDark to mud
const mudN = new Tile("mudN", 1, 18, OFTEN_0);
const mudE = new Tile("mudE", 2, 19, OFTEN_0);
const mudS = new Tile("mudS", 1, 20, OFTEN_0);
const mudW = new Tile("mudW", 0, 19, OFTEN_0);
const mudNW = new Tile("mudNW", 0, 18, SOME_0);
const mudNE = new Tile("mudNE", 2, 18, SOME_0);
const mudSE = new Tile("mudSE", 2, 20, SOME_0);
const mudSW = new Tile("mudSW", 0, 20, SOME_0);
const mudCurveNW = new Tile("mudCurveNW", 0, 21, RARE_2);
const mudCurveNE = new Tile("mudCurveNE", 1, 21, RARE_2);
const mudCurveSE = new Tile("mudCurveSE", 1, 22, RARE_2);
const mudCurveSW = new Tile("mudCurveSW", 0, 22, RARE_2);
const mudCurveD0 = new Tile("mudCurveD0", 2, 21, SOME_0);
const mudCurveD1 = new Tile("mudCurveD1", 2, 22, SOME_0);

const grassDaMudTrans = [mudN, mudE, mudS, mudW, mudNW, mudNE, mudSE, mudSW, mudCurveNW, mudCurveNE, mudCurveSE, mudCurveSW, mudCurveD0, mudCurveD1];
addTransitionRules(grassDark.name, mud.name, grassDaMudTrans, baseTransitionGroup);

//decoGroup
const decoGroup = [];
const overlapTiles = []; //special and work in progress

//base alternatives
const grassLight_alter = new Tile("grassL_alter", 1, 11, OFTEN_1);
grassLight_alter.addRule(new Rule(grassLight.name, grassLight.name, grassLight.name, grassLight.name));
decoGroup.push(grassLight_alter);

const grassDark_alter = new Tile("grassDa_alter", 0, 17, OFTEN_1);
grassDark_alter.addRule(new Rule(grassDark.name, grassDark.name, grassDark.name, grassDark.name));
decoGroup.push(grassDark_alter);

const mud_alter = new Tile("mud_alternative", 1, 17, OFTEN_1);
mud_alter.addRule(new Rule(mud.name, mud.name, mud.name, mud.name));
decoGroup.push(mud_alter);

//deco 1-1
const flower0 = new Tile("flower0", 0, 2, OFTEN_1 * DECO_FREQ_MULTI);
const flower1 = new Tile("flower1", 1, 2, OFTEN_1 * DECO_FREQ_MULTI);
const flower2 = new Tile("flower2", 2, 2, OFTEN_1 * DECO_FREQ_MULTI);
const grassTuft0 = new Tile("grassTuft0", 3, 2, OFTEN_2 * DECO_FREQ_MULTI);
const grassTuft1 = new Tile("grassTuft1", 4, 2, OFTEN_2 * DECO_FREQ_MULTI);
const flower3 = new Tile("flower3", 5, 2, OFTEN_1 * DECO_FREQ_MULTI);
const treeStump = new Tile("treeStump", 6, 2, RARE_2 * DECO_FREQ_MULTI);
const rock0 = new Tile("rock0", 5, 3, SOME_0 * DECO_FREQ_MULTI);
const rock1 = new Tile("rock0", 5, 4, SOME_0 * DECO_FREQ_MULTI);
const rock2 = new Tile("rock0", 0, 3, SOME_0 * DECO_FREQ_MULTI);
const mush = new Tile("mush", 2, 4, RARE_2 * DECO_FREQ_MULTI);
const moss = new Tile("moss", 1, 4, RARE_2 * DECO_FREQ_MULTI);

setBasesToAll(baseGroup, [nothing, flower0, flower1, flower2, grassTuft0, grassTuft1, flower3, treeStump, rock0, rock1, rock2, mush, moss]);
addRuleToAll(nothing_rule, [nothing, flower0, flower1, flower2, grassTuft0, grassTuft1, flower3, treeStump, rock0, rock1, rock2, mush, moss]);
decoGroup.push(flower0, flower1, flower2, grassTuft0, grassTuft1, flower3, treeStump, rock0, rock1, rock2, mush, moss);

//deco 1-2
const treeTrunk_0 = new Tile("treeTrunk_0", 5, 1, SOME_0 * DECO_FREQ_MULTI);
const treeTrunk_1 = new Tile("treeTrunk_1", 6, 1, SOME_0 * DECO_FREQ_MULTI);
const treeTrunkMossy_0 = new Tile("treeTrunkMossy_0", 1, 1, SOME_0 * DECO_FREQ_MULTI);
const treeTrunkMossy_1 = new Tile("treeTrunkMossy_1", 2, 1, SOME_0 * DECO_FREQ_MULTI);
const rock4_0 = new Tile("rock4_0", 1, 3, RARE_2 * DECO_FREQ_MULTI);
const rock4_1 = new Tile("rock4_1", 2, 3, RARE_2 * DECO_FREQ_MULTI);

setBasesToAll(baseGroup, [treeTrunk_0, treeTrunk_1, treeTrunkMossy_0, treeTrunkMossy_1, rock4_0, rock4_1])
treeTrunk_0.addRule(new Rule(NOTHING, treeTrunk_0.name + NOTHING, NOTHING, NOTHING));
treeTrunk_1.addRule(new Rule(NOTHING, NOTHING, NOTHING, treeTrunk_0.name + NOTHING));
treeTrunkMossy_0.addRule(new Rule(NOTHING, treeTrunkMossy_0.name + NOTHING, NOTHING, NOTHING));
treeTrunkMossy_1.addRule(new Rule(NOTHING, NOTHING, NOTHING, treeTrunkMossy_0.name + NOTHING));
rock4_0.addRule(new Rule(NOTHING, rock4_0.name + NOTHING, NOTHING, NOTHING));
rock4_1.addRule(new Rule(NOTHING, NOTHING, NOTHING, rock4_0.name + NOTHING));
decoGroup.push(treeTrunk_0, treeTrunk_1, treeTrunkMossy_0, treeTrunkMossy_1, rock4_0, rock4_1);

//deco 2-1
const grassTuft2_0 = new Tile("grassTuft2_0", 3, 0, SOME_1 * DECO_FREQ_MULTI);
const grassTuft2_1 = new Tile("grassTuft2_1", 3, 1, SOME_1 * DECO_FREQ_MULTI);
const grassTuft3_0 = new Tile("grassTuft3_0", 4, 0, SOME_1 * DECO_FREQ_MULTI);
const grassTuft3_1 = new Tile("grassTuft3_1", 4, 1, SOME_1 * DECO_FREQ_MULTI);
const fern_0 = new Tile("fern_0", 7, 1, SOME_1 * DECO_FREQ_MULTI);
const fern_1 = new Tile("fern_1", 7, 2, SOME_1 * DECO_FREQ_MULTI);

setBasesToAll(baseGroup, [grassTuft2_0, grassTuft2_1, grassTuft3_0, grassTuft3_1, fern_0, fern_1])
grassTuft2_0.addRule(new Rule(NOTHING, NOTHING, grassTuft2_0.name + NOTHING, NOTHING));
grassTuft2_1.addRule(new Rule(grassTuft2_0.name + NOTHING, NOTHING, NOTHING, NOTHING));
grassTuft3_0.addRule(new Rule(NOTHING, NOTHING, grassTuft3_0.name + NOTHING, NOTHING));
grassTuft3_1.addRule(new Rule(grassTuft3_0.name + NOTHING, NOTHING, NOTHING, NOTHING));
fern_0.addRule(new Rule(NOTHING, NOTHING, fern_0.name + NOTHING, NOTHING));
fern_1.addRule(new Rule(fern_0.name + NOTHING, NOTHING, NOTHING, NOTHING));
decoGroup.push(grassTuft2_0, grassTuft2_1, grassTuft3_0, grassTuft3_1, fern_0, fern_1);
//overlapTiles.push(grassTuft2_0, grassTuft3_0, fern_0);

//deco 2-2
const bigStone0_0 = new Tile("bigStone0_0", 3, 3, RARE_1 * DECO_FREQ_MULTI);
const bigStone0_1 = new Tile("bigStone0_1", 4, 3, RARE_1 * DECO_FREQ_MULTI);
const bigStone0_2 = new Tile("bigStone0_2", 3, 4, RARE_1 * DECO_FREQ_MULTI);
const bigStone0_3 = new Tile("bigStone0_3", 4, 4, RARE_1 * DECO_FREQ_MULTI);

setBasesToAll(baseGroup, [bigStone0_0, bigStone0_1, bigStone0_2, bigStone0_3])
bigStone0_0.addRule(new Rule(NOTHING, bigStone0_0.name + NOTHING, bigStone0_2.name + NOTHING, NOTHING));
bigStone0_1.addRule(new Rule(NOTHING, NOTHING, bigStone0_1.name + NOTHING, bigStone0_0.name + NOTHING));
bigStone0_2.addRule(new Rule(bigStone0_2.name + NOTHING, bigStone0_3.name + NOTHING, NOTHING, NOTHING));
bigStone0_3.addRule(new Rule(bigStone0_1.name + NOTHING, NOTHING, NOTHING, bigStone0_3.name + NOTHING));

decoGroup.push(bigStone0_0, bigStone0_1, bigStone0_2, bigStone0_3);

//deco X-1 (cliff)
const cliff_0 = new Tile("cliff_0", 5, 0, SOME_1 * DECO_FREQ_MULTI);
const cliff_1 = new Tile("cliff_1", 6, 0, SOME_2 * DECO_FREQ_MULTI);
const cliff_2 = new Tile("cliff_2", 7, 0, SOME_1 * DECO_FREQ_MULTI);

setBasesToAll(baseGroup, [cliff_0, cliff_1, cliff_2])
cliff_0.addRule(new Rule(NOTHING, cliff_1.name + NOTHING, NOTHING, NOTHING));
cliff_1.addRule(new Rule(NOTHING, cliff_1.name + NOTHING, NOTHING, cliff_1.name + NOTHING));
cliff_2.addRule(new Rule(NOTHING, NOTHING, NOTHING, cliff_1.name + NOTHING));

decoGroup.push(cliff_0, cliff_1, cliff_2);

//deco X-X (tall grasses)
const tallGrass0 = new Tile("tallGrass0", 4, 6, OFTEN_0 * DECO_FREQ_MULTI);
const tallGrass0N = new Tile("tallGrass0N", 4, 5, SOME_2 * DECO_FREQ_MULTI);
const tallGrass0E = new Tile("tallGrass0E", 5, 6, SOME_2 * DECO_FREQ_MULTI);
const tallGrass0S = new Tile("tallGrass0S", 4, 7, SOME_2 * DECO_FREQ_MULTI);
const tallGrass0W = new Tile("tallGrass0W", 3, 6, SOME_2 * DECO_FREQ_MULTI);
const tallGrass0NW = new Tile("tallGrass0NW", 3, 5, SOME_0 * DECO_FREQ_MULTI);
const tallGrass0NE = new Tile("tallGrass0NE", 5, 5, SOME_0 * DECO_FREQ_MULTI);
const tallGrass0SE = new Tile("tallGrass0SE", 5, 7, SOME_0 * DECO_FREQ_MULTI);
const tallGrass0SW = new Tile("tallGrass0SW", 3, 7, SOME_0 * DECO_FREQ_MULTI);

const tallGrass1 = new Tile("tallGrass1", 4, 12, OFTEN_0 * DECO_FREQ_MULTI);
const tallGrass1N = new Tile("tallGrass1N", 4, 11, SOME_2 * DECO_FREQ_MULTI);
const tallGrass1E = new Tile("tallGrass1E", 5, 12, SOME_2 * DECO_FREQ_MULTI);
const tallGrass1S = new Tile("tallGrass1S", 4, 13, SOME_2 * DECO_FREQ_MULTI);
const tallGrass1W = new Tile("tallGrass1W", 3, 12, SOME_2 * DECO_FREQ_MULTI);
const tallGrass1NW = new Tile("tallGrass1NW", 3, 11, SOME_0 * DECO_FREQ_MULTI);
const tallGrass1NE = new Tile("tallGrass1NE", 5, 11, SOME_0 * DECO_FREQ_MULTI);
const tallGrass1SE = new Tile("tallGrass1SE", 5, 13, SOME_0 * DECO_FREQ_MULTI);
const tallGrass1SW = new Tile("tallGrass1SW", 3, 13, SOME_0 * DECO_FREQ_MULTI);

const tallGrass2 = new Tile("tallGrass2", 4, 18, OFTEN_0 * DECO_FREQ_MULTI);
const tallGrass2N = new Tile("tallGrass2N", 4, 17, SOME_2 * DECO_FREQ_MULTI);
const tallGrass2E = new Tile("tallGrass2E", 5, 18, SOME_2 * DECO_FREQ_MULTI);
const tallGrass2S = new Tile("tallGrass2S", 4, 19, SOME_2 * DECO_FREQ_MULTI);
const tallGrass2W = new Tile("tallGrass2W", 3, 18, SOME_2 * DECO_FREQ_MULTI);
const tallGrass2NW = new Tile("tallGrass2NW", 3, 17, SOME_0 * DECO_FREQ_MULTI);
const tallGrass2NE = new Tile("tallGrass2NE", 5, 17, SOME_0 * DECO_FREQ_MULTI);
const tallGrass2SE = new Tile("tallGrass2SE", 5, 19, SOME_0 * DECO_FREQ_MULTI);
const tallGrass2SW = new Tile("tallGrass2SW", 3, 19, SOME_0 * DECO_FREQ_MULTI);

addSelfRule(tallGrass0, decoGroup);
addSelfRule(tallGrass1, decoGroup);
addSelfRule(tallGrass2, decoGroup);

setBasesToAll(baseGroup, [tallGrass0N, tallGrass0E, tallGrass0S, tallGrass0W, tallGrass0NW, tallGrass0NE, tallGrass0SE, tallGrass0SW]);
setBasesToAll(baseGroup, [tallGrass1N, tallGrass1E, tallGrass1S, tallGrass1W, tallGrass1NW, tallGrass1NE, tallGrass1SE, tallGrass1SW]);
setBasesToAll(baseGroup, [tallGrass2N, tallGrass2E, tallGrass2S, tallGrass2W, tallGrass2NW, tallGrass2NE, tallGrass2SE, tallGrass2SW]);
addTransitionRules(NOTHING, tallGrass0.name, [tallGrass0N, tallGrass0E, tallGrass0S, tallGrass0W, tallGrass0NW, tallGrass0NE, tallGrass0SE, tallGrass0SW], decoGroup);
addTransitionRules(NOTHING, tallGrass1.name, [tallGrass1N, tallGrass1E, tallGrass1S, tallGrass1W, tallGrass1NW, tallGrass1NE, tallGrass1SE, tallGrass1SW], decoGroup);
addTransitionRules(NOTHING, tallGrass2.name, [tallGrass2N, tallGrass2E, tallGrass2S, tallGrass2W, tallGrass2NW, tallGrass2NE, tallGrass2SE, tallGrass2SW], decoGroup);

//waterGroup
const waterGroup = [];

//water0
const water0 = new Tile("water0", 4, 27, VERY_OFTEN_2);
water0.setPossibleBases(baseGroup);
addSelfRule(water0, waterGroup, true);

const water0N = new Tile("water0N", 4, 26, OFTEN_0);
const water0E = new Tile("water0E", 5, 27, OFTEN_0);
const water0S = new Tile("water0S", 4, 28, OFTEN_0);
const water0W = new Tile("water0W", 3, 27, OFTEN_0);
const water0NW = new Tile("water0NW", 3, 26, SOME_1);
const water0NE = new Tile("water0NE", 5, 26, SOME_1);
const water0SE = new Tile("water0SE", 5, 28, SOME_1);
const water0SW = new Tile("water0SW", 3, 28, SOME_1);
const water0CurveNW = new Tile("water0CurveNW", 6, 28, SOME_0);
const water0CurveNE = new Tile("water0CurveNE", 7, 28, SOME_0);
const water0CurveSE = new Tile("water0CurveSE", 7, 29, SOME_0);
const water0CurveSW = new Tile("water0CurveSW", 6, 29, SOME_0);
const water0CurveD0 = new Tile("water0CurveD0", 6, 24, RARE_0);
const water0CurveD1 = new Tile("water0CurveD1", 6, 25, RARE_0);

const water0_all = [water0N, water0E, water0S, water0W, water0NW, water0NE, water0SE, water0SW, water0CurveNW, water0CurveNE, water0CurveSE, water0CurveSW, water0CurveD0, water0CurveD1];
setBasesToAll(baseGroup, water0_all);
addTransitionRules(NOTHING, water0.name + NOTHING, water0_all, waterGroup);

//water1
const water1 = new Tile("water1", 1, 27, VERY_OFTEN_1);
water1.setPossibleBases(baseGroup);
addSelfRule(water1, waterGroup, true);

const water1N = new Tile("water1N", 1, 26, OFTEN_0);
const water1E = new Tile("water1E", 2, 27, OFTEN_0);
const water1S = new Tile("water1S", 1, 28, OFTEN_0);
const water1W = new Tile("water1W", 0, 27, OFTEN_0);
const water1NW = new Tile("water1NW", 0, 26, SOME_1);
const water1NE = new Tile("water1NE", 2, 26, SOME_1);
const water1SE = new Tile("water1SE", 2, 28, SOME_1);
const water1SW = new Tile("water1SW", 0, 28, SOME_1);
const water1CurveNW = new Tile("water1CurveNW", 6, 26, SOME_1);
const water1CurveNE = new Tile("water1CurveNE", 7, 26, SOME_1);
const water1CurveSE = new Tile("water1CurveSE", 7, 27, SOME_1);
const water1CurveSW = new Tile("water1CurveSW", 6, 27, SOME_1);
const water1CurveD0 = new Tile("water1CurveD0", 7, 24, RARE_1);
const water1CurveD1 = new Tile("water1CurveD1", 7, 25, RARE_1);

const water1_all = [water1N, water1E, water1S, water1W, water1NW, water1NE, water1SE, water1SW, water1CurveNW, water1CurveNE, water1CurveSE, water1CurveSW, water1CurveD0, water1CurveD1];
setBasesToAll(baseGroup, water1_all);
addTransitionRules(NOTHING, water1.name + NOTHING, water1_all, waterGroup);

//waterDecoGroup
const waterDecoGroup = [];
const waterBase = [water0, water1];

//deco 1-1
const waterLily0 = new Tile("waterLily0", 7, 5, OFTEN_1 * DECO_FREQ_MULTI);
const waterLily1 = new Tile("waterLily1", 6, 5, OFTEN_1 * DECO_FREQ_MULTI);
const waterLily2 = new Tile("waterLily2", 6, 6, OFTEN_1 * DECO_FREQ_MULTI);
const waterLily3 = new Tile("waterLily3", 6, 7, OFTEN_1 * DECO_FREQ_MULTI);

setBasesToAll(waterBase, [waterLily0, waterLily1, waterLily2, waterLily3])
addRuleToAll(nothing_rule, [waterLily0, waterLily1, waterLily2, waterLily3]);
waterDecoGroup.push(waterLily0, waterLily1, waterLily2, waterLily3);

//deco 2-2
const bigStone1_0 = new Tile("bigStone1_0", 6, 3, RARE_2 * DECO_FREQ_MULTI);
const bigStone1_1 = new Tile("bigStone1_1", 7, 3, RARE_2 * DECO_FREQ_MULTI);
const bigStone1_2 = new Tile("bigStone1_2", 6, 4, RARE_2 * DECO_FREQ_MULTI);
const bigStone1_3 = new Tile("bigStone1_3", 7, 4, RARE_2 * DECO_FREQ_MULTI);

setBasesToAll(waterBase, [bigStone1_0, bigStone1_1, bigStone1_2, bigStone1_3])
bigStone1_0.addRule(new Rule(NOTHING, bigStone1_0.name + NOTHING, bigStone1_2.name + NOTHING, NOTHING));
bigStone1_1.addRule(new Rule(NOTHING, NOTHING, bigStone1_1.name + NOTHING, bigStone1_0.name + NOTHING));
bigStone1_2.addRule(new Rule(bigStone1_2.name + NOTHING, bigStone1_3.name + NOTHING, NOTHING, NOTHING));
bigStone1_3.addRule(new Rule(bigStone1_1.name + NOTHING, NOTHING, NOTHING, bigStone1_3.name + NOTHING));
waterDecoGroup.push(bigStone1_0, bigStone1_1, bigStone1_2, bigStone1_3);

//stoneGroup
const stoneGroup = [];

//stone0
const stone0 = new Tile("stone0", 4, 9, VERY_OFTEN_0);
addSelfRule(stone0, stoneGroup);

const stone0N = new Tile("stone0N", 4, 8, OFTEN_0);
const stone0E = new Tile("stone0E", 5, 9, OFTEN_0);
const stone0S = new Tile("stone0S", 4, 10, OFTEN_0);
const stone0W = new Tile("stone0W", 3, 9, OFTEN_0);
const stone0NW = new Tile("stone0NW", 3, 8, OFTEN_0);
const stone0NE = new Tile("stone0NE", 5, 8, OFTEN_0);
const stone0SE = new Tile("stone0SE", 5, 10, OFTEN_0);
const stone0SW = new Tile("stone0SW", 3, 10, OFTEN_0);
const stone0CurveNW = new Tile("stone0CurveNW", 7, 9, RARE_2);
const stone0CurveNE = new Tile("stone0CurveNE", 6, 9, RARE_2);
const stone0CurveSE = new Tile("stone0CurveSE", 6, 8, RARE_2);
const stone0CurveSW = new Tile("stone0CurveSW", 7, 8, RARE_2);

const stone0_all = [stone0N, stone0E, stone0S, stone0W, stone0NW, stone0NE, stone0SE, stone0SW, stone0CurveNW, stone0CurveNE, stone0CurveSE, stone0CurveSW];
setBasesToAll(baseGroup, stone0_all);
addTransitionRules(NOTHING, stone0.name, stone0_all, stoneGroup);

//stone1
const stone1 = new Tile("stone1", 4, 15, VERY_OFTEN_0);
addSelfRule(stone1, stoneGroup);

const stone1N = new Tile("stone1N", 4, 14, OFTEN_0);
const stone1E = new Tile("stone1E", 5, 15, OFTEN_0);
const stone1S = new Tile("stone1S", 4, 16, OFTEN_0);
const stone1W = new Tile("stone1W", 3, 15, OFTEN_0);
const stone1NW = new Tile("stone1NW", 3, 14, OFTEN_0);
const stone1NE = new Tile("stone1NE", 5, 14, OFTEN_0);
const stone1SE = new Tile("stone1SE", 5, 16, OFTEN_0);
const stone1SW = new Tile("stone1SW", 3, 16, OFTEN_0);
const stone1CurveNW = new Tile("stone1CurveNW", 6, 14, RARE_2);
const stone1CurveNE = new Tile("stone1CurveNE", 7, 14, RARE_2);
const stone1CurveSE = new Tile("stone1CurveSE", 7, 15, RARE_2);
const stone1CurveSW = new Tile("stone1CurveSW", 6, 15, RARE_2);

const stone1_all = [stone1N, stone1E, stone1S, stone1W, stone1NW, stone1NE, stone1SE, stone1SW, stone1CurveNW, stone1CurveNE, stone1CurveSE, stone1CurveSW];
setBasesToAll(baseGroup, stone1_all);
addTransitionRules(NOTHING, stone1.name, stone1_all, stoneGroup);

//stone2
const stone2 = new Tile("stone2", 4, 21, VERY_OFTEN_0);
addSelfRule(stone2, stoneGroup);

const stone2N = new Tile("stone2N", 4, 20, OFTEN_0);
const stone2E = new Tile("stone2E", 5, 21, OFTEN_0);
const stone2S = new Tile("stone2S", 4, 22, OFTEN_0);
const stone2W = new Tile("stone2W", 3, 21, OFTEN_0);
const stone2NW = new Tile("stone2NW", 3, 20, OFTEN_0);
const stone2NE = new Tile("stone2NE", 5, 20, OFTEN_0);
const stone2SE = new Tile("stone2SE", 5, 22, OFTEN_0);
const stone2SW = new Tile("stone2SW", 3, 22, OFTEN_0);
const stone2CurveNW = new Tile("stone2CurveNW", 7, 21, RARE_2);
const stone2CurveNE = new Tile("stone2CurveNE", 6, 21, RARE_2);
const stone2CurveSE = new Tile("stone2CurveSE", 6, 20, RARE_2);
const stone2CurveSW = new Tile("stone2CurveSW", 7, 20, RARE_2);

const stone2_all = [stone2N, stone2E, stone2S, stone2W, stone2NW, stone2NE, stone2SE, stone2SW, stone2CurveNW, stone2CurveNE, stone2CurveSE, stone2CurveSW];
setBasesToAll(baseGroup, stone2_all);
addTransitionRules(NOTHING, stone2.name, stone2_all, stoneGroup);

//bridgeGroup
const bridgeGroup = [];

//bridge
//add + NOTHING
const bridgeSurHor0N = new Tile("bridgeSurHor0N", 1, 23, RARE_2);
const bridgeSurHor1N = new Tile("bridgeSurHor1N", 2, 23, RARE_2);
const bridgeSurHor2N = new Tile("bridgeSurHor2N", 3, 23, RARE_2);
const bridgeSurHor0S = new Tile("bridgeSurHor0S", 1, 24, RARE_2);
const bridgeSurHor1S = new Tile("bridgeSurHor1S", 2, 24, RARE_2);
const bridgeSurHor2S = new Tile("bridgeSurHor2S", 3, 24, RARE_2);
const bridgeSurVerW = new Tile("bridgeSurVerW", 6, 23, RARE_0);
const bridgeSurVerE = new Tile("bridgeSurVerE", 7, 23, RARE_0);
const bridgeEdge0 = new Tile("bridgeEdge0", 1, 25, RARE_2);
const bridgeEdge1 = new Tile("bridgeEdge1", 2, 25, RARE_1);
const bridgeEdge2 = new Tile("bridgeEdge2", 3, 25, RARE_2);
const bridgeCoastW = new Tile("bridgeCoastW", 0, 25, RARE_0);
const bridgeCoastE = new Tile("bridgeCoastE", 5, 25, RARE_0);

const bridge_all = [bridgeSurHor0N, bridgeSurHor1N, bridgeSurHor2N, bridgeSurHor0S, bridgeSurHor1S, bridgeSurHor2S, bridgeSurVerW, bridgeSurVerE, bridgeEdge0, bridgeEdge1, bridgeEdge2, bridgeCoastW, bridgeCoastE];
setBasesToAll(baseGroup, bridge_all)

bridgeSurHor1N.addRule(new Rule(water0.name, bridgeSurHor1N.name, bridgeSurHor1S.name, bridgeSurHor1N.name));
bridgeSurHor1N.addRule(new Rule(water0E.name, NOTHING, bridgeSurHor1S.name, bridgeSurHor1N.name));
bridgeSurHor1N.addRule(new Rule(water0W.name, bridgeSurHor1N.name, bridgeSurHor1S.name, NOTHING));
bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, bridgeSurHor0S.name, bridgeEdge1.name, bridgeSurHor0S.name));
bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, NOTHING, bridgeCoastE.name, bridgeSurHor0S.name));
bridgeSurHor1S.addRule(new Rule(bridgeSurHor1S.name, bridgeSurHor0S.name, bridgeCoastW.name, NOTHING));
bridgeSurHor0N.addRule(new Rule(water0.name, bridgeSurHor1N.name, bridgeSurHor0N.name, water0.name));
bridgeSurHor0S.addRule(new Rule(bridgeSurHor0N.name, bridgeSurHor0S.name, bridgeEdge0.name, water0.name));
bridgeSurHor2N.addRule(new Rule(water0.name, water0.name, bridgeSurHor2N.name, bridgeSurHor1N.name));
bridgeSurHor2S.addRule(new Rule(bridgeSurHor2N.name, water0.name, bridgeEdge2.name, bridgeSurHor0S.name));
bridgeEdge0.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
bridgeEdge0.addRule(new Rule(bridgeEdge0.name, bridgeEdge1.name, water0.name, water0.name));
bridgeEdge1.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
bridgeEdge2.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, water0.name, bridgeEdge1.name));
bridgeEdge2.addRule(new Rule(bridgeEdge2.name, water0.name, water0.name, bridgeEdge1.name));
bridgeCoastW.addRule(new Rule(bridgeCoastW.name, bridgeEdge1.name, water0W.name, NOTHING));
bridgeCoastE.addRule(new Rule(bridgeCoastE.name, NOTHING, water0E.name, bridgeEdge1.name));

bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, bridgeSurVerW.name, water0.name));
bridgeSurVerW.addRule(new Rule(NOTHING, bridgeSurVerW.name, bridgeSurVerW.name, water0N.name));
bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, NOTHING, water0S.name));
bridgeSurVerW.addRule(new Rule(bridgeSurVerW.name, bridgeSurVerW.name, bridgeEdge0.name, water0.name));
bridgeSurVerW.addRule(new Rule(bridgeEdge1.name, bridgeSurVerW.name, bridgeSurVerW.name, bridgeEdge1.name));

bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0.name, bridgeSurVerE.name, bridgeSurVerW.name));
bridgeSurVerE.addRule(new Rule(NOTHING, water0N.name, bridgeSurVerE.name, bridgeSurVerW.name));
bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0S.name, NOTHING, bridgeSurVerW.name));
bridgeSurVerE.addRule(new Rule(bridgeSurVerE.name, water0.name, bridgeEdge2.name, bridgeSurVerW.name));
bridgeSurVerE.addRule(new Rule(bridgeEdge1.name, bridgeEdge1.name, bridgeSurVerE.name, bridgeSurVerW.name));

bridgeGroup.push(bridgeSurHor0N, bridgeSurHor1N, bridgeSurHor2N, bridgeSurHor0S, bridgeSurHor1S, bridgeSurHor2S, bridgeSurVerW, bridgeSurVerE, bridgeEdge0, bridgeEdge1, bridgeEdge2, bridgeCoastW, bridgeCoastE);

//add all to tileTypes
export let tileTypes = [];

groupPush(baseGroup, tileTypes);
groupPush(baseTransitionGroup, tileTypes);
groupPush(decoGroup, tileTypes);
groupPush(waterGroup, tileTypes);
groupPush(waterDecoGroup, tileTypes);
groupPush(stoneGroup, tileTypes);
groupPush(bridgeGroup, tileTypes);

console.log("Tile counter: " + tileTypes.length);
console.log(tileTypes);

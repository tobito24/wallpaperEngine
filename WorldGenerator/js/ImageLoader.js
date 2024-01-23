//TileSet Image, in it are all tiles
const tilesetImage = new Image();
tilesetImage.src = "img/tileset.jpg";

//tilesize in px
const tilesize = 32;

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

/*
   Class for a single tile
   Parameter
       name: name
       xPos, yPos: Coordinates in Image
       north, east, south, west: edge rules
       weight: (1 - 100) Weighted probability
*/
class Tile {
    static numberOfTileSets = 0;

    constructor(name, xPos, yPos, north, east, south, west, weight = 100) {
        this.id = Tile.numberOfTileSets;
        Tile.numberOfTileSets++;
        this.name = name;
        this.xPos = xPos;
        this.yPos = yPos;
        this.north = north;
        this.east = east;
        this.south = south;
        this.west = west;
        this.weight = weight;
    }

    draw(context, dx, dy, size) {
        let sx = this.xPos * tilesize;
        let sy = this.yPos * tilesize;
        let sw = tilesize;
        let sh = tilesize;

        context.drawImage(tilesetImage, sx, sy, sw, sh, dx, dy, size, size);
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
const VERY_OFTEN = 11;
const OFTEN_2 = 10;
const OFTEN_1 = 9;
const OFTEN_0 = 7;
const SOME_2 = 6;
const SOME_1 = 5;
const SOME_0 = 4;
const RARE_2 = 3;
const RARE_1 = 2;
const RARE_0 = 1;
const NEVER = 0;

//Tile Edges (for rules)
const GRASS = 0;
const ROAD = 1;
const ROAD_N = 2;
const ROAD_E = 3;
const ROAD_S = 4;
const ROAD_W = 5;
const WATER = 6;
const WATER_N = 7;
const WATER_E = 8;
const WATER_S = 9;
const WATER_W = 10;
const ROCK0 = 11;
const ROCK0_N = 12;
const ROCK0_E = 13;
const ROCK0_S = 14;
const ROCK0_W = 15;
const ROCK1 = 16;
const ROCK1_N = 17;
const ROCK1_E = 18;
const ROCK1_S = 19;
const ROCK1_W = 20;
const ROCK2 = 21;
const ROCK2_N = 22;
const ROCK2_E = 23;
const ROCK2_S = 24;
const ROCK2_W = 25;

const SET_GRASS_WOOD = 26;
const SET_GRASS_CLIFF = 27;
const SET_GRASS_DEKO_5 = 28;
const SET_GRASS_DEKO_6 = 29;
const SET_GRASS_DEKO_7 = 30;
const SET_ROAD_WOOD = 31;
const SET_ROAD_CLIFF = 32;
const SET_ROAD_DEKO_5 = 33;
const SET_ROAD_DEKO_6 = 34;
const SET_ROAD_DEKO_7 = 35;
const SET_WATER_DEKO_9_0 = 36;
const SET_WATER_DEKO_9_1 = 37;
const SET_WATER_DEKO_9_2 = 38;
const SET_WATER_DEKO_9_3 = 39;

const BRIDGE_SHORE_W = 40;
const BRIDGE_SHORE_E = 41;
const BRIDGE_EDGE_N = 42;
const BRIDGE_EDGE_SIDE = 43;
const BRIDGE_HOR_TOP_CONNECTOR = 44;
const BRIDGE_HOR_BOT_CONNECTOR = 45;
const BRIDGE_HOR_MID = 46;
const BRIDGE_HOR_START_W = 47;
const BRIDGE_HOR_START_E = 48;
const BRIDGE_HOR_END_W = 49;
const BRIDGE_HOR_END_E = 50;
const BRIDGE_VER_L_CONNECTOR = 51;
const BRIDGE_VER_R_CONNECTOR = 52;
const BRIDGE_VER_MID = 53;
const BRIDGE_VER_START_N = 54;
const BRIDGE_VER_START_S = 55;
const BRIDGE_VER_END_S = 56;
const BRIDGE_VER_TO_HOR = 57;

const BIG_TREE_H00 = 58;
const BIG_TREE_H01 = 59;
const BIG_TREE_H02 = 60;
const BIG_TREE_H03 = 61;
const BIG_TREE_H10 = 62;
const BIG_TREE_H11 = 63;
const BIG_TREE_H12 = 64;
const BIG_TREE_H13 = 65;
const BIG_TREE_V00 = 66;
const BIG_TREE_V01 = 67;
const BIG_TREE_V02 = 68;
const BIG_TREE_V10 = 69;
const BIG_TREE_V11 = 70;
const BIG_TREE_V12 = 71;
const BIG_TREE_V20 = 72;
const BIG_TREE_V21 = 73;
const BIG_TREE_V22 = 74;

const GRASS_WALKABLE = 75;

//All tile types
export let tileTypes = [];

//position in tilesetImage and rules for edges
//tileTypes.push(new Tile("name", X, Y, NORTH, EAST, SOUTH, WEST, RARE));

//grass
tileTypes.push(new Tile("Grass_0", 0, 0, GRASS, GRASS, GRASS, GRASS, VERY_OFTEN));

//grass - deko
tileTypes.push(new Tile("Grass_Deko_0", 3, 2, GRASS, GRASS, GRASS, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Grass_Deko_1", 4, 2, GRASS, GRASS, GRASS, GRASS, OFTEN_0));
tileTypes.push(new Tile("Grass_Deko_2", 5, 2, GRASS, GRASS, GRASS, GRASS, SOME_1));
tileTypes.push(new Tile("Grass_Deko_4", 6, 2, GRASS, GRASS, GRASS, GRASS, SOME_1));

//grass - deko sets
tileTypes.push(new Tile("Grass_Wood_0", 5, 1, GRASS, SET_GRASS_WOOD, GRASS, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Wood_1", 6, 1, GRASS, GRASS, GRASS, SET_GRASS_WOOD, RARE_1));

tileTypes.push(new Tile("Grass_Cliff_Left", 5, 0, GRASS, SET_GRASS_CLIFF, GRASS, GRASS, SOME_1));
tileTypes.push(new Tile("Grass_Cliff_Mid", 6, 0, GRASS, SET_GRASS_CLIFF, GRASS, SET_GRASS_CLIFF, OFTEN_0));
tileTypes.push(new Tile("Grass_Cliff_Right", 7, 0, GRASS, GRASS, GRASS, SET_GRASS_CLIFF, SOME_1));

tileTypes.push(new Tile("Grass_Deko_5_0", 3, 0, GRASS, GRASS, SET_GRASS_DEKO_5, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Deko_5_0", 3, 1, SET_GRASS_DEKO_5, GRASS, GRASS, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Deko_6_0", 4, 0, GRASS, GRASS, SET_GRASS_DEKO_6, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Deko_6_1", 4, 1, SET_GRASS_DEKO_6, GRASS, GRASS, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Deko_7_0", 7, 1, GRASS, GRASS, SET_GRASS_DEKO_7, GRASS, RARE_1));
tileTypes.push(new Tile("Grass_Deko_7_1", 7, 2, SET_GRASS_DEKO_7, GRASS, GRASS, GRASS, RARE_1));

//road                              
tileTypes.push(new Tile("Road_corner_NW", 0, 1, GRASS, ROAD_N, ROAD_W, GRASS, OFTEN_0));
tileTypes.push(new Tile("Road_edge_N", 1, 1, GRASS, ROAD_N, ROAD, ROAD_N, OFTEN_0));
tileTypes.push(new Tile("Road_corner_NE", 2, 1, GRASS, GRASS, ROAD_E, ROAD_N, OFTEN_0));

tileTypes.push(new Tile("Road_edge_W", 0, 2, ROAD_W, ROAD, ROAD_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Road", 1, 2, ROAD, ROAD, ROAD, ROAD, VERY_OFTEN));
tileTypes.push(new Tile("Road_edge_E", 2, 2, ROAD_E, GRASS, ROAD_E, ROAD, VERY_OFTEN));

tileTypes.push(new Tile("Road_Corner_SW", 0, 3, ROAD_W, ROAD_S, GRASS, GRASS, OFTEN_0));
tileTypes.push(new Tile("Road_edge_S", 1, 3, ROAD, ROAD_S, GRASS, ROAD_S, VERY_OFTEN));
tileTypes.push(new Tile("Road_Corner_SE", 2, 3, ROAD_E, GRASS, GRASS, ROAD_S, OFTEN_0));

tileTypes.push(new Tile("Road_Curve_NW", 0, 4, ROAD_W, ROAD, ROAD, ROAD_N, RARE_1));
tileTypes.push(new Tile("Road_Curve_NE", 1, 4, ROAD_E, ROAD_N, ROAD, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Diagonal_0", 2, 4, ROAD_E, ROAD_N, ROAD_W, ROAD_S, RARE_0));
tileTypes.push(new Tile("Road_Curve_SW", 0, 5, ROAD, ROAD, ROAD_W, ROAD_S, RARE_1));
tileTypes.push(new Tile("Road_Curve_SE", 1, 5, ROAD, ROAD_S, ROAD_E, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Diagonal_1", 2, 5, ROAD_W, ROAD_S, ROAD_E, ROAD_N, RARE_0));

//road - deko
tileTypes.push(new Tile("Road_Deko_0", 3, 5, ROAD, ROAD, ROAD, ROAD, VERY_OFTEN));
tileTypes.push(new Tile("Road_Deko_1", 4, 5, ROAD, ROAD, ROAD, ROAD, OFTEN_0));
tileTypes.push(new Tile("Road_Deko_2", 5, 5, ROAD, ROAD, ROAD, ROAD, SOME_1));
tileTypes.push(new Tile("Road_Deko_4", 6, 5, ROAD, ROAD, ROAD, ROAD, SOME_1));

tileTypes.push(new Tile("Road_Wood_0", 5, 4, ROAD, SET_ROAD_WOOD, ROAD, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Wood_1", 6, 4, ROAD, ROAD, ROAD, SET_ROAD_WOOD, RARE_1));

//road - deko sets
tileTypes.push(new Tile("Road_Cliff_Left", 5, 3, ROAD, SET_ROAD_CLIFF, ROAD, ROAD, SOME_1));
tileTypes.push(new Tile("Road_Cliff_Mid", 6, 3, ROAD, SET_ROAD_CLIFF, ROAD, SET_ROAD_CLIFF, OFTEN_0));
tileTypes.push(new Tile("Road_Cliff_Right", 7, 3, ROAD, ROAD, ROAD, SET_ROAD_CLIFF, SOME_1));

tileTypes.push(new Tile("Road_Deko_5_0", 3, 3, ROAD, ROAD, SET_ROAD_DEKO_5, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Deko_5_0", 3, 4, SET_ROAD_DEKO_5, ROAD, ROAD, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Deko_6_0", 4, 3, ROAD, ROAD, SET_ROAD_DEKO_6, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Deko_6_1", 4, 4, SET_ROAD_DEKO_6, ROAD, ROAD, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Deko_7_0", 7, 4, ROAD, ROAD, SET_ROAD_DEKO_7, ROAD, RARE_1));
tileTypes.push(new Tile("Road_Deko_7_1", 7, 5, SET_ROAD_DEKO_7, ROAD, ROAD, ROAD, RARE_1));

//water
tileTypes.push(new Tile("Water_corner_NW", 0, 9, GRASS, WATER_N, WATER_W, GRASS, OFTEN_0));
tileTypes.push(new Tile("Water_edge_N", 1, 9, GRASS, WATER_N, WATER, WATER_N, VERY_OFTEN));
tileTypes.push(new Tile("Road_corner_NE", 2, 9, GRASS, GRASS, WATER_E, WATER_N, OFTEN_0));

tileTypes.push(new Tile("Water_edge_W", 0, 10, WATER_W, WATER, WATER_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Water", 1, 10, WATER, WATER, WATER, WATER, VERY_OFTEN));
tileTypes.push(new Tile("Water_edge_E", 2, 10, WATER_E, GRASS, WATER_E, WATER, VERY_OFTEN));

tileTypes.push(new Tile("Water_Corner_SW", 0, 11, WATER_W, WATER_S, GRASS, GRASS, OFTEN_0));
tileTypes.push(new Tile("Water_edge_S", 1, 11, WATER, WATER_S, GRASS, WATER_S, VERY_OFTEN));
tileTypes.push(new Tile("Water_Corner_SE", 2, 11, WATER_E, GRASS, GRASS, WATER_S, OFTEN_0));

tileTypes.push(new Tile("Water_Curve_NW", 0, 12, WATER_W, WATER, WATER, WATER_N, RARE_1));
tileTypes.push(new Tile("Water_Curve_NE", 1, 12, WATER_E, WATER_N, WATER, WATER, RARE_1));
tileTypes.push(new Tile("Water_Diagonal_0", 2, 12, WATER_E, WATER_N, WATER_W, WATER_S, RARE_0));
tileTypes.push(new Tile("Water_Curve_SW", 0, 13, WATER, WATER, WATER_W, WATER_S, RARE_1));
tileTypes.push(new Tile("Water_Curve_SE", 1, 13, WATER, WATER_S, WATER_E, WATER, RARE_1));
tileTypes.push(new Tile("Water_Diagonal_1", 2, 13, WATER_W, WATER_S, WATER_E, WATER_N, RARE_0));

//water - deko
tileTypes.push(new Tile("Water_Deko_0", 3, 9, WATER, WATER, WATER, WATER, SOME_1));
tileTypes.push(new Tile("Water_Deko_1", 4, 9, WATER, WATER, WATER, WATER, SOME_1));
tileTypes.push(new Tile("Water_Deko_2", 5, 9, WATER, WATER, WATER, WATER, SOME_1));
tileTypes.push(new Tile("Water_Deko_3", 3, 10, WATER, WATER, WATER, WATER, SOME_1));
tileTypes.push(new Tile("Water_Deko_4", 4, 10, WATER, WATER, WATER, WATER, RARE_1));
tileTypes.push(new Tile("Water_Deko_5", 5, 10, WATER, WATER, WATER, WATER, RARE_0));
tileTypes.push(new Tile("Water_Deko_6", 7, 10, WATER, WATER, WATER, WATER, NEVER));
tileTypes.push(new Tile("Water_Deko_7", 3, 11, WATER, WATER, WATER, WATER, RARE_1));
tileTypes.push(new Tile("Water_Deko_8", 3, 12, WATER, WATER, WATER, WATER, RARE_0));

//water - deko sets
tileTypes.push(new Tile("Water_Deko_9_0", 4, 11, WATER, SET_WATER_DEKO_9_0, SET_WATER_DEKO_9_3, WATER, RARE_1));
tileTypes.push(new Tile("Water_Deko_9_1", 5, 11, WATER, WATER, SET_WATER_DEKO_9_1, SET_WATER_DEKO_9_0, RARE_1));
tileTypes.push(new Tile("Water_Deko_9_2", 5, 12, SET_WATER_DEKO_9_1, WATER, WATER, SET_WATER_DEKO_9_2, RARE_1));
tileTypes.push(new Tile("Water_Deko_9_3", 4, 12, SET_WATER_DEKO_9_3, SET_WATER_DEKO_9_2, WATER, WATER, RARE_1));

//bridge
tileTypes.push(new Tile("Bridge_shore_0", 0, 8, BRIDGE_SHORE_W, BRIDGE_EDGE_SIDE, WATER_W, GRASS, RARE_1));
tileTypes.push(new Tile("Bridge_shore_1", 5, 8, BRIDGE_SHORE_E, GRASS, WATER_E, BRIDGE_EDGE_SIDE, RARE_1));
tileTypes.push(new Tile("Bridge_edge_0", 2, 8, BRIDGE_EDGE_N, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, SOME_1));
tileTypes.push(new Tile("Bridge_edge_1", 1, 8, BRIDGE_EDGE_N, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, RARE_1));
tileTypes.push(new Tile("Bridge_edge_2", 3, 8, BRIDGE_EDGE_N, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, RARE_1));
tileTypes.push(new Tile("Bridge_edge_1", 1, 8, BRIDGE_EDGE_N, BRIDGE_EDGE_SIDE, WATER, WATER, RARE_1));
tileTypes.push(new Tile("Bridge_edge_2", 3, 8, BRIDGE_EDGE_N, WATER, WATER, BRIDGE_EDGE_SIDE, RARE_1));

tileTypes.push(new Tile("Bridge_hor_top_mid", 0, 6, WATER, BRIDGE_HOR_TOP_CONNECTOR, BRIDGE_HOR_MID, BRIDGE_HOR_TOP_CONNECTOR, SOME_0));
tileTypes.push(new Tile("Bridge_hor_top_start_W", 0, 6, WATER_W, BRIDGE_HOR_TOP_CONNECTOR, BRIDGE_HOR_START_W, GRASS, RARE_1));
tileTypes.push(new Tile("Bridge_hor_top_start_E", 0, 6, WATER_E, GRASS, BRIDGE_HOR_START_E, BRIDGE_HOR_TOP_CONNECTOR, RARE_1));
tileTypes.push(new Tile("Bridge_hor_top_end_W", 1, 6, WATER, BRIDGE_HOR_TOP_CONNECTOR, BRIDGE_HOR_END_W, WATER, RARE_1));
tileTypes.push(new Tile("Bridge_hor_top_end_E", 3, 6, WATER, WATER, BRIDGE_HOR_END_E, BRIDGE_HOR_TOP_CONNECTOR, RARE_1));

tileTypes.push(new Tile("Bridge_hor_bot_mid", 0, 7, BRIDGE_HOR_MID, BRIDGE_HOR_BOT_CONNECTOR, BRIDGE_EDGE_N, BRIDGE_HOR_BOT_CONNECTOR, SOME_0));
tileTypes.push(new Tile("Bridge_hor_bot_start_W", 0, 7, BRIDGE_HOR_START_W, BRIDGE_HOR_BOT_CONNECTOR, BRIDGE_SHORE_W, GRASS, RARE_1));
tileTypes.push(new Tile("Bridge_hor_bot_start_E", 0, 7, BRIDGE_HOR_START_E, GRASS, BRIDGE_SHORE_E, BRIDGE_HOR_BOT_CONNECTOR, RARE_1));
tileTypes.push(new Tile("Bridge_hor_bot_end_W", 1, 7, BRIDGE_HOR_END_W, BRIDGE_HOR_BOT_CONNECTOR, BRIDGE_EDGE_N, WATER, RARE_1));
tileTypes.push(new Tile("Bridge_hor_bot_end_E", 3, 7, BRIDGE_HOR_END_E, WATER, BRIDGE_EDGE_N, BRIDGE_HOR_BOT_CONNECTOR, RARE_1));

tileTypes.push(new Tile("Bridge_ver_l_mid", 6, 6, BRIDGE_VER_L_CONNECTOR, BRIDGE_VER_MID, BRIDGE_VER_L_CONNECTOR, WATER, SOME_0));
tileTypes.push(new Tile("Bridge_ver_l_start_N", 6, 6, GRASS, BRIDGE_VER_START_N, BRIDGE_VER_L_CONNECTOR, WATER_N, RARE_1));
tileTypes.push(new Tile("Bridge_ver_l_start_S", 6, 6, BRIDGE_VER_L_CONNECTOR, BRIDGE_VER_START_S, GRASS, WATER_S, RARE_1));
tileTypes.push(new Tile("Bridge_ver_l_end_S", 6, 6, BRIDGE_VER_L_CONNECTOR, BRIDGE_VER_END_S, BRIDGE_EDGE_N, WATER, RARE_1));
tileTypes.push(new Tile("Bridge_ver_l_to_hor", 6, 6, BRIDGE_EDGE_N, BRIDGE_VER_TO_HOR, BRIDGE_VER_L_CONNECTOR, BRIDGE_EDGE_SIDE, RARE_1));


tileTypes.push(new Tile("Bridge_ver_r_mid", 7, 6, BRIDGE_VER_R_CONNECTOR, WATER, BRIDGE_VER_R_CONNECTOR, BRIDGE_VER_MID, SOME_0));
tileTypes.push(new Tile("Bridge_ver_r_start_N", 7, 6, GRASS, WATER_N, BRIDGE_VER_R_CONNECTOR, BRIDGE_VER_START_N, RARE_1));
tileTypes.push(new Tile("Bridge_ver_r_start_S", 7, 6, BRIDGE_VER_R_CONNECTOR, WATER_S, GRASS, BRIDGE_VER_START_S, RARE_1));
tileTypes.push(new Tile("Bridge_ver_r_end_S", 7, 6, BRIDGE_VER_R_CONNECTOR, WATER, BRIDGE_EDGE_N, BRIDGE_VER_END_S, RARE_1));
tileTypes.push(new Tile("Bridge_ver_r_to_hor", 7, 6, BRIDGE_EDGE_N, BRIDGE_EDGE_SIDE, BRIDGE_VER_R_CONNECTOR, BRIDGE_VER_TO_HOR, RARE_1));

//rock - 0
tileTypes.push(new Tile("Rock0_corner_NW", 3, 14, GRASS, ROCK0_N, ROCK0_W, GRASS, OFTEN_0));
tileTypes.push(new Tile("Rock0_edge_N", 4, 14, GRASS, ROCK0_N, ROCK0, ROCK0_N, VERY_OFTEN));
tileTypes.push(new Tile("Rock0_corner_NE", 5, 14, GRASS, GRASS, ROCK0_E, ROCK0_N, OFTEN_0));
tileTypes.push(new Tile("Rock0_edge_W", 3, 15, ROCK0_W, ROCK0, ROCK0_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Rock0", 4, 15, ROCK0, ROCK0, ROCK0, ROCK0, VERY_OFTEN));
tileTypes.push(new Tile("Rock0_edge_E", 5, 15, ROCK0_E, GRASS, ROCK0_E, ROCK0, VERY_OFTEN));
tileTypes.push(new Tile("Rock0_Corner_SW", 3, 16, ROCK0_W, ROCK0_S, GRASS, GRASS, OFTEN_0));
tileTypes.push(new Tile("Rock1_edge_S", 4, 16, ROCK0, ROCK0_S, GRASS, ROCK0_S, VERY_OFTEN));
tileTypes.push(new Tile("Rock1_Corner_SE", 5, 16, ROCK0_E, GRASS, GRASS, ROCK0_S, OFTEN_0));

tileTypes.push(new Tile("Rock0_Curve_NW", 6, 14, ROCK0, ROCK0_S, ROCK0_E, ROCK0, RARE_1));
tileTypes.push(new Tile("Rock0_Curve_NE", 7, 14, ROCK0, ROCK0, ROCK0_W, ROCK0_S, RARE_1));
tileTypes.push(new Tile("Rock0_Curve_SW", 6, 15, ROCK0_E, ROCK0_N, ROCK0, ROCK0, RARE_1));
tileTypes.push(new Tile("Rock0_Curve_SE", 7, 15, ROCK0_W, ROCK0, ROCK0, ROCK0_N, RARE_1));

//rock - 1
tileTypes.push(new Tile("Rock1_corner_NW", 0, 14, ROCK0, ROCK1_N, ROCK1_W, ROCK0, OFTEN_0));
tileTypes.push(new Tile("Rock1_edge_N", 1, 14, ROCK0, ROCK1_N, ROCK1, ROCK1_N, VERY_OFTEN));
tileTypes.push(new Tile("Rock1_corner_NE", 2, 14, ROCK0, ROCK0, ROCK1_E, ROCK1_N, OFTEN_0));
tileTypes.push(new Tile("Rock1_edge_W", 0, 15, ROCK0_W, ROCK1, ROCK1_W, ROCK0, VERY_OFTEN));
tileTypes.push(new Tile("Rock1", 1, 15, ROCK1, ROCK1, ROCK1, ROCK1, VERY_OFTEN));
tileTypes.push(new Tile("Rock1_edge_E", 2, 15, ROCK1_E, ROCK0, ROCK1_E, ROCK1, VERY_OFTEN));
tileTypes.push(new Tile("Rock1_Corner_SW", 0, 16, ROCK1_W, ROCK1_S, ROCK0, ROCK0, OFTEN_0));
tileTypes.push(new Tile("Rock1_edge_S", 1, 16, ROCK0, ROCK1_S, ROCK0, ROCK1_S, VERY_OFTEN));
tileTypes.push(new Tile("Rock1_Corner_SE", 2, 16, ROCK1_E, ROCK0, ROCK0, ROCK1_S, OFTEN_0));

tileTypes.push(new Tile("Rock1_Curve_NW", 6, 16, ROCK1, ROCK1_S, ROCK1_E, ROCK1, RARE_1));
tileTypes.push(new Tile("Rock1_Curve_NE", 7, 16, ROCK1, ROCK1, ROCK1_W, ROCK1_S, RARE_1));
tileTypes.push(new Tile("Rock1_Curve_SW", 6, 17, ROCK1_E, ROCK1_N, ROCK1, ROCK1, RARE_1));
tileTypes.push(new Tile("Rock1_Curve_SE", 7, 17, ROCK1_W, ROCK1, ROCK1, ROCK1_N, RARE_1));

//rock - 2
tileTypes.push(new Tile("Rock2_corner_NW", 0, 17, ROCK1, ROCK2_N, ROCK2_W, ROCK1, OFTEN_0));
tileTypes.push(new Tile("Rock2_edge_N", 1, 17, ROCK1, ROCK2_N, ROCK2, ROCK2_N, VERY_OFTEN));
tileTypes.push(new Tile("Rock2_corner_NE", 2, 17, ROCK1, ROCK1, ROCK2_E, ROCK2_N, OFTEN_0));
tileTypes.push(new Tile("Rock2_edge_W", 0, 18, ROCK2_W, ROCK2, ROCK2_W, ROCK1, VERY_OFTEN));
tileTypes.push(new Tile("Rock2", 1, 18, ROCK2, ROCK2, ROCK2, ROCK2, VERY_OFTEN));
tileTypes.push(new Tile("Rock2_edge_E", 2, 18, ROCK2_E, ROCK1, ROCK2_E, ROCK2, VERY_OFTEN));
tileTypes.push(new Tile("Rock2_Corner_SW", 0, 19, ROCK2_W, ROCK2_S, ROCK1, ROCK1, OFTEN_0));
tileTypes.push(new Tile("Rock2_edge_S", 1, 19, ROCK2, ROCK2_S, ROCK1, ROCK2_S, VERY_OFTEN));
tileTypes.push(new Tile("Rock2_Corner_SE", 2, 19, ROCK2_E, ROCK1, ROCK1, ROCK2_S, OFTEN_0));

tileTypes.push(new Tile("Rock2_Curve_NW", 6, 18, ROCK2_W, ROCK2, ROCK2, ROCK2_N, RARE_1));
tileTypes.push(new Tile("Rock2_Curve_NE", 7, 18, ROCK2_E, ROCK2_N, ROCK2, ROCK2, RARE_1));
tileTypes.push(new Tile("Rock2_Curve_SW", 6, 19, ROCK2, ROCK2, ROCK2_W, ROCK2_S, RARE_1));
tileTypes.push(new Tile("Rock2_Curve_SE", 7, 19, ROCK2, ROCK2_S, ROCK2_E, ROCK2, RARE_1));

//tree
tileTypes.push(new Tile("BIG_TREE_00", 0, 20, GRASS, BIG_TREE_H00, BIG_TREE_V00, GRASS, RARE_0));
tileTypes.push(new Tile("BIG_TREE_01", 1, 20, GRASS, BIG_TREE_H10, BIG_TREE_V01, BIG_TREE_H00, RARE_0));
tileTypes.push(new Tile("BIG_TREE_02", 2, 20, GRASS, GRASS, BIG_TREE_V02, BIG_TREE_H10, RARE_0));
tileTypes.push(new Tile("BIG_TREE_10", 0, 21, BIG_TREE_V00, BIG_TREE_H01, BIG_TREE_V10, GRASS, RARE_0));
tileTypes.push(new Tile("BIG_TREE_11", 1, 21, BIG_TREE_V01, BIG_TREE_H11, BIG_TREE_V11, BIG_TREE_H01, RARE_0));
tileTypes.push(new Tile("BIG_TREE_12", 2, 21, BIG_TREE_V02, GRASS, BIG_TREE_V12, BIG_TREE_H11, RARE_0));
tileTypes.push(new Tile("BIG_TREE_20", 0, 22, BIG_TREE_V10, BIG_TREE_H02, BIG_TREE_V20, GRASS, RARE_0));
tileTypes.push(new Tile("BIG_TREE_21", 1, 22, BIG_TREE_V11, BIG_TREE_H12, BIG_TREE_V21, BIG_TREE_H02, RARE_0));
tileTypes.push(new Tile("BIG_TREE_22", 2, 22, BIG_TREE_V12, GRASS, BIG_TREE_V22, BIG_TREE_H12, RARE_0));
tileTypes.push(new Tile("BIG_TREE_30", 0, 23, BIG_TREE_V20, BIG_TREE_H03, GRASS, GRASS, RARE_0));
tileTypes.push(new Tile("BIG_TREE_31", 1, 23, BIG_TREE_V21, BIG_TREE_H13, GRASS, BIG_TREE_H03, RARE_0));
tileTypes.push(new Tile("BIG_TREE_32", 2, 23, BIG_TREE_V22, GRASS, GRASS, BIG_TREE_H13, RARE_0));


export default Tile;
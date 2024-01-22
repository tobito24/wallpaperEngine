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
const ALWAYS = 100;
const VERY_OFTEN = 90;
const OFTEN = 80;
const SOME = 50;
const RARE = 20;
const ULTRA_RARE = 10;
const NEVER = 1;

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
const ROCK = 11;
const ROCK_N = 12;
const ROCK_E = 13;
const ROCK_S = 14;
const ROCK_W = 15;

const SET_GRASS_WOOD = 16;
const SET_GRASS_CLIFF = 17;
const SET_GRASS_DEKO_5 = 18;
const SET_GRASS_DEKO_6 = 19;
const SET_GRASS_DEKO_7 = 20;
const SET_ROAD_WOOD = 21;
const SET_ROAD_CLIFF = 22;
const SET_ROAD_DEKO_5 = 23;
const SET_ROAD_DEKO_6 = 24;
const SET_ROAD_DEKO_7 = 25;
const SET_WATER_DEKO_9_0 = 26;
const SET_WATER_DEKO_9_1 = 27;
const SET_WATER_DEKO_9_2 = 28;
const SET_WATER_DEKO_9_3 = 29;


//All tile types
export let tileTypes = [];

//position in tilesetImage and rules for edges
//tileTypes.push(new Tile("name", X, Y, NORTH, EAST, SOUTH, WEST, RARE));

//grass
tileTypes.push(new Tile("Grass_0", 0, 0, GRASS, GRASS, GRASS, GRASS, ALWAYS));

//grass - deko
tileTypes.push(new Tile("Grass_Deko_0", 3, 2, GRASS, GRASS, GRASS, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Grass_Deko_1", 4, 2, GRASS, GRASS, GRASS, GRASS, OFTEN));
tileTypes.push(new Tile("Grass_Deko_2", 5, 2, GRASS, GRASS, GRASS, GRASS, SOME));
tileTypes.push(new Tile("Grass_Deko_4", 6, 2, GRASS, GRASS, GRASS, GRASS, SOME));

//grass - deko sets
tileTypes.push(new Tile("Grass_Wood_0", 5, 1, GRASS, SET_GRASS_WOOD, GRASS, GRASS, RARE));
tileTypes.push(new Tile("Grass_Wood_1", 6, 1, GRASS, GRASS, GRASS, SET_GRASS_WOOD, RARE));

tileTypes.push(new Tile("Grass_Cliff_Left", 5, 0, GRASS, SET_GRASS_CLIFF, GRASS, GRASS, SOME));
tileTypes.push(new Tile("Grass_Cliff_Mid", 6, 0, GRASS, SET_GRASS_CLIFF, GRASS, SET_GRASS_CLIFF, OFTEN));
tileTypes.push(new Tile("Grass_Cliff_Right", 7, 0, GRASS, GRASS, GRASS, SET_GRASS_CLIFF, SOME));

tileTypes.push(new Tile("Grass_Deko_5_0", 3, 0, GRASS, GRASS, SET_GRASS_DEKO_5, GRASS, RARE));
tileTypes.push(new Tile("Grass_Deko_5_0", 3, 1, SET_GRASS_DEKO_5, GRASS, GRASS, GRASS, RARE));
tileTypes.push(new Tile("Grass_Deko_6_0", 4, 0, GRASS, GRASS, SET_GRASS_DEKO_6, GRASS, RARE));
tileTypes.push(new Tile("Grass_Deko_6_1", 4, 1, SET_GRASS_DEKO_6, GRASS, GRASS, GRASS, RARE));
tileTypes.push(new Tile("Grass_Deko_7_0", 7, 1, GRASS, GRASS, SET_GRASS_DEKO_7, GRASS, RARE));
tileTypes.push(new Tile("Grass_Deko_7_1", 7, 2, SET_GRASS_DEKO_7, GRASS, GRASS, GRASS, RARE));

//road                              
tileTypes.push(new Tile("Road_corner_NW", 0, 1, GRASS, ROAD_N, ROAD_W, GRASS, OFTEN));
tileTypes.push(new Tile("Road_edge_N", 1, 1, GRASS, ROAD_N, ROAD, ROAD_N, VERY_OFTEN));
tileTypes.push(new Tile("Road_corner_NE", 2, 1, GRASS, GRASS, ROAD_E, ROAD_N, OFTEN));

tileTypes.push(new Tile("Road_edge_W", 0, 2, ROAD_W, ROAD, ROAD_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Road", 1, 2, ROAD, ROAD, ROAD, ROAD, ALWAYS));
tileTypes.push(new Tile("Road_edge_E", 2, 2, ROAD_E, GRASS, ROAD_E, ROAD, VERY_OFTEN));

tileTypes.push(new Tile("Road_Corner_SW", 0, 3, ROAD_W, ROAD_S, GRASS, GRASS, OFTEN));
tileTypes.push(new Tile("Road_edge_S", 1, 3, ROAD, ROAD_S, GRASS, ROAD_S, VERY_OFTEN));
tileTypes.push(new Tile("Road_Corner_SE", 2, 3, ROAD_E, GRASS, GRASS, ROAD_S, OFTEN));

tileTypes.push(new Tile("Road_Curve_NW", 0, 4, ROAD_W, ROAD, ROAD, ROAD_N, SOME));
tileTypes.push(new Tile("Road_Curve_NE", 1, 4, ROAD_E, ROAD_N, ROAD, ROAD, SOME));
tileTypes.push(new Tile("Road_Diagonal_0", 2, 4, ROAD_E, ROAD_N, ROAD_W, ROAD_S, RARE));
tileTypes.push(new Tile("Road_Curve_SW", 0, 5, ROAD, ROAD, ROAD_W, ROAD_S, SOME));
tileTypes.push(new Tile("Road_Curve_SE", 1, 5, ROAD, ROAD_S, ROAD_E, ROAD, SOME));
tileTypes.push(new Tile("Road_Diagonal_1", 2, 5, ROAD_W, ROAD_S, ROAD_E, ROAD_N, RARE));

//road - deko
tileTypes.push(new Tile("Road_Deko_0", 3, 5, ROAD, ROAD, ROAD, ROAD, VERY_OFTEN));
tileTypes.push(new Tile("Road_Deko_1", 4, 5, ROAD, ROAD, ROAD, ROAD, OFTEN));
tileTypes.push(new Tile("Road_Deko_2", 5, 5, ROAD, ROAD, ROAD, ROAD, SOME));
tileTypes.push(new Tile("Road_Deko_4", 6, 5, ROAD, ROAD, ROAD, ROAD, SOME));

tileTypes.push(new Tile("Road_Wood_0", 5, 4, ROAD, SET_ROAD_WOOD, ROAD, ROAD, RARE));
tileTypes.push(new Tile("Road_Wood_1", 6, 4, ROAD, ROAD, ROAD, SET_ROAD_WOOD, RARE));

//road - deko sets
tileTypes.push(new Tile("Road_Cliff_Left", 5, 3, ROAD, SET_ROAD_CLIFF, ROAD, ROAD, SOME));
tileTypes.push(new Tile("Road_Cliff_Mid", 6, 3, ROAD, SET_ROAD_CLIFF, ROAD, SET_ROAD_CLIFF, OFTEN));
tileTypes.push(new Tile("Road_Cliff_Right", 7, 3, ROAD, ROAD, ROAD, SET_ROAD_CLIFF, SOME));

tileTypes.push(new Tile("Road_Deko_5_0", 3, 3, ROAD, ROAD, SET_ROAD_DEKO_5, ROAD, RARE));
tileTypes.push(new Tile("Road_Deko_5_0", 3, 4, SET_ROAD_DEKO_5, ROAD, ROAD, ROAD, RARE));
tileTypes.push(new Tile("Road_Deko_6_0", 4, 3, ROAD, ROAD, SET_ROAD_DEKO_6, ROAD, RARE));
tileTypes.push(new Tile("Road_Deko_6_1", 4, 4, SET_ROAD_DEKO_6, ROAD, ROAD, ROAD, RARE));
tileTypes.push(new Tile("Road_Deko_7_0", 7, 4, ROAD, ROAD, SET_ROAD_DEKO_7, ROAD, RARE));
tileTypes.push(new Tile("Road_Deko_7_1", 7, 5, SET_ROAD_DEKO_7, ROAD, ROAD, ROAD, RARE));

//water
tileTypes.push(new Tile("Water_corner_NW", 0, 10, GRASS, WATER_N, WATER_W, GRASS, OFTEN));
tileTypes.push(new Tile("Water_edge_N", 1, 10, GRASS, WATER_N, WATER, WATER_N, VERY_OFTEN));
tileTypes.push(new Tile("Road_corner_NE", 2, 10, GRASS, GRASS, WATER_E, WATER_N, OFTEN));

tileTypes.push(new Tile("Water_edge_W", 0, 11, WATER_W, WATER, WATER_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Water", 1, 11, WATER, WATER, WATER, WATER, ALWAYS));
tileTypes.push(new Tile("Water_edge_E", 2, 11, WATER_E, GRASS, WATER_E, WATER, VERY_OFTEN));

tileTypes.push(new Tile("Water_Corner_SW", 0, 12, WATER_W, WATER_S, GRASS, GRASS, OFTEN));
tileTypes.push(new Tile("Water_edge_S", 1, 12, WATER, WATER_S, GRASS, WATER_S, VERY_OFTEN));
tileTypes.push(new Tile("Water_Corner_SE", 2, 12, WATER_E, GRASS, GRASS, WATER_S, OFTEN));

tileTypes.push(new Tile("Water_Curve_NW", 0, 13, WATER_W, WATER, WATER, WATER_N, SOME));
tileTypes.push(new Tile("Water_Curve_NE", 1, 13, WATER_E, WATER_N, WATER, WATER, SOME));
tileTypes.push(new Tile("Water_Diagonal_0", 2, 13, WATER_E, WATER_N, WATER_W, WATER_S, RARE));
tileTypes.push(new Tile("Water_Curve_SW", 0, 14, WATER, WATER, WATER_W, WATER_S, SOME));
tileTypes.push(new Tile("Water_Curve_SE", 1, 14, WATER, WATER_S, WATER_E, WATER, SOME));
tileTypes.push(new Tile("Water_Diagonal_1", 2, 14, WATER_W, WATER_S, WATER_E, WATER_N, RARE));

//water - deko
tileTypes.push(new Tile("Water_Deko_0", 3, 12, WATER, WATER, WATER, WATER, SOME));
tileTypes.push(new Tile("Water_Deko_1", 3, 13, WATER, WATER, WATER, WATER, SOME));
tileTypes.push(new Tile("Water_Deko_2", 3, 14, WATER, WATER, WATER, WATER, SOME));
tileTypes.push(new Tile("Water_Deko_3", 4, 12, WATER, WATER, WATER, WATER, SOME));
tileTypes.push(new Tile("Water_Deko_4", 5, 12, WATER, WATER, WATER, WATER, NEVER));
tileTypes.push(new Tile("Water_Deko_5", 3, 11, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Water_Deko_6", 4, 11, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Water_Deko_7", 5, 11, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Water_Deko_8", 7, 12, WATER, WATER, WATER, WATER, ULTRA_RARE));

//water - deko sets
tileTypes.push(new Tile("Water_Deko_9_0", 4, 13, WATER, SET_WATER_DEKO_9_0, SET_WATER_DEKO_9_3, WATER, RARE));
tileTypes.push(new Tile("Water_Deko_9_1", 5, 13, WATER, WATER, SET_WATER_DEKO_9_1, SET_WATER_DEKO_9_0, RARE));
tileTypes.push(new Tile("Water_Deko_9_2", 5, 14, SET_WATER_DEKO_9_1, WATER, WATER, SET_WATER_DEKO_9_2, RARE));
tileTypes.push(new Tile("Water_Deko_9_3", 4, 14, SET_WATER_DEKO_9_3, SET_WATER_DEKO_9_2, WATER, WATER, RARE));

const BRIDGE_EDGE_TOP = 30
const BRIDGE_EDGE_SIDE = 31
//water/grass transition aka. bridge
/*
tileTypes.push(new Tile("Bridge_shore_0", 0, 8, BRIDGE_EDGE_TOP, BRIDGE_EDGE_SIDE, WATER_W, GRASS, RARE));
tileTypes.push(new Tile("Bridge_shore_1", 5, 8, BRIDGE_EDGE_TOP, GRASS, WATER_E, BRIDGE_EDGE_SIDE, RARE));
tileTypes.push(new Tile("Bridge_edge_0", 2, 8, BRIDGE_EDGE_TOP, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, RARE));
tileTypes.push(new Tile("Bridge_edge_1", 1, 8, BRIDGE_EDGE_TOP, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, RARE));
tileTypes.push(new Tile("Bridge_edge_2", 3, 8, BRIDGE_EDGE_TOP, BRIDGE_EDGE_SIDE, WATER, BRIDGE_EDGE_SIDE, RARE));
tileTypes.push(new Tile("Bridge_surface_horizontal_bot", X, Y, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Bridge_surface_horizontal_top", X, Y, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Bridge_surface_vertical_left", X, Y, WATER, WATER, WATER, WATER, RARE));
tileTypes.push(new Tile("Bridge_surface_vertical_right", X, Y, WATER, WATER, WATER, WATER, RARE));
*/

//rock
tileTypes.push(new Tile("Rock_corner_NW", 3, 15, GRASS, ROCK_N, ROCK_W, GRASS, OFTEN));
tileTypes.push(new Tile("Rock_edge_N", 4, 15, GRASS, ROCK_N, ROCK, ROCK_N, VERY_OFTEN));
tileTypes.push(new Tile("Rock_corner_NE", 5, 15, GRASS, GRASS, ROCK_E, ROCK_N, OFTEN));

tileTypes.push(new Tile("Rock_edge_W", 3, 16, ROCK_W, ROCK, ROCK_W, GRASS, VERY_OFTEN));
tileTypes.push(new Tile("Rock", 4, 16, ROCK, ROCK, ROCK, ROCK, ALWAYS));
tileTypes.push(new Tile("Rock_edge_E", 5, 16, ROCK_E, GRASS, ROCK_E, ROCK, VERY_OFTEN));

tileTypes.push(new Tile("Rock_Corner_SW", 3, 17, ROCK_W, ROCK_S, GRASS, GRASS, OFTEN));
tileTypes.push(new Tile("Rock_edge_S", 4, 17, ROCK, ROCK_S, GRASS, ROCK_S, VERY_OFTEN));
tileTypes.push(new Tile("Rock_Corner_SE", 5, 17, ROCK_E, GRASS, GRASS, ROCK_S, OFTEN));

//tree

export default Tile;
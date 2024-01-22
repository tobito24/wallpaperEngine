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
*/
class Tile {
    static numberOfTileSets = 0;

    constructor(name, xPos, yPos, north, east, south, west) {
        this.id = Tile.numberOfTileSets;
        Tile.numberOfTileSets++;
        this.name = name;
        this.xPos = xPos;
        this.yPos = yPos;
        this.north = north;
        this.east = east;
        this.south = south;
        this.west = west;
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


//All tile types
export let tileTypes = [];

//position in tilesetImage and rules for edges
//road                              
tileTypes.push(new Tile("Road_corner_NW", 0, 0, GRASS, ROAD_N, ROAD_W, GRASS));
tileTypes.push(new Tile("Road_edge_N", 1, 0, GRASS, ROAD_N, ROAD, ROAD_N));
tileTypes.push(new Tile("Road_corner_NE", 2, 0, GRASS, GRASS, ROAD_E, ROAD_N));

tileTypes.push(new Tile("Road_edge_W", 0, 1, ROAD_W, ROAD, ROAD_W, GRASS));
tileTypes.push(new Tile("Road", 1, 1, ROAD, ROAD, ROAD, ROAD));
tileTypes.push(new Tile("Road_edge_E", 2, 1, ROAD_E, GRASS, ROAD_E, ROAD));

tileTypes.push(new Tile("Road_Corner_SW", 0, 2, ROAD_W, ROAD_S, GRASS, GRASS));
tileTypes.push(new Tile("Road_edge_S", 1, 2, ROAD, ROAD_S, GRASS, ROAD_S));
tileTypes.push(new Tile("Road_Corner_SE", 2, 2, ROAD_E, GRASS, GRASS, ROAD_S));

//water
tileTypes.push(new Tile("Water_corner_NW", 3, 0, GRASS, WATER_N, WATER_W, GRASS));
tileTypes.push(new Tile("Water_edge_N", 4, 0, GRASS, WATER_N, WATER, WATER_N));
tileTypes.push(new Tile("Road_corner_NE", 5, 0, GRASS, GRASS, WATER_E, WATER_N));

tileTypes.push(new Tile("Water_edge_W", 3, 1, WATER_W, WATER, WATER_W, GRASS));
tileTypes.push(new Tile("Water", 4, 1, WATER, WATER, WATER, WATER));
tileTypes.push(new Tile("Water_edge_E", 5, 1, WATER_E, GRASS, WATER_E, WATER));

tileTypes.push(new Tile("Water_Corner_SW", 3, 2, WATER_W, WATER_S, GRASS, GRASS));
tileTypes.push(new Tile("Water_edge_S", 4, 2, WATER, WATER_S, GRASS, WATER_S));
tileTypes.push(new Tile("Water_Corner_SE", 5, 2, WATER_E, GRASS, GRASS, WATER_S));

//grass
tileTypes.push(new Tile("Grass_0", 6, 0, GRASS, GRASS, GRASS, GRASS));
tileTypes.push(new Tile("Grass_1", 7, 0, GRASS, GRASS, GRASS, GRASS));

//rock
tileTypes.push(new Tile("Rock_corner_NW", 0, 3, GRASS, ROCK_N, ROCK_W, GRASS));
tileTypes.push(new Tile("Rock_edge_N", 1, 3, GRASS, ROCK_N, ROCK, ROCK_N));
tileTypes.push(new Tile("Rock_corner_NE", 2, 3, GRASS, GRASS, ROCK_E, ROCK_N));

tileTypes.push(new Tile("Rock_edge_W", 0, 4, ROCK_W, ROCK, ROCK_W, GRASS));
tileTypes.push(new Tile("Rock", 1, 4, ROCK, ROCK, ROCK, ROCK));
tileTypes.push(new Tile("Rock_edge_E", 2, 4, ROCK_E, GRASS, ROCK_E, ROCK));

tileTypes.push(new Tile("Rock_Corner_SW", 0, 5, ROCK_W, ROCK_S, GRASS, GRASS));
tileTypes.push(new Tile("Rock_edge_S", 1, 5, ROCK, ROCK_S, GRASS, ROCK_S));
tileTypes.push(new Tile("Rock_Corner_SE", 2, 5, ROCK_E, GRASS, GRASS, ROCK_S));


export default Tile;
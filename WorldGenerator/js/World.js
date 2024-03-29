import WorldPiece from "./WorldPiece.js";
import { writeModeGroup } from "./Tiles.js";
import { tileTypes } from "./Tiles.js";

const FREEZE_MODE = "FREEZE_MODE";
const WRITE_MODE = "WRITE_MODE";

class World {

    static autoStart = false;
    static highlightMode = FREEZE_MODE;

    constructor(width, height) {

        this.width = width <= 0 ? 1 : width;
        this.height = height <= 0 ? 1 : height;
        this.world;
        this.previousWorldPiece;

        this.createWorld(true);
    }

    createWorld(withClear = true) {

        const highlights = [];

        if (withClear) {

            this.world = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                this.world[x] = new Array(this.height);
                for (let y = 0; y < this.height; y++) {
                    this.world[x][y] = new WorldPiece(x, y, tileTypes);
                }
            }

        } else if (World.highlightMode === FREEZE_MODE) {

            for (let x = 0; x < this.width; x++)
                for (let y = 0; y < this.height; y++)
                    if (!this.world[x][y].isHighlight)
                        this.world[x][y] = new WorldPiece(x, y, tileTypes);
                    else
                        highlights.push(this.world[x][y]);

        } else if (World.highlightMode === WRITE_MODE) {

            const rng = Math.floor(Math.random() * writeModeGroup.length);
            const tile = writeModeGroup[rng];
            const filteredTileTypes = tileTypes.filter(tileType => tileType.id !== tile.id);

            for (let x = 0; x < this.width; x++)
                for (let y = 0; y < this.height; y++)
                    if (this.world[x][y].isHighlight) {
                        this.world[x][y] = new WorldPiece(x, y, [tile]);
                        this.world[x][y].isHighlight = true;
                        highlights.push(this.world[x][y]);

                    } else if (this.world[x][y].isNeighborHighlight()) {
                        this.world[x][y] = new WorldPiece(x, y, filteredTileTypes);

                    } else {
                        this.world[x][y] = new WorldPiece(x, y, tileTypes);
                    }
        }

        //Neighborhood relationship
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                //North: y-1, East: x+1, South: y+1, West: x-1
                const northPiece = (y > 0) ? this.world[x][y - 1] : null;
                const eastPiece = (x < this.world.length - 1) ? this.world[x + 1][y] : null;
                const southPiece = (y < this.world[x].length - 1) ? this.world[x][y + 1] : null;
                const westPiece = (x > 0) ? this.world[x - 1][y] : null;

                this.world[x][y].setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece);
            }
        }

        for (let i = 0; i < highlights.length; i++)
            highlights[i].callNeighbors(highlights[i], highlights[i].xPos, highlights[i].yPos)

        if (highlights.length === 0)
            this.randomFirstTick();
    }

    randomFirstTick() {
        const rngX = Math.floor(Math.random() * this.width);
        const rngY = Math.floor(Math.random() * this.height);
        this.world[rngX][rngY].chooseTile();
        this.previousWorldPiece = this.world[rngX][rngY];
    }

    nextWorldPiece() {


        let nextWorldPiece = [];
        let lowestEntropy = Number.MAX_SAFE_INTEGER;

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                //WorldPiece already has tile
                if (this.world[x][y].isUntouched || this.world[x][y].tile != null) {
                    continue;
                }
                else if (this.world[x][y].getEntropy() < lowestEntropy) {
                    lowestEntropy = this.world[x][y].getEntropy();
                    nextWorldPiece = [];
                    nextWorldPiece.push(this.world[x][y]);
                }
                else if (this.world[x][y].getEntropy() === lowestEntropy) {
                    nextWorldPiece.push(this.world[x][y]);
                }
            }
        }

        if (nextWorldPiece.length > 0) {
            const rng = Math.floor(Math.random() * nextWorldPiece.length);
            nextWorldPiece[rng].chooseTile(this.previousWorldPiece);
            this.previousWorldPiece = nextWorldPiece[rng];

        } else if (World.autoStart) {
            this.createWorld(false);
        } else {
            return false;
        }

        return true;
    }

    drawWorld(context, squareSize, offsetX, offsetY, isSuppressHighlight) {
        let color;
        if (isSuppressHighlight)
            color = null;
        else
            color = World.highlightMode === WRITE_MODE ? "#ffff00" : "#00ffff";

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.world[x][y].draw(context, squareSize, offsetX, offsetY, color);
            }
        }
    }

    highlightArea(xStart, yStart, xEnd, yEnd) {

        xStart = xStart < 0 ? 0 : xStart;
        xStart = xStart >= this.width ? this.width - 1 : xStart;
        yStart = yStart < 0 ? 0 : yStart;
        yStart = yStart >= this.height ? this.height - 1 : yStart;

        xEnd = xEnd < 0 ? 0 : xEnd;
        xEnd = xEnd >= this.width ? this.width - 1 : xEnd;
        yEnd = yEnd < 0 ? 0 : yEnd;
        yEnd = yEnd >= this.height ? this.height - 1 : yEnd;

        if (xEnd < xStart) {
            const help = xEnd;
            xEnd = xStart;
            xStart = help;
        }

        if (yEnd < yStart) {
            const help = yEnd;
            yEnd = yStart;
            yStart = help;
        }

        for (let x = xStart; x <= xEnd; x++) {
            for (let y = yStart; y <= yEnd; y++) {
                this.world[x][y].isHighlight = !this.world[x][y].isHighlight;
            }
        }
    }

    resetHighlight() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.world[x][y].isHighlight = false;
            }
        }
    }

    setAccuracy(accuracy) {
        WorldPiece.accuracy = accuracy;
    }
}

export default World;
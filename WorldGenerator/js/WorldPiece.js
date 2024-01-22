import { tileTypes } from "./ImageLoader.js";
//import Tile from "./ImageLoader.js";

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

class WorldPiece {
    constructor(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.possiblePieces = Array.from(tileTypes);
        this.tile = null;
        this.northPiece = null;
        this.eastPiece = null;
        this.southPiece = null;
        this.westPiece = null;
    }

    setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece) {
        this.northPiece = northPiece;
        this.eastPiece = eastPiece;
        this.southPiece = southPiece;
        this.westPiece = westPiece;
    }

    draw(context, squareSize, offsetX, offsetY) {

        let dx = this.xPos * squareSize + offsetX;
        let dy = this.yPos * squareSize + offsetY;

        if (this.tile === null) {
            //black box
            context.fillStyle = "#0f1923";
            context.fillRect(dx, dy, squareSize, squareSize);

            //text change depending on the entropy
            const percentageEntropy = 1 - this.getEntropy() / tileTypes.length;

            const fontSize = Math.max(squareSize * percentageEntropy, squareSize * 0.25);

            let green = Math.round(255 * (1 - percentageEntropy));
            green = green.toString(16).padStart(2, "0");
            
            //entropy text
            context.fillStyle = "#" + green + "FF" + green;
            context.font = fontSize + "px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(this.getEntropy(), dx + squareSize / 2, dy + squareSize / 2);

        } else {
            //Tile
            this.tile.draw(context, dx, dy, squareSize);
        }
    }

    getEntropy() {
        return this.possiblePieces.length;
    }

    updateEntropy() {
        let oldEntropy = this.getEntropy();

        //possiblePieces update
        let newPossiblePieces = [];

        for (let i = 0; i < this.possiblePieces.length; i++) {

            const northEdge = this.possiblePieces[i].getEdge(NORTH);
            const eastEdge = this.possiblePieces[i].getEdge(EAST);
            const southEdge = this.possiblePieces[i].getEdge(SOUTH);
            const westEdge = this.possiblePieces[i].getEdge(WEST);

            if (this.northPiece != null) {
                if (!this.northPiece.isValidEdge(SOUTH, northEdge)) {
                    continue;
                }
            }

            if (this.eastPiece != null) {
                if (!this.eastPiece.isValidEdge(WEST, eastEdge)) {
                    continue;
                }
            }

            if (this.southPiece != null) {
                if (!this.southPiece.isValidEdge(NORTH, southEdge)) {
                    continue;
                }
            }

            if (this.westPiece != null) {
                if (!this.westPiece.isValidEdge(EAST, westEdge)) {
                    continue;
                }
            }

            newPossiblePieces.push(this.possiblePieces[i]);
        }

        this.possiblePieces = newPossiblePieces;

        //entropy has changed -> call neighbors
        if (oldEntropy != this.getEntropy()) {
            this.callNeighbors();
        }
    }



    isValidEdge(direction, edge) {
        let valid = false;

        for (let i = 0; i < this.possiblePieces.length; i++) {

            let tmpEdge = this.possiblePieces[i].getEdge(direction);

            if (tmpEdge === edge) {
                valid = true;
            }
        }

        return valid;
    }

    chooseTile() {

        let totalWeight = 0;
        for (let i = 0; i < this.possiblePieces.length; i++) {
            totalWeight += this.possiblePieces[i].weight;
        }

        const rngWeight = Math.floor(Math.random() * totalWeight);

        let tmpWeight = 0;

        for (let i = 0; i < this.possiblePieces.length; i++) {
            tmpWeight += this.possiblePieces[i].weight;

            if(tmpWeight >= rngWeight){
                this.tile = this.possiblePieces[i];
                this.possiblePieces = [this.tile];
                break;
            }
        }

        this.callNeighbors();
    }

    callNeighbors() {
        if (this.northPiece != null) {
            this.northPiece.updateEntropy();
        }
        if (this.eastPiece != null) {
            this.eastPiece.updateEntropy();
        }
        if (this.southPiece != null) {
            this.southPiece.updateEntropy();
        }
        if (this.westPiece != null) {
            this.westPiece.updateEntropy();
        }
    }


}

export default WorldPiece;
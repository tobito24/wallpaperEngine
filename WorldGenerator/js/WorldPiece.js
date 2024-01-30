import { tileTypes } from "./ImageLoader.js";

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

class WorldPiece {
    constructor(xPos, yPos) {
        this.xPos = xPos;
        this.yPos = yPos;

        this.possibleTiles = Array.from(tileTypes);
        this.tile = null; //main tile
        this.rule = null; //selected rule
        this.baseTiles = null; //tile for transparent tiles

        //neighborhoodRelationship
        this.northPiece = null;
        this.eastPiece = null;
        this.southPiece = null;
        this.westPiece = null;

        this.isErrorState = false;
        this.isHighlight = false;
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

            const fontSize = squareSize * percentageEntropy;

            let green = Math.round(255 * (1 - percentageEntropy));
            green = green.toString(16).padStart(2, "0");

            //entropy text
            context.fillStyle = "#" + green + "FF" + green;
            context.font = fontSize + "px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(this.getEntropy(), dx + squareSize / 2, dy + squareSize / 2);

        } else {
            if (this.baseTiles != null){
                for (let i = this.baseTiles.length - 1; i >= 0; i--) {
                    this.baseTiles[i].draw(context, dx, dy, squareSize);
                }
            }

            this.tile.draw(context, dx, dy, squareSize);
        }

        if (this.isErrorState) {
            context.strokeStyle = "#ff0000";
            context.lineWidth = 2;
            context.strokeRect(dx, dy, squareSize, squareSize);
        }

        if(this.isHighlight){
            context.strokeStyle = "#00ffff";
            context.lineWidth = 2;
            context.strokeRect(dx, dy, squareSize, squareSize);
        }
    }

    getEntropy() {
        return this.possibleTiles.length;
    }

    chooseTile() {

        //random choose with weights
        let totalWeight = 0;
        for (let i = 0; i < this.possibleTiles.length; i++) {
            totalWeight += this.possibleTiles[i].weight;
        }

        const rngWeight = Math.random() * totalWeight;

        let tmpWeight = 0;

        for (let i = 0; i < this.possibleTiles.length; i++) {
            tmpWeight += this.possibleTiles[i].weight;

            if (tmpWeight >= rngWeight) {
                this.tile = this.possibleTiles[i];
                this.possibleTiles = [this.tile];
                break;
            }
        }

        //tile fixed to one rule
        const possibleRules = this.getPossibleRules();

        if (possibleRules.length === 0) {
            this.isErrorState = true;
            console.log("ERROR001: WordPiece.chooseTile() - cant fixed to one rule");
            this.rule = this.tile.rules[0];
        } else {

            const rng = Math.floor(Math.random() * possibleRules.length);

            this.rule = possibleRules[rng];
            this.baseTiles = this.rule.getBaseStack();
        }

        //update Neighbors
        this.callNeighbors(this);
    }

    getPossibleRules() {
        const possibleRules = [];

        for (let i = 0; i < this.tile.rules.length; i++) {

            const tmpRule = this.tile.rules[i];

            let northValid, easthValid, southValid, westValid;
            northValid = this.isCompatible(tmpRule.getEdge(NORTH), this.northPiece, SOUTH);
            easthValid = this.isCompatible(tmpRule.getEdge(EAST), this.eastPiece, WEST);
            southValid = this.isCompatible(tmpRule.getEdge(SOUTH), this.southPiece, NORTH);
            westValid = this.isCompatible(tmpRule.getEdge(WEST), this.westPiece, EAST);

            if (northValid && easthValid && southValid && westValid)
                possibleRules.push(tmpRule);
        }

        return possibleRules;
    }

    isCompatible(edge, piece, edgeDirectionPiece) {

        if (piece === null) return true;

        if (piece.rule != null) return edge === piece.rule.getEdge(edgeDirectionPiece);

        let isValid = false;

        //every rule of every tile is looked up
        for (let i = 0; i < piece.possibleTiles.length; i++) {
            let tmpNeighborTile = piece.possibleTiles[i];

            for (let j = 0; j < tmpNeighborTile.rules.length; j++) {
                const tmpEdge = tmpNeighborTile.rules[j].getEdge(edgeDirectionPiece);

                if (tmpEdge === edge) {
                    isValid = true;
                    break;
                }
            }

            if (isValid) break;
        }

        return isValid;
    }

    callNeighbors(sourcePiece) {

        if (this.northPiece != null && this.northPiece != sourcePiece) {
            this.northPiece.updateEntropy(this);
        }
        if (this.eastPiece != null && this.eastPiece != sourcePiece) {
            this.eastPiece.updateEntropy(this);
        }
        if (this.southPiece != null && this.southPiece != sourcePiece) {
            this.southPiece.updateEntropy(this);
        }
        if (this.westPiece != null && this.westPiece != sourcePiece) {
            this.westPiece.updateEntropy(this);
        }
    }

    updateEntropy(scourcePiece) {

        if (this.tile != null) return;

        let oldEntropy = this.getEntropy();

        //possibleTiles update
        let newPossibleTiles = [];

        for (let i = 0; i < this.possibleTiles.length; i++) {

            const tmpTile = this.possibleTiles[i];

            for (let j = 0; j < tmpTile.rules.length; j++) {
                const tmpRule = tmpTile.rules[j];

                let northValid, easthValid, southValid, westValid;
                northValid = this.isCompatible(tmpRule.getEdge(NORTH), this.northPiece, SOUTH);
                easthValid = this.isCompatible(tmpRule.getEdge(EAST), this.eastPiece, WEST);
                southValid = this.isCompatible(tmpRule.getEdge(SOUTH), this.southPiece, NORTH);
                westValid = this.isCompatible(tmpRule.getEdge(WEST), this.westPiece, EAST);

                if (northValid && easthValid && southValid && westValid){
                    newPossibleTiles.push(tmpTile);
                    break;
                }
            }
        }

        if (newPossibleTiles.length != 0) {
            this.possibleTiles = newPossibleTiles;
        } else {
            this.isErrorState = true;
        }

        //entropy has changed -> call neighbors
        if (oldEntropy != this.getEntropy()) {
            this.callNeighbors(scourcePiece);
        }
    }
}

export default WorldPiece;
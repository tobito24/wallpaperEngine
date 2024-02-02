import { tileTypes } from "./Tiles.js";

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;

class WorldPiece {
    constructor(xPos, yPos, tile = null) {
        this.xPos = xPos;
        this.yPos = yPos;
        this.tile = tile; //main tile

        if(tile != null){
            this.possibleTiles = [tile];
            this.rule = tile.rules[0];
            this.baseTiles = this.rule.getBaseStack();
        } else {
            this.possibleTiles = Array.from(tileTypes);
            this.rule = null;
            this.baseTiles = null;
        }

        //neighborhoodRelationship
        this.northPiece = null;
        this.eastPiece = null;
        this.southPiece = null;
        this.westPiece = null;

        //marks
        this.isErrorState = false;
        this.isHighlight = false;
    }

    setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece) {
        this.northPiece = northPiece;
        this.eastPiece = eastPiece;
        this.southPiece = southPiece;
        this.westPiece = westPiece;
    }

    draw(context, squareSize, offsetX, offsetY, highlightColor = "#00ffff") {

        let dx = this.xPos * squareSize + offsetX;
        let dy = this.yPos * squareSize + offsetY;

        if (this.tile === null) {
            //black box
            context.fillStyle = "#0f1923";
            context.fillRect(dx, dy, squareSize, squareSize);

            //text change depending on the entropy
            const percentageEntropy = this.getEntropy() / tileTypes.length;

            const fontSize = Math.max(squareSize * (1 - percentageEntropy) * 0.95, squareSize * 0.30);

            let green = percentageEntropy < 0.6 ? Math.round(255 * (1 - percentageEntropy)) : Math.round(255 * percentageEntropy);
            let red = percentageEntropy < 0.4 ? Math.round(255 * percentageEntropy) : Math.round(255 * (1 - percentageEntropy));
            let blue = percentageEntropy < 0.2 ? Math.round(255 * percentageEntropy) : Math.round(255 * (1 - percentageEntropy));

            if (percentageEntropy > 0.8)
                green = red = blue = 255;

            red = red.toString(16).padStart(2, "0");
            green = green.toString(16).padStart(2, "0");
            blue = blue.toString(16).padStart(2, "0");

            //entropy text
            context.fillStyle = "#" + red + green + blue;
            context.font = fontSize + "px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(this.getEntropy(), dx + squareSize / 2, dy + squareSize / 2);

        } else {
            if (this.baseTiles != null) {
                for (let i = this.baseTiles.length - 1; i >= 0; i--) {
                    this.baseTiles[i].draw(context, dx, dy, squareSize);
                }
            }

            this.tile.draw(context, dx, dy, squareSize);
        }

        if (this.isErrorState) {
            context.strokeStyle = "#ff0000";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        if (this.isHighlight) {

            context.strokeStyle = highlightColor;
            context.lineWidth = 2;

            if (this.northPiece != null && !this.northPiece.isHighlight)
                context.strokeRect(dx + 1, dy + 1, squareSize - 2, 0);

            if (this.eastPiece != null && !this.eastPiece.isHighlight)
                context.strokeRect(dx + squareSize - 1, dy + 1, 0, squareSize - 2);

            if (this.southPiece != null && !this.southPiece.isHighlight)
                context.strokeRect(dx + 1, dy + squareSize - 1, squareSize - 2, 0);

            if (this.westPiece != null && !this.westPiece.isHighlight)
                context.strokeRect(dx + 1, dy + 1, 0, squareSize - 2);

        }
    }

    getEntropy() {
        return this.possibleTiles.length;
    }

    chooseTile(previousPiece = null) {

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
            //error
            this.isErrorState = true;
            console.log("ERROR001: WordPiece.chooseTile() - cant fixed to one rule");
            this.rule = this.tile.rules[0];

        } else if (possibleRules.length === 1) {
            //sure
            this.rule = possibleRules[0];

        } else if (previousPiece !== null) {
            //unsure, orientation on the last tile (Solution for the "fixed structures BUG")
            for (let i = 0; i < possibleRules.length; i++) {
                const tmpBaseTiles = possibleRules[i].getBaseStack();
                if (haveSameContent(previousPiece.baseTiles, tmpBaseTiles)) {
                    this.rule = possibleRules[i];
                    break;
                }
            }
        }

        if (this.rule === null) {
            //TODO: weighted decision
            const rng = Math.floor(Math.random() * possibleRules.length);
            this.rule = possibleRules[rng];
        }

        this.baseTiles = this.rule.getBaseStack();

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

                if (northValid && easthValid && southValid && westValid) {
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

//help function
function haveSameContent(array0, array1) {
    if (array0.length !== array1.length)
        return false;
    for (let i = 0; i < array0.length; i++)
        if (array0[i] !== array1[i])
            return false;
    return true;
}

export default WorldPiece;
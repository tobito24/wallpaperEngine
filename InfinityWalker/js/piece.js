import { allTileTypes, walkableTiles } from "./tiles.js";
import { DIRECTION } from "./config.js";

export default class WorldPiece {
    static accuracy = 2;

    constructor(pieceX, pieceY, isPath = false) {
        this.pieceX = pieceX;
        this.pieceY = pieceY;
        this.isPath = isPath;
        this.possibleTiles = Array.from(isPath ? walkableTiles : allTileTypes);
        this.startEntropy = this.possibleTiles.length;

        this.tile = null;
        this.rule = null;
        this.baseTiles = null;

        this.northPiece = null;
        this.eastPiece = null;
        this.southPiece = null;
        this.westPiece = null;

        //flags
        this.isErrorState = false;
        this.isUntouched = true;
    }

    setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece) {
        this.northPiece = northPiece;
        this.eastPiece = eastPiece;
        this.southPiece = southPiece;
        this.westPiece = westPiece;
    }

    draw(context, dx, dy, squareSize) {
        // TODO: remove later - debug draw
        if (this.isPath) {
            context.strokeStyle = "#ee0dc8ff";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        if (this.tile !== null) {
            if (this.baseTiles != null) {
                for (let i = this.baseTiles.length - 1; i >= 0; i--) {
                    this.baseTiles[i].draw(context, dx, dy, squareSize);
                }
            }

            this.tile.draw(context, dx, dy, squareSize);
        }

        if (this.isUntouched) {
            return;
        }

        if (this.tile === null) {
            const previousAlpha = context.globalAlpha;
            context.globalAlpha = 0.5;
            const rng = Math.floor(Math.random() * this.possibleTiles.length);
            this.possibleTiles[rng].draw(context, dx, dy, squareSize);
            context.globalAlpha = previousAlpha;

            //text change depending on the entropy
            const percentageEntropy = this.getEntropy() / this.startEntropy;

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
        }

        if (this.isErrorState) {
            context.strokeStyle = "#ff0000";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        if (this.isPath) {
            context.strokeStyle = "#ee0dc8ff";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }
    }

    getEntropy() {
        return this.possibleTiles.length;
    }

    checkIfPathExists() {
        if (this.isPath) {
            console.log('im a path '+ this.pieceX + ', ' + this.pieceY);
            
            return true;
        }
        if (this.tile === null) return false;
        return this.tile.walkable;
    }

    chooseTile(previousPiece = null) {
        if (this.tile != null) return;

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
            // TODO: fix this old problem
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
        this.isUntouched = false;

        //update Neighbors
        this.callNeighbors(this, this.pieceX, this.pieceY);
    }

    getPossibleRules() {
        const possibleRules = [];

        for (let i = 0; i < this.tile.rules.length; i++) {

            const tmpRule = this.tile.rules[i];

            let northValid, easthValid, southValid, westValid;
            northValid = this.isCompatible(tmpRule.getEdge(DIRECTION.NORTH), this.northPiece, DIRECTION.SOUTH);
            easthValid = this.isCompatible(tmpRule.getEdge(DIRECTION.EAST), this.eastPiece, DIRECTION.WEST);
            southValid = this.isCompatible(tmpRule.getEdge(DIRECTION.SOUTH), this.southPiece, DIRECTION.NORTH);
            westValid = this.isCompatible(tmpRule.getEdge(DIRECTION.WEST), this.westPiece, DIRECTION.EAST);

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

    callNeighbors(previousPiece, origenX, origenY) {

        if (Math.abs(origenX - this.pieceX) > WorldPiece.accuracy) return;
        if (Math.abs(origenY - this.pieceY) > WorldPiece.accuracy) return;

        if (this.northPiece != null && this.northPiece != previousPiece) {
            this.northPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.eastPiece != null && this.eastPiece != previousPiece) {
            this.eastPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.southPiece != null && this.southPiece != previousPiece) {
            this.southPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.westPiece != null && this.westPiece != previousPiece) {
            this.westPiece.updateEntropy(origenX, origenY, this);
        }
    }

    updateEntropy(origenX = this.pieceX, origenY = this.pieceY, previousPiece = this) {

        if (this.tile != null) return;

        let oldEntropy = this.getEntropy();

        //possibleTiles update
        let newPossibleTiles = [];

        for (let i = 0; i < this.possibleTiles.length; i++) {

            const tmpTile = this.possibleTiles[i];

            for (let j = 0; j < tmpTile.rules.length; j++) {
                const tmpRule = tmpTile.rules[j];

                let northValid, easthValid, southValid, westValid;
                northValid = this.isCompatible(tmpRule.getEdge(DIRECTION.NORTH), this.northPiece, DIRECTION.SOUTH);
                easthValid = this.isCompatible(tmpRule.getEdge(DIRECTION.EAST), this.eastPiece, DIRECTION.WEST);
                southValid = this.isCompatible(tmpRule.getEdge(DIRECTION.SOUTH), this.southPiece, DIRECTION.NORTH);
                westValid = this.isCompatible(tmpRule.getEdge(DIRECTION.WEST), this.westPiece, DIRECTION.EAST);

                if (northValid && easthValid && southValid && westValid) {
                    newPossibleTiles.push(tmpTile);
                    break;
                }
            }
        }

        if (newPossibleTiles.length != 0) {
            this.possibleTiles = newPossibleTiles;
            this.isUntouched = false;
        } else {
            this.isErrorState = true;
        }

        //entropy has changed -> call neighbors
        if (oldEntropy != this.getEntropy()) {
            this.callNeighbors(previousPiece, origenX, origenY);
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

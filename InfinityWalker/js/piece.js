import {
    baseTiles,
    cliffTiles,
    overlayTiles,
    decoTiles
} from "./tiles.js";
import { DIRECTION, LAYER, OPPOSITE_DIRECTION, WFC_ACCURACY } from "./config.js";
import { getHeightLevel, isCliff } from './utility/getHeightLevel.js';

export default class WorldPiece {
    constructor(worldX, worldY, isPath = false) {
        this.pieceX = worldX;
        this.pieceY = worldY;
        this.isPath = isPath;
        this.height = getHeightLevel(worldX, worldY);
        this.isCliff = isCliff(worldX, worldY);

        this.possibleBaseTiles = Array.from(baseTiles);
        //possible tiles, edge masks and entropy
        if (this.isCliff) {
            this.possibleOverlayTiles = Array.from(cliffTiles);
        } else {
            this.possibleOverlayTiles = Array.from(overlayTiles);
        }
        this.possibleDecoTiles = Array.from(decoTiles);

        this.currentBaseEdgeMasks = [0n, 0n, 0n, 0n];
        this.currentOverlayEdgeMasks = [0n, 0n, 0n, 0n];
        this.currentDecoEdgeMasks = [0n, 0n, 0n, 0n];
        this.updateEdgeMasks();

        // chosen tile and rule after collapse
        this.baseTile = null;
        this.overlayTile = null;
        this.decoTile = null;
        this.drawFunction = null;

        // neighbors
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

    isCollapsed() {
        // TODO: adjust if overlay and deco tiles are added
        return this.baseTile != null;
    }

    draw(context, dx, dy, squareSize) {
        if (this.isUntouched) {
            return;
        }

        if (this.drawFunction !== null) {
            this.drawFunction(context, dx, dy);
        }

        if (this.baseTile === null) {
            const previousAlpha = context.globalAlpha;
            context.globalAlpha = 0.7;
            const rng = Math.floor(Math.random() * this.possibleBaseTiles.length);
            this.possibleBaseTiles[rng].draw(context, dx, dy);
            context.globalAlpha = previousAlpha;
        }

        if (this.isErrorState) {
            context.strokeStyle = "#ff0000";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        // TODO: path highlight - remove later
        if (this.isPath) {
            context.strokeStyle = "#ee0dc8ff";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        if (this.isCliff) {
            context.strokeStyle = "#ffa500";
            context.lineWidth = 2;
            context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        }

        context.font = "20px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "#fff";
        context.fillText(this.height, dx + squareSize / 2, dy + squareSize / 2);
    }

    getEntropy(layer = LAYER.BASE) {
        if (layer === LAYER.BASE) {
            return this.possibleBaseTiles.length;
        } else if (layer === LAYER.OVERLAY) {
            return this.possibleOverlayTiles.length;
        } else if (layer === LAYER.DECO) {
            return this.possibleDecoTiles.length;
        }
    }

    checkIfPathExists() {
        if (this.isPath) {
            return true;
        }
        if (this.baseTile === null) return false;
        return this.baseTile.walkable;
    }

    chooseTile() {
        if (this.baseTile != null) return;

        //random choose with weights
        let totalWeight = 0;
        for (let i = 0; i < this.possibleBaseTiles.length; i++) {
            totalWeight += this.possibleBaseTiles[i].weight;
        }

        const rngWeight = Math.random() * totalWeight;

        let tmpWeight = 0;

        for (let i = 0; i < this.possibleBaseTiles.length; i++) {
            tmpWeight += this.possibleBaseTiles[i].weight;

            if (tmpWeight >= rngWeight) {
                this.baseTile = this.possibleBaseTiles[i];
                this.possibleBaseTiles = [this.baseTile];
                this.updateEdgeMasks();
                break;
            }
        }

        // TODO: overlay and deco tile selection

        this.drawFunction = this.baseTile.getDrawFunction();

        this.isUntouched = false;

        //update Neighbors
        this.callNeighbors(this.pieceX, this.pieceY);
    }

    isCompatible(edge0Mask, edge1Mask) {
        if (edge0Mask === null || edge1Mask === null) return true;

        return (edge0Mask & edge1Mask) !== 0n;
    }

    callNeighbors(origenX, origenY) {

        if (Math.abs(origenX - this.pieceX) > WFC_ACCURACY) return;
        if (Math.abs(origenY - this.pieceY) > WFC_ACCURACY) return;

        if (this.northPiece) {
            this.northPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.eastPiece) {
            this.eastPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.southPiece) {
            this.southPiece.updateEntropy(origenX, origenY, this);
        }
        if (this.westPiece) {
            this.westPiece.updateEntropy(origenX, origenY, this);
        }
    }

    updateEntropy(origenX = this.pieceX, origenY = this.pieceY, previousPiece = null) {

        if (this.baseTile != null) return;
        if (previousPiece == this) return;

        let oldEntropy = this.getEntropy();
        let newPossibleTiles = [];

        this.possibleBaseTiles.forEach(tile => {
            const edgeMasks = tile.edgeMasks;

            let northValid, easthValid, southValid, westValid;
            northValid = easthValid = southValid = westValid = true;

            if (this.northPiece) {
                const northTileMask = edgeMasks[DIRECTION.NORTH];
                const northNeighborMask = this.northPiece.currentBaseEdgeMasks[OPPOSITE_DIRECTION[DIRECTION.NORTH]];
                northValid = this.isCompatible(northTileMask, northNeighborMask);
            }

            if (this.eastPiece) {
                const eastTileMask = edgeMasks[DIRECTION.EAST];
                const eastNeighborMask = this.eastPiece.currentBaseEdgeMasks[OPPOSITE_DIRECTION[DIRECTION.EAST]];
                easthValid = this.isCompatible(eastTileMask, eastNeighborMask);
            }

            if (this.southPiece) {
                const southTileMask = edgeMasks[DIRECTION.SOUTH];
                const southNeighborMask = this.southPiece.currentBaseEdgeMasks[OPPOSITE_DIRECTION[DIRECTION.SOUTH]];
                southValid = this.isCompatible(southTileMask, southNeighborMask);
            }

            if (this.westPiece) {
                const westTileMask = edgeMasks[DIRECTION.WEST];
                const westNeighborMask = this.westPiece.currentBaseEdgeMasks[OPPOSITE_DIRECTION[DIRECTION.WEST]];
                westValid = this.isCompatible(westTileMask, westNeighborMask);
            }

            if (northValid && easthValid && southValid && westValid) {
                newPossibleTiles.push(tile);
            }
        });

        if (newPossibleTiles.length != 0) {
            this.possibleBaseTiles = newPossibleTiles;
            this.isUntouched = false;
            this.updateEdgeMasks();
        } else {
            this.isErrorState = true;
        }

        //entropy has changed -> call neighbors
        if (oldEntropy != this.getEntropy()) {
            this.callNeighbors(origenX, origenY);
        }
    }

    updateEdgeMasks() {
        const masks = [0n, 0n, 0n, 0n];
        this.possibleBaseTiles.forEach(tile => {
            const tileMask = tile.edgeMasks;
            masks[DIRECTION.NORTH] |= tileMask[DIRECTION.NORTH];
            masks[DIRECTION.EAST] |= tileMask[DIRECTION.EAST];
            masks[DIRECTION.SOUTH] |= tileMask[DIRECTION.SOUTH];
            masks[DIRECTION.WEST] |= tileMask[DIRECTION.WEST];
        });
        this.currentBaseEdgeMasks = masks;
    }
}

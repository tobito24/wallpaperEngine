import {
    baseTiles,
    overlayTiles,
    decoTiles,
    getCliffOverlayTile,
    transparentMasks,
    allAllowedEdgeMasks,
} from "./tiles.js";
import {
    DIRECTION,
    LAYER,
    OPPOSITE_DIRECTION,
    WFC_ACCURACY,
    CLIFF_TYPES,
    WORLDPIECE_STATE,
} from "./config.js";
import {
    getHeightLevel,
    getCliffType
} from './utility/getHeightLevel.js';

export default class WorldPiece {
    constructor(worldX, worldY, isPath = false) {
        this.pieceX = worldX;
        this.pieceY = worldY;
        this.isPath = isPath;
        this.height = getHeightLevel(worldX, worldY);

        this.cliffType = getCliffType(worldX, worldY);
        this.isCliff = this.cliffType !== null;
        const cliffOverlayTile = this.isCliff ? getCliffOverlayTile(this.cliffType, this.height) : null;

        this.possibleBaseTiles = Array.from(baseTiles);
        this.possibleOverlayTiles = this.isCliff ? [cliffOverlayTile] : Array.from(overlayTiles);
        this.possibleDecoTiles = Array.from(decoTiles);
        this.currentBaseEdgeMasks = [0n, 0n, 0n, 0n];
        this.currentOverlayEdgeMasks = [0n, 0n, 0n, 0n];
        this.currentDecoEdgeMasks = [0n, 0n, 0n, 0n];

        // chosen tile after collapse
        this.baseTile = null;
        this.overlayTile = this.isCliff ? cliffOverlayTile : null;
        this.decoTile = null;

        this.baseTileSpriteIndex = 0;
        this.overlayTileSpriteIndex = 0;
        this.decoTileSpriteIndex = 0;

        // neighbors
        this.northPiece = null;
        this.eastPiece = null;
        this.southPiece = null;
        this.westPiece = null;

        this.currentState = WORLDPIECE_STATE.UNTOUCHED;

        this.updateEdgeMasks();
    }

    setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece) {
        this.northPiece = northPiece;
        this.eastPiece = eastPiece;
        this.southPiece = southPiece;
        this.westPiece = westPiece;
    }

    isCollapsed() {
        return this.currentState === WORLDPIECE_STATE.COLLAPSED || this.currentState === WORLDPIECE_STATE.ERROR;
    }

    isUntouched() {
        return this.currentState === WORLDPIECE_STATE.UNTOUCHED;
    }

    draw(context, dx, dy, squareSize) {
        if (this.currentState === WORLDPIECE_STATE.UNTOUCHED) {
            return;
        }

        if (this.baseTile !== null) {
            this.baseTile.draw(context, dx, dy, squareSize, this.baseTileSpriteIndex);
        } else if (this.possibleBaseTiles.length > 0) {
            const previousAlpha = context.globalAlpha;
            context.globalAlpha = 0.9;
            const rng = Math.floor(Math.random() * this.possibleBaseTiles.length);
            this.possibleBaseTiles[rng].draw(context, dx, dy, squareSize);
            context.globalAlpha = previousAlpha;
        }

        if (this.overlayTile !== null) {
            this.overlayTile.draw(context, dx, dy, squareSize, this.overlayTileSpriteIndex);
        } else if (this.possibleOverlayTiles.length > 0) {
            const previousAlpha = context.globalAlpha;
            context.globalAlpha = 0.4;
            const rng = Math.floor(Math.random() * this.possibleOverlayTiles.length);
            this.possibleOverlayTiles[rng].draw(context, dx, dy, squareSize);
            context.globalAlpha = previousAlpha;
        }

        if (this.decoTile !== null) {
            this.decoTile.draw(context, dx, dy, squareSize, this.decoTileSpriteIndex);
        } else if (this.possibleDecoTiles.length > 0) {
            const previousAlpha = context.globalAlpha;
            context.globalAlpha = 0.2;
            const rng = Math.floor(Math.random() * this.possibleDecoTiles.length);
            this.possibleDecoTiles[rng].draw(context, dx, dy, squareSize);
            context.globalAlpha = previousAlpha;
        }

        // if (this.currentState === WORLDPIECE_STATE.ERROR) {
        //     context.strokeStyle = "#ff0000";
        //     context.lineWidth = 2;
        //     context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        // }

        // // TODO: path highlight - remove later
        // if (this.isPath) {
        //     context.strokeStyle = "#ee0dc8ff";
        //     context.lineWidth = 2;
        //     context.strokeRect(dx + 1, dy + 1, squareSize - 2, squareSize - 2);
        // }
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

    getEdgeMasks(layer = LAYER.BASE) {
        if (layer === LAYER.BASE) {
            return this.currentBaseEdgeMasks;
        } else if (layer === LAYER.OVERLAY) {
            return this.currentOverlayEdgeMasks;
        } else if (layer === LAYER.DECO) {
            return this.currentDecoEdgeMasks;
        }
    }

    isWalkable() {
        // TODO: rework after path implementation
        if (this.isPath) {
            return true;
        }
    }

    updateState() {
        if (this.isCollapsed()) {
            return;
        }

        switch (this.currentState) {
            case WORLDPIECE_STATE.UNTOUCHED:
            case WORLDPIECE_STATE.TOUCHED:
                if (this.baseTile !== null && this.overlayTile !== null) {
                    this.currentState = WORLDPIECE_STATE.OVERLAY_GENERATED;
                } else if (this.baseTile !== null && this.overlayTile === null) {
                    this.currentState = WORLDPIECE_STATE.BASE_GENERATED;
                }
                break;
            case WORLDPIECE_STATE.BASE_GENERATED:
                if (this.overlayTile !== null) {
                    this.currentState = WORLDPIECE_STATE.OVERLAY_GENERATED;
                }
                break;
            case WORLDPIECE_STATE.OVERLAY_GENERATED:
                if (this.decoTile !== null) {
                    this.currentState = WORLDPIECE_STATE.COLLAPSED;
                }
                break;
            default:
                this.setErrorState();
                return;
        }
    }

    getPossibleTiles() {
        switch (this.currentState) {
            case WORLDPIECE_STATE.UNTOUCHED:
            case WORLDPIECE_STATE.TOUCHED:
                return this.possibleBaseTiles;
            case WORLDPIECE_STATE.BASE_GENERATED:
                return this.possibleOverlayTiles;
            case WORLDPIECE_STATE.OVERLAY_GENERATED:
                return this.possibleDecoTiles;
            default:
                return null;
        }
    }

    collapse() {
        if (this.isCollapsed()) return;

        const possibleTiles = this.getPossibleTiles();
        if (!possibleTiles || possibleTiles.length === 0) {
            console.log('Error: no possible tiles during collapse');
            this.setErrorState();
            return;
        }

        //random choose with weights
        let totalWeight = 0;
        possibleTiles.forEach(tile => {
            totalWeight += tile.weight;
        });

        const rngWeight = Math.random() * totalWeight;

        let tmpWeight = 0;
        let selectedTile = null;

        for (const tile of possibleTiles) {
            tmpWeight += tile.weight;
            if (tmpWeight >= rngWeight) {
                selectedTile = tile;
                break;
            }
        }

        if (selectedTile === null) {
            console.log('Error: no tile selected during collapse');
            this.setErrorState();
            return;
        }

        switch (this.currentState) {
            case WORLDPIECE_STATE.UNTOUCHED:
            case WORLDPIECE_STATE.TOUCHED:
                this.baseTile = selectedTile;
                this.possibleBaseTiles = [this.baseTile];
                this.baseTileSpriteIndex = selectedTile.getSpriteIndex();
                break;
            case WORLDPIECE_STATE.BASE_GENERATED:
                this.overlayTile = selectedTile;
                this.possibleOverlayTiles = [this.overlayTile];
                this.overlayTileSpriteIndex = selectedTile.getSpriteIndex();
                break;
            case WORLDPIECE_STATE.OVERLAY_GENERATED:
                this.decoTile = selectedTile;
                this.possibleDecoTiles = [this.decoTile];
                this.decoTileSpriteIndex = selectedTile.getSpriteIndex();
                break;
            default:
                console.log('Error: invalid state during collapse');
                this.setErrorState();
                return;
        }

        this.updateEdgeMasks();
        this.updateState();
        this.callNeighbors(new Set([this]), { x: this.pieceX, y: this.pieceY });
    }

    callNeighbors(visitedSet, origin) {
        if (this.northPiece) {
            this.northPiece.updateEntropy(visitedSet, origin);
        }
        if (this.eastPiece) {
            this.eastPiece.updateEntropy(visitedSet, origin);
        }
        if (this.southPiece) {
            this.southPiece.updateEntropy(visitedSet, origin);
        }
        if (this.westPiece) {
            this.westPiece.updateEntropy(visitedSet, origin);
        }
    }

    updateEntropy(visitedSet = new Set(), origin = { x: this.pieceX, y: this.pieceY }) {
        // TODO: if newPossibleTiles is empty -> ERROR state
        if (this.isCollapsed()) return;
        const manhattanDist = Math.abs(origin.x - this.pieceX) + Math.abs(origin.y - this.pieceY);
        if (manhattanDist > WFC_ACCURACY) return;
        if (visitedSet.has(this)) return;
        visitedSet.add(this);

        const oldEntropies = [this.getEntropy(LAYER.BASE), this.getEntropy(LAYER.OVERLAY), this.getEntropy(LAYER.DECO)];

        // Base layer
        if (this.baseTile === null) {
            const newPossibleBaseTiles = [];
            this.possibleBaseTiles.forEach(tile => {
                // same layer neighbor check
                if (this.isEdgeMasksValid(tile.edgeMasks, LAYER.BASE)) {
                    newPossibleBaseTiles.push(tile);
                }
            });

            if (newPossibleBaseTiles.length === 0) {
                console.log('Error: no possible base tiles during entropy update');
                this.setErrorState();
                return;
            }
            this.possibleBaseTiles = newPossibleBaseTiles;

            if (oldEntropies[0] !== this.getEntropy(LAYER.BASE)) {
                this.currentState = WORLDPIECE_STATE.TOUCHED;
            }
        }

        // Overlay layer
        if (this.overlayTile === null) {
            const newPossibleOverlayTiles = [];
            this.possibleOverlayTiles.forEach(tile => {
                // same layer neighbor check
                let isValid = this.isEdgeMasksValid(tile.edgeMasks, LAYER.OVERLAY);
                if (!isValid) return;

                isValid = this.possibleBaseTiles.some(baseTile =>
                    tile.isUndergroundAllowed(baseTile, null)
                );

                if (isValid) newPossibleOverlayTiles.push(tile);
            });

            if (newPossibleOverlayTiles.length === 0) {
                console.log('Error: no possible overlay tiles during entropy update');
                this.setErrorState();
                return;
            }
            this.possibleOverlayTiles = newPossibleOverlayTiles;
        }

        // Deco layer
        if (this.decoTile === null) {
            const newPossibleDecoTiles = [];
            this.possibleDecoTiles.forEach(tile => {
                let isValid = this.isEdgeMasksValid(tile.edgeMasks, LAYER.DECO);
                if (!isValid) return;

                isValid = this.possibleBaseTiles.some(baseTile =>
                    this.possibleOverlayTiles.some(overlayTile =>
                        tile.isUndergroundAllowed(baseTile, overlayTile)
                    )
                );

                if (isValid) newPossibleDecoTiles.push(tile);
            });

            if (newPossibleDecoTiles.length === 0) {
                console.log('Error: no possible deco tiles during entropy update');
                this.setErrorState();
                return;
            }
            this.possibleDecoTiles = newPossibleDecoTiles;
        }

        //entropy has changed -> call neighbors        
        const isChanged = oldEntropies.some((entropy, index) => entropy !== this.getEntropy(index));
        if (isChanged) {
            this.updateEdgeMasks();
            this.callNeighbors(visitedSet, origin);
        }
    }

    isEdgeMasksValid(edgeMasks, layer) {
        let northValid, easthValid, southValid, westValid;
        northValid = easthValid = southValid = westValid = true;

        if (this.northPiece) {
            const northTileMask = edgeMasks[DIRECTION.NORTH];
            const northNeighborMask = this.northPiece.getEdgeMasks(layer)[OPPOSITE_DIRECTION[DIRECTION.NORTH]];
            northValid = this.isCompatible(northTileMask, northNeighborMask);
        }

        if (this.eastPiece) {
            const eastTileMask = edgeMasks[DIRECTION.EAST];
            const eastNeighborMask = this.eastPiece.getEdgeMasks(layer)[OPPOSITE_DIRECTION[DIRECTION.EAST]];
            easthValid = this.isCompatible(eastTileMask, eastNeighborMask);
        }

        if (this.southPiece) {
            const southTileMask = edgeMasks[DIRECTION.SOUTH];
            const southNeighborMask = this.southPiece.getEdgeMasks(layer)[OPPOSITE_DIRECTION[DIRECTION.SOUTH]];
            southValid = this.isCompatible(southTileMask, southNeighborMask);
        }

        if (this.westPiece) {
            const westTileMask = edgeMasks[DIRECTION.WEST];
            const westNeighborMask = this.westPiece.getEdgeMasks(layer)[OPPOSITE_DIRECTION[DIRECTION.WEST]];
            westValid = this.isCompatible(westTileMask, westNeighborMask);
        }

        return northValid && easthValid && southValid && westValid;
    }

    isCompatible(edge0Mask, edge1Mask) {
        if (edge0Mask === null || edge1Mask === null) return true;
        return (edge0Mask & edge1Mask) !== 0n;
    }

    updateEdgeMasks() {
        const masks = [[0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n], [0n, 0n, 0n, 0n]]; // base, overlay, deco

        const allPossibleTiles = [this.possibleBaseTiles, this.possibleOverlayTiles, this.possibleDecoTiles];
        allPossibleTiles.forEach((possibleTiles, index) => {
            if (possibleTiles.length === 0) return;

            possibleTiles.forEach(tile => {
                const tileMask = tile.edgeMasks;
                masks[index][DIRECTION.NORTH] |= tileMask[DIRECTION.NORTH];
                masks[index][DIRECTION.EAST] |= tileMask[DIRECTION.EAST];
                masks[index][DIRECTION.SOUTH] |= tileMask[DIRECTION.SOUTH];
                masks[index][DIRECTION.WEST] |= tileMask[DIRECTION.WEST];
            });
        });
        this.currentBaseEdgeMasks = masks[0];
        this.currentOverlayEdgeMasks = masks[1];
        this.setCliffEdgeMasks();
        this.currentDecoEdgeMasks = masks[2];
    }

    setCliffEdgeMasks() {
        if (this.isCliff && this.overlayTile !== null) {
            const cliffOverlayMasks = this.overlayTile.edgeMasks;
            switch (this.cliffType) {
                case CLIFF_TYPES.NORTH_EDGE:
                    this.currentBaseEdgeMasks[DIRECTION.SOUTH] = cliffOverlayMasks[DIRECTION.SOUTH];
                    break;
                case CLIFF_TYPES.EAST_EDGE:
                    this.currentBaseEdgeMasks[DIRECTION.WEST] = cliffOverlayMasks[DIRECTION.WEST];
                    break;
                case CLIFF_TYPES.SOUTH_EDGE:
                    this.currentBaseEdgeMasks[DIRECTION.NORTH] = cliffOverlayMasks[DIRECTION.NORTH];
                    break;
                case CLIFF_TYPES.WEST_EDGE:
                    this.currentBaseEdgeMasks[DIRECTION.EAST] = cliffOverlayMasks[DIRECTION.EAST];
                    break;
                case CLIFF_TYPES.NORTH_WEST_INNER_CORNER:
                    this.currentBaseEdgeMasks[DIRECTION.SOUTH] = cliffOverlayMasks[DIRECTION.SOUTH];
                    this.currentBaseEdgeMasks[DIRECTION.EAST] = cliffOverlayMasks[DIRECTION.EAST];
                    break;
                case CLIFF_TYPES.NORTH_EAST_INNER_CORNER:
                    this.currentBaseEdgeMasks[DIRECTION.SOUTH] = cliffOverlayMasks[DIRECTION.SOUTH];
                    this.currentBaseEdgeMasks[DIRECTION.WEST] = cliffOverlayMasks[DIRECTION.WEST];
                    break;
                case CLIFF_TYPES.SOUTH_EAST_INNER_CORNER:
                    this.currentBaseEdgeMasks[DIRECTION.NORTH] = cliffOverlayMasks[DIRECTION.NORTH];
                    this.currentBaseEdgeMasks[DIRECTION.WEST] = cliffOverlayMasks[DIRECTION.WEST];
                    break;
                case CLIFF_TYPES.SOUTH_WEST_INNER_CORNER:
                    this.currentBaseEdgeMasks[DIRECTION.NORTH] = cliffOverlayMasks[DIRECTION.NORTH];
                    this.currentBaseEdgeMasks[DIRECTION.EAST] = cliffOverlayMasks[DIRECTION.EAST];
                    break;
            }
            this.currentOverlayEdgeMasks = transparentMasks;
        }
    }

    setErrorState() {
        this.currentState = WORLDPIECE_STATE.ERROR;
        this.currentBaseEdgeMasks = allAllowedEdgeMasks;
        this.currentOverlayEdgeMasks = allAllowedEdgeMasks;
        this.currentDecoEdgeMasks = allAllowedEdgeMasks;
    }
}

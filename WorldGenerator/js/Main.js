import WorldPiece from "./WorldPiece.js";

//basics
let canvas = document.getElementById("canvas0");
let context = canvas.getContext("2d");

let window_width = window.innerWidth;
let window_height = window.innerHeight;

canvas.style.background = "#0f1923";
canvas.width = window_width;
canvas.height = window_height;

//chess board
const TICK_RATE = 0;
const SQUARE_SIZE = 32;
let running = true;

let square_width = Math.floor(window_width / SQUARE_SIZE);
let square_height = Math.floor(window_height / SQUARE_SIZE);

let border_width = window_width % SQUARE_SIZE;
let border_height = window_height % SQUARE_SIZE;

const OFFSET_X = border_width / 2;
const OFFSET_Y = 0;

//world building (init or resize)
let world;
let previousWorldPiece;

function createWorld(withClear = true) {

    const highlights = [];

    if (withClear) {
        world = new Array(square_width);
        for (let x = 0; x < square_width; x++) {
            world[x] = new Array(square_height);
            for (let y = 0; y < square_height; y++) {
                world[x][y] = new WorldPiece(x, y);
            }
        }
    } else {
        for (let x = 0; x < square_width; x++)
            for (let y = 0; y < square_height; y++)
                if (!world[x][y].isHighlight)
                    world[x][y] = new WorldPiece(x, y);
                else
                    highlights.push(world[x][y]);
    }

    //Neighborhood relationship
    for (let x = 0; x < world.length; x++) {
        for (let y = 0; y < world[x].length; y++) {
            //North: y-1, East: x+1, South: y+1, West: x-1
            const northPiece = (y > 0) ? world[x][y - 1] : null;
            const eastPiece = (x < world.length - 1) ? world[x + 1][y] : null;
            const southPiece = (y < world[x].length - 1) ? world[x][y + 1] : null;
            const westPiece = (x > 0) ? world[x - 1][y] : null;

            world[x][y].setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece);
        }
    }

    for (let i = 0; i < highlights.length; i++) highlights[i].callNeighbors(highlights[i])

    if (withClear) randomFirstTick();
}

createWorld();

function randomFirstTick() {
    const rngX = Math.floor(Math.random() * world.length);
    const rngY = Math.floor(Math.random() * world[0].length);
    world[rngX][rngY].chooseTile();
    previousWorldPiece = world[rngX][rngY];
}


//trigger function -> selects the next tile
function nextWorldPiece() {

    let nextWorldPiece = [];
    let lowestEntropy = Number.MAX_SAFE_INTEGER;

    for (let x = 0; x < world.length; x++) {
        for (let y = 0; y < world[x].length; y++) {
            //WorldPiece already has tile
            if (world[x][y].tile != null) {
                continue;
            }
            else if (world[x][y].getEntropy() < lowestEntropy) {
                lowestEntropy = world[x][y].getEntropy();
                nextWorldPiece = [];
                nextWorldPiece.push(world[x][y]);
            }
            else if (world[x][y].getEntropy() === lowestEntropy) {
                nextWorldPiece.push(world[x][y]);
            }
        }
    }

    if (nextWorldPiece.length > 0) {
        let rng = Math.floor(Math.random() * nextWorldPiece.length);
        nextWorldPiece[rng].chooseTile(previousWorldPiece);
        previousWorldPiece = nextWorldPiece[rng];
    } else {
        createWorld(false);
    }
}

//draw function
function drawWorld() {
    for (let x = 0; x < world.length; x++) {
        for (let y = 0; y < world[x].length; y++) {
            world[x][y].draw(context, SQUARE_SIZE, OFFSET_X, OFFSET_Y);
        }
    }
}

//tick function
let ticker = 0;

function tickerInc() {
    ticker++;
    if (ticker >= TICK_RATE) {
        ticker = 0;
        nextWorldPiece();
    }
}

//resize function
function windowResize() {

    console.log('Changed window size!');
    window_width = window.innerWidth;
    window_height = window.innerHeight;
    canvas.width = window_width;
    canvas.height = window_height;
    square_width = Math.floor(window_width / SQUARE_SIZE);
    square_height = Math.floor(window_height / SQUARE_SIZE);
    border_width = window_width % SQUARE_SIZE;
    border_height = window_height % SQUARE_SIZE;

    createWorld();
}

window.addEventListener('resize', windowResize);

//keyHandler function
function keyHandler(event) {
    if (event.key === "Enter") {
        console.log("Enter!");
        running = !running;
    }
}

document.addEventListener("keydown", keyHandler);

//Highlight with the mous
let xStart = 0, yStart = 0;
function startHighlight(event) {
    if (event.type === "mousedown") {
        xStart = Math.floor((event.clientX - OFFSET_X) / SQUARE_SIZE);
        yStart = Math.floor((event.clientY - OFFSET_Y) / SQUARE_SIZE);
    } else if (event.type === "touchstart") {
        xStart = Math.floor((event.touches[0].clientX - OFFSET_X) / SQUARE_SIZE);
        yStart = Math.floor((event.touches[0].clientY - OFFSET_Y) / SQUARE_SIZE);
    }

    xStart = xStart < 0 ? 0 : xStart;
    xStart = xStart >= world.length ? world.length - 1 : xStart;
    yStart = yStart < 0 ? 0 : yStart;
    yStart = yStart >= world[0].length ? world[0].length - 1 : yStart;
}

function endHighlight(event) {
    let xEnd = 0, yEnd = 0;
    if (event.type === "mouseup") {
        xEnd = Math.floor((event.clientX - OFFSET_X) / SQUARE_SIZE);
        yEnd = Math.floor((event.clientY - OFFSET_Y) / SQUARE_SIZE);
    } else if (event.type === "touchend") {
        xEnd = Math.floor((event.changedTouches[0].clientX - OFFSET_X) / SQUARE_SIZE);
        yEnd = Math.floor((event.changedTouches[0].clientY - OFFSET_Y) / SQUARE_SIZE);
    }

    xEnd = xEnd < 0 ? 0 : xEnd;
    xEnd = xEnd >= world.length ? world.length - 1 : xEnd;
    yEnd = yEnd < 0 ? 0 : yEnd;
    yEnd = yEnd >= world[0].length ? world[0].length - 1 : yEnd;

    let help;
    if (xEnd < xStart) {
        help = xEnd;
        xEnd = xStart;
        xStart = help;
    }

    if (yEnd < yStart) {
        help = yEnd;
        yEnd = yStart;
        yStart = help;
    }

    for (let x = xStart; x <= xEnd; x++) {
        for (let y = yStart; y <= yEnd; y++) {
            world[x][y].isHighlight = !world[x][y].isHighlight;
        }
    }
}

document.addEventListener('mousedown', startHighlight);
document.addEventListener('mouseup', endHighlight);
document.addEventListener('touchstart', startHighlight);
document.addEventListener('touchend', endHighlight);


//animation
function animate() {

    if (running) tickerInc();

    context.clearRect(0, 0, window_width, window_height);
    drawWorld();
    requestAnimationFrame(animate);
}

animate();
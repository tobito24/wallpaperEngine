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
const TICK_RATE = 10;
const SQUARE_SIZE = 100;

let square_width = Math.floor(window_width / SQUARE_SIZE);
let square_height = Math.floor(window_height / SQUARE_SIZE);

let border_width = window_width % SQUARE_SIZE;
let border_height = window_height % SQUARE_SIZE;

const OFFSET_X = border_width/2;
const OFFSET_Y = 0;

//world building (init or resize)
let world;

function createWorld() {

    world = new Array(square_width);

    for (let x = 0; x < square_width; x++) {
        world[x] = new Array(square_height);

        for (let y = 0; y < square_height; y++) {

            world[x][y] = new WorldPiece(x, y);
        }
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
}

createWorld();

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

    if(nextWorldPiece.length > 0){
        let rng = Math.floor(Math.random() * nextWorldPiece.length);
        nextWorldPiece[rng].chooseTile();
    } else {
        createWorld();
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

//resize listener
window.addEventListener('resize', function () {
    windowResize();
    console.log('Fenstergröße geändert!');
});

//animation
function animate() {
    context.clearRect(0, 0, window_width, window_height);
    tickerInc();
    drawWorld();
    requestAnimationFrame(animate);
}

animate();


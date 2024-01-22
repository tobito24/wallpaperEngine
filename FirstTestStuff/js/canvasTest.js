//import tests
import TestKlasse from './basics.js';
let myTest = new TestKlasse("Tobi", 24);

import { myFirstFunction } from './basics.js';
myFirstFunction(myTest.name);

//basics
let canvas = document.getElementById("canvas0");
let context = canvas.getContext("2d");

let window_width = window.innerWidth;
let window_height = window.innerHeight;

canvas.style.background = "black";
canvas.width = window_width;
canvas.height = window_height;

//chess board
const SQUARE_SIZE = 100;
let square_width = Math.floor(window_width / SQUARE_SIZE);
let square_height = Math.floor(window_height / SQUARE_SIZE);
let border_width = window_width % SQUARE_SIZE;
let border_height = window_height % SQUARE_SIZE;

//tickrate
let stepsPlayer = 0;
let ticks = 0;

function ticksIncrease() {
    /*
    context.fillStyle = "red";
    context.font = "20px Arial";
    context.fillText("T:" + ticks, 0, 50);
    */
    ticks++;
    if (ticks >= 100) {
        ticks = 0;
        stepsPlayer++;
        if (stepsPlayer >= imageFormat[0]) stepsPlayer = 0;
    }
}

//player directions init (0-3)
let player_directions;

function playerDirectionsUpdate() {

    player_directions = new Array(square_width);

    for (let i = 0; i < square_width; i++) {
        player_directions[i] = new Array(square_height);

        for (let j = 0; j < square_height; j++) {
            player_directions[i][j] = Math.floor(Math.random() * 4);
        }
    }
}

playerDirectionsUpdate();

//image
const playerImage = new Image();
playerImage.src = "img/trainer_bug.png";
let imageFormat = [4, 4];//x,y
let subImageWidth = playerImage.width / imageFormat[0];
let subImageHeight = playerImage.height / imageFormat[1];

function drawPlayer(direction = 0, dx = 0, dy = 0) {

    let sx = stepsPlayer * subImageWidth;
    let sy = direction * subImageHeight;
    let sw = subImageWidth;
    let sh = subImageHeight;
    let dw = SQUARE_SIZE;
    let dh = SQUARE_SIZE;

    context.drawImage(playerImage, sx, sy, sw, sh, dx, dy, dw, dh);
}

playerImage.onload = function () {
    console.log("playerImage geladen");
    subImageWidth = playerImage.width / imageFormat[0];
    subImageHeight = playerImage.height / imageFormat[1];
};

function drawChessBoard() {
    for (let i = 0; i < square_width; i++) {
        for (let j = 0; j < square_height; j++) {
            if (i % 2 === j % 2) {
                context.fillStyle = "black";
            } else {
                context.fillStyle = "white";
            }
            let dx = i * SQUARE_SIZE + border_width / 2;
            let dy = j * SQUARE_SIZE;

            context.fillRect(dx, dy, SQUARE_SIZE, SQUARE_SIZE);

            //add images
            drawPlayer(player_directions[i][j], dx, dy);
        }
    }
}

function windowResize() {

    window_width = window.innerWidth;
    window_height = window.innerHeight;
    canvas.width = window_width;
    canvas.height = window_height;
    square_width = Math.floor(window_width / SQUARE_SIZE);
    square_height = Math.floor(window_height / SQUARE_SIZE);
    border_width = window_width % SQUARE_SIZE;
    border_height = window_height % SQUARE_SIZE;
    playerDirectionsUpdate();
}

//resize listener
window.addEventListener('resize', function () {
    windowResize();
    console.log('Fenstergröße geändert!');
});

//animation
function animate() {
    context.clearRect(0, 0, window_width, window_height);
    drawChessBoard();
    ticksIncrease();
    requestAnimationFrame(animate);
}

animate();

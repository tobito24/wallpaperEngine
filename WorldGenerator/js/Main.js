import World from "./World.js";

/*
################################################

    Main.js
        GUI
           resizable
           button interactions
           mouse interactions
        
        World
            init
            animation
            tigger

################################################
*/

//canvas + context
let canvas = document.getElementById("canvas0");
let context = canvas.getContext("2d");

// Buttons
let buttonSettings = document.getElementById("buttonSettings");
buttonSettings.addEventListener("click", buttonHandler);
buttonSettings.querySelector("img").style.width = "100%";
buttonSettings.querySelector("img").style.height = "100%";

let buttonStartStop = document.getElementById("buttonStartStop");
buttonStartStop.addEventListener("click", buttonHandler);
buttonStartStop.querySelector("img").style.width = "100%";
buttonStartStop.querySelector("img").style.height = "100%";

let buttonReload = document.getElementById("buttonReload");
buttonReload.addEventListener("click", buttonHandler);
buttonReload.querySelector("img").style.width = "100%";
buttonReload.querySelector("img").style.height = "100%";

let buttonClear = document.getElementById("buttonClear");
buttonClear.addEventListener("click", buttonHandler);
buttonClear.querySelector("img").style.width = "100%";
buttonClear.querySelector("img").style.height = "100%";

let buttonMove = document.getElementById("buttonMove");
buttonMove.querySelector("img").style.width = "100%";
buttonMove.querySelector("img").style.height = "100%";

//image
let iconFrame = document.getElementById("iconFrame");


//changeable by the user
let TICK_RATE = 0;
let SQUARE_SIZE = 32;
let OFFSET_X = 0;
let OFFSET_Y = 0;

//internal variables
let running = true;

let window_width;
let window_height;
let square_count_width;
let square_count_height;
let border_width;
let border_height;
let offsetX_buttonGroup = 0;
let offsetY_buttonGroup = 0;
let buttonGroupScale = 1;

//resize function
function windowResize(init = false) {

    if (init instanceof Event) init = false;

    if (!init) console.log('Changed window size!');

    //intern
    window_width = window.innerWidth;
    window_height = window.innerHeight;
    canvas.width = window_width;
    canvas.height = window_height;
    square_count_width = Math.floor(window_width / SQUARE_SIZE);
    square_count_height = Math.floor(window_height / SQUARE_SIZE);
    border_width = window_width % SQUARE_SIZE;
    border_height = window_height % SQUARE_SIZE;
    OFFSET_X = border_width / 2; //center
    OFFSET_Y = border_height / 2; //center
    offsetX_buttonGroup = 0;
    offsetY_buttonGroup = 0;

    buttonGroupScale = 0.5 * (window_width / 1920);

    //button + Frame
    iconFrame.style.width = 1000 * buttonGroupScale + "px";
    iconFrame.style.height = 400 * buttonGroupScale + "px";

    buttonMove.style.width = 200 * buttonGroupScale + "px";
    buttonMove.style.height = 200 * buttonGroupScale + "px";

    buttonSettings.style.width = 200 * buttonGroupScale + "px";
    buttonSettings.style.height = 200 * buttonGroupScale + "px";

    buttonStartStop.style.width = 200 * buttonGroupScale + "px";
    buttonStartStop.style.height = 200 * buttonGroupScale + "px";

    buttonReload.style.width = 200 * buttonGroupScale + "px";
    buttonReload.style.height = 200 * buttonGroupScale + "px";

    buttonClear.style.width = 200 * buttonGroupScale + "px";
    buttonClear.style.height = 200 * buttonGroupScale + "px";

    changePositionButtonGroup()

    if (!init) world.setSize(square_count_width, square_count_height);
}

//init 
windowResize(true);

window.addEventListener('resize', windowResize);

function changePositionButtonGroup() {

    let dx = offsetX_buttonGroup, dy = offsetY_buttonGroup;

    iconFrame.style.left = dx + "px";
    iconFrame.style.top = dy + "px";

    buttonMove.style.left = dx + "px";
    buttonMove.style.top = dy + "px";

    dx += 100 * buttonGroupScale;
    dy += 100 * buttonGroupScale;
    buttonSettings.style.left = dx + "px";
    buttonSettings.style.top = dy + "px";

    dx += 200 * buttonGroupScale;
    buttonStartStop.style.left = dx + "px";
    buttonStartStop.style.top = dy + "px";

    dx += 200 * buttonGroupScale;
    buttonReload.style.left = dx + "px";
    buttonReload.style.top = dy + "px";

    dx += 200 * buttonGroupScale;
    buttonClear.style.left = dx + "px";
    buttonClear.style.top = dy + "px";
}

//button interactions
function buttonHandler(event) {

    switch (event.currentTarget.id) {
        case "buttonSettings":
            console.log("Settings Button clicked!");
            break;
        case "buttonStartStop":
            running = !running;

            if (running)
                buttonStartStop.querySelector("img").src = "/img/gui/buttonStop.png";
            else
                buttonStartStop.querySelector("img").src = "/img/gui/buttonPlay.png";
            break;
        case "buttonReload":
            world.createWorld(false);
            break;
        case "buttonClear":
            world.resetHighlight();
            break;
        default:
            console.log("Unknown button clicked!");
    }
}

//move ButtonGroup - called by mouse Events
let isButtonMovePressed = false;
function moveButtonGroup(event) {
    if (event.type === "mousedown" || event.type === "mousemove") {
        offsetX_buttonGroup = event.clientX;
        offsetY_buttonGroup = event.clientY;
    } else if (event.type === "touchstart" || event.type === "touchmove") {
        offsetX_buttonGroup = event.touches[0].clientX;
        offsetY_buttonGroup = event.touches[0].clientY;
    }

    offsetX_buttonGroup -= 100 * buttonGroupScale;
    offsetY_buttonGroup -= 100 * buttonGroupScale;

    changePositionButtonGroup();
}


//cursor movement. Use for buttonGroup move and highlight positions
let xStart = 0, yStart = 0;
function mouseDown(event) {

    //start move ButtonGroup
    if (event.target.id === buttonMove.id) {
        isButtonMovePressed = true;
        moveButtonGroup(event);
        return;
    }

    //start Highlight
    if (event.type === "mousedown") {
        xStart = Math.floor((event.clientX - OFFSET_X) / SQUARE_SIZE);
        yStart = Math.floor((event.clientY - OFFSET_Y) / SQUARE_SIZE);
    } else if (event.type === "touchstart") {
        xStart = Math.floor((event.touches[0].clientX - OFFSET_X) / SQUARE_SIZE);
        yStart = Math.floor((event.touches[0].clientY - OFFSET_Y) / SQUARE_SIZE);
    }
}

function mouseMove(event) {
   
    //move ButtonGroup
    if (isButtonMovePressed) {
        moveButtonGroup(event);
    }
}

function mouseUp(event) {

    //end move ButtonGroup
    if (event.target.id === buttonMove.id) {
        isButtonMovePressed = false;
        return;
    }

    //end Highlight
    let xEnd = 0, yEnd = 0;
    if (event.type === "mouseup") {
        xEnd = Math.floor((event.clientX - OFFSET_X) / SQUARE_SIZE);
        yEnd = Math.floor((event.clientY - OFFSET_Y) / SQUARE_SIZE);
    } else if (event.type === "touchend") {
        xEnd = Math.floor((event.changedTouches[0].clientX - OFFSET_X) / SQUARE_SIZE);
        yEnd = Math.floor((event.changedTouches[0].clientY - OFFSET_Y) / SQUARE_SIZE);
    }

    world.highlightArea(xStart, yStart, xEnd, yEnd);
}

//register mouse and touch
document.addEventListener('mousedown', mouseDown);
document.addEventListener('mousemove', mouseMove);
document.addEventListener('mouseup', mouseUp);
document.addEventListener('touchstart', mouseDown);
document.addEventListener('touchmove', mouseMove);
document.addEventListener('touchend', mouseUp);

/*
################################################

    World init and animation

################################################
*/

//world building
let world = new World(square_count_width, square_count_height);

//tick function
let ticker = 0;

function tickerInc() {
    ticker++;
    if (ticker >= TICK_RATE) {
        ticker = 0;
        world.nextWorldPiece();
    }
}

//animation
function animate() {

    if (running) tickerInc();

    context.clearRect(0, 0, window_width, window_height);
    world.drawWorld(context, SQUARE_SIZE, OFFSET_X, OFFSET_Y);
    requestAnimationFrame(animate);
}

animate();
import World from "./World.js";

/*
################################################

    Main.js
        GUI
            canvas
            main-gui-buttons
            2x image
            a lot of input stuff
            variables
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
const buttonSettings = document.getElementById("buttonSettings");
buttonSettings.addEventListener("click", buttonHandler);
buttonSettings.querySelector("img").style.width = "100%";
buttonSettings.querySelector("img").style.height = "100%";

const buttonStartStop = document.getElementById("buttonStartStop");
buttonStartStop.addEventListener("click", buttonHandler);
buttonStartStop.querySelector("img").style.width = "100%";
buttonStartStop.querySelector("img").style.height = "100%";

const buttonReload = document.getElementById("buttonReload");
buttonReload.addEventListener("click", buttonHandler);
buttonReload.querySelector("img").style.width = "100%";
buttonReload.querySelector("img").style.height = "100%";

const buttonClear = document.getElementById("buttonClear");
buttonClear.addEventListener("click", buttonHandler);
buttonClear.querySelector("img").style.width = "100%";
buttonClear.querySelector("img").style.height = "100%";

const buttonMove = document.getElementById("buttonMove");
buttonMove.style.cursor = "move";
buttonMove.querySelector("img").style.width = "100%";
buttonMove.querySelector("img").style.height = "100%";

//image
const iconFrame = document.getElementById("iconFrame");
const settingsFrame = document.getElementById("settingsFrame");
settingsFrame.style.visibility = "hidden";

//input
const checkboxAutoStart = document.getElementById("checkboxAutoStart");
checkboxAutoStart.addEventListener("change", function () {
    world.autoStart = this.checked;
});

const radioHighlightMode0 = document.getElementById("radioHighlightMode0");
radioHighlightMode0.addEventListener("change", setHighlightMode);
radioHighlightMode0.checked = true;
const radioHighlightMode1 = document.getElementById("radioHighlightMode1");
radioHighlightMode1.addEventListener("change", setHighlightMode);

const sliderTickRate = document.getElementById("sliderTickRate");
sliderTickRate.addEventListener("input", function () {
    TICK_RATE = this.value;
});

const sliderSquareSize = document.getElementById("sliderSquareSize");
sliderSquareSize.addEventListener("input", function () {
    SQUARE_SIZE = this.value;
    windowResize(false, false);
});

const sliderGuiSize = document.getElementById("sliderGuiSize");
sliderGuiSize.addEventListener("change", function () {
    GUI_SIZE = this.value;
    resizeGui();
});

const radioOffsetX0 = document.getElementById("radioOffsetX0");
radioOffsetX0.addEventListener("change", setOffsetXMode);
const radioOffsetX1 = document.getElementById("radioOffsetX1");
radioOffsetX1.addEventListener("change", setOffsetXMode);
radioOffsetX1.checked = true;
const radioOffsetX2 = document.getElementById("radioOffsetX2");
radioOffsetX2.addEventListener("change", setOffsetXMode);
const radioOffsetY0 = document.getElementById("radioOffsetY0");
radioOffsetY0.addEventListener("change", setOffsetYMode);
const radioOffsetY1 = document.getElementById("radioOffsetY1");
radioOffsetY1.addEventListener("change", setOffsetYMode);
radioOffsetY1.checked = true;
const radioOffsetY2 = document.getElementById("radioOffsetY2");
radioOffsetY2.addEventListener("change", setOffsetYMode);


//changeable by the user
let TICK_RATE = 0;
let SQUARE_SIZE = 32;
let GUI_SIZE = 0.5;
let MULTIPLIER = [];
let OFFSET_X_MODE = "CENTER";
let OFFSET_Y_MODE = "CENTER";

//internal variables
let running = true;

let window_width;
let window_height;
let square_count_width;
let square_count_height;
let border_width;
let border_height;
let offsetX = 0;
let offsetY = 0;
let offsetX_buttonGroup = 0;
let offsetY_buttonGroup = 0;
let buttonGroupScale = 1;

//resize function
function windowResize(init = false, isGuiResize = true) {

    if (init instanceof Event) init = false;

    //intern
    window_width = window.innerWidth;
    window_height = window.innerHeight;
    canvas.width = window_width;
    canvas.height = window_height;
    square_count_width = Math.floor(window_width / SQUARE_SIZE);
    square_count_height = Math.floor(window_height / SQUARE_SIZE);
    border_width = window_width % SQUARE_SIZE;
    border_height = window_height % SQUARE_SIZE;
    offsetX = OFFSET_X_MODE === "CENTER" ? border_width / 2 : OFFSET_X_MODE === "RIGHT" ? border_width : 0;
    offsetY = OFFSET_Y_MODE === "CENTER" ? border_height / 2 : OFFSET_Y_MODE === "BOT" ? border_height : 0;
    offsetX_buttonGroup = 0;
    offsetY_buttonGroup = 0;

    if (isGuiResize) resizeGui();

    if (!init) world.setSize(square_count_width, square_count_height);
}

function resizeGui() {
    buttonGroupScale = GUI_SIZE * (window_width / 1920);

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

    settingsFrame.style.width = 1000 * buttonGroupScale + "px";
    settingsFrame.style.height = 950 * buttonGroupScale + "px";

    checkboxAutoStart.style.width = 50 * buttonGroupScale + "px";
    checkboxAutoStart.style.height = 50 * buttonGroupScale + "px";

    radioHighlightMode0.style.width = 50 * buttonGroupScale + "px";
    radioHighlightMode0.style.height = 50 * buttonGroupScale + "px";
    radioHighlightMode1.style.width = 50 * buttonGroupScale + "px";
    radioHighlightMode1.style.height = 50 * buttonGroupScale + "px";

    sliderTickRate.style.width = 450 * buttonGroupScale + "px";
    sliderTickRate.style.height = 50 * buttonGroupScale + "px";
    sliderSquareSize.style.width = 450 * buttonGroupScale + "px";
    sliderSquareSize.style.height = 50 * buttonGroupScale + "px";
    sliderGuiSize.style.width = 450 * buttonGroupScale + "px";
    sliderGuiSize.style.height = 50 * buttonGroupScale + "px";

    radioOffsetX0.style.width = 50 * buttonGroupScale + "px";
    radioOffsetX0.style.height = 50 * buttonGroupScale + "px";
    radioOffsetX1.style.width = 50 * buttonGroupScale + "px";
    radioOffsetX1.style.height = 50 * buttonGroupScale + "px";
    radioOffsetX2.style.width = 50 * buttonGroupScale + "px";
    radioOffsetX2.style.height = 50 * buttonGroupScale + "px";
    radioOffsetY0.style.width = 50 * buttonGroupScale + "px";
    radioOffsetY0.style.height = 50 * buttonGroupScale + "px";
    radioOffsetY1.style.width = 50 * buttonGroupScale + "px";
    radioOffsetY1.style.height = 50 * buttonGroupScale + "px";
    radioOffsetY2.style.width = 50 * buttonGroupScale + "px";
    radioOffsetY2.style.height = 50 * buttonGroupScale + "px";

    changePositionGUI()
}

//init 
windowResize(true);

window.addEventListener('resize', windowResize);

function changePositionGUI() {

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

    dx = offsetX_buttonGroup, dy = offsetY_buttonGroup;
    dy += 350 * buttonGroupScale;
    settingsFrame.style.left = dx + "px";
    settingsFrame.style.top = dy + "px";

    dx += 425 * buttonGroupScale;
    dy += 110 * buttonGroupScale;
    checkboxAutoStart.style.left = dx + "px";
    checkboxAutoStart.style.top = dy + "px";

    dy += 50 * buttonGroupScale;
    radioHighlightMode0.style.left = dx + "px";
    radioHighlightMode0.style.top = dy + "px";

    dx += 150 * buttonGroupScale;
    radioHighlightMode1.style.left = dx + "px";
    radioHighlightMode1.style.top = dy + "px";

    dx -= 150 * buttonGroupScale;
    dy += 50 * buttonGroupScale;
    sliderTickRate.style.left = dx + "px";
    sliderTickRate.style.top = dy + "px";

    dy += 50 * buttonGroupScale;
    sliderSquareSize.style.left = dx + "px";
    sliderSquareSize.style.top = dy + "px";

    dy += 50 * buttonGroupScale;
    sliderGuiSize.style.left = dx + "px";
    sliderGuiSize.style.top = dy + "px";

    dy += 50 * buttonGroupScale;
    radioOffsetX0.style.left = dx + "px";
    radioOffsetX0.style.top = dy + "px";

    dx += 150 * buttonGroupScale;
    radioOffsetX1.style.left = dx + "px";
    radioOffsetX1.style.top = dy + "px";

    dx += 150 * buttonGroupScale;
    radioOffsetX2.style.left = dx + "px";
    radioOffsetX2.style.top = dy + "px";

    dx -= 300 * buttonGroupScale;
    dy += 50 * buttonGroupScale;
    radioOffsetY0.style.left = dx + "px";
    radioOffsetY0.style.top = dy + "px";

    dx += 150 * buttonGroupScale;
    radioOffsetY1.style.left = dx + "px";
    radioOffsetY1.style.top = dy + "px";

    dx += 150 * buttonGroupScale;
    radioOffsetY2.style.left = dx + "px";
    radioOffsetY2.style.top = dy + "px";
}

//settings hidden/visible
let visibility = "hidden";
function visibilitySettings() {

    visibility = visibility === "hidden" ? "visible" : "hidden";

    settingsFrame.style.visibility = visibility;
    checkboxAutoStart.style.visibility = visibility;
    radioHighlightMode0.style.visibility = visibility;
    radioHighlightMode1.style.visibility = visibility;
    sliderTickRate.style.visibility = visibility;
    sliderSquareSize.style.visibility = visibility;
    sliderGuiSize.style.visibility = visibility;
    radioOffsetX0.style.visibility = visibility;
    radioOffsetX1.style.visibility = visibility;
    radioOffsetX2.style.visibility = visibility;
    radioOffsetY0.style.visibility = visibility;
    radioOffsetY1.style.visibility = visibility;
    radioOffsetY2.style.visibility = visibility;
}

//button interactions
function buttonHandler(event) {

    switch (event.currentTarget.id) {
        case "buttonSettings":
            visibilitySettings();
            break;

        case "buttonStartStop":
            running = !running;

            if (running)
                buttonStartStop.querySelector("img").src = "img/gui/buttonStop.png";
            else
                buttonStartStop.querySelector("img").src = "img/gui/buttonPlay.png";

            if (isWorldReady) {
                world.createWorld(false);
                isWorldReady = false;
            }

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

function setHighlightMode(event) {
    if (event.target.checked)
        world.highlightMode = event.target.value;
}

function setOffsetXMode(event) {
    if (event.target.checked) {
        OFFSET_X_MODE = event.target.value;
        offsetX = OFFSET_X_MODE === "CENTER" ? border_width / 2 : OFFSET_X_MODE === "RIGHT" ? border_width : 0;
        console.log(OFFSET_X_MODE + " " + offsetX);
    }
}

function setOffsetYMode(event) {
    if (event.target.checked) {
        OFFSET_Y_MODE = event.target.value;
        offsetY = OFFSET_Y_MODE === "CENTER" ? border_height / 2 : OFFSET_Y_MODE === "BOT" ? border_height : 0;
        console.log(OFFSET_Y_MODE + " " + offsetY);
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

    changePositionGUI();
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
        xStart = Math.floor((event.clientX - offsetX) / SQUARE_SIZE);
        yStart = Math.floor((event.clientY - offsetY) / SQUARE_SIZE);
    } else if (event.type === "touchstart") {
        xStart = Math.floor((event.touches[0].clientX - offsetX) / SQUARE_SIZE);
        yStart = Math.floor((event.touches[0].clientY - offsetY) / SQUARE_SIZE);
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
        xEnd = Math.floor((event.clientX - offsetX) / SQUARE_SIZE);
        yEnd = Math.floor((event.clientY - offsetY) / SQUARE_SIZE);
    } else if (event.type === "touchend") {
        xEnd = Math.floor((event.changedTouches[0].clientX - offsetX) / SQUARE_SIZE);
        yEnd = Math.floor((event.changedTouches[0].clientY - offsetY) / SQUARE_SIZE);
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
let isWorldReady = false;

//tick function
let ticker = 0;

function tickerInc() {
    ticker++;
    if (ticker >= TICK_RATE) {
        ticker = 0;
        if (!world.nextWorldPiece()) {
            //world is ready built
            running = false;
            buttonStartStop.querySelector("img").src = "img/gui/buttonPlay.png";
            isWorldReady = true;
        }
    }
}

//animation
function animate() {

    if (running) tickerInc();

    context.clearRect(0, 0, window_width, window_height);
    world.drawWorld(context, SQUARE_SIZE, offsetX, offsetY);
    requestAnimationFrame(animate);
}

animate();
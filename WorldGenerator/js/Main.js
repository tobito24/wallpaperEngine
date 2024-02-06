import { changeWeights } from "./Tiles.js";
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
            slider interactions
            radio button interactions
            mouse interactions

        Wallpaper Engine
            User Properties

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

const buttonStartStop = document.getElementById("buttonStartStop");
buttonStartStop.addEventListener("click", buttonHandler);

const buttonReload = document.getElementById("buttonReload");
buttonReload.addEventListener("click", buttonHandler);

const buttonClear = document.getElementById("buttonClear");
buttonClear.addEventListener("click", buttonHandler);

const buttonMove = document.getElementById("buttonMove");
buttonMove.style.cursor = "move";

//image
const iconFrame = document.getElementById("iconFrame");
const settingsFrame = document.getElementById("settingsFrame");
settingsFrame.style.visibility = "hidden";

//input
const checkboxAutoStart = document.getElementById("checkboxAutoStart");
checkboxAutoStart.addEventListener("change", function () {
    World.autoStart = this.checked;
});

const radioHighlightMode0 = document.getElementById("radioHighlightMode0");
radioHighlightMode0.addEventListener("change", setHighlightMode);
radioHighlightMode0.checked = true;
const radioHighlightMode1 = document.getElementById("radioHighlightMode1");
radioHighlightMode1.addEventListener("change", setHighlightMode);

const sliderTickRate = document.getElementById("sliderTickRate");
sliderTickRate.addEventListener("input", sliderHandler);
const sliderAccuracy = document.getElementById("sliderAccuracy");
sliderAccuracy.addEventListener("input", sliderHandler);
const sliderSquareSize = document.getElementById("sliderSquareSize");
sliderSquareSize.addEventListener("input", sliderHandler);
const sliderGuiSize = document.getElementById("sliderGuiSize");
sliderGuiSize.addEventListener("change", sliderHandler);

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

const sliderChangeWeightsDeco = document.getElementById("sliderChangeWeightsDeco");
sliderChangeWeightsDeco.addEventListener("change", sliderHandler);
const sliderChangeWeightsBridge = document.getElementById("sliderChangeWeightsBridge");
sliderChangeWeightsBridge.addEventListener("change", sliderHandler);
const sliderChangeWeightsStone = document.getElementById("sliderChangeWeightsStone");
sliderChangeWeightsStone.addEventListener("change", sliderHandler);
const sliderChangeWeightsTree = document.getElementById("sliderChangeWeightsTree");
sliderChangeWeightsTree.addEventListener("change", sliderHandler);
const sliderChangeWeightsWater = document.getElementById("sliderChangeWeightsWater");
sliderChangeWeightsWater.addEventListener("change", sliderHandler);
const sliderChangeWeightsBase = document.getElementById("sliderChangeWeightsBase");
sliderChangeWeightsBase.addEventListener("change", sliderHandler);
const sliderChangeWeightsBaseT = document.getElementById("sliderChangeWeightsBaseT");
sliderChangeWeightsBaseT.addEventListener("change", sliderHandler);

//changeable by the user
let TICK_RATE = 0;
let SQUARE_SIZE = 64;
let GUI_SIZE = 0.5;
let OFFSET_X_MODE = "CENTER";
let OFFSET_Y_MODE = "CENTER";
let HIDE_HIGHLIGHT = false;


//internal variables
let running = true;

let window_width;
let window_height;
let square_count_width;
let square_count_height;
let offsetX = 0;
let offsetY = 0;
let border_width;
let border_height;
let offsetX_buttonGroup = 0;
let offsetY_buttonGroup = 0;
let buttonGroupScale = 1;

//resize function
function windowResize(event, isGuiResize = true) {

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

    world = new World(square_count_width, square_count_height);
}

window.addEventListener('resize', windowResize);

function resizeGui() {
    buttonGroupScale = GUI_SIZE * (window_width / 1920);

    //button + Frame
    styleElement(iconFrame, 1000, 400);
    styleElement(buttonMove, 200, 200);
    styleElement(buttonSettings, 200, 200);
    styleElement(buttonStartStop, 200, 200);
    styleElement(buttonReload, 200, 200);
    styleElement(buttonClear, 200, 200);
    styleElement(settingsFrame, 1000, 1050);

    styleElement(checkboxAutoStart, 50, 50);
    styleElement(radioHighlightMode0, 50, 50);
    styleElement(radioHighlightMode1, 50, 50);

    styleElement(sliderTickRate, 450, 50, 20, 5);
    styleElement(sliderAccuracy, 450, 50, 20, 5);
    styleElement(sliderSquareSize, 450, 50, 20, 5);
    styleElement(sliderGuiSize, 450, 50, 20, 5);

    styleElement(radioOffsetX0, 50, 50);
    styleElement(radioOffsetX1, 50, 50);
    styleElement(radioOffsetX2, 50, 50);
    styleElement(radioOffsetY0, 50, 50);
    styleElement(radioOffsetY1, 50, 50);
    styleElement(radioOffsetY2, 50, 50);

    styleElement(sliderChangeWeightsBase, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsDeco, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsWater, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsStone, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsBridge, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsTree, 450, 50, 20, 5);
    styleElement(sliderChangeWeightsBaseT, 450, 50, 20, 5);

    changePositionGUI();
}

function styleElement(element, width, height, borderRadius = null, border = null) {
    element.style.width = width * buttonGroupScale + "px";
    element.style.height = height * buttonGroupScale + "px";
    if (borderRadius != null)
        element.style.borderRadius = borderRadius * buttonGroupScale + "px";
    if (border != null)
        element.style.border = border * buttonGroupScale + "px solid #ffffff";
}

function changePositionGUI() {

    let dx = offsetX_buttonGroup, dy = offsetY_buttonGroup;
    let inputHeight = 55;

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

    //settings
    dx = offsetX_buttonGroup, dy = offsetY_buttonGroup;
    dy += 325 * buttonGroupScale;
    settingsFrame.style.left = dx + "px";
    settingsFrame.style.top = dy + "px";

    dx += 425 * buttonGroupScale;
    dy += 100 * buttonGroupScale;
    checkboxAutoStart.style.left = dx + "px";
    checkboxAutoStart.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    radioHighlightMode0.style.left = dx + "px";
    radioHighlightMode0.style.top = dy + "px";

    dx += 300 * buttonGroupScale;
    radioHighlightMode1.style.left = dx + "px";
    radioHighlightMode1.style.top = dy + "px";

    dx -= 300 * buttonGroupScale;
    dy += inputHeight * buttonGroupScale;
    sliderTickRate.style.left = dx + "px";
    sliderTickRate.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderAccuracy.style.left = dx + "px";
    sliderAccuracy.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderSquareSize.style.left = dx + "px";
    sliderSquareSize.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderGuiSize.style.left = dx + "px";
    sliderGuiSize.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    radioOffsetX0.style.left = dx + "px";
    radioOffsetX0.style.top = dy + "px";

    dx += 160 * buttonGroupScale;
    radioOffsetX1.style.left = dx + "px";
    radioOffsetX1.style.top = dy + "px";

    dx += 140 * buttonGroupScale;
    radioOffsetX2.style.left = dx + "px";
    radioOffsetX2.style.top = dy + "px";

    dx -= 300 * buttonGroupScale;
    dy += inputHeight * buttonGroupScale;
    radioOffsetY0.style.left = dx + "px";
    radioOffsetY0.style.top = dy + "px";

    dx += 160 * buttonGroupScale;
    radioOffsetY1.style.left = dx + "px";
    radioOffsetY1.style.top = dy + "px";

    dx += 140 * buttonGroupScale;
    radioOffsetY2.style.left = dx + "px";
    radioOffsetY2.style.top = dy + "px";

    dx -= 300 * buttonGroupScale;
    dy += 2 * inputHeight * buttonGroupScale;
    sliderChangeWeightsBase.style.left = dx + "px";
    sliderChangeWeightsBase.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsDeco.style.left = dx + "px";
    sliderChangeWeightsDeco.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsWater.style.left = dx + "px";
    sliderChangeWeightsWater.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsStone.style.left = dx + "px";
    sliderChangeWeightsStone.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsBridge.style.left = dx + "px";
    sliderChangeWeightsBridge.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsTree.style.left = dx + "px";
    sliderChangeWeightsTree.style.top = dy + "px";

    dy += inputHeight * buttonGroupScale;
    sliderChangeWeightsBaseT.style.left = dx + "px";
    sliderChangeWeightsBaseT.style.top = dy + "px";
}

//gui hidden/visible
let visibilityGUI = "visible";
function setVisibilityGUI(isVisible) {

    visibilityGUI = isVisible ? "visible" : "hidden";

    buttonSettings.style.visibility = visibilityGUI;
    buttonStartStop.style.visibility = visibilityGUI;
    buttonReload.style.visibility = visibilityGUI;
    buttonClear.style.visibility = visibilityGUI;
    buttonMove.style.visibility = visibilityGUI;
    iconFrame.style.visibility = visibilityGUI;

    if (visibilityGUI === "hidden")
        changeVisiblitySettings("hidden");
}

//settings hidden/visible
let visibilitySettings = "hidden";
function changeVisiblitySettings(newVisibility = null) {

    if (newVisibility === null)
        visibilitySettings = visibilitySettings === "hidden" ? "visible" : "hidden";
    else
        visibilitySettings = newVisibility;

    settingsFrame.style.visibility = visibilitySettings;
    checkboxAutoStart.style.visibility = visibilitySettings;
    radioHighlightMode0.style.visibility = visibilitySettings;
    radioHighlightMode1.style.visibility = visibilitySettings;
    sliderTickRate.style.visibility = visibilitySettings;
    sliderAccuracy.style.visibility = visibilitySettings;
    sliderSquareSize.style.visibility = visibilitySettings;
    sliderGuiSize.style.visibility = visibilitySettings;
    radioOffsetX0.style.visibility = visibilitySettings;
    radioOffsetX1.style.visibility = visibilitySettings;
    radioOffsetX2.style.visibility = visibilitySettings;
    radioOffsetY0.style.visibility = visibilitySettings;
    radioOffsetY1.style.visibility = visibilitySettings;
    radioOffsetY2.style.visibility = visibilitySettings;
    sliderChangeWeightsDeco.style.visibility = visibilitySettings;
    sliderChangeWeightsBridge.style.visibility = visibilitySettings;
    sliderChangeWeightsStone.style.visibility = visibilitySettings;
    sliderChangeWeightsTree.style.visibility = visibilitySettings;
    sliderChangeWeightsWater.style.visibility = visibilitySettings;
    sliderChangeWeightsBase.style.visibility = visibilitySettings;
    sliderChangeWeightsBaseT.style.visibility = visibilitySettings;
}

//button interactions
function buttonHandler(event) {

    switch (event.currentTarget.id) {
        case "buttonSettings":
            changeVisiblitySettings();
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

//slider interactions
function sliderHandler(event, sliderId, pValue) {

    if (event != null)
        sliderId = event.currentTarget.id;

    const slider = document.getElementById(sliderId);

    let value = slider.value;

    if (pValue != undefined)
        value = pValue;

    let max = parseInt(slider.max);

    switch (sliderId) {
        case "sliderTickRate":
            value = parseInt(value);
            TICK_RATE = value;
            break;

        case "sliderAccuracy":
            value = parseInt(value);
            world.setAccuracy(value);
            break;

        case "sliderSquareSize":
            value = parseInt(value);
            SQUARE_SIZE = value;
            windowResize(null, false);
            break;

        case "sliderGuiSize":
            value = parseFloat(value);
            GUI_SIZE = value;
            resizeGui();
            break;

        case "sliderChangeWeightsDeco":
            value = parseInt(value);
            changeWeights(value, "DECO");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsBridge":
            value = parseInt(value);
            changeWeights(value, "BRIDGE");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsStone":
            value = parseInt(value);
            changeWeights(value, "STONE");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsTree":
            value = parseInt(value);
            changeWeights(value, "TREE");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsWater":
            value = parseInt(value);
            changeWeights(value, "WATER");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsBase":
            value = parseInt(value);
            changeWeights(value, "BASE");
            value += 1000;
            max += 1000;
            break;

        case "sliderChangeWeightsBaseT":
            value = parseInt(value);
            changeWeights(value, "BASE_T");
            value += 1000;
            max += 1000;
            break;

        default:
            console.log("Unknown slider clicked!");
            return;
    }

    const percentageValue = (value / max) * 100;
    const gradientColor = "linear-gradient(to right, #0f1923 0%, #0f1923 " + percentageValue + "%, #ffffff " + percentageValue + "%, #ffffff 100%)";
    slider.style.background = gradientColor;
}

//radio buttons interactions
function setHighlightMode(event) {
    if (event.target.checked)
        World.highlightMode = event.target.value;
}

function setOffsetXMode(event) {
    if (event.target.checked) {
        OFFSET_X_MODE = event.target.value;
        offsetX = OFFSET_X_MODE === "CENTER" ? border_width / 2 : OFFSET_X_MODE === "RIGHT" ? border_width : 0;
    }
}

function setOffsetYMode(event) {
    if (event.target.checked) {
        OFFSET_Y_MODE = event.target.value;
        offsetY = OFFSET_Y_MODE === "CENTER" ? border_height / 2 : OFFSET_Y_MODE === "BOT" ? border_height : 0;
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

    if (event.target.id != canvas.id)
        return;

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

    Wallpaper Engine - User Properties

################################################
*/

window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {

        if (properties.checkbox_hidegui) { //key - checkbox_hidegui
            setVisibilityGUI(!properties.checkbox_hidegui.value);

        } else if (properties.checkbox_hidehighlight) { //key - checkbox_hidehighlight
            HIDE_HIGHLIGHT = properties.checkbox_hidehighlight.value;

        } else if (properties.checkbox_autostart) {//key - checkbox_autostart
            checkboxAutoStart.checked = properties.checkbox_autostart.value;
            World.autoStart = properties.checkbox_autostart.value;

        } else if (properties.combo_highlightmode) {//key - combo_highlightmode - values: FREEZE_MODE, WRITE_MODE
            if (properties.combo_highlightmode.value === "FREEZE_MODE") {
                radioHighlightMode0.checked = true;
            } else if (properties.combo_highlightmode.value === "WRITE_MODE") {
                radioHighlightMode1.checked = true;
            }
            World.highlightMode = properties.combo_highlightmode.value;

        } else if (properties.slider_tickrate) {//key - slider_tickrate - min="0" max="1000" value="0"
            sliderHandler(null, "sliderTickRate", properties.slider_tickrate.value);

        } else if (properties.slider_squaresize) {//key - slider_squaresize - min="8" max="512" step="8" value="32"
            sliderHandler(null, "sliderSquareSize", properties.slider_squaresize.value);

        } else if (properties.slider_guisize) {//key - slider_guisize - min="0.1" max="1.0" step="0.01" value="0.5"
            sliderHandler(null, "sliderGuiSize", properties.slider_guisize.value);

        } else if (properties.combo_offset_x) {//key - combo_offset_x - values: LEFT, CENTER, RIGHT
            OFFSET_X_MODE = properties.combo_offset_x.value;
            switch (OFFSET_X_MODE) {
                case "LEFT":
                    offsetX = 0;
                    radioOffsetX0.checked = true;
                    break;
                case "CENTER":
                    offsetX = border_width / 2;
                    radioOffsetX1.checked = true;
                    break;
                case "RIGHT":
                    offsetX = border_width;
                    radioOffsetX2.checked = true;
                    break;
            }
        } else if (properties.combo_offset_y) {//key - combo_offset_y - values: TOP, CENTER, BOT
            OFFSET_Y_MODE = properties.combo_offset_y.value;
            switch (OFFSET_Y_MODE) {
                case "TOP":
                    offsetY = 0;
                    radioOffsetY0.checked = true;
                    break;
                case "CENTER":
                    offsetY = border_height / 2;
                    radioOffsetY1.checked = true;
                    break;
                case "BOT":
                    offsetY = border_height;
                    radioOffsetY2.checked = true;
                    break;
            }
        } else if (properties.slider_changeweightsdeco) {//key - slider_changeweightsdeco - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsDeco", properties.slider_changeweightsdeco.value);

        } else if (properties.slider_changeweightsbridge) {//key - slider_changeweightsbridge - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsBridge", properties.slider_changeweightsbridge.value);

        } else if (properties.slider_changeweightsstone) {//key - slider_changeweightsstone - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsStone", properties.slider_changeweightsstone.value);

        } else if (properties.slider_changeweightstree) {//key - slider_changeweightstree - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsTree", properties.slider_changeweightstree.value);

        } else if (properties.slider_changeweightswater) {//key - slider_changeweightswater - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsWater", properties.slider_changeweightswater.value);

        } else if (properties.slider_changeweightsbase) {//key - slider_changeweightsbase - min="-1000" max="1000" value="0"
            sliderHandler(null, "sliderChangeWeightsBase", properties.slider_changeweightsbase.value);

        } else if (properties.slider_changeweightsbaset) {//key - slider_changeweightsbaset - min="-1000" max="1000"value="0"
            sliderHandler(null, "sliderChangeWeightsBaseT", properties.slider_changeweightsbaset.value);

        } else if (properties.slider_accuracy) {//key - slider_accuracy - min="0" max="10"  value="2"
            sliderHandler(null, "sliderAccuracy", properties.slider_accuracy.value);

        }
    }
}

/*
################################################

    World init and animation

################################################
*/

//world building
let world;
let isWorldReady = false;

//init window values
windowResize(true);
sliderHandler(null, "sliderTickRate");//correct background
sliderHandler(null, "sliderAccuracy");
sliderHandler(null, "sliderSquareSize");

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
    world.drawWorld(context, SQUARE_SIZE, offsetX, offsetY, HIDE_HIGHLIGHT);
    requestAnimationFrame(animate);
}

animate();
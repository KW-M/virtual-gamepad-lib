import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, ButtonConfig, VariableButtonConfig, JoystickConfig, EGamepad } from "../../src/GamepadEmulator.js";
import { GamepadApiWrapper } from "../../src/GamepadApiWrapper.js";
import { GamepadDisplay, GamepadDisplayJoystick } from "../../src/GamepadDisplay.js";
import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "../../src/enums.js";
import type { GamepadDisplayVariableButton, GamepadDisplayButton } from "../../src/GamepadDisplay";
import { CenterTransformOrigin, CenterTransformOriginDebug } from "../../src/utilities.js";
// import "./phaser.js";
// import "./twin-stick-game.js"


// the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine or any other library that uses navigator.getGamepads()
const gamepadEmu = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 0, // update the gamepad state every frame
    axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
});

// CONSTS
const GPAD_DISPLAY_CONTAINER = document.body;
const START_BUTTON_INDEX = 8;
const LEFT_X_AXIS_INDEX = 0;
const LEFT_Y_AXIS_INDEX = 1;
const RIGHT_X_AXIS_INDEX = 2;
const RIGHT_Y_AXIS_INDEX = 3;
const BUTTON_ID_NAMES = [
    "button_1",
    "button_2",
    "button_3",
    "button_4",
    "shoulder_button_front_left",
    "shoulder_button_front_right",
    "shoulder_trigger_back_left",
    "shoulder_trigger_back_right",
    "select_button",
    "start_button",
    "stick_button_left",
    "stick_button_right",
    "d_pad_up",
    "d_pad_down",
    "d_pad_left",
    "d_pad_right",
    /* "vendor" */// generally not available to browsers because it is used by OS vendors (eg: Xbox Game Bar, Steam HUD).
];

/** Setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
function setupEmulatedGamepadInput(gpadIndex: number, display_gpad: HTMLElement) {

    /* ----- SETUP BUTTON INPUTS ----- */
    const emulatorButtonConfigs = BUTTON_ID_NAMES.map((name, i) => {
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                buttonIndex: i,
                type: gamepadButtonType.variable,
                tapTarget: display_gpad.querySelector("#" + name + "_touch_target"),
                dragDistance: 50, // pixels that the user must drag the button down to fully press it.
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: true,
                    [gamepadDirection.left]: false,
                    [gamepadDirection.right]: false,
                }
            } as VariableButtonConfig
        } else {
            return {
                buttonIndex: i,
                type: gamepadButtonType.onOff,
                lockTargetWhilePressed: name.includes("stick"),
                tapTarget: display_gpad.querySelector("#" + name + "_touch_target")
            } as ButtonConfig
        }
    }); gamepadEmu.AddDisplayButtonEventListeners(gpadIndex, emulatorButtonConfigs);


    /* ----- SETUP JOYSTICK INPUTS ----- */
    const emulatorStickConfigs: JoystickConfig[] = [{
        tapTarget: display_gpad.querySelector("#stick_button_left_touch_target")!,
        dragDistance: 30, // pixels that the user must drag the joystic to represent +/- 1.
        xAxisIndex: 0,
        yAxisIndex: 1,
        lockTargetWhilePressed: true,
        directions: {
            [gamepadDirection.up]: true,
            [gamepadDirection.down]: false, // disable the down direction so that the joystick can only be dragged up (note that manual calls to moveAxis can still override this).
            [gamepadDirection.left]: true,
            [gamepadDirection.right]: true,
        },
    },
    {
        tapTarget: display_gpad.querySelector("#stick_button_right_touch_target")!,
        dragDistance: 30, // pixels that the user must drag the joystic to represent +/- 1.
        xAxisIndex: 2,
        yAxisIndex: 3,
        lockTargetWhilePressed: true,
        directions: {
            [gamepadDirection.up]: true,
            [gamepadDirection.down]: true,
            [gamepadDirection.left]: true,
            [gamepadDirection.right]: true,
        },
    }]; gamepadEmu.AddDisplayJoystickEventListeners(gpadIndex, emulatorStickConfigs);
}

/** Setup the display buttons & axes of the onscreen gamepad to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
function setupGamepadDisplay(gpadIndex) {

    document.querySelectorAll("#stick_right, #stick_left").forEach((element) => {
        CenterTransformOrigin(element as SVGGraphicsElement); // useful if you want to visually transform the joystick with rotation and scaling
        // CenterTransformOriginDebug(element as SVGGraphicsElement); // show debug bounding boxes used in this feature.
    })

    /* ----- SETUP BUTTON DISPLAY ----- */
    const buttons = BUTTON_ID_NAMES.map((name, i) => {
        console.log(name);
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                type: gamepadButtonType.variable,
                highlight: GPAD_DISPLAY_CONTAINER.querySelector("#" + name + "_highlight"),
                buttonElement: GPAD_DISPLAY_CONTAINER.querySelector("#" + name),
                direction: gamepadDirection.down,
                directionHighlight: GPAD_DISPLAY_CONTAINER.querySelector("#" + name + "_direction_highlight"),
                movementRange: 10, // pixels that the button can move
                extraData: {
                    myCustomData: "variable btn name is " + name
                }
            } as GamepadDisplayVariableButton;
        } else {
            // all other buttons are simply on (pressed) or off (not pressed).
            return {
                type: gamepadButtonType.onOff,
                highlight: GPAD_DISPLAY_CONTAINER.querySelector("#" + name + "_highlight"),
                extraData: {
                    myCustomData: "onOff btn name is " + name
                }
            } as GamepadDisplayButton;
        }
    })

    /* ----- SETUP JOYSTICK DISPLAY ----- */
    const joysticks: GamepadDisplayJoystick[] = [{
        joystickElement: GPAD_DISPLAY_CONTAINER.querySelector("#stick_left") as SVGElement,
        xAxisIndex: 0,
        yAxisIndex: 1,
        movementRange: 10,
        highlights: {
            [gamepadDirection.up]: GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_up_direction_highlight") as SVGElement,
            [gamepadDirection.down]: GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_down_direction_highlight") as SVGElement,
            [gamepadDirection.left]: GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_left_direction_highlight") as SVGElement,
            [gamepadDirection.right]: GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_right_direction_highlight") as SVGElement,
        }
    }, {
        joystickElement: GPAD_DISPLAY_CONTAINER.querySelector("#stick_right") as SVGElement,
        xAxisIndex: 2,
        yAxisIndex: 3,
        movementRange: 10,
        highlights: {
            [gamepadDirection.up]: GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_up_direction_highlight") as SVGElement,
            [gamepadDirection.down]: GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_down_direction_highlight") as SVGElement,
            [gamepadDirection.left]: GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_left_direction_highlight") as SVGElement,
            [gamepadDirection.right]: GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_right_direction_highlight") as SVGElement,
        }
    }]

    // create the gamepad display class instance and pass the config
    const display = new GamepadDisplay({
        gamepadIndex: gpadIndex,
        pressedHighlightClass: "pressed",
        touchedHighlightClass: "touched",
        moveDirectionHighlightClass: "moved",
        buttons: buttons,
        sticks: joysticks,
    }, gpadApiWrapper); // we can pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.
}

function setupEmulatedGamepad() {
    const EMULATED_GPAD_INDEX = 0; // in this example we will only add one emulated gamepad at position/index 0 in the navigator.getGamepads() array.
    gamepadEmu.AddEmulatedGamepad(EMULATED_GPAD_INDEX, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);
    setupGamepadDisplay(EMULATED_GPAD_INDEX); // setup the display buttons to react to the events FROM the gamepad api directly
    setupEmulatedGamepadInput(EMULATED_GPAD_INDEX, GPAD_DISPLAY_CONTAINER); // setup event listeners on the buttons/joysticks to send button/axis updates TO the emulated gamepad.

    // the game engine expects some BUTTON event to detect that our emulated gamepad has connected (and is ready to use):
    gamepadEmu.PressButton(EMULATED_GPAD_INDEX, START_BUTTON_INDEX, 1, true); // press the start button
    setTimeout(() => { gamepadEmu.PressButton(EMULATED_GPAD_INDEX, START_BUTTON_INDEX, 0, false) }, 2); // release the start button after one "frame" (2ms) (if this is less than the rate at which the game engine checks for button presses, the game engine will not detect it)

    // also add keyboard bindings to the gamepad emulator (NOTE that this is through the gamepad emulator. The game engine thinks it is reciving gamepad events)
    window.onkeydown = (e: KeyboardEvent) => {
        const numberKey = parseInt(e.key);
        // wasd to move the left stick
        if (e.key === "a") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 0, -1);
        else if (e.key === "d") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 0, 1);
        else if (e.key === "w") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 1, -1);
        else if (e.key === "s") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 1, 1);
        // arrow keys to move the right stick (prevent default to prevent scrolling)
        else if (e.key === "ArrowLeft") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 2, -1); e.preventDefault(); }
        else if (e.key === "ArrowRight") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 2, 1); e.preventDefault(); }
        else if (e.key === "ArrowUp") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 3, -1); e.preventDefault(); }
        else if (e.key === "ArrowDown") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 3, 1); e.preventDefault(); }
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, numberKey, 1, true);
        else if (e.keyCode) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 66 + 10, 1, true); // 66 is the keycode for "B" (A is already used), 10 is the count of number keys on the keyboard (0-9), so "b" is button #10, "c" is button #11, etc.
    };

    window.onkeyup = (e: KeyboardEvent) => {
        const numberKey = parseInt(e.key);
        // wasd to move the left stick
        if (e.key === "a") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_X_AXIS_INDEX, 0);
        else if (e.key === "d") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_X_AXIS_INDEX, 0);
        else if (e.key === "w") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_Y_AXIS_INDEX, 0);
        else if (e.key === "s") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_Y_AXIS_INDEX, 0);
        // arrow keys to move the right stick (prevent default to prevent scrolling)
        else if (e.key === "ArrowLeft") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_X_AXIS_INDEX, 0); e.preventDefault(); }
        else if (e.key === "ArrowRight") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_X_AXIS_INDEX, 0); e.preventDefault(); }
        else if (e.key === "ArrowUp") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_Y_AXIS_INDEX, 0); e.preventDefault(); }
        else if (e.key === "ArrowDown") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_Y_AXIS_INDEX, 0); e.preventDefault(); }
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, numberKey, 0, false);
        else if (e.keyCode) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 66 + 10, 0, false); // 66 is the keycode for "B" (A is already used), 10 is the count of number keys on the keyboard (0-9), so "b" is button #10, "c" is button #11, etc.
    };

}

// expose for the game engine / page to let us know when the game is ready to start
globalThis.onGameReady = () => {
    document.querySelector("#loading-msg")?.remove();
    document.querySelectorAll(".gpad-display").forEach(elem => {
        elem.classList.remove("hidden");
    })

    // setup a new emulated gamepad with the existing gamepad emulator:
    setupEmulatedGamepad();
}

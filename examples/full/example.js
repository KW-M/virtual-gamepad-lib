import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "../../src/enums.js";
import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT } from "../../src/GamepadEmulator.js";
import { GamepadApiWrapper } from "../../src/GamepadApiWrapper.js";
import { GamepadDisplay } from "../../src/GamepadDisplay.js";
import { CenterTransformOrigin } from "../../src/utilities.js";
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
    /* "vendor" */ // generally not available to browsers because it is used by OS vendors (eg: Xbox Game Bar, Steam HUD).
];
// !!! IMPORTANT: The gamepad emulator class MUST be created before creating the GamepadApiWrapper, Game or any other library that uses navigator.getGamepads()
const gamepadEmu = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({ buttonConfigs: [], updateDelay: 0, axisDeadZone: 0.05 });
const gamepadDisplaySection = document.getElementById("gamepads");
const gamepadDisplayTemplate = document.getElementById("gamepad_display_template");
let Gamepad_Displays = [];
window.addEventListener("gamepadconnected", (e) => {
    const gpad = e.gamepad;
    const index = gpad.index;
    const emulationState = gpad.emulation;
    console.info(`Gamepad ${index} connected (${emulationState}): ${gpad.id}`);
    updateAllGamepadDisplays();
});
window.addEventListener("gamepaddisconnected", (e) => {
    const gpad = e.gamepad;
    const index = gpad.index;
    const emulationState = gpad.emulation;
    console.info(`Gamepad ${index} disconnected (${emulationState}): ${gpad.id}`);
    updateAllGamepadDisplays();
});
function removeAllGamepadDisplays() {
    for (let i = 0; i < Gamepad_Displays.length; i++) {
        const gDisplay = Gamepad_Displays[i];
        gamepadEmu.ClearDisplayButtonEventListeners(gDisplay.index);
        gamepadEmu.ClearDisplayJoystickEventListeners(gDisplay.index);
        gDisplay.container.remove();
        gDisplay.display.Cleanup();
    }
    Gamepad_Displays = [];
}
function updateAllGamepadDisplays() {
    removeAllGamepadDisplays();
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        const gpad = gamepads[i];
        if (!gpad)
            continue;
        // add the gamepad display to the page
        const { display, container } = addGamepadDisplay(gpad.index);
        Gamepad_Displays.push({ display: display, index: gpad.index, container: container });
        // setup click/drag event listeners from the displayed gamepad as input to the emulated gamepad at this index.
        const emulationState = gpad.emulation;
        if (emulationState === gamepadEmulationState.emulated || emulationState === gamepadEmulationState.overlay) {
            setupEmulatedGamepadInput(gpad.index, container);
        }
    }
}
function addEmulatedGamepad(overlay, index) {
    if (overlay) {
        // add an emulated gamepad at the provided index with overlayMode on.
        gamepadEmu.AddEmulatedGamepad(index, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT); // returns the new (emulated) gamepad or false if some error happened.
    }
    else {
        // add an emulated Gamepad at the next available index (indicated by -1) with overlayMode off.
        gamepadEmu.AddEmulatedGamepad(-1, false, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT); // returns the new (emulated) gamepad or false if some error happened.
    }
}
/** setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
function setupEmulatedGamepadInput(gpadIndex, display_gpad) {
    /* ----- SETUP BUTTON INPUTS ----- */
    const emulatorButtonConfigs = BUTTON_ID_NAMES.map((name, i) => {
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                buttonIndex: i,
                type: gamepadButtonType.variable,
                tapTarget: display_gpad.querySelector("#" + name + "_touch_target"),
                dragDistance: 50,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: true,
                    [gamepadDirection.left]: false,
                    [gamepadDirection.right]: false,
                }
            };
        }
        else {
            return {
                buttonIndex: i,
                type: gamepadButtonType.onOff,
                lockTargetWhilePressed: name.includes("stick"),
                tapTarget: display_gpad.querySelector("#" + name + "_touch_target")
            };
        }
    });
    gamepadEmu.AddDisplayButtonEventListeners(gpadIndex, emulatorButtonConfigs);
    /* ----- SETUP JOYSTICK INPUTS ----- */
    const emulatorStickConfigs = [{
            tapTarget: display_gpad.querySelector("#stick_button_left_touch_target"),
            dragDistance: 30,
            xAxisIndex: 0,
            yAxisIndex: 1,
            lockTargetWhilePressed: true,
            directions: {
                [gamepadDirection.up]: true,
                [gamepadDirection.down]: true,
                [gamepadDirection.left]: true,
                [gamepadDirection.right]: true,
            },
        },
        {
            tapTarget: display_gpad.querySelector("#stick_button_right_touch_target"),
            dragDistance: 30,
            xAxisIndex: 2,
            yAxisIndex: 3,
            lockTargetWhilePressed: true,
            directions: {
                [gamepadDirection.up]: true,
                [gamepadDirection.down]: true,
                [gamepadDirection.left]: true,
                [gamepadDirection.right]: true,
            },
        }];
    gamepadEmu.AddDisplayJoystickEventListeners(gpadIndex, emulatorStickConfigs);
}
/** adds a gamepad display from the template element to the page and sets up the display buttons & axes of the onscreen gamepad
 *  to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
function addGamepadDisplay(gpadIndex) {
    if (!gamepadDisplayTemplate || !gamepadDisplaySection || !gamepadDisplayTemplate.content.firstElementChild)
        throw Error("gamepadDisplayTemplate or gamepadDisplaySection elements not found in DOM");
    const clone = gamepadDisplayTemplate.content.firstElementChild.cloneNode(true);
    gamepadDisplaySection.appendChild(clone);
    document.querySelectorAll("#stick_right, #stick_left").forEach((element) => {
        CenterTransformOrigin(element); // useful if you want to visually transform the joystick with rotation and scaling
        // CenterTransformOriginDebug(element as SVGGraphicsElement); // show debug bounding boxes used in this feature.
    });
    // setup the display buttons of the newly created gamepad display in the dom
    const buttons = BUTTON_ID_NAMES.map((name, i) => {
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                type: gamepadButtonType.variable,
                highlight: clone.querySelector("#" + name + "_highlight"),
                buttonElement: clone.querySelector("#" + name),
                direction: gamepadDirection.down,
                directionHighlight: clone.querySelector("#" + name + "_direction_highlight"),
                movementRange: 10,
                extraData: {
                    myCustomData: "variable btn name is " + name
                }
            };
        }
        else {
            //  all other buttons are simply on (pressed) or off (not pressed).
            return {
                type: gamepadButtonType.onOff,
                highlight: clone.querySelector("#" + name + "_highlight"),
                extraData: {
                    myCustomData: "onOff btn name is " + name
                }
            };
        }
    });
    // setup the joysticks of the newly created gamepad display in the dom
    const joysticks = [{
            joystickElement: clone.querySelector("#stick_left"),
            xAxisIndex: 0,
            yAxisIndex: 1,
            movementRange: 10,
            highlights: {
                [gamepadDirection.up]: clone.querySelector("#l_stick_up_direction_highlight"),
                [gamepadDirection.down]: clone.querySelector("#l_stick_down_direction_highlight"),
                [gamepadDirection.left]: clone.querySelector("#l_stick_left_direction_highlight"),
                [gamepadDirection.right]: clone.querySelector("#l_stick_right_direction_highlight"),
            }
        },
        {
            joystickElement: clone.querySelector("#stick_right"),
            xAxisIndex: 2,
            yAxisIndex: 3,
            movementRange: 10,
            highlights: {
                [gamepadDirection.up]: clone.querySelector("#r_stick_up_direction_highlight"),
                [gamepadDirection.down]: clone.querySelector("#r_stick_down_direction_highlight"),
                [gamepadDirection.left]: clone.querySelector("#r_stick_left_direction_highlight"),
                [gamepadDirection.right]: clone.querySelector("#r_stick_right_direction_highlight"),
            }
        }
    ];
    // create the gamepad display class instance and pass the config
    const display = new GamepadDisplay({
        gamepadIndex: gpadIndex,
        pressedHighlightClass: "pressed",
        touchedHighlightClass: "touched",
        moveDirectionHighlightClass: "moved",
        buttons: buttons,
        sticks: joysticks,
        buttonDisplayFunction: (button, value, touched, pressed, changes, btnIndex) => {
            // (optional) call the default display function, to show the button state w classes:
            display.DefaultButtonDisplayFunction(button, value, touched, pressed, changes, btnIndex);
            // --- do some custom stuff here, if you want ---
        },
        joystickDisplayFunction: (stickConfig, xAxisValue, yAxisValue) => {
            // (optional) call the default display function, so show the joystick motion and direction highlights
            display.DefaultJoystickDisplayFunction(stickConfig, xAxisValue, yAxisValue);
            // --- do some custom stuff here if you want ---
            //   - EG: Show extra details about the joysticks in the dom
            if (stickConfig.xAxisIndex === 0) {
                // show the values of the left joystick on svg label:
                const l_label = clone.querySelector("#l_stick_action_help_label");
                if (l_label)
                    l_label.innerHTML = "(" + xAxisValue.toFixed(1) + ", " + yAxisValue.toFixed(1) + ")";
            }
            else if (stickConfig.xAxisIndex === 2) {
                // show the values of the right joystick on svg label:
                const r_label = clone.querySelector("#r_stick_action_help_label");
                if (r_label)
                    r_label.innerHTML = "(" + xAxisValue.toFixed(1) + ", " + yAxisValue.toFixed(1) + ")";
            }
            //   - EG: Fade in the joystick highlights when the joystick is moved
            const upHighlight = stickConfig.highlights[gamepadDirection.up];
            const downHighlight = stickConfig.highlights[gamepadDirection.down];
            const leftHighlight = stickConfig.highlights[gamepadDirection.left];
            const rightHighlight = stickConfig.highlights[gamepadDirection.right];
            if (upHighlight)
                upHighlight.style.opacity = Math.max(-yAxisValue, 0).toString();
            if (downHighlight)
                downHighlight.style.opacity = Math.max(yAxisValue, 0).toString();
            if (leftHighlight)
                leftHighlight.style.opacity = Math.max(-xAxisValue, 0).toString();
            if (rightHighlight)
                rightHighlight.style.opacity = Math.max(xAxisValue, 0).toString();
        },
    }, gpadApiWrapper); // use the same gamepadApiWrapper across all gamepad displays
    const gpad = navigator.getGamepads()[gpadIndex];
    if (gpad.emulation === gamepadEmulationState.emulated) {
        clone.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Emulated | ${gpad.id}`;
        clone.querySelector("#gpad-emulation-btn").innerHTML = "REMOVE Emulated Gamepad";
    }
    else if (gpad.emulation === gamepadEmulationState.overlay) {
        clone.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Overlay (real + emulated input) | ${gpad.id}`;
        clone.querySelector("#gpad-emulation-btn").innerHTML = "REMOVE Emulated Gamepad Overlay";
    }
    else if (gpad.emulation === gamepadEmulationState.real) {
        clone.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Real (no emulated input) | ${gpad.id} `;
        clone.querySelector("#gpad-emulation-btn").innerHTML = "ADD Emulated Gamepad Overlay";
    }
    clone.querySelector("#gpad-emulation-btn").addEventListener("click", () => { handleGpadEmulationBtnClick(gpadIndex); });
    return { container: clone, display: display };
}
function handleGpadEmulationBtnClick(gpadIndex) {
    const emulationState = navigator.getGamepads()[gpadIndex].emulation;
    if (emulationState === gamepadEmulationState.emulated) {
        gamepadEmu.RemoveEmulatedGamepad(gpadIndex);
    }
    else if (emulationState === gamepadEmulationState.overlay) {
        gamepadEmu.RemoveEmulatedGamepad(gpadIndex);
    }
    else if (emulationState === gamepadEmulationState.real) {
        addEmulatedGamepad(true, gpadIndex);
    }
}
// `export` these functions to the global scope so they can be used in the html document onclick="" and other event attributes.
globalThis.addEmulatedGamepad = () => { addEmulatedGamepad(false, -1); };

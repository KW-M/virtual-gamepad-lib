import { gamepadButtonType, gamepadDirection } from "../../src/enums";
import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT } from "../../src/GamepadEmulator";
import { GamepadApiWrapper } from "../../src/GamepadApiWrapper";
import { GamepadDisplay } from "../../src/GamepadDisplay";
// CONSTS
const GPAD_DISPLAY_CONTAINER = document.getElementById("gpad-display-container");
const AXIS_TABLE_ELEM = document.getElementById('axis-table');
const BUTTON_TABLE_ELEM = document.getElementById('button-table');
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
// the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine, or any other library that uses navigator.getGamepads() or listens for gamepad events
const gamepadEmu = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 300,
    axisDeadZone: 0.05,
    buttonConfigs: [] // if we want special behavior for any buttons like HOLD events, we can add them here (see the keyboard example).
});
const EMULATED_GPAD_INDEX = 0; // in this example we will only add one emulated gamepad at position/index 0 in the navigator.getGamepads() array.
gamepadEmu.AddEmulatedGamepad(EMULATED_GPAD_INDEX, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);
setupGamepadDisplay(EMULATED_GPAD_INDEX); // setup the display buttons to react to the events FROM the gamepad api directly
setupEmulatedGamepadInput(EMULATED_GPAD_INDEX, GPAD_DISPLAY_CONTAINER); // setup event listeners on the buttons/joysticks to send button/axis updates TO the emulated gamepad.
// listen for gamepad connection events and log them (you could also use the native window.addEventListener("gamepadconnected", ...) event)
gpadApiWrapper.onGamepadConnect((gpad) => {
    console.log("Gamepad connected: ", gpad);
});
// listen for gamepad disconnection events and log them (you could also use the native window.addEventListener("gamepaddisconnected", ...) event)
gpadApiWrapper.onGamepadDisconnect((gpad) => {
    console.log("Gamepad disconnected: ", gpad);
});
// listen for gamepad button change events and log them (you could also check for changes yourself by calling the navigator.getGamepads() function)
gpadApiWrapper.onGamepadButtonChange((gpadIndex, gpad, buttonChanges) => {
    console.log(`Gamepad ${gpadIndex} button change: `, buttonChanges);
    for (let i = 0; i < gpad.buttons.length; i++) {
        if (!buttonChanges[i])
            continue; // this button did not change, so skip it.
        // display the button change in the table:
        const btnTableRow = BUTTON_TABLE_ELEM.children[i];
        if (btnTableRow) {
            const btnValue = gpad.buttons[i].value || 0;
            const btnValueCell = btnTableRow.children[2];
            btnTableRow.style.backgroundColor = gpad.buttons[i].pressed ? "blueviolet" : (gpad.buttons[i].touched ? "greenyellow" : "");
            btnValueCell.style.backgroundColor = btnValue == 0 ? "" : "#FF" + Math.round(btnValue * 255).toString(16).padStart(2, "0") + "00";
            btnValueCell.innerText = btnValue.toFixed(2);
        }
    }
});
// listen for gamepad axis change events and log them (you could also check for changes yourself by calling the navigator.getGamepads() function)
gpadApiWrapper.onGamepadAxisChange((gpadIndex, gpad, axisChangesMask) => {
    console.log(`Gamepad ${gpadIndex} axis change: `, gpad.axes, axisChangesMask);
    const axisValuesTableRow = AXIS_TABLE_ELEM.children[1];
    for (let i = 0; i < axisChangesMask.length; i++) {
        if (!axisChangesMask[i])
            continue; // this axis did not change, so skip it
        // display the axis change in the table:
        const axisValueCell = axisValuesTableRow.children[i + 1];
        if (axisValueCell) {
            const axisValue = gpad.axes[i] || 0;
            axisValueCell.innerText = axisValue.toFixed(2);
            axisValueCell.style.backgroundColor = "#" + Math.round(255 - (Math.max(-axisValue, 0) * 255)).toString(16).padStart(2, "0") + "FF" + Math.round(255 - (Math.max(axisValue, 0) * 255)).toString(16).padStart(2, "0");
        }
    }
});
/** Setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
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
/** Setup the display buttons & axes of the onscreen gamepad to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
function setupGamepadDisplay(gpadIndex) {
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
                movementRange: 10,
                extraData: {
                    myCustomData: "variable btn name is " + name
                }
            };
        }
        else {
            // all other buttons are simply on (pressed) or off (not pressed).
            return {
                type: gamepadButtonType.onOff,
                highlight: GPAD_DISPLAY_CONTAINER.querySelector("#" + name + "_highlight"),
                extraData: {
                    myCustomData: "onOff btn name is " + name
                }
            };
        }
    });
    /* ----- SETUP JOYSTICK DISPLAY ----- */
    const joysticks = [{
            joystickElement: GPAD_DISPLAY_CONTAINER.querySelector("#" + "stick_left"),
            xAxisIndex: 0,
            yAxisIndex: 1,
            movementRange: 10,
            directions: {
                [gamepadDirection.up]: true,
                [gamepadDirection.down]: true,
                [gamepadDirection.left]: true,
                [gamepadDirection.right]: true,
            },
            highlights: {
                [gamepadDirection.up]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "l_stick_up_direction_highlight"),
                [gamepadDirection.down]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "l_stick_down_direction_highlight"),
                [gamepadDirection.left]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "l_stick_left_direction_highlight"),
                [gamepadDirection.right]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "l_stick_right_direction_highlight"),
            }
        }, {
            joystickElement: GPAD_DISPLAY_CONTAINER.querySelector("#" + "stick_right"),
            xAxisIndex: 2,
            yAxisIndex: 3,
            movementRange: 10,
            directions: {
                [gamepadDirection.up]: true,
                // [gamepadDirection.down]: true,
                [gamepadDirection.left]: true,
                // [gamepadDirection.right]: true,
            },
            // highlights: {
            //     [gamepadDirection.up]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "r_stick_up_direction_highlight") as SVGElement,
            //     [gamepadDirection.down]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "r_stick_down_direction_highlight") as SVGElement,
            //     [gamepadDirection.left]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "r_stick_left_direction_highlight") as SVGElement,
            //     [gamepadDirection.right]: GPAD_DISPLAY_CONTAINER.querySelector("#" + "r_stick_right_direction_highlight") as SVGElement,
            // }
        }];
    // create the gamepad display class instance and pass the config
    new GamepadDisplay({
        gamepadIndex: gpadIndex,
        buttonHighlightClass: "highlight",
        pressedHighlightClass: "pressed",
        touchedHighlightClass: "touched",
        moveDirectionHighlightClass: "moved",
        buttons: buttons,
        sticks: joysticks,
    }, gpadApiWrapper); // we can pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.
}

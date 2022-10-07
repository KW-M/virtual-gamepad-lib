import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, ButtonConfig, VariableButtonConfig, JoystickConfig, EGamepad } from "../../src/GamepadEmulator";
import { GamepadApiWrapper } from "../../src/GamepadApiWrapper";
import { GamepadDisplay, GamepadDisplayJoystick } from "../../src/GamepadDisplay";
import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "../../src/enums";
import type { GamepadDisplayVariableButton, GamepadDisplayButton } from "../../src/GamepadDisplay";


const BUTTON_DISPLAY_NAMES = [
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
    // "vendor" // generally not available to browsers, because it is used by vendors (eg: xbox game bar, steam).
];


const dirHighlights = [
    "r_stick_right_direction_highlight",
    "r_stick_left_direction_highlight",
    "r_stick_up_direction_highlight",
    "r_stick_down_direction_highlight",
    "l_stick_right_direction_highlight",
    "l_stick_left_direction_highlight",
    "l_stick_up_direction_highlight",
    "l_stick_down_direction_highlight",
    "shoulder_trigger_back_left_direction_highlight",
    "shoulder_trigger_back_right_direction_highlight",
]
dirHighlights.forEach((highlightId) => {
    const highlight = document.querySelector("#" + highlightId);
    if (highlight) highlight.classList.add("gpad-direction-highlight");
})

const setupGamepadEmulatorInput = (gpadIndex: number, display_gpad: HTMLElement) => {
    // setup the touch targets / inputs controlls for interacting with the emulated gamepad  (part of the emulated gamepad module)
    const emulatorButtonConfigs = BUTTON_DISPLAY_NAMES.map((name, i) => {
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
    })

    const emulatorStickConfigs: JoystickConfig[] = [{
        tapTarget: display_gpad.querySelector("#stick_button_left_touch_target")!,
        dragDistance: 30, // pixels that the user must drag the joystic to represent +/- 1.
        xAxisIndex: 0,
        yAxisIndex: 1,
        lockTargetWhilePressed: true,
        directions: {
            [gamepadDirection.up]: true,
            [gamepadDirection.down]: true,
            [gamepadDirection.left]: true,
            [gamepadDirection.right]: true,
        },
    }, {
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
    }]

    gamepadEmu.AddDisplayButtonEventListeners(gpadIndex, emulatorButtonConfigs);
    gamepadEmu.AddDisplayJoystickEventListeners(gpadIndex, emulatorStickConfigs);
}

const addGamepadDisplay = (gpadIndex) => {
    const clone = gamepadDisplayContainer;
    // setup the display buttons of the newly created gamepad display in the dom
    const buttons = BUTTON_DISPLAY_NAMES.map((name, i) => {
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                type: gamepadButtonType.variable,
                highlight: clone.querySelector("#" + name + "_highlight"),
                buttonElement: clone.querySelector("#" + name),
                direction: gamepadDirection.down,
                directionHighlight: clone.querySelector("#" + name + "_direction_highlight"),
                movementRange: 10, // pixels that the button can move
                extraData: {
                    myCustomData: "variable btn name is " + name
                }
            } as GamepadDisplayVariableButton;
        } else {
            //  all other buttons are simply on (pressed) or off (not pressed).
            return {
                type: gamepadButtonType.onOff,
                highlight: clone.querySelector("#" + name + "_highlight"),
                extraData: {
                    myCustomData: "onOff btn name is " + name
                }
            } as GamepadDisplayButton;
        }
    })
    // setup the joysticks of the newly created gamepad display in the dom
    const joysticks: GamepadDisplayJoystick[] = [{
        joystickElement: clone.querySelector("#" + "stick_left") as SVGElement,
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
            [gamepadDirection.up]: clone.querySelector("#" + "l_stick_up_direction_highlight") as SVGElement,
            [gamepadDirection.down]: clone.querySelector("#" + "l_stick_down_direction_highlight") as SVGElement,
            [gamepadDirection.left]: clone.querySelector("#" + "l_stick_left_direction_highlight") as SVGElement,
            [gamepadDirection.right]: clone.querySelector("#" + "l_stick_right_direction_highlight") as SVGElement,
        }
    },
    {
        joystickElement: clone.querySelector("#" + "stick_right") as SVGElement,
        xAxisIndex: 2,
        yAxisIndex: 3,
        movementRange: 10,
        directions: {
            [gamepadDirection.up]: true,
            [gamepadDirection.down]: true,
            [gamepadDirection.left]: true,
            [gamepadDirection.right]: true,
        },
        highlights: {
            [gamepadDirection.up]: clone.querySelector("#" + "r_stick_up_direction_highlight") as SVGElement,
            [gamepadDirection.down]: clone.querySelector("#" + "r_stick_down_direction_highlight") as SVGElement,
            [gamepadDirection.left]: clone.querySelector("#" + "r_stick_left_direction_highlight") as SVGElement,
            [gamepadDirection.right]: clone.querySelector("#" + "r_stick_right_direction_highlight") as SVGElement,
        }
    }
    ]

    // create the gamepad display class instance and pass the config
    const gDisplay = new GamepadDisplay({
        gamepadIndex: gpadIndex,
        buttonHighlightClass: "highlight",
        pressedHighlightClass: "pressed",
        touchedHighlightClass: "touched",
        moveDirectionHighlightClass: "moved",
        buttons: buttons,
        sticks: joysticks,
    })


    return clone
}

// the gamepad emulator MUST be created before creating the GamepadApiWrapper, Game or any other library that uses navigator.getGamepads()
const gamepadEmu = new GamepadEmulator(0.1);
const gamepadDisplayContainer = document.getElementById("gpad-display-container") as HTMLElement;

function addEmulatedGamepad() {
    gamepadEmu.AddEmulatedGamepad(0, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);
    addGamepadDisplay(0);
    setupGamepadEmulatorInput(0, gamepadDisplayContainer);

    // also add keyboard bindings to the gamepad emulator
    window.onkeydown = (e: KeyboardEvent) => {
        const GPAD_INDEX = 0, numberKey = parseInt(e.key);
        console.log(e.key);
        // wasd to move the left stick
        if (e.key === "a") gamepadEmu.MoveAxis(GPAD_INDEX, 0, -1);
        else if (e.key === "d") gamepadEmu.MoveAxis(GPAD_INDEX, 0, 1);
        else if (e.key === "w") gamepadEmu.MoveAxis(GPAD_INDEX, 1, -1);
        else if (e.key === "s") gamepadEmu.MoveAxis(GPAD_INDEX, 1, 1);
        // arrow keys to move the right stick
        else if (e.key === "ArrowLeft") gamepadEmu.MoveAxis(GPAD_INDEX, 2, -1);
        else if (e.key === "ArrowRight") gamepadEmu.MoveAxis(GPAD_INDEX, 2, 1);
        else if (e.key === "ArrowUp") gamepadEmu.MoveAxis(GPAD_INDEX, 3, -1);
        else if (e.key === "ArrowDown") gamepadEmu.MoveAxis(GPAD_INDEX, 3, 1);
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) {
            gamepadEmu.PressButton(GPAD_INDEX, numberKey, 0, false);
            console.log("pressed button " + numberKey);
        }
        // else if (e.keyCode) gamepadEmu.PressButton(GPAD_INDEX, e.keyCode - 66 + 10, 0, false); // 66 is the keycode for "B" (A is already used), 10 is the count of number keys on the keyboard (0-9), so "b" is button #10, "c" is button #11, etc.
        e.preventDefault();
    };

    window.onkeyup = (e: KeyboardEvent) => {
        const GPAD_INDEX = 0, numberKey = parseInt(e.key);
        console.log(e.key);
        // wasd to move the left stick
        if (e.key === "a") gamepadEmu.MoveAxis(GPAD_INDEX, 0, 0);
        else if (e.key === "d") gamepadEmu.MoveAxis(GPAD_INDEX, 0, 0);
        else if (e.key === "w") gamepadEmu.MoveAxis(GPAD_INDEX, 1, 0);
        else if (e.key === "s") gamepadEmu.MoveAxis(GPAD_INDEX, 1, 0);
        // arrow keys to move the right stick
        else if (e.key === "ArrowLeft") gamepadEmu.MoveAxis(GPAD_INDEX, 2, 0);
        else if (e.key === "ArrowRight") gamepadEmu.MoveAxis(GPAD_INDEX, 2, 0);
        else if (e.key === "ArrowUp") gamepadEmu.MoveAxis(GPAD_INDEX, 3, 0);
        else if (e.key === "ArrowDown") gamepadEmu.MoveAxis(GPAD_INDEX, 3, 0);
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) gamepadEmu.PressButton(GPAD_INDEX, numberKey, 0, false);
        else if (e.keyCode) gamepadEmu.PressButton(GPAD_INDEX, e.keyCode - 66 + 10, 0, false); // 66 is the keycode for "B" (A is already used), 10 is the count of number keys on the keyboard (0-9), so "b" is button #10, "c" is button #11, etc.
    };

}

// expose for the page
globalThis.addEmulatedGamepad = addEmulatedGamepad;

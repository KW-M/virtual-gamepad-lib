import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, ButtonConfig, VariableButtonConfig, JoystickConfig, EGamepad } from "../src/GamepadEmulator";
import { GamepadApiWrapper } from "../src/GamepadApiWrapper";
import { GamepadDisplay } from "../src/GamepadDisplay";
import { gamepadButtonType, gamepadDirection } from "../src/enums";
import type { GamepadDisplayVariableButton, GamepadDisplayButton } from "../src/GamepadDisplay";

// the gamepad emulator MUST be created before creating the GamepadApiWrapper, Game or any other library that uses navigator.getGamepads()
const gamepadEmu = new GamepadEmulator(0.1);
const gamepadApiWrapper = new GamepadApiWrapper({ buttonConfigs: [], updateDelay: 0 });
let EMU_GAMEPAD_INDEX = 0;

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

const gamepadDisplaySection = document.getElementById("gamepads");
const gamepadDisplayTemplate = document.getElementById("gamepad_display_template") as (HTMLTemplateElement | null);
window.addEventListener("gamepadconnected", (e) => {
    const gpad = e.gamepad;
    const index = gpad.index;
    const emulationState = (gpad as EGamepad).emulation;
    console.info((emulationState ? emulationState : "") + " gamepad connected: " + gpad.id)
    let clone = addGamepadDisplay(gpad.index);
    setupGamepadEmulatorInput(gpad.index, clone);
});
window.addEventListener("gamepaddisconnected", (e) => {
    const gpad = e.gamepad;
    const index = gpad.index;
    const emulationState = (gpad as EGamepad).emulation;
    console.info((emulationState ? emulationState : "") + "  gamepad disconnected: " + gpad.id);
});

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
                tapTarget: display_gpad.querySelector("#" + name + "_touch_target")
            } as ButtonConfig
        }
    })

    const emulatorStickConfigs: JoystickConfig[] = [{
        tapTarget: display_gpad.querySelector("#stick_button_left_touch_target")!,
        dragDistance: 30, // pixels that the user must drag the joystic to represent +/- 1.
        xAxisIndex: 0,
        yAxisIndex: 1,
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
    if (!gamepadDisplayTemplate || !gamepadDisplaySection || !gamepadDisplayTemplate.content.firstElementChild) throw Error("gamepadDisplayTemplate or gamepadDisplaySection elements not found in DOM");
    const clone = gamepadDisplayTemplate.content.firstElementChild.cloneNode(true) as HTMLElement;
    gamepadDisplaySection.appendChild(clone);
    // setup the display buttons of the newly created gamepad display in the dom
    const buttons = BUTTON_DISPLAY_NAMES.map((name, i) => {
        if (name.includes("trigger")) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                type: gamepadButtonType.variable,
                highlight: clone.querySelector("#" + name + "_highlight"),
                buttonElement: clone.querySelector("#" + name),
                direction: gamepadDirection.down,
                directionHighlight: clone.querySelector("#" + name + "_arrow"),
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
    const joysticks = [{
        joystickElement: clone.querySelector("#" + "stick_left"),
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
            [gamepadDirection.up]: clone.querySelector("#" + "l_stick_up_direction_highlight"),
            [gamepadDirection.down]: clone.querySelector("#" + "l_stick_down_direction_highlight"),
            [gamepadDirection.left]: clone.querySelector("#" + "l_stick_left_direction_highlight"),
            [gamepadDirection.right]: clone.querySelector("#" + "l_stick_right_direction_highlight"),
        }
    },
    {
        joystickElement: clone.querySelector("#" + "stick_right"),
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
            [gamepadDirection.up]: clone.querySelector("#" + "r_stick_up_direction_highlight"),
            [gamepadDirection.down]: clone.querySelector("#" + "r_stick_down_direction_highlight"),
            [gamepadDirection.left]: clone.querySelector("#" + "r_stick_left_direction_highlight"),
            [gamepadDirection.right]: clone.querySelector("#" + "r_stick_right_direction_highlight"),
        }
    }
    ]

    // create the gamepad display class instance and pass the config
    const gDisplay = new GamepadDisplay({
        gamepadIndex: gpadIndex,
        buttonHighlightClass: "highlight",
        pressedHighlightClass: "pressed",
        touchedHighlightClass: "touched",
        buttons: buttons,
        sticks: joysticks,
    })

    return clone
}

globalThis.addEmulatedGamepad = () => {
    const gpad = gamepadEmu.AddEmulatedGamepad(EMU_GAMEPAD_INDEX, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);
    EMU_GAMEPAD_INDEX += 1;
}

let manualGamepadUpdateInterval;
let tickCount = 0;
globalThis.toggleProgramaticGamepadUpdates = () => {
    if (!manualGamepadUpdateInterval) {

        manualGamepadUpdateInterval = setInterval(() => {

            // keep track of time
            tickCount++;

            // generate some interesting pattern for axies:
            const x = Math.cos(tickCount / 100) //+ 0.1 * Math.sin(tickCount / 200 + 0.7);;
            const y = Math.sin(tickCount / 100) //(Math.cos(tickCount / 100) - 0.5) * 2  //+ 0.1 * Math.sin(tickCount / 200 + 0.5);
            // move axis 0 (left stick x)
            gamepadEmu.MoveAxis(0, 0, x);
            // move axis 1 (left stick y)
            gamepadEmu.MoveAxis(0, 1, y);
            // show those values on the label
            const l_label = document.getElementById("l_stick_action_help_label")
            if (l_label) l_label.innerHTML = "(" + x.toFixed(1) + ", " + y.toFixed(1) + ")";

            // // move axis 2 (right stick x)
            gamepadEmu.MoveAxis(0, 2, -x);
            // // move axis 3 (right stick y)
            gamepadEmu.MoveAxis(0, 3, -y);
            // show those values on the label
            const r_label = document.getElementById("r_stick_action_help_label")
            if (r_label) r_label.innerHTML = "(" + -x.toFixed(1) + ", " + -y.toFixed(1) + ")";


            // generate some random pattern of button presses:
            const btnIndex = Math.floor(Math.random() * DEFAULT_GPAD_BUTTON_COUNT);
            const btnValue = Math.max(x * y * 0.5, 0); // the value is between 0 and 1. if it is greater than the value of the button threshold (given in new GamepadEmulator(threshold)), the button is considered "pressed". most buttons only have 0 and 1 states, but some buttons have variable states (like the triggers)
            // the button will always be "touched" if the button value is above the pressed threshold, but a non-pressed button can either be touched or not:
            const btnTouched = Math.random() > 0.8;
            // press (or unpress) the button:
            gamepadEmu.PressButton(0, btnIndex, btnValue, btnTouched);

        }, 10);

    } else {

        clearInterval(manualGamepadUpdateInterval);
        manualGamepadUpdateInterval = null;

    }
}

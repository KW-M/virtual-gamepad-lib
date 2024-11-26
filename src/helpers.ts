import { PRESET_SVG_GPAD_BTN_IDS, PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS, PRESET_SVG_GPAD_CLASS, PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES, gamepadButtonType, gamepadDirection, standardGpadButtonMap } from "./enums.js";
import { DisplayGamepadConfig, GamepadDisplay, GamepadDisplayJoystick, GamepadDisplayOnOffButton, GamepadDisplayVariableButton } from "./GamepadDisplay.js";
import { ButtonTouchConfig, DEFAULT_GPAD_AXIS_COUNT, DEFAULT_GPAD_BUTTON_COUNT, GamepadEmulator, VariableButtonTouchConfig } from "./GamepadEmulator.js";
import { GamepadApiWrapper } from "./GamepadApiWrapper.js";
import { CenterTransformOrigin } from "./utilities.js";

/**  optional parameters to override default behavior of setupPresetInteractiveGamepad */
export interface interactiveGamepadPresetConfig {
    GpadEmulator?: GamepadEmulator,
    GpadApiWrapper?: GamepadApiWrapper,
    GpadDisplayConfig?: DisplayGamepadConfig,
    EmulatedGamepadIndex?: number,
    EmulatedGamepadOverlayMode?: boolean,
    AllowDpadDiagonals?: boolean,
    VariableTriggers?: boolean,
    ClickableJoysticks?: boolean,
    JoystickDragDistance?: number,
    TriggerDragDistance?: number,
}


export const setupPresetInteractiveGamepad = (containerElement: HTMLElement, config: interactiveGamepadPresetConfig) => {

    // merge the config with the default config
    config = Object.assign({
        GpadDisplayConfig: { gamepadIndex: 0 },
        EmulatedGamepadIndex: 0,
        EmulatedGamepadOverlayMode: true,
        AllowDpadDiagonals: false,
        VariableTriggers: true,
        ClickableJoysticks: true,
        JoystickDragDistance: 50,
        TriggerDragDistance: 50,
    } as interactiveGamepadPresetConfig, config);

    // add the gpad-container class to the container element to apply default styles
    containerElement.classList.add("gpad-container");

    // create the GamepadEmulator instance the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine, or any other library that uses navigator.getGamepads() or listens for gamepad events
    const gpadEmulator = config.GpadEmulator ?? new GamepadEmulator(0.1);

    // create the GamepadApiWrapper with the desired configuration - used to respond to gamepad events
    const gpadApiWrapper = config.GpadApiWrapper ?? new GamepadApiWrapper({
        updateDelay: 0, // update the gamepad state every 0ms, updateDelay: 0 means update as fast as the framerate of the browser (fastest possible).
        axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
        buttonConfigs: [] // if we want special behavior for any buttons like HOLD events, we can add them here (see the keyboard example).
    });

    // Add the emulated gamepad to the navigator.getGamepads() array in overlay mode
    const EMULATED_GPAD_INDEX = config.EmulatedGamepadIndex!;
    gpadEmulator.AddEmulatedGamepad(EMULATED_GPAD_INDEX, config.EmulatedGamepadOverlayMode!, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);

    /* Setup onscreen gamepad button touch/mouse inputs */
    const buttonInputConfigs: ButtonTouchConfig[] = [];
    for (let i = 0; i < PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS.length; i++) {
        const tapTargetId = PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS[i]
        const tapTarget = containerElement.querySelector("#" + tapTargetId) as HTMLElement | SVGElement | null;
        const isTrigger = tapTargetId.includes("trigger");
        const isStick = tapTargetId.includes("stick");
        if (!tapTarget) {
            console.error("Could not find gamepad tap target with id " + tapTargetId + ". Make sure to insert the full gamepad SVG into the DOM before calling setupPremadeInteractiveGamepad().");
            continue;
        } else if (isTrigger && config.VariableTriggers) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            buttonInputConfigs.push({
                buttonIndex: i,
                type: gamepadButtonType.variable,
                tapTarget: tapTarget,
                dragDistance: config.TriggerDragDistance, // svg pixels that the user must drag the trigger button down to fully press it.
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.down]: true,
                }
            } as VariableButtonTouchConfig)
        } else if (!isStick || config.ClickableJoysticks) {
            buttonInputConfigs.push({
                buttonIndex: i,
                tapTarget: tapTarget,
                type: gamepadButtonType.onOff,
                lockTargetWhilePressed: (isStick === true),
            })
        }
    }


    if (config.AllowDpadDiagonals) {
        for (const [tapTargetId, buttonIndexes] of Object.entries(PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES)) {
            const tapTarget = containerElement.querySelector("#" + tapTargetId);
            if (tapTarget) {
                buttonInputConfigs.push({
                    buttonIndexes: buttonIndexes,
                    type: gamepadButtonType.onOff,
                    tapTarget: tapTarget,
                    lockTargetWhilePressed: false, // important to set this to false for dpad buttons to allow sliding a finger between the buttons.
                } as ButtonTouchConfig)
            } else {
                console.error("Could not find gamepad tap target with id " + tapTargetId + ". Make sure to insert the full gamepad SVG into the DOM before calling setupPremadeInteractiveGamepad().");
                continue;
            }
        }
    }

    // Tell the GamepadEmulator to listen for button touch events on the tap targets and update the emulated gamepad state.
    gpadEmulator.AddButtonTouchEventListeners(EMULATED_GPAD_INDEX, buttonInputConfigs);

    /* ----- SETUP JOYSTICK INPUTS ----- */
    gpadEmulator.AddJoystickTouchEventListeners(EMULATED_GPAD_INDEX, [
        {
            tapTarget: containerElement.querySelector("#stick_button_left_tap_target")!,
            dragDistance: config.JoystickDragDistance!, // svg pixels that the user must drag the joystick to represent + 1 (or in reverse to represent minus one).
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
            tapTarget: containerElement.querySelector("#stick_button_right_tap_target")!,
            dragDistance: config.JoystickDragDistance!, //svg pixels that the user must drag the joystick to represent + 1 (or in reverse to represent minus one).
            xAxisIndex: 2,
            yAxisIndex: 3,
            lockTargetWhilePressed: true,
            directions: {
                [gamepadDirection.up]: true,
                [gamepadDirection.down]: true,
                [gamepadDirection.left]: true,
                [gamepadDirection.right]: true,
            },
        }
    ]);


    // ----------------------------------------------------------------------
    // ----- MAKE DISPLAYED GAMEPAD REACT TO EMULATED GAMEPAD STATE -----
    // ----------------------------------------------------------------------

    const leftStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`) as SVGGraphicsElement;
    const rightStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`) as SVGGraphicsElement;

    // Center the transform origin of the stick buttons so that they rotate around their center.
    CenterTransformOrigin(leftStickButton);
    CenterTransformOrigin(rightStickButton);

    /* ----- MAKE BUTTON DISPLAY CONFIG ----- */
    const buttons = PRESET_SVG_GPAD_BTN_IDS.map((btnId) => {
        const isTrigger = btnId.includes("trigger");
        if (isTrigger && config.VariableTriggers) {
            // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
            return {
                type: gamepadButtonType.variable,
                direction: gamepadDirection.down,
                buttonElement: containerElement.querySelector(`#${btnId}`),
                highlight: containerElement.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                directionHighlight: containerElement.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.DirectionHighlight}`),
                movementRange: 10, // SVG pixels that the button can move down to represent fully pressed.
            } as GamepadDisplayVariableButton;
        } else {
            // all other buttons are simply on (pressed) or off (not pressed).
            return {
                type: gamepadButtonType.onOff,
                highlight: containerElement.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                extraData: {
                    // we can add custom data to the button config that will be passed to the buttonDisplayFunction when the button is updated.
                    myCustomData: "onOff btn name is " + btnId
                }
            } as GamepadDisplayOnOffButton;
        }
    })

    /* ----- MAKE JOYSTICK DISPLAY CONFIG ----- */
    const joysticks: GamepadDisplayJoystick[] = [{
        joystickElement: containerElement.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`) as SVGElement,
        xAxisIndex: 0,
        yAxisIndex: 1,
        movementRange: 10,
    }, {
        joystickElement: containerElement.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`) as SVGElement,
        xAxisIndex: 2,
        yAxisIndex: 3,
        movementRange: 10,
    }]

    // create the gamepad display class instance and pass the button and joystick configs
    const gpadDisplay = new GamepadDisplay(Object.assign({
        gamepadIndex: EMULATED_GPAD_INDEX, // the index of the emulated gamepad that we want to display.
        buttons: buttons,
        sticks: joysticks,
    }, config.GpadDisplayConfig), gpadApiWrapper); // we pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.

    return { gpadEmulator, gpadApiWrapper, gpadDisplay };
}

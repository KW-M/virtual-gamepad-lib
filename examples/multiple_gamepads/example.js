import { GamepadApiWrapper } from "virtual-gamepad-lib/GamepadApiWrapper";
import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT } from "virtual-gamepad-lib/GamepadEmulator";
import { GamepadDisplay } from "virtual-gamepad-lib/GamepadDisplay";
import { gamepadButtonType, gamepadDirection, gamepadEmulationState, PRESET_SVG_GPAD_BTN_IDS, PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS, PRESET_SVG_GPAD_CLASS, standardGpadButtonMap } from "virtual-gamepad-lib/enums";
import { CenterTransformOrigin } from "virtual-gamepad-lib/utilities";
// import the svg source code for the left and right onscreen gamepad SVGs
//  - this could be done like with a build tool like vite(shown here) or webpack or at runtime with a fetch request
import FULL_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-full.svg?raw";
// !!!IMPORTANT: A single GamepadEmulator class MUST be created before creating the GamepadApiWrapper, a Game engine or any other library that uses navigator.getGamepads()
const gpadEmulator = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({ buttonConfigs: [], updateDelay: 0, axisDeadZone: 0.05 });
let Gamepad_Displays = [];
window.addEventListener("DOMContentLoaded", () => {
    const gamepadDisplaySection = document.getElementById("gamepads");
    const gamepadDisplayTemplate = document.getElementById("gamepad_display_template");
    const addEmulatedGamepadButton = document.getElementById("add_emulated_gpad_btn");
    if (!gamepadDisplaySection || !gamepadDisplayTemplate || !addEmulatedGamepadButton)
        throw Error("gamepadDisplaySection or gamepadDisplayTemplate elements not found in DOM");
    // insert the svg contents for the full gamepad display into the page
    gamepadDisplayTemplate.content.querySelector("#gpad_display_full").innerHTML = FULL_GPAD_SVG_SOURCE_CODE;
    // wire up the add emulated gamepad button
    addEmulatedGamepadButton?.addEventListener("click", () => {
        addEmulatedGamepad(false, -1);
    });
    // add event listeners for gamepad connection/disconnection events
    window.addEventListener("gamepadconnected", (e) => {
        const gpad = e.gamepad;
        const index = gpad.index;
        const emulationState = gpad.emulation;
        console.info(`Gamepad ${index} connected (${emulationState}): ${gpad.id}`);
        updateAllGamepadDisplays();
    });
    // add event listeners for gamepad connection/disconnection events
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
            gpadEmulator.ClearButtonTouchEventListeners(gDisplay.index);
            gpadEmulator.ClearJoystickTouchEventListeners(gDisplay.index);
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
            gpadEmulator.AddEmulatedGamepad(index, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT); // returns the new (emulated) gamepad or false if some error happened.
        }
        else {
            // add an emulated Gamepad at the next available index (indicated by -1) with overlayMode off.
            gpadEmulator.AddEmulatedGamepad(-1, false, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT); // returns the new (emulated) gamepad or false if some error happened.
        }
    }
    /** setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
    function setupEmulatedGamepadInput(gpadIndex, display_gpad) {
        /* ----- SETUP BUTTON TOUCH INPUTS ----- */
        gpadEmulator.AddButtonTouchEventListeners(gpadIndex, PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS.map((tapTargetId, i) => {
            const isTrigger = tapTargetId.includes("trigger");
            const isStick = tapTargetId.includes("stick");
            if (isTrigger) {
                // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
                return {
                    buttonIndex: i,
                    type: gamepadButtonType.variable,
                    tapTarget: display_gpad.querySelector("#" + tapTargetId),
                    dragDistance: 50, // pixels that the user must drag the button down to fully press it.
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
                    lockTargetWhilePressed: (isStick === true),
                    tapTarget: display_gpad.querySelector("#" + tapTargetId)
                };
            }
        }));
        /* ----- SETUP JOYSTICK TOUCH INPUTS ----- */
        gpadEmulator.AddJoystickTouchEventListeners(gpadIndex, [
            {
                // left joystick (we re-use the same tap target id as the button for clicking the left stick)
                tapTarget: display_gpad.querySelector("#" + PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS[standardGpadButtonMap.LStick]),
                dragDistance: 30, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
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
                // right joystick (we re-use the same tap target id as the button for clicking the right stick)
                tapTarget: display_gpad.querySelector("#" + PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS[standardGpadButtonMap.RStick]),
                dragDistance: 30, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
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
    }
    /** adds a gamepad display from the template element to the page and sets up the display buttons & axes of the onscreen gamepad
     *  to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
    function addGamepadDisplay(gpadIndex) {
        // Add a copy of the gamepad display to the page
        if (!gamepadDisplayTemplate || !gamepadDisplaySection || !gamepadDisplayTemplate.content.firstElementChild)
            throw Error("gamepadDisplayTemplate or gamepadDisplaySection elements not found in DOM");
        const clone = gamepadDisplayTemplate.content.firstElementChild.cloneNode(true);
        const display_gpad = gamepadDisplaySection.appendChild(clone);
        // Center the transform origin of the stick buttons so that they rotate around their center.
        const leftStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`);
        const rightStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`);
        CenterTransformOrigin(leftStickButton);
        CenterTransformOrigin(rightStickButton);
        /* ----- MAKE BUTTON DISPLAY CONFIG ----- */
        const buttons = PRESET_SVG_GPAD_BTN_IDS.map((btnId) => {
            const isTrigger = btnId.includes("trigger");
            if (isTrigger) {
                // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
                return {
                    type: gamepadButtonType.variable,
                    direction: gamepadDirection.down,
                    buttonElement: display_gpad.querySelector(`#${btnId}`),
                    highlight: display_gpad.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                    directionHighlight: display_gpad.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.DirectionHighlight}`),
                    movementRange: 10, // pixels that the button can move
                    extraData: {
                        // we can add custom data to the button config that will be passed to the buttonDisplayFunction when the button is updated.
                        myCustomData: "variable btn name is " + btnId
                    }
                };
            }
            else {
                // all other buttons are simply on (pressed) or off (not pressed).
                return {
                    type: gamepadButtonType.onOff,
                    highlight: display_gpad.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                    extraData: {
                        // we can add custom data to the button config that will be passed to the buttonDisplayFunction when the button is updated.
                        myCustomData: "onOff btn name is " + btnId
                    }
                };
            }
        });
        console.log("buttons", display_gpad.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`));
        /* ----- MAKE JOYSTICK DISPLAY CONFIG ----- */
        const joysticks = [{
                joystickElement: display_gpad.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`),
                xAxisIndex: 0,
                yAxisIndex: 1,
                movementRange: 10,
            }, {
                joystickElement: display_gpad.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`),
                xAxisIndex: 2,
                yAxisIndex: 3,
                movementRange: 10,
            }];
        // create the gamepad display class instance and pass the button and joystick configs
        const display = new GamepadDisplay({
            gamepadIndex: gpadIndex,
            buttons: buttons,
            sticks: joysticks,
            // (optional) custom joystick display function that will be called for each joystick when the gamepad state changes.
            joystickDisplayFunction: function (stickConfig, xAxisValue, yAxisValue) {
                // (optional) call the default display implementation to move the joystick element.
                display.DefaultJoystickDisplayFunction(stickConfig, xAxisValue, yAxisValue);
                // ---- Add your own custom joystick display code -----
                //   - EG: Show extra details about the joysticks in the dom
                if (stickConfig.xAxisIndex === 0) {
                    // show the values of the left joystick on svg label:
                    const l_label = display_gpad.querySelector("#l_stick_action_help_label");
                    if (l_label)
                        l_label.innerHTML = "(" + xAxisValue.toFixed(1) + ", " + yAxisValue.toFixed(1) + ")";
                }
                else if (stickConfig.xAxisIndex === 2) {
                    // show the values of the right joystick on svg label:
                    const r_label = display_gpad.querySelector("#r_stick_action_help_label");
                    if (r_label)
                        r_label.innerHTML = "(" + xAxisValue.toFixed(1) + ", " + yAxisValue.toFixed(1) + ")";
                }
            },
        }, gpadApiWrapper); // we can pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.
        const gpad = navigator.getGamepads()[gpadIndex];
        if (gpad.emulation === gamepadEmulationState.emulated) {
            display_gpad.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Emulated | ${gpad.id}`;
            display_gpad.querySelector("#gpad-emulation-btn").innerHTML = "REMOVE Emulated Gamepad";
        }
        else if (gpad.emulation === gamepadEmulationState.overlay) {
            display_gpad.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Overlay (real + emulated input) | ${gpad.id}`;
            display_gpad.querySelector("#gpad-emulation-btn").innerHTML = "REMOVE Emulated Gamepad Overlay";
        }
        else if (gpad.emulation === gamepadEmulationState.real) {
            display_gpad.querySelector("#gpad-emulation-label").innerHTML = `gpad #${gpad.index} | Real (no emulated input) | ${gpad.id} `;
            display_gpad.querySelector("#gpad-emulation-btn").innerHTML = "ADD Emulated Gamepad Overlay";
        }
        display_gpad.querySelector("#gpad-emulation-btn").addEventListener("click", () => { handleGpadEmulationBtnClick(gpadIndex); });
        return { container: clone, display: display };
    }
    function handleGpadEmulationBtnClick(gpadIndex) {
        const emulationState = navigator.getGamepads()[gpadIndex].emulation;
        if (emulationState === gamepadEmulationState.emulated) {
            gpadEmulator.RemoveEmulatedGamepad(gpadIndex);
        }
        else if (emulationState === gamepadEmulationState.overlay) {
            gpadEmulator.RemoveEmulatedGamepad(gpadIndex);
        }
        else if (emulationState === gamepadEmulationState.real) {
            addEmulatedGamepad(true, gpadIndex);
        }
    }
});

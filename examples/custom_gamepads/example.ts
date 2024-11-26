import { CenterTransformOrigin } from "virtual-gamepad-lib/utilities";
import { GamepadApiWrapper, type buttonChangeDetails } from "virtual-gamepad-lib/GamepadApiWrapper";
import { GamepadDisplay, type GamepadDisplayJoystick, type GamepadDisplayVariableButton, type GamepadDisplayButton } from "virtual-gamepad-lib/GamepadDisplay";
import { GamepadEmulator, type VariableButtonTouchConfig, type EGamepad, ButtonTouchConfig } from "virtual-gamepad-lib/GamepadEmulator";
import { PRESET_SVG_GPAD_BTN_IDS, PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS, PRESET_SVG_GPAD_CLASS, PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES, gamepadButtonType, gamepadDirection, standardGpadButtonMap } from "virtual-gamepad-lib/enums";


// import the svg source code for the left and right onscreen gamepad SVGs
//  - this could be done like with a build tool like vite(shown here) or webpack or at runtime with a fetch request
import LEFT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-left.svg?raw";
import RIGHT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-right.svg?raw";

// the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine, or any other library that uses navigator.getGamepads() or listens for gamepad events
const gpadEmulator = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 0, // update the gamepad state every 0ms, updateDelay: 0 means update as fast as the framerate of the browser (fastest possible).
    axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
    buttonConfigs: [] // if we want special behavior for any buttons like HOLD events, we can add them here (see the keyboard example).
});

// add an emulated gamepad with more than the default number of buttons and axes
// in this example we will only add one emulated gamepad at index 0 in the navigator.getGamepads() array.
const EMULATED_GPAD_INDEX = 0; // the index of the emulated gamepad we will add to the navigator.getGamepads() array.
gpadEmulator.AddEmulatedGamepad(EMULATED_GPAD_INDEX, true, 22 /*number of buttons*/, 6 /*number of axes*/);

// listen for gamepad connection events and log them (you could also use the native window.addEventListener("gamepadconnected", ...) event)
gpadApiWrapper.onGamepadConnect((gpad: GamepadEvent) => {
    console.log("Gamepad connected: ", gpad);
})

// listen for gamepad disconnection events and log them (you could also use the native window.addEventListener("gamepaddisconnected", ...) event)
gpadApiWrapper.onGamepadDisconnect((gpad: GamepadEvent) => {
    console.log("Gamepad disconnected: ", gpad);
})

// --- DOM Related things comming up next ---
const onPageLoad = () => {

    // Get the HTML elements we will be using to display the gamepad state
    const SPLIT_GPAD_DISPLAY_CONTAINER = document.getElementById("split_gpad_display_container")!;
    const CUSTOM_HTML_GPAD_DISPLAY_CONTAINER = document.getElementById("gpad_display_html")!;


    // insert the svg contents for the left gamepad
    document.getElementById("gpad_display_left")!.innerHTML = LEFT_GPAD_SVG_SOURCE_CODE;
    // insert the svg contents for the right gamepad
    document.getElementById("gpad_display_right")!.innerHTML = RIGHT_GPAD_SVG_SOURCE_CODE;

    // setup event listeners on the buttons/joysticks to send button/axis updates TO the emulated gamepad.
    setupEmulatedGamepadInput(EMULATED_GPAD_INDEX); // setup the svg gamepad display
    setupCustomEmulatedGamepadInput(EMULATED_GPAD_INDEX); // setup the custom html gamepad display

    // setup the display buttons to react to the events FROM the gamepad api directly
    setupGamepadDisplay(EMULATED_GPAD_INDEX); // setup the svg gamepad display
    setupCustomGamepadDisplay(EMULATED_GPAD_INDEX); // setup the custom html gamepad display

    // listen for gamepad button change events and log them (you could also check for changes yourself by calling the navigator.getGamepads() function)
    gpadApiWrapper.onGamepadButtonChange((gpadIndex: number, gpad: (EGamepad | Gamepad), buttonChanges: readonly (buttonChangeDetails | false)[]) => {
        console.log(`Gamepad ${gpadIndex} button change: `, buttonChanges);
    });

    // listen for gamepad axis change events and log them (you could also check for changes yourself by calling the navigator.getGamepads() function)
    gpadApiWrapper.onGamepadAxisChange((gpadIndex: number, gpad: (EGamepad | Gamepad), axisChangesMask: readonly boolean[]) => {
        console.log(`Gamepad ${gpadIndex} axis change: `, gpad.axes, axisChangesMask);
    });

    /** Setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
    function setupEmulatedGamepadInput(gpadIndex: number) {

        /* ----- SETUP BUTTON INPUTS ----- */
        gpadEmulator.AddButtonTouchEventListeners(gpadIndex, PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS.map((tapTargetId, i) => {
            const isTrigger = tapTargetId.includes("trigger");
            const isStick = tapTargetId.includes("stick");
            if (isTrigger) {
                // trigger buttons usually take variable pressure so can be represented by a variable button that is dragged down.
                return {
                    buttonIndex: i,
                    type: gamepadButtonType.variable,
                    tapTarget: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#" + tapTargetId),
                    dragDistance: 50, // pixels that the user must drag the button down to fully press it.
                    lockTargetWhilePressed: true,
                    directions: {
                        [gamepadDirection.up]: false,
                        [gamepadDirection.down]: true,
                        [gamepadDirection.left]: false,
                        [gamepadDirection.right]: false,
                    }
                } as VariableButtonTouchConfig
            } else {
                return {
                    buttonIndex: i,
                    type: gamepadButtonType.onOff,
                    lockTargetWhilePressed: (isStick === true),
                    tapTarget: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#" + tapTargetId)
                } as ButtonTouchConfig
            }
        }).concat(Object.entries(PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES).map(([tapTargetId, buttonIndexes]) => {
            // add the diagonal dpad buttons (which are represented by multiple buttons being pressed at once)
            return {
                buttonIndexes: buttonIndexes,
                type: gamepadButtonType.onOff,
                tapTarget: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#" + tapTargetId),
                lockTargetWhilePressed: false, // important to set this to false for dpad buttons to allow sliding a finger between the buttons.
            } as ButtonTouchConfig
        })));


        /* ----- SETUP JOYSTICK INPUTS ----- */
        gpadEmulator.AddJoystickTouchEventListeners(gpadIndex, [
            {
                tapTarget: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#" + PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS[standardGpadButtonMap.LStick])!,
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
                tapTarget: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#" + PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS[standardGpadButtonMap.RStick])!,
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



    /** Setup the display buttons & axes of the onscreen gamepad to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
    function setupGamepadDisplay(gpadIndex: number) {


        const leftStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`) as SVGGraphicsElement;
        const rightStickButton = document.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`) as SVGGraphicsElement;

        // Center the transform origin of the stick buttons so that they rotate around their center.
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
                    buttonElement: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${btnId}`),
                    highlight: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                    directionHighlight: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.DirectionHighlight}`),
                    movementRange: 10, // pixels that the button can move
                    extraData: {
                        // we can add custom data to the button config that will be passed to the buttonDisplayFunction when the button is updated.
                        myCustomData: "variable btn name is " + btnId
                    }
                } as GamepadDisplayVariableButton;
            } else {
                // all other buttons are simply on (pressed) or off (not pressed).
                return {
                    type: gamepadButtonType.onOff,
                    highlight: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${btnId} .${PRESET_SVG_GPAD_CLASS.ButtonHighlight}`),
                    extraData: {
                        // we can add custom data to the button config that will be passed to the buttonDisplayFunction when the button is updated.
                        myCustomData: "onOff btn name is " + btnId
                    }
                } as GamepadDisplayButton;
            }
        })

        /* ----- MAKE JOYSTICK DISPLAY CONFIG ----- */
        const joysticks: GamepadDisplayJoystick[] = [{
            joystickElement: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.LStick]}`) as SVGElement,
            xAxisIndex: 0,
            yAxisIndex: 1,
            movementRange: 10,
            extraData: {
                directionHighlightArrows: {
                    [gamepadDirection.up]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_up_direction_highlight") as SVGElement,
                    [gamepadDirection.down]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_down_direction_highlight") as SVGElement,
                    [gamepadDirection.left]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_left_direction_highlight") as SVGElement,
                    [gamepadDirection.right]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#l_stick_right_direction_highlight") as SVGElement,
                }
            }
        }, {
            joystickElement: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector(`#${PRESET_SVG_GPAD_BTN_IDS[standardGpadButtonMap.RStick]}`) as SVGElement,
            xAxisIndex: 2,
            yAxisIndex: 3,
            movementRange: 10,
            extraData: {
                directionHighlightArrows: {
                    [gamepadDirection.up]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_up_direction_highlight") as SVGElement,
                    [gamepadDirection.down]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_down_direction_highlight") as SVGElement,
                    [gamepadDirection.left]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_left_direction_highlight") as SVGElement,
                    [gamepadDirection.right]: SPLIT_GPAD_DISPLAY_CONTAINER.querySelector("#r_stick_right_direction_highlight") as SVGElement,
                }
            }
        }]

        // create the gamepad display class instance and pass the button and joystick configs
        const display = new GamepadDisplay({
            gamepadIndex: gpadIndex,
            pressedHighlightClass: "pressed", // the class that will be added to the button highlight element when that gamepad button is pressed.
            touchedHighlightClass: "touched", // the class that will be added to the button highlight element when that gamepad button is lightly touched (supported by some controllers).
            moveDirectionHighlightClass: "moved", // (optional) the class that will be added to the button direction highlight element when the joystick is moved in a direction.
            buttons: buttons,
            sticks: joysticks,
            // (optional) custom joystick display function that will be called for each joystick when the gamepad state changes.
            joystickDisplayFunction: function (stickConfig: GamepadDisplayJoystick, xAxisValue: number, yAxisValue: number) {
                // (optional) call the default display implementation to move the joystick element.
                // this.DefaultJoystickDisplayFunction(stickConfig, xAxisValue, yAxisValue);

                // ---- Add your own custom joystick display code -----

                // Example: 3d rotate the joystick element by the specified amount rather than just 2d translating it...
                // Note: For rotations/scaling like this to work, you should call the centerTransformOrigins("#querySelector") function from utilites
                //       (once after page load) on the joystick element to ensure the rotation/scaling is done around the center of the joystick element.
                stickConfig.joystickElement.style.transform = `rotateY(${(xAxisValue * 30)}deg) rotateX(${(-yAxisValue * 30)}deg) translateZ(17px)`

                // Example: Show fading arrows to higlight how much the gamepad is being pushed in each direction.
                const arrows = stickConfig.extraData.directionHighlightArrows;
                arrows[gamepadDirection.up].style.opacity = Math.max(-yAxisValue, 0).toString();
                arrows[gamepadDirection.down].style.opacity = Math.max(yAxisValue, 0).toString();
                arrows[gamepadDirection.left].style.opacity = Math.max(-xAxisValue, 0).toString();
                arrows[gamepadDirection.right].style.opacity = Math.max(xAxisValue, 0).toString();
            },

            // (optional) custom button display function that will be called for each button when the gamepad state changes.
            buttonDisplayFunction: function (buttonConfig: GamepadDisplayButton, value: number, touched: boolean, pressed: boolean, changes: buttonChangeDetails, btnIndex: number) {
                // (optional) call the default display implementation to add classes to the button highlight element.
                display.DefaultButtonDisplayFunction(buttonConfig, value, touched, pressed, changes, btnIndex);

                // ---- Add your own custom button display code -----
                // Example: Style the color of variable button elements to show their numeric value.
                if (buttonConfig.type === gamepadButtonType.variable) {
                    buttonConfig.buttonElement.style.fill = `hsl(${value * 360}, 100%, 50%)`;
                }
            }
        }, gpadApiWrapper); // we can pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.
    }

    /** Setup the touch targets & input parameters for translating onscreen events into events for the emulated gamepad (part of the emulated gamepad module) */
    function setupCustomEmulatedGamepadInput(gpadIndex: number) {

        /* ----- SETUP BUTTON INPUTS ----- */
        const emulatorButtonConfigs: ButtonTouchConfig[] = []

        // Add Drag Buttons (buttons 1, 2, & 3)
        for (let i = 0; i <= 3; i++) {
            const enableDownDrag = i === 1; // true when i is 1 - button 1 is setup to be dragged up/down
            const enableLeftDrag = i === 0; // true when i is 0 - button 0 should be dragged left only
            const enableRightDrag = i === 2; // true when i is 3 - button 3 should be dragged right only
            emulatorButtonConfigs.push({
                buttonIndex: i,
                type: gamepadButtonType.variable,
                lockTargetWhilePressed: true, // lock the target while the button is pressed (good ux for variable buttons)
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#drag-button-" + i)!,
                dragDistance: 100, // pixels that the user must drag the button to fully "press" it.
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: enableDownDrag,
                    [gamepadDirection.left]: enableLeftDrag,
                    [gamepadDirection.right]: enableRightDrag,
                }
            })
        }

        // Add Normal Buttons (buttons labeled/indexed 3-20)
        for (let i = 3; i <= 20; i++) {
            emulatorButtonConfigs.push({
                buttonIndex: i,
                type: gamepadButtonType.onOff,
                lockTargetWhilePressed: false,
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#button-" + i)!
            })
        }

        // Setup the first joystick thumbstick (axis 0) to act like button 21.
        // - This extra button makes it so you can respond to thumbstick press and touch states.
        emulatorButtonConfigs.push({
            type: gamepadButtonType.onOff,
            buttonIndex: 21,
            tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-0 .gpad-custom-thumbstick")!,
            lockTargetWhilePressed: true, // lock the target while the button is pressed (gemerally desired behavior for thumbsticks)
        })


        gpadEmulator.AddButtonTouchEventListeners(gpadIndex, emulatorButtonConfigs);


        /* ----- SETUP JOYSTICK INPUTS ----- */
        gpadEmulator.AddJoystickTouchEventListeners(gpadIndex, [
            {
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-0 .gpad-custom-thumbstick")!,
                dragDistance: 100, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
                xAxisIndex: 0,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: false,
                    [gamepadDirection.left]: true,
                    [gamepadDirection.right]: true,
                },
            },

            {
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-1 .gpad-custom-thumbstick")!,
                dragDistance: 200, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
                yAxisIndex: 1,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: true,
                    [gamepadDirection.down]: false,
                    [gamepadDirection.left]: false,
                    [gamepadDirection.right]: false,
                },
            },
            {
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-2 .gpad-custom-thumbstick")!,
                dragDistance: 200, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
                yAxisIndex: 3,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: true,
                    [gamepadDirection.left]: false,
                    [gamepadDirection.right]: false,
                },
            },
            {
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-3 .gpad-custom-thumbstick")!,
                dragDistance: 100, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
                xAxisIndex: 2,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: false,
                    [gamepadDirection.down]: false,
                    [gamepadDirection.left]: true,
                    [gamepadDirection.right]: true,
                },
            },
            {
                tapTarget: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#axis-4 .gpad-custom-thumbstick")!,
                dragDistance: 100, // pixels that the user must drag the joystic to represent + 1 (or in reverse to represent minus one).
                xAxisIndex: 4,
                yAxisIndex: 5,
                lockTargetWhilePressed: true,
                directions: {
                    [gamepadDirection.up]: true,
                    [gamepadDirection.down]: true,
                    [gamepadDirection.left]: true,
                    [gamepadDirection.right]: true,
                },
            },
        ]);
    }

    /** Setup the display buttons & axes of the onscreen gamepad to react to the state of the gamepad from the browser gamepad api (uses the gamepadApiWrapper) */
    function setupCustomGamepadDisplay(gpadIndex: number) {

        /* ----- MAKE BUTTON DISPLAY CONFIG ARRAY ----- */
        const displayButtons: GamepadDisplayButton[] = []

        // Add Drag Buttons (buttons 0, 1, & 2)
        for (let i = 0; i <= 2; i++) {
            let direction: gamepadDirection;
            if (i == 0) direction = gamepadDirection.left; // button 0 is setup to be dragged left only
            else if (i == 1) direction = gamepadDirection.down; // button 1 is setup to be dragged up only
            else direction = gamepadDirection.right; // button 2 is setup to be dragged down only

            displayButtons.push({
                type: gamepadButtonType.variable,
                direction: direction,
                movementRange: 60, // pixels that the button can moved
                buttonElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#drag-button-" + i)!,
                highlight: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#drag-button-" + i) as HTMLElement,
            })
        }

        // Add Normal Buttons (buttons labeled/indexed 3-20)
        for (let i = 3; i <= 20; i++) {
            displayButtons.push({
                type: gamepadButtonType.onOff,
                highlight: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector("#button-" + i)!
            })
        }


        // Setup the first joystick thumbstick (axis 0) to show  the state of button 21.
        // - This extra "button" makes the thumbstick to show the press and touch state of button 21.
        displayButtons.push({
            type: gamepadButtonType.onOff,
            highlight: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-0 .gpad-custom-thumbstick`) as SVGElement,
        })


        /* ----- MAKE JOYSTICK DISPLAY CONFIG ARRAY ----- */
        const joysticks: GamepadDisplayJoystick[] = [{
            joystickElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-0 .gpad-custom-thumbstick`) as SVGElement,
            xAxisIndex: 0,
            movementRange: 100 - 30,
        }, {
            joystickElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-1 .gpad-custom-thumbstick`) as SVGElement,
            yAxisIndex: 1,
            movementRange: 200 - 60,
        }, {
            joystickElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-2 .gpad-custom-thumbstick`) as SVGElement,
            yAxisIndex: 3,
            movementRange: 200 - 60,
        }, {
            joystickElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-3 .gpad-custom-thumbstick`) as SVGElement,
            xAxisIndex: 2,
            movementRange: 100 - 30,
        }, {
            joystickElement: CUSTOM_HTML_GPAD_DISPLAY_CONTAINER.querySelector(`#axis-4 .gpad-custom-thumbstick`) as SVGElement,
            xAxisIndex: 4,
            yAxisIndex: 5,
            movementRange: 100 - 30,
        }]

        // create the gamepad display class instance and pass the button and joystick configs
        const display = new GamepadDisplay({
            gamepadIndex: gpadIndex,
            pressedHighlightClass: "pressed", // the class that will be added to the button highlight element when that gamepad button is pressed.
            touchedHighlightClass: "touched", // the class that will be added to the button highlight element when that gamepad button is lightly touched (supported by some controllers).
            moveDirectionHighlightClass: "moved", // (optional) the class that will be added to the button direction highlight element when the joystick is moved in a direction.
            buttons: displayButtons,
            sticks: joysticks,

            // (optional) custom button display function that will be called for each button when the gamepad state changes.
            buttonDisplayFunction: function (buttonConfig: GamepadDisplayButton, value: number, touched: boolean, pressed: boolean, changes: buttonChangeDetails, btnIndex: number) {
                // (optional) call the default display implementation to add classes to the button highlight element.
                display.DefaultButtonDisplayFunction(buttonConfig, value, touched, pressed, changes, btnIndex);

                // ---- Add your own custom button display code -----
                // Example: Style the color of variable button elements to show their numeric value.
                if (buttonConfig.type === gamepadButtonType.variable) {
                    buttonConfig.buttonElement.style.backgroundColor = `hsl(0, 0%, ${value * 100}%)`;
                }
            }
        }, gpadApiWrapper); // we can pass our existing instance of the gpadApiWrapper to the gamepad display so that it can use it to update the gamepad state efficiently.
    }

}

console.log("Waiting for page to load...", document.readyState);
//if the page is already loaded, call the onPageLoad function now.
if (document.readyState === "complete") onPageLoad();
else window.addEventListener("load", onPageLoad); // otherwise, wait for the page to load before calling onPageLoad.

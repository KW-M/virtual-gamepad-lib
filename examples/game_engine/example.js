import { setupPresetInteractiveGamepad } from "virtual-gamepad-lib/helpers";
import { GamepadEmulator } from "virtual-gamepad-lib/GamepadEmulator";
import { GamepadApiWrapper } from "virtual-gamepad-lib/GamepadApiWrapper";
import { standardGpadAxesMap, standardGpadButtonMap } from "virtual-gamepad-lib/enums";
//
// import the svg source code for the left and right onscreen gamepad SVGs
//  - this could be done like with a build tool like webpack or vite (shown here) or at runtime with a fetch request.
import LEFT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-left.svg?raw";
import RIGHT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-right.svg?raw";
//
// A single GamepadEmulator MUST be created BEFORE initilizing a game engine, a GamepadApiWrapper, or any other library that listens for gamepad events (uses navigator.getGamepads())
const gpadEmulator = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 0, // update the gamepad state every frame
    axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
});
//
// This event is exposed by Phaser.js and is called when the game is loaded and ready to start
// @ts-expect-error
globalThis.onGameReady = () => {
    //
    // Get the HTML elements we will be using to display the gamepads
    const GPAD_DISPLAY_CONTAINER = document.getElementById("gpad_display_container");
    const LOADING_MESSAGE = document.getElementById("loading-msg");
    LOADING_MESSAGE?.remove();
    //
    // REQUIRED: Insert the SVG contents for the left gamepad into the DOM
    document.getElementById("gpad_display_left").innerHTML = LEFT_GPAD_SVG_SOURCE_CODE;
    // REQUIRED: Insert the SVG contents for the right gamepad into the DOM
    document.getElementById("gpad_display_right").innerHTML = RIGHT_GPAD_SVG_SOURCE_CODE;
    //
    // The index of the emulated gamepad our onscreen gamepad will show up as in the navigator.getGamepads() array.
    const EMULATED_GPAD_INDEX = 0;
    // setup the onscreen gamepad to react to the state of the emulated gamepad.
    setupPresetInteractiveGamepad(GPAD_DISPLAY_CONTAINER, {
        AllowDpadDiagonals: true,
        GpadEmulator: gpadEmulator,
        GpadApiWrapper: gpadApiWrapper,
        EmulatedGamepadIndex: EMULATED_GPAD_INDEX,
        EmulatedGamepadOverlayMode: true,
        /* for more option, see interactiveGamepadPresetConfig type in helpers.ts */
    });
    // The phaser game engine expects a gamepad button press to detect that our emulated gamepad has connected (and is ready to use):
    gpadEmulator.PressButton(EMULATED_GPAD_INDEX, standardGpadButtonMap.Start, 1, true); // press the start button
    // Release the start button after a (if the game engine does not check for button presses in this window, the game engine will not detect the button, add more delay in this case)
    setTimeout(() => { gpadEmulator.PressButton(EMULATED_GPAD_INDEX, standardGpadButtonMap.Start, 0, false); }, 10);
    const pressedKeyboardKeys = new Set();
    // also add keyboard bindings to the gamepad emulator (NOTE that this is through the gamepad emulator, so any game engine will think it is reciving gamepad events)
    window.onkeydown = (e) => {
        if (e.shiftKey || e.altKey || e.metaKey)
            return; // ignore key events with shift, alt, or meta keys pressed
        const key = e.key.toLowerCase();
        pressedKeyboardKeys.add(key);
        const numberKey = parseInt(key);
        const touchNotPress = e.ctrlKey;
        // []+- to move the left joystick
        if (key === "a")
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, -1);
        else if (key === "d")
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, 1);
        else if (key === "w")
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, -1);
        else if (key === "s")
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, 1);
        // arrow keys to move the right joystick (prevent default is to prevent scrolling)
        else if (key === "arrowleft") {
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, -1);
            e.preventDefault();
        }
        else if (key === "arrowright") {
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, 1);
            e.preventDefault();
        }
        else if (key === "arrowup") {
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, -1);
            e.preventDefault();
        }
        else if (key === "arrowdown") {
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, 1);
            e.preventDefault();
        }
        // gamepad buttons 0-9 are mapped to the number keys
        else if (!isNaN(numberKey))
            gpadEmulator.PressButton(EMULATED_GPAD_INDEX, numberKey, touchNotPress ? 0 : 1, true);
        else if (key === " ")
            gpadEmulator.PressButton(EMULATED_GPAD_INDEX, standardGpadButtonMap.A, touchNotPress ? 0 : 1, true);
    };
    window.onkeyup = (e) => {
        if (e.shiftKey || e.altKey || e.metaKey)
            return; // ignore key events with shift, alt, or meta keys pressed
        pressedKeyboardKeys.delete(e.key.toLowerCase());
        const numberKey = parseInt(e.key);
        // []+- to move the left joystick
        if (!pressedKeyboardKeys.has("a") && !pressedKeyboardKeys.has("d"))
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, 0);
        if (!pressedKeyboardKeys.has("w") && !pressedKeyboardKeys.has("s"))
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, 0);
        // arrow keys to move the right joystick
        if (!pressedKeyboardKeys.has("arrowleft") && !pressedKeyboardKeys.has("arrowright"))
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, 0);
        if (!pressedKeyboardKeys.has("arrowup") && !pressedKeyboardKeys.has("arrowdown"))
            gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, 0);
        // gamepad buttons 0-9 are mapped to the number keys
        if (!isNaN(numberKey))
            gpadEmulator.PressButton(EMULATED_GPAD_INDEX, numberKey, 0, false);
        else if (e.key === " ")
            gpadEmulator.PressButton(EMULATED_GPAD_INDEX, standardGpadButtonMap.A, 0, false);
    };
};

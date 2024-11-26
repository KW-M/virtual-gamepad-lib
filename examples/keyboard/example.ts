import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, EGamepad } from "virtual-gamepad-lib/GamepadEmulator";
import { buttonChangeDetails, GamepadApiWrapper, wrapperButtonConfig } from "virtual-gamepad-lib/GamepadApiWrapper";
import { PRESET_SVG_GPAD_BTN_IDS, standardGpadAxesMap } from "virtual-gamepad-lib/enums";

// in this example we will only add one emulated gamepad at position/index 0 in the navigator.getGamepads() array.
const EMULATED_GPAD_INDEX = 0;

// the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine, or any other library that uses navigator.getGamepads()
const gpadEmulator = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 150, // update the gamepad state every 150ms, set to 0 to update as fast as the framerate of the browser (fastest possible).
    axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
    buttonConfigs: PRESET_SVG_GPAD_BTN_IDS.map((name, i) => {
        return {
            // d_pad directions and button 0-3 can be held down in this example
            fireWhileHolding: name.includes("d_pad") || i <= 3 // keep firing the button press event while this button is held down
        } as wrapperButtonConfig
    })
});

window.addEventListener("DOMContentLoaded", () => {

    const SCROLL_AREA_ELEMENT = document.getElementById('gamepad-event-area');
    const EVENT_LOGS_ELEMENT = document.getElementById('gamepad-event-display');
    const BUTTON_STATE_TABLE_ELEM = document.getElementById('button-table');
    if (!SCROLL_AREA_ELEMENT) throw new Error("Could not find element with id 'gamepad-event-area'");
    if (!EVENT_LOGS_ELEMENT) throw new Error("Could not find element with id 'gamepad-event-display'");
    if (!BUTTON_STATE_TABLE_ELEM) throw new Error("Could not find element with id 'button-table'");

    gpadApiWrapper.onGamepadConnect((gpad: GamepadEvent) => {
        console.log("Gamepad connected: ", gpad);
        EVENT_LOGS_ELEMENT.appendChild(document.createTextNode(`Gamepad connected: ${gpad.gamepad.id}\n`));
    })

    gpadApiWrapper.onGamepadDisconnect((gpad: GamepadEvent) => {
        console.log("Gamepad disconnected: ", gpad);
        EVENT_LOGS_ELEMENT.appendChild(document.createTextNode(`Gamepad disconnected: ${gpad.gamepad.id}\n`));
    })

    gpadApiWrapper.onGamepadButtonChange((gpadIndex: number, gpad: (EGamepad | Gamepad), buttonChangesMask: readonly (buttonChangeDetails | false)[]) => {
        console.log(`Gamepad ${gpadIndex} button change: `, buttonChangesMask);
        let text = `Buttons changed ${gpad.id} (gpad #${gpadIndex}):\n`
        for (let i = 0; i < gpad.buttons.length; i++) {
            const change = buttonChangesMask[i];
            if (!change) continue; // this button did not change
            text += `    Button #${i} (value = ${gpad.buttons[i].value})`;
            text += change.heldDown ? " | held down " : "";
            text += change.pressed ? " | pressed   " : "";
            text += change.released ? " | released  " : "";
            text += change.touchDown ? " | touch down" : "";
            text += change.touchUp ? " | touch up  " : "";
            text += change.valueChanged ? " | value change" : "";
            text += "\n";
            const btnTableRow = BUTTON_STATE_TABLE_ELEM.children[i]
            if (btnTableRow) (btnTableRow.children[1] as HTMLElement).style.backgroundColor = gpad.buttons[i].pressed ? "blueviolet" : (gpad.buttons[i].touched ? "greenyellow" : "");
        }
        EVENT_LOGS_ELEMENT.appendChild(document.createTextNode(text));
        SCROLL_AREA_ELEMENT.scrollTo(0, SCROLL_AREA_ELEMENT.scrollHeight);
    });

    gpadApiWrapper.onGamepadAxisChange((gpadIndex: number, gpad: (EGamepad | Gamepad), axisChangesMask: readonly boolean[]) => {
        console.log(`Gamepad ${gpadIndex} axis change: `, gpad.axes, axisChangesMask);
        let text = `Gamepad axis changes ${gpad.id} (gpad #${gpadIndex}):\n`
        for (let i = 0; i < axisChangesMask.length; i++) {
            const change = axisChangesMask[i];
            if (!change) continue; // this axis did not change
            text += `    Axis #${i}: value: ${gpad.axes[i]}\n`;
        }
        EVENT_LOGS_ELEMENT.appendChild(document.createTextNode(text));
        SCROLL_AREA_ELEMENT.scrollTo(0, SCROLL_AREA_ELEMENT.scrollHeight);
    });

    //
    gpadEmulator.AddEmulatedGamepad(EMULATED_GPAD_INDEX, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);

    // also add keyboard bindings to the gamepad emulator (NOTE that this is through the gamepad emulator, so any game engine will think it is reciving gamepad events)
    window.onkeydown = (e: KeyboardEvent) => {
        const numberKey = parseInt(e.key);
        const touchNotPress = e.ctrlKey;
        // []+- to move the left joystick
        if (e.key === "[") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, -1);
        else if (e.key === "]") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, 1);
        else if (e.key === "-") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, -1);
        else if (e.key === "=") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, 1);
        // arrow keys to move the right joystick (prevent default is to prevent scrolling)
        else if (e.key === "ArrowLeft") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, -1); e.preventDefault(); }
        else if (e.key === "ArrowRight") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, 1); e.preventDefault(); }
        else if (e.key === "ArrowUp") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, -1); e.preventDefault(); }
        else if (e.key === "ArrowDown") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, 1); e.preventDefault(); }
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) gpadEmulator.PressButton(EMULATED_GPAD_INDEX, numberKey, touchNotPress ? 0 : 1, true);
        else if (e.keyCode) gpadEmulator.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 65 + 10, touchNotPress ? 0 : 1, true); // 65 is the keycode for "a", 10 is the count of number keys on the keyboard (0-9), so "a" is button #10, "b" is button #11, etc.
    };

    window.onkeyup = (e: KeyboardEvent) => {
        const numberKey = parseInt(e.key);
        // []+- to move the left joystick
        if (e.key === "[") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, 0);
        else if (e.key === "]") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickX, 0);
        else if (e.key === "-") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, 0);
        else if (e.key === "=") gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.LStickY, 0);
        // arrow keys to move the right joystick (prevent default is to prevent scrolling)
        else if (e.key === "ArrowLeft") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, 0); e.preventDefault(); }
        else if (e.key === "ArrowRight") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickX, 0); e.preventDefault(); }
        else if (e.key === "ArrowUp") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, 0); e.preventDefault(); }
        else if (e.key === "ArrowDown") { gpadEmulator.MoveAxis(EMULATED_GPAD_INDEX, standardGpadAxesMap.RStickY, 0); e.preventDefault(); }
        // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
        else if (!isNaN(numberKey)) gpadEmulator.PressButton(EMULATED_GPAD_INDEX, numberKey, 0, false);
        else if (e.keyCode) gpadEmulator.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 65 + 10, 0, false); // 65 is the keycode for "a", 10 is the count of number keys on the keyboard (0-9), so "a" is button #10, "b" is button #11, etc.
    };
});

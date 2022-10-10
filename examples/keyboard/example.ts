import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, EGamepad } from "../../src/GamepadEmulator";
import { buttonChangeDetails, GamepadApiWrapper, gamepadApiWrapperButtonConfig } from "../../src/GamepadApiWrapper";

// CONSTS
const EMULATED_GPAD_INDEX = 0; // in this example we will only add one emulated gamepad at position/index 0 in the navigator.getGamepads() array.
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


// the gamepad emulator MUST be created before creating the GamepadApiWrapper, a game engine, or any other library that uses navigator.getGamepads()
const gamepadEmu = new GamepadEmulator(0.1);
const gpadApiWrapper = new GamepadApiWrapper({
    updateDelay: 150, // update the gamepad state every 150ms, set to 0 to update as fast as the framerate of the browser (fastest possible).
    axisDeadZone: 0.05, // set the deadzone for all axes to 0.05 [5%] (to avoid extra events when the joystick is near its neutral point).
    buttonConfigs: BUTTON_ID_NAMES.map((name, i) => {
        return {
            // d_pad directions and button 0-3 can be held down in this example
            fireWhileHolding: name.includes("d_pad") || i < 4 // keep firing the button press event while this button is held down
        } as gamepadApiWrapperButtonConfig
    })
});
const eventDisplayElem = document.getElementById('gamepad-event-display');
const buttonTable = document.getElementById('button-table');
const gamepadEventArea = document.getElementById('gamepad-event-area');
if (!eventDisplayElem) throw new Error("Could not find element with id 'gamepad-event-display'");
if (!buttonTable) throw new Error("Could not find element with id 'button-table'");
if (!gamepadEventArea) throw new Error("Could not find element with id 'gamepad-event-area'");

gpadApiWrapper.onGamepadConnect((gpad: GamepadEvent) => {
    console.log("Gamepad connected: ", gpad);
    eventDisplayElem.appendChild(document.createTextNode(`Gamepad connected: ${gpad.gamepad.id}\n`));
})

gpadApiWrapper.onGamepadDisconnect((gpad: GamepadEvent) => {
    console.log("Gamepad disconnected: ", gpad);
    eventDisplayElem.appendChild(document.createTextNode(`Gamepad disconnected: ${gpad.gamepad.id}\n`));
})

gpadApiWrapper.onGamepadButtonChange((gpadIndex: number, gpad: (EGamepad | Gamepad), buttonChangesMask: (buttonChangeDetails | false)[]) => {
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
        const btnTableRow = buttonTable.children[i]
        if (btnTableRow) (btnTableRow.children[1] as HTMLElement).style.backgroundColor = gpad.buttons[i].pressed ? "blueviolet" : (gpad.buttons[i].touched ? "greenyellow" : "");
    }
    eventDisplayElem.appendChild(document.createTextNode(text));
    gamepadEventArea.scrollTo(0, gamepadEventArea.scrollHeight);
});

gpadApiWrapper.onGamepadAxisChange((gpadIndex: number, gpad: (EGamepad | Gamepad), axisChangesMask: boolean[]) => {
    console.log(`Gamepad ${gpadIndex} axis change: `, gpad.axes, axisChangesMask);
    let text = `Gamepad axis changes ${gpad.id} (gpad #${gpadIndex}):\n`
    for (let i = 0; i < axisChangesMask.length; i++) {
        const change = axisChangesMask[i];
        if (!change) continue; // this axis did not change
        text += `    Axis #${i}: value: ${gpad.axes[i]}\n`;
    }
    eventDisplayElem.appendChild(document.createTextNode(text));
    gamepadEventArea.scrollTo(0, gamepadEventArea.scrollHeight);
});

//
gamepadEmu.AddEmulatedGamepad(EMULATED_GPAD_INDEX, true, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT);

// also add keyboard bindings to the gamepad emulator (NOTE that this is through the gamepad emulator. The game engine thinks it is reciving gamepad events)
window.onkeydown = (e: KeyboardEvent) => {
    const numberKey = parseInt(e.key);
    const touchNotPress = e.ctrlKey;
    // <>l/ to move the left stick
    if (e.key === "[") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 0, -1);
    else if (e.key === "]") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 0, 1);
    else if (e.key === "-") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 1, -1);
    else if (e.key === "=") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 1, 1);
    // arrow keys to move the right stick (prevent default to prevent scrolling)
    else if (e.key === "ArrowLeft") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 2, -1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 2, 1); e.preventDefault(); }
    else if (e.key === "ArrowUp") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 3, -1); e.preventDefault(); }
    else if (e.key === "ArrowDown") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, 3, 1); e.preventDefault(); }
    // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
    else if (!isNaN(numberKey)) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, numberKey, touchNotPress ? 0 : 1, true);
    else if (e.keyCode) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 65 + 10, touchNotPress ? 0 : 1, true); // 65 is the keycode for "a", 10 is the count of number keys on the keyboard (0-9), so "a" is button #10, "b" is button #11, etc.
};

window.onkeyup = (e: KeyboardEvent) => {
    const numberKey = parseInt(e.key);
    // <>l/ to move the left stick
    if (e.key === "[") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_X_AXIS_INDEX, 0);
    else if (e.key === "]") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_X_AXIS_INDEX, 0);
    else if (e.key === "-") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_Y_AXIS_INDEX, 0);
    else if (e.key === "+") gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, LEFT_Y_AXIS_INDEX, 0);
    // arrow keys to move the right stick (prevent default to prevent scrolling)
    else if (e.key === "ArrowLeft") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_X_AXIS_INDEX, 0); e.preventDefault(); }
    else if (e.key === "ArrowRight") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_X_AXIS_INDEX, 0); e.preventDefault(); }
    else if (e.key === "ArrowUp") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_Y_AXIS_INDEX, 0); e.preventDefault(); }
    else if (e.key === "ArrowDown") { gamepadEmu.MoveAxis(EMULATED_GPAD_INDEX, RIGHT_Y_AXIS_INDEX, 0); e.preventDefault(); }
    // all other gamepad buttons are mapped to the number keys or keycodes for high button numbers
    else if (!isNaN(numberKey)) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, numberKey, 0, false);
    else if (e.keyCode) gamepadEmu.PressButton(EMULATED_GPAD_INDEX, e.keyCode - 65 + 10, 0, false); // 65 is the keycode for "a", 10 is the count of number keys on the keyboard (0-9), so "a" is button #10, "b" is button #11, etc.
};

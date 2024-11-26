
import { setupPresetInteractiveGamepad } from "virtual-gamepad-lib/helpers";
import { GamepadEmulator, type EGamepad } from "virtual-gamepad-lib/GamepadEmulator";
import { type buttonChangeDetails } from "virtual-gamepad-lib/GamepadApiWrapper"

// import the svg source code for the left and right onscreen gamepad SVGs
//  - this could be done like with a build tool like webpack or vite (shown here) or at runtime with a fetch request.
import LEFT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-left.svg?raw";
import RIGHT_GPAD_SVG_SOURCE_CODE from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-right.svg?raw";

// A single GamepadEmulator MUST be created BEFORE initilizing a game engine, a GamepadApiWrapper, or any other library that listens for gamepad events (uses navigator.getGamepads())
const gpadEmulator = new GamepadEmulator(0.1);

// This event is called when the page is fully loaded.
window.addEventListener("DOMContentLoaded", () => {

    // Get the HTML elements we will be using to display the gamepad state
    const GPAD_DISPLAY_CONTAINER = document.getElementById("gpad_display_container")!;
    const AXIS_TABLE_ELEM = document.getElementById('axis-table')!;
    const BUTTON_TABLE_ELEM = document.getElementById('button-table')!;

    // REQUIRED: Insert the SVG contents for the left gamepad into the DOM
    document.getElementById("gpad_display_left")!.innerHTML = LEFT_GPAD_SVG_SOURCE_CODE;
    // REQUIRED: Insert the SVG contents for the right gamepad into the DOM
    document.getElementById("gpad_display_right")!.innerHTML = RIGHT_GPAD_SVG_SOURCE_CODE;

    // The index of the emulated gamepad our onscreen gamepad will show up as in the navigator.getGamepads() array.
    const EMULATED_GPAD_INDEX = 0;

    // setup the onscreen gamepad to react to the state of the emulated gamepad.
    const { gpadApiWrapper } = setupPresetInteractiveGamepad(GPAD_DISPLAY_CONTAINER, {
        AllowDpadDiagonals: true,
        GpadEmulator: gpadEmulator,
        EmulatedGamepadIndex: EMULATED_GPAD_INDEX,
        EmulatedGamepadOverlayMode: true,
        /* for more option, see interactiveGamepadPresetConfig type in helpers.ts */
    });

    // listen for gamepad button change events and display them (you could also check for changes yourself by calling the navigator.getGamepads() function)
    gpadApiWrapper.onGamepadButtonChange((gpadIndex: number, gpad: (EGamepad | Gamepad), buttonChanges: readonly (buttonChangeDetails | false)[]) => {

        console.log(`Gamepad ${gpadIndex} button change: `, buttonChanges);

        // only update the table for the emulated gamepad (not other connected gamepads)
        if (gpadIndex !== EMULATED_GPAD_INDEX) return;

        // loop through each button and update the table for the buttons that changed
        for (let i = 0; i < gpad.buttons.length; i++) {
            if (!buttonChanges[i]) continue; // this button did not change, so skip it.
            // get the numerical value of the button, 0 for not pressed, 1 for fully pressed, and a value in between for partially pressed
            const btnValue = gpad.buttons[i].value;
            // get the table row that displays the button values
            const btnTableRow = BUTTON_TABLE_ELEM!.children[i] as HTMLTableRowElement
            if (!btnTableRow) continue;
            // get the table cell that displays the button value
            const btnValueCell = btnTableRow.children[2] as HTMLTableCellElement;
            // set the button cell background color based on the button state, blueviolet for pressed, greenyellow for touched, and default color for not pressed or touched
            btnTableRow.style.backgroundColor = gpad.buttons[i].pressed ? "blueviolet" : (gpad.buttons[i].touched ? "greenyellow" : "");
            // set the button value table cell background color based on the numerical button value, blue for fully pressed, and default color for not pressed
            btnValueCell.style.backgroundColor = btnValue == 0 ? "" : "#00FF" + Math.round(btnValue * 255).toString(16).padStart(2, "0");
            // display the numerical button value in the table
            btnValueCell.innerText = btnValue.toFixed(2);

        }
    });

    // listen for gamepad axis change events and log them (you could also check for changes yourself by calling the navigator.getGamepads() function)
    gpadApiWrapper.onGamepadAxisChange((gpadIndex: number, gpad: (EGamepad | Gamepad), axisChangesMask: readonly boolean[]) => {

        console.log(`Gamepad ${gpadIndex} axis change: `, gpad.axes, axisChangesMask);

        // only update the table for the emulated gamepad (not other connected gamepads)
        if (gpadIndex !== EMULATED_GPAD_INDEX) return;

        // loop through each axis and update the table for the axes that changed
        for (let i = 0; i < axisChangesMask.length; i++) {
            if (!axisChangesMask[i]) continue; // this axis did not change, so skip it
            // otherwise display the axis change in the table:
            const axisValuesTableRow = AXIS_TABLE_ELEM!.children[1] as HTMLTableRowElement
            const axisValueCell = axisValuesTableRow.children[i + 1] as HTMLTableCellElement;
            if (!axisValueCell) continue;
            // get the numerical value of the axis, a value between -1 and 1
            const axisValue = gpad.axes[i];
            // set the axis value table cell background color based on the numerical axis value, more red for positive, more blue for negative, and neutral for 0
            axisValueCell.style.backgroundColor = "#" + Math.round(255 - (Math.max(-axisValue, 0) * 255)).toString(16).padStart(2, "0") + "FF" + Math.round(255 - (Math.max(axisValue, 0) * 255)).toString(16).padStart(2, "0");
            // display the numerical axis value in the table
            axisValueCell.innerText = axisValue.toFixed(2);
        }
    });
})

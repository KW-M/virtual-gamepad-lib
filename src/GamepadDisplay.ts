

import { type AxisChangeCallback, type ButtonChangeCallback, GamepadApiWrapper, type buttonChangeDetails } from "./GamepadApiWrapper.js";
import { gamepadButtonType, gamepadDirection, type standardGpadButtonMap, type standardGpadAxesMap } from "./enums.js";

export type ButtonDisplayFunction = (buttonConfig: GamepadDisplayButton | GamepadDisplayVariableButton, value: number, touched: boolean, pressed: boolean, changes: buttonChangeDetails, btnIndex: number) => void;

export type JoystickDisplayFunction = (stickConfig: GamepadDisplayJoystick, xAxisValue: number, yAxisValue: number) => void;

export interface GamepadDisplayButton {
    type: gamepadButtonType.onOff,
    /** The element to add the touch and press classses, to represent touching or pressing on this button */
    highlight: HTMLElement | SVGElement;
    /** optional, for your own use */
    extraData?: any;
}

export interface GamepadDisplayVariableButton {
    type: gamepadButtonType.variable,
    /** The element to add the touch and press classses, to represent touching or pressing on this button */
    highlight: HTMLElement | SVGElement;
    /** The element to move to represent pressing on this button */
    buttonElement: HTMLElement | SVGElement;
    /** How far the {@link GamepadDisplayVariableButton.buttonElement} should move to represent being pressed fully */
    movementRange: number;
    /** Direction the {@link GamepadDisplayVariableButton.buttonElement} should move to represent being pressed */
    direction: gamepadDirection;
    /** Drag direction indicator / highlight element for this variable button */
    directionHighlight?: HTMLElement | SVGElement;
    /** optional, for your own use */
    extraData?: any;
}

export interface GamepadDisplayJoystick {
    joystickElement: HTMLElement | SVGElement;
    movementRange: number;
    /** Axis index (as returned by the browser gamepad api) to track for the horizontal movement of the display joystick
     * see {@link standardGpadAxesMap}  */
    xAxisIndex?: number;
    /** Axis index (as returned by the browser gamepad api) to track for the vertical movement of the display joystick
     * see {@link standardGpadAxesMap}  */
    yAxisIndex?: number;
    /** When the joystick is moved in a given direction, the corresponding highlight element will be given the {@link DisplayGamepadConfig.moveDirectionHighlightClass} from the config
     *  - Can be used for e.g. arrows to indicate the direction of the joystick */
    highlights?: {
        [gamepadDirection.up]?: HTMLElement | SVGElement | null;
        [gamepadDirection.down]?: HTMLElement | SVGElement | null;
        [gamepadDirection.left]?: HTMLElement | SVGElement | null;
        [gamepadDirection.right]?: HTMLElement | SVGElement | null;
    }
}

export interface DisplayGamepadConfig {
    /** The index of the gamepad this Gamepad Display should track as returned from `navigator.GetGamepads()` */
    gamepadIndex: number;
    /** Configuration for Buttons and Variable Pressure Buttons (eg: shoulder triggers) to represent in the gamepad display
     * - The index of the button in the array corresponds to the index of the button as returned by the browser gamepad api.
     * - Add null in the array for any button you don't want to track.
     * - @see {@link GamepadDisplayButton} and {@link GamepadDisplayVariableButton} {@link standardGpadButtonMap} for more information */
    buttons: (GamepadDisplayButton | GamepadDisplayVariableButton | null | undefined)[];
    /** Configuration for Joysticks to represent in the gamepad display (based on gamepad axes indecies as as returned by the browser gamepad api) */
    sticks: GamepadDisplayJoystick[];
    /** The class to add to the corresponding highlight element when a gamepad button is touched (whether or not its pressed) */
    touchedHighlightClass?: string;
    /** The class to add to the corresponding highlight element when a gamepad button is pressed */
    pressedHighlightClass?: string;
    /** The class to add to the corresponding direction indicator element when a gamepad joystick is moved in a direction or a variable button is pressed */
    moveDirectionHighlightClass?: string;
    /** If provided, this function will be called for each button with a state change (pressed, touched, released, etc...)
     * @see {@link GamepadDisplay.DefaultButtonDisplayFunction} for an example */
    buttonDisplayFunction?: ButtonDisplayFunction;
    /** If provided, this function will be called when the gamepad axies change for a joystick instead of the default display function.
     * @see {@link GamepadDisplay.DefaultJoystickDisplayFunction} for an example */
    joystickDisplayFunction?: JoystickDisplayFunction;
}

/**
 * Class to handle displaying the state of a gamepad on the screen.
 * This class will not draw anything to the screen. Instead it will update the classes / transforms of the elements
 * you provide to represent the buttons and axes of the gamepad. See the examples for more information.
 */
export class GamepadDisplay {
    protected config: DisplayGamepadConfig;
    protected apiWrapper: GamepadApiWrapper;

    /** Create a new GamepadDisplay instance
    * @param config The config to use for the gamepad display
    * @param apiWrapper (OPTIONAL) The gamepad api will use this GamepadApiWrapper instance to listen for gamepad events, otherwise it will create a new gamepad wrapper under the hood.
    */
    constructor(config: DisplayGamepadConfig, apiWrapper?: GamepadApiWrapper) {
        this.config = config;
        this.apiWrapper = apiWrapper || new GamepadApiWrapper({ buttonConfigs: [], updateDelay: 0 });
        this.apiWrapper.onGamepadButtonChange(this.displayButtonChanges);
        this.apiWrapper.onGamepadAxisChange(this.displayJoystickChanges);
    };

    /**
     * Function called by default when the gamepad axies change for a joystick (as configured in this GamepadDisplay)
     * If you specify your own {@link DisplayGamepadConfig.joystickDisplayFunction} in the config, this function won't get called.
     * Instead, you can call this function with the same parameters as passed to the {@link DisplayGamepadConfig.joystickDisplayFunction}
     * if you want to keep the default behaviour (and then you can add your own custom behaviour on top)
     * @param stickConfig The config for the joystick that has changed (as configured in {@link DisplayGamepadConfig.sticks})
     * @param xValue The new x axis value
     * @param yValue The new y axis value
     */
    DefaultJoystickDisplayFunction = (stickConfig: GamepadDisplayJoystick, xValue: number, yValue: number) => {
        const stickRange = stickConfig.movementRange;
        // stickConfig.joystickElement.style.transform = `rotateY(${-xValue * 30}deg) rotateX(${yValue * 30}deg) translate(${xValue * stickRange}px,${yValue * stickRange}px)`;
        stickConfig.joystickElement.style.transform = `translate(${xValue * stickRange}px,${yValue * stickRange}px)`;
        if (stickConfig.highlights && this.config.moveDirectionHighlightClass) {
            const upHighlight = stickConfig.highlights[gamepadDirection.up];
            const downHighlight = stickConfig.highlights[gamepadDirection.down];
            const leftHighlight = stickConfig.highlights[gamepadDirection.left];
            const rightHighlight = stickConfig.highlights[gamepadDirection.right];
            if (upHighlight && yValue < -0.1) upHighlight.classList.add(this.config.moveDirectionHighlightClass || ""); else if (upHighlight) upHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (downHighlight && yValue > 0.1) downHighlight.classList.add(this.config.moveDirectionHighlightClass || ""); else if (downHighlight) downHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (leftHighlight && xValue < -0.1) leftHighlight.classList.add(this.config.moveDirectionHighlightClass || ""); else if (leftHighlight) leftHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (rightHighlight && xValue > 0.1) rightHighlight.classList.add(this.config.moveDirectionHighlightClass || ""); else if (rightHighlight) rightHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
        }
    }

    /**
     * Function called by default when any gamepad buttons change (called separately for each button (as configured in this GamepadDisplay))
     * If you specify your own {@link DisplayGamepadConfig.buttonDisplayFunction} in the config, this function won't get called.
     * Instead, you can call this function with the same parameters as passed to the {@link DisplayGamepadConfig.buttonDisplayFunction}
     * if you want to keep the default behaviour (and then you can add your own custom behaviour on top)
     * @param buttonConfig The config for the button that has changed as configured in {@link DisplayGamepadConfig.buttons}
     * @param value The new value of the button
     * @param touched Whether the button is currently being touched (unused, but included for consistency with the {@link ButtonDisplayFunction} signature)
     * @param pressed Whether the button is currently being pressed (unused, but included for consistency with the {@link ButtonDisplayFunction} signature)
     * @param changes The changes that have occurred since the last update
     * @param btnIndex The index of the button that has changed (unused, but included for consistency with the {@link ButtonDisplayFunction} signature)
     */
    DefaultButtonDisplayFunction = (buttonConfig: GamepadDisplayButton | GamepadDisplayVariableButton, value: number, touched: boolean, pressed: boolean, changes: buttonChangeDetails, btnIndex: number) => {
        const btnHiglightElem = buttonConfig.highlight;

        if (this.config.touchedHighlightClass && btnHiglightElem) {
            if (changes.touchDown) {
                btnHiglightElem.classList.add(this.config.touchedHighlightClass);
            } else if (changes.touchUp) {
                btnHiglightElem.classList.remove(this.config.touchedHighlightClass);
            }
        }

        if (this.config.pressedHighlightClass && btnHiglightElem) {
            if (changes.pressed) {
                btnHiglightElem.classList.add(this.config.pressedHighlightClass);
            } else if (changes.released) {
                btnHiglightElem.classList.remove(this.config.pressedHighlightClass);
            }
        }

        if (buttonConfig.type == gamepadButtonType.variable) {
            const dirHighlightElem = buttonConfig.directionHighlight;
            if (this.config.moveDirectionHighlightClass && dirHighlightElem) {
                if (changes.pressed) {
                    dirHighlightElem.classList.add(this.config.moveDirectionHighlightClass);
                } else if (changes.released) {
                    dirHighlightElem.classList.remove(this.config.moveDirectionHighlightClass);
                }
            }
            if (buttonConfig.buttonElement) {
                const isX = buttonConfig.direction == gamepadDirection.left || buttonConfig.direction == gamepadDirection.right;
                const isPositive = buttonConfig.direction == gamepadDirection.right || buttonConfig.direction == gamepadDirection.down;
                buttonConfig.buttonElement.style.transform = `translate${isX ? "X" : "Y"}(${isPositive ? "" : "-"}${value * buttonConfig.movementRange}px)`;
            }
        }
    }

    /**
     * This function is registered as the callback for {@link GamepadApiWrapper.onGamepadAxisChange}
     * it calls the {@link DisplayGamepadConfig.joystickDisplayFunction} (if specified) or the {@link GamepadDisplay.DefaultJoystickDisplayFunction} otherwise
     * for each configured joystick with axies that have changed
     * @param gpadIndex The index of the gamepad that has changed
     * @param gpadState The new state of the gamepad as reported by the browser  / {@link GamepadApiWrapper.onGamepadAxisChange}
     * @param axisChangesMask An array of booleans, where each true indicates that the corresponding axis has changed since the last update
     */
    protected displayJoystickChanges: AxisChangeCallback = (gpadIndex, gpadState, axisChangesMask) => {
        if (gpadIndex != this.config.gamepadIndex) return;
        const joystickConfigs = this.config.sticks;
        for (let i = 0; i < joystickConfigs.length; i++) {

            const stickConfig = joystickConfigs[i];
            if (stickConfig == undefined) continue;

            // only update if the joystick has changed
            if ((stickConfig.xAxisIndex !== undefined && axisChangesMask[stickConfig.xAxisIndex]) || (stickConfig.yAxisIndex !== undefined && axisChangesMask[stickConfig.yAxisIndex])) {

                // extract useful values from the config
                const gpadAxisValues = gpadState.axes;
                const xValue = stickConfig.xAxisIndex !== undefined ? (gpadAxisValues[stickConfig.xAxisIndex] || 0) : 0;
                const yValue = stickConfig.yAxisIndex !== undefined ? (gpadAxisValues[stickConfig.yAxisIndex] || 0) : 0;

                // display the new  joystick state
                if (this.config.joystickDisplayFunction) {
                    this.config.joystickDisplayFunction(stickConfig, xValue, yValue);
                } else {
                    this.DefaultJoystickDisplayFunction(stickConfig, xValue, yValue);
                }
            }
        }
    }


    /**
     * This function is registered as the callback for {@link GamepadApiWrapper.onGamepadButtonChange}
     * it calls the {@link DisplayGamepadConfig.buttonDisplayFunction} (if specified) or the {@link GamepadDisplay.DefaultButtonDisplayFunction} otherwise
     * for every button that has changed since the last update
     * @param gpadIndex The index of the gamepad that has changed
     * @param gpadState The new state of the gamepad as reported by the browser  / {@link GamepadApiWrapper.onGamepadButtonChange}
     * @param buttonChangesMask An array of buttonChangeDetails or false, where each false in the array indicates that the corresponding button index has not changed since the last update.
     * @returns
     */
    protected displayButtonChanges: ButtonChangeCallback = (gpadIndex, gpadState, buttonChangesMask) => {
        if (gpadIndex != this.config.gamepadIndex) return;
        const buttonConfigs = this.config.buttons;
        for (let i = 0; i < buttonConfigs.length; i++) {
            const buttonConfig = buttonConfigs[i];
            const changes = buttonChangesMask[i];
            // only update if the joystick has changed
            if (!buttonConfig || Object.keys(buttonConfig).length == 0 || !changes || Object.keys(changes).length == 0) continue;

            // extract useful values from the changes
            const value = gpadState.buttons[i].value;
            const touched = gpadState.buttons[i].touched;
            const pressed = gpadState.buttons[i].pressed;

            // display the new button state
            if (this.config.buttonDisplayFunction) {
                this.config.buttonDisplayFunction(buttonConfig, value, touched, pressed, changes, i);
            } else {
                this.DefaultButtonDisplayFunction(buttonConfig, value, touched, pressed, changes, i);
            }
        }
    }



    /**
     * Cleanup function to remove all event listeners created by the {@link GamepadDisplay}
     * Call this function before removing the gamepad display from the DOM or deleting
     * the {@link GamepadDisplay} instance to prevent memory leaks
     */
    Cleanup() {
        this.apiWrapper.offGamepadButtonChange(this.displayButtonChanges)
        this.apiWrapper.offGamepadAxisChange(this.displayJoystickChanges)
    }

}

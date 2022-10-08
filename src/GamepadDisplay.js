import { GamepadApiWrapper } from "./GamepadApiWrapper";
/**
 * Class to handle displaying the state of a gamepad on the screen.
 * This library will not draw anything to the screen, it will only update the classes / transforms of the elements
 * you provide to represent the buttons/axes of the gamepad. See the examples for more information.
 * @param {DisplayGamepadConfig} config The config to use for the gamepad display
 * @param {GamepadApiWrapper} config (OPTIONAL) The gamepad api will use this GamepadApiWrapper instance to listen for gamepad events, otherwise it will create a new gamepad wrapper.
 */
export class GamepadDisplay {
    config;
    apiWrapper;
    #btnChangeListener;
    #axisChangeListener;
    constructor(config, apiWrapper) {
        this.config = config;
        this.apiWrapper = apiWrapper || new GamepadApiWrapper({ buttonConfigs: [], updateDelay: 0 });
        this.#btnChangeListener = this.apiWrapper.onGamepadButtonChange(this.#displayButtonChanges.bind(this));
        this.#axisChangeListener = this.apiWrapper.onGamepadAxisChange(this.#displayJoystickChanges.bind(this));
    }
    ;
    defaultJoystickDisplayFunction = (stickConfig, xValue, yValue) => {
        const stickRange = stickConfig.movementRange;
        // stickConfig.joystickElement.style.transform = `rotateY(${-xValue * 30}deg) rotateX(${yValue * 30}deg) translate(${xValue * stickRange}px,${yValue * stickRange}px)`;
        stickConfig.joystickElement.style.transform = `translate(${xValue * stickRange}px,${yValue * stickRange}px)`;
        if (stickConfig.highlights && this.config.moveDirectionHighlightClass) {
            const upHighlight = stickConfig.highlights["up" /* gamepadDirection.up */];
            const downHighlight = stickConfig.highlights["down" /* gamepadDirection.down */];
            const leftHighlight = stickConfig.highlights["left" /* gamepadDirection.left */];
            const rightHighlight = stickConfig.highlights["right" /* gamepadDirection.right */];
            if (upHighlight && yValue < -0.1)
                upHighlight.classList.add(this.config.moveDirectionHighlightClass || "");
            else if (upHighlight)
                upHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (downHighlight && yValue > 0.1)
                downHighlight.classList.add(this.config.moveDirectionHighlightClass || "");
            else if (downHighlight)
                downHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (leftHighlight && xValue < -0.1)
                leftHighlight.classList.add(this.config.moveDirectionHighlightClass || "");
            else if (leftHighlight)
                leftHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
            if (rightHighlight && xValue > 0.1)
                rightHighlight.classList.add(this.config.moveDirectionHighlightClass || "");
            else if (rightHighlight)
                rightHighlight.classList.remove(this.config.moveDirectionHighlightClass || "");
        }
    };
    defaultButtonDisplayFunction = (buttonConfig, value, touched, pressed, changes, _) => {
        const btnHiglightElem = buttonConfig.highlight;
        if (this.config.touchedHighlightClass && btnHiglightElem) {
            if (changes.touchDown) {
                btnHiglightElem.classList.add(this.config.touchedHighlightClass);
            }
            else if (changes.touchUp) {
                btnHiglightElem.classList.remove(this.config.touchedHighlightClass);
            }
        }
        if (this.config.pressedHighlightClass && btnHiglightElem) {
            if (changes.pressed) {
                btnHiglightElem.classList.add(this.config.pressedHighlightClass);
            }
            else if (changes.released) {
                btnHiglightElem.classList.remove(this.config.pressedHighlightClass);
            }
        }
        if (buttonConfig.type == "variable" /* gamepadButtonType.variable */) {
            const dirHighlightElem = buttonConfig.directionHighlight;
            if (this.config.moveDirectionHighlightClass && dirHighlightElem) {
                if (changes.pressed) {
                    dirHighlightElem.classList.add(this.config.moveDirectionHighlightClass);
                }
                else if (changes.released) {
                    dirHighlightElem.classList.remove(this.config.moveDirectionHighlightClass);
                }
            }
            if (buttonConfig.buttonElement) {
                const isX = buttonConfig.direction == "left" /* gamepadDirection.left */ || buttonConfig.direction == "right" /* gamepadDirection.right */;
                const isPositive = buttonConfig.direction == "right" /* gamepadDirection.right */ || buttonConfig.direction == "down" /* gamepadDirection.down */;
                buttonConfig.buttonElement.style.transform = `translate${isX ? "X" : "Y"}(${isPositive ? "" : "-"}${value * buttonConfig.movementRange}px)`;
            }
        }
    };
    #displayButtonChanges = (gpadIndex, gpadState, buttonChangesMask) => {
        if (gpadIndex != this.config.gamepadIndex)
            return;
        const buttonConfigs = this.config.buttons;
        for (let i = 0; i < buttonConfigs.length; i++) {
            const changes = buttonChangesMask[i];
            // only update if the joystick has changed
            if (!changes || Object.keys(changes).length == 0)
                continue;
            // extract useful values from the config
            const buttonConfig = buttonConfigs[i];
            const value = gpadState.buttons[i].value;
            const touched = gpadState.buttons[i].touched;
            const pressed = gpadState.buttons[i].pressed;
            // display the new button state
            if (this.config.buttonDisplayFunction) {
                this.config.buttonDisplayFunction(buttonConfig, value, touched, pressed, changes, i);
            }
            else {
                this.defaultButtonDisplayFunction(buttonConfig, value, touched, pressed, changes, i);
            }
        }
    };
    #displayJoystickChanges(gpadIndex, gpadState, axisChangesMask) {
        if (gpadIndex != this.config.gamepadIndex)
            return;
        const joystickConfigs = this.config.sticks;
        for (let i = 0; i < joystickConfigs.length; i++) {
            const stickConfig = joystickConfigs[i];
            // only update if the joystick has changed
            if ((stickConfig.xAxisIndex !== undefined && axisChangesMask[stickConfig.xAxisIndex]) || (stickConfig.yAxisIndex !== undefined && axisChangesMask[stickConfig.yAxisIndex])) {
                // extract useful values from the config
                const gpadAxisValues = gpadState.axes;
                const xValue = stickConfig.xAxisIndex !== undefined ? (gpadAxisValues[stickConfig.xAxisIndex] || 0) : 0;
                const yValue = stickConfig.yAxisIndex !== undefined ? (gpadAxisValues[stickConfig.yAxisIndex] || 0) : 0;
                // display the new  joystick state
                if (this.config.joystickDisplayFunction) {
                    this.config.joystickDisplayFunction(stickConfig, xValue, yValue);
                }
                else {
                    this.defaultJoystickDisplayFunction(stickConfig, xValue, yValue);
                }
            }
        }
    }
    cleanup() {
        this.apiWrapper.offGamepadButtonChange(this.#btnChangeListener);
        this.apiWrapper.offGamepadAxisChange(this.#axisChangeListener);
    }
}

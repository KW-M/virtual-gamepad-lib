import { gamepadButtonType, gamepadDirection, gamepadEmulationState, gpadButtonMapType, standardGpadButtonMap, xboxButtonMap } from "./enums.js";
import { NormalizeClampVector } from "./utilities.js";

/** Extends the browser Gamepad interface to include an emulation property that exposes how this gamepad is being emulated (or not)
 * This Gamepad API interface defines an individual gamepad or other controller, allowing access to information such as button presses, axis positions, and id. Normally Available only in secure webpage contexts. */
export interface EGamepad extends Omit<Gamepad, "vibrationActuator"> {
    readonly emulation: gamepadEmulationState | undefined;
    readonly displayId: string;
    hapticActuators?: GamepadHapticActuator[];
    vibrationActuator?: GamepadHapticActuator;
}

export interface EGamepadPrivateData {
    /** true if this e-gamepad was created in overlay mode */
    overlayMode: boolean;
    /** stores a refrence to a function to cleanup all event listeners created for controlling buttons on this egamepad */
    removeButtonListenersFunc?: (() => void);
    /** stores a refrence to a function to cleanup all event listeners created for controlling axes on this egamepad */
    removeJoystickListenersFunc?: (() => void);
}

/** Extends the browser Gamepad Event interface to use an {@link EGamepad} type instead of a Gamepad */
export interface EGamepadEvent extends Omit<GamepadEvent, "gamepad"> {
    gamepad: EGamepad;
}

export interface OnOffButtonTouchConfig {
    type: gamepadButtonType.onOff,
    /** Taps/clicks/hovers on this element will trigger events for this button on the emulated gamepad. */
    tapTarget: (HTMLElement | SVGElement)
    /** The index of the gamepad button this tap target should control
     * corresponds to the button index as found in the {@link EGamepad.buttons} array
     * Can also pass a value from the {@link standardGpadButtonMap}, {@link xboxButtonMap}, etc...  */
    buttonIndex: number | gpadButtonMapType,
    /** Allows this tap target to control multiple gamepad buttons at once
     * useful for e.g. allowing diagonal directions of a dpad.
     * Overrides buttonIndex - Each number in the array is the index corresponding to a button in the {@link EGamepad.buttons} array that this tap target will control */
    buttonIndexes?: (number | gpadButtonMapType)[],
    /** Should this button lock the cursor once it is preseed (mouse or touch), such that NO pointer/mouse/touch events are fired with that pointer on any other elements on the page unil the finger leaves the screen or mouse lets go.
     * This option also prevents this button from reacting when a press starts on another button or page element and then the pointer/touch moves over the tap target of this button while being held down. */
    lockTargetWhilePressed?: boolean;
}

export interface VariableButtonTouchConfig {
    type: gamepadButtonType.variable,
    /** The element where a tap or mouse click must start to control this variable button.
     * The pointer does not need to remain within this element while dragging to continue controlling the variable button as long as the mouse / touch / pointer is held down and lockTargetWhilePressed is true */
    tapTarget: (HTMLElement | SVGElement)
    /** The index of the gamepad button this tap target should control
     * corresponds to the button index as found in the {@link EGamepad.buttons} array
     * Can also pass a value from the {@link standardGpadButtonMap}, {@link xboxButtonMap}, etc...  */
    buttonIndex: number | gpadButtonMapType,
    /** Allows this tap target to control multiple gamepad buttons at once
     * useful for e.g. allowing diagonal directions of a dpad.
     * Overrides buttonIndex - Each number in the array is the index corresponding to a button in the {@link EGamepad.buttons} array that this tap target will control */
    buttonIndexes?: (number | gpadButtonMapType)[],
    /** The distance drag gesture must go in pixels to appear as a fully pressed button: value = 1 */
    dragDistance: number,
    /** Should this variable button lock the cursor once a drag gesture has started, such that NO pointer/mouse/touch events are fired with that pointer on any other elements on the page unil the gesture is finished (finger leaves the screen or mouse lets go)
     * This option also prevents this button from reacting when a press starts on another button or page element and then the pointer/touch moves over the tap target of this button while being held down. */
    lockTargetWhilePressed?: boolean;
    /** What drag/movement gesture directions should result in the button value of this varaible button increasing
     * Typically only one direction will be set to true, but you can set multiple to true if you want to. See: {@link gamepadDirection} */
    directions: {
        [gamepadDirection.up]?: boolean;
        [gamepadDirection.down]?: boolean;
        [gamepadDirection.left]?: boolean;
        [gamepadDirection.right]?: boolean;
    }
}

export type ButtonTouchConfig = OnOffButtonTouchConfig | VariableButtonTouchConfig;

export interface JoystickTouchConfig {
    /** The element where a tap or mouse click must start to control this joystick
     * The pointer does not need to remain within this element while dragging to continue controlling the joystick as long as the mouse / touch / pointer is held down */
    tapTarget: HTMLElement | SVGElement;
    /** The distance a drag gesture must go in pixels to register as a full 1 or -1 on the x or y axis (Alternatively, the distance from the touch start posisiton that the joystick can be dragged)  */
    dragDistance: number;
    /** What emulated gamepad axis (the index in {@link EGamepad.axes}) to drive When the virtual joystick is dragged left (-) and right (+) */
    xAxisIndex?: number;
    /** What emulated gamepad axis (the index in {@link EGamepad.axes}) to drive When the virtual joystick is dragged up (-) and down (+) */
    yAxisIndex?: number;
    /** Should the joystick lock the cursor once a drag gesture has started, such that NO pointer/mouse/touch events are fired with that pointer on any other elements on the page unil the gesture is finished (finger leaves the screen or mouse lets go) */
    lockTargetWhilePressed?: boolean;
    /** What drag/movement directions does this joystick support. See: {@link gamepadDirection} */
    directions: {
        [gamepadDirection.up]?: boolean;
        [gamepadDirection.down]?: boolean;
        [gamepadDirection.left]?: boolean;
        [gamepadDirection.right]?: boolean;
    }
}

interface TouchDetails {
    startX: number;
    startY: number;
}

/** A number of typical buttons recognized by Gamepad API and mapped to
 *  standard controls. Any extraneous buttons will have larger indexes. */
export const DEFAULT_GPAD_BUTTON_COUNT: number = 18

/** A number of typical axes recognized by Gamepad API and mapped to
 * standard controls. Any extraneous axes will have larger indexes.*/
export const DEFAULT_GPAD_AXIS_COUNT: number = 4

/** Class to handle emulated gamepads and injecting them into the browser getGamepads() and event listener APIs.
 * >  You **MUST** call `new GamepadEmulator()` before any other libraries or functions use or store the browser gamepad api for it to function! */
export class GamepadEmulator {


    /** a static class variable to tell if any other instances of the GamepadEmulator class are active, and throw an error if a new one is created */
    protected static instanceRunning = false;

    /** stores a reference to the real, unpatched navigator.getGamepads() function (if available) **/
    getNativeGamepads?: () => (Gamepad | null)[] = undefined;

    /** the threshold above which a variable button is considered a "pressed" button */
    protected buttonPressThreshold: number = 0.1;

    // /** count of real gamepads connected to the browser */
    // protected realGamepadCount: number = 0

    /** A list of the indecies of all the real gamepads that have ever been conected durring this browser session, where the array index is the "gamepadIndex" returned by the native gamepad api, and the value is the index that gamepad should be exposed at in the emulated getGamepads() array */
    protected realGpadToPatchedIndexMap: number[] = []

    /** the reverse mapping array of {@link GamepadEmulator.realGpadToPatchedIndexMap} */
    protected patchedGpadToRealIndexMap: number[] = []

    /** A list of all the emulated gamepads, where the index is the "gamepadIndex" passed when AddEmulatedGamepad() was called (Ie: there may be holes in the list),
     * when an emulated gamepad is "connected" ie: call AddEmulatedGamepad(), it is added to this list at the provided index  (or returns false if there is already an emulated gamepad at that index).
     * when an emulated gamepad is "disconnected" ie: call removeEmulatedGamepad(), it is removed from this list provided index (or returns false if there is already an emulated gamepad at that index). */
    protected emulatedGamepads: (EGamepad | null)[] = []

    /** A list that mirrors the structure of {@link GamepadEmulator.emulatedGamepads}, but contains data internal to this class for keeping track of their state */
    protected emulatedGamepadsMetadata: (EGamepadPrivateData | null)[] = [];

    /** stores the function returned by monkeyPatchGamepadEvents() to undo the gamepad event monkey patch  **/
    protected undoEventPatch: () => void = () => { }

    /** Creates a new GamepadEmulator object and monkey patches the browser getGamepads() API and gamepad events to report emulated gamepads
     * - **MUST** be called before any other libraries or functions use or store the browser gamepad api!
     * @param buttonPressThreshold - the threshold above which a variable button is considered a "pressed" button */
    constructor(buttonPressThreshold: number) {
        this.buttonPressThreshold = buttonPressThreshold || this.buttonPressThreshold
        if (GamepadEmulator.instanceRunning) throw new Error("Only one GamepadEmulator instance may exist at a time!");
        GamepadEmulator.instanceRunning = true;
        this.undoEventPatch = this.monkeyPatchGamepadEvents();
        this.monkeyPatchGetGamepads();
    }

    /** @returns true if the gamepad api is supported natively by the browser context */
    gamepadApiNativelySupported() {
        return !!this.getNativeGamepads && !!this.getNativeGamepads.apply(navigator); // firefox still exposes the gamepad api when in insecure contexts, but does not return anything, so it's not "supported".
    }

    /** creates a new emmulated gamepad at the given index as would be read in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to create, pass null to create a new gamepad at the next available index
     * @param {string} overlayMode - if a real gamepad is connected at the same index as this emulated one and overlayMode is true, the emulated gamepad values will get merged or overlayed on the real gamepad button and axis values, otherwise the emulated gamepad will be shifted to the next available index (appear as a separate gamepad from the real gamepad)
     * @param {number} buttonCount - normally 18, the number of buttons on the gamepad
     * @param {number} axisCount - normally 4, the number of axes on the gamepad */
    AddEmulatedGamepad(gpadIndex: number, overlayMode: boolean, buttonCount: number = DEFAULT_GPAD_BUTTON_COUNT, axisCount: number = DEFAULT_GPAD_AXIS_COUNT): EGamepad | false {
        if (gpadIndex === -1 || (!gpadIndex && gpadIndex !== 0)) gpadIndex = this.nextEmptyEGpadIndex(overlayMode);
        if (this.emulatedGamepads[gpadIndex]) return false;

        // create the new gamepad object
        const eGpad: EGamepad = {
            emulation: gamepadEmulationState.emulated,
            connected: true,
            timestamp: performance.now(),
            displayId: "Emulated Gamepad " + gpadIndex,
            id: "Emulated Gamepad " + gpadIndex + " (Xinput STANDARD GAMEPAD)",
            mapping: "standard",
            index: gpadIndex,
            buttons: new Array(buttonCount).fill({ pressed: false, value: 0, touched: false }, 0, buttonCount),
            axes: new Array(axisCount).fill(0, 0, axisCount),
            hapticActuators: [],
        };

        // Add the new gamepad object to the list of emulated gamepads
        this.emulatedGamepads[gpadIndex] = eGpad;
        this.emulatedGamepadsMetadata[gpadIndex] = { overlayMode: overlayMode }

        // Trigger the (system) gamepad connected event on the window object (this will also trigger the window.ongamepadconnected function)
        const event = new Event('gamepadconnected') as EGamepadEvent;
        event.gamepad = eGpad;
        window.dispatchEvent(event);
        return eGpad
    }

    /** removes the emmulated gamepad at the passed index as would be read from the list in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to remove */
    RemoveEmulatedGamepad(gpadIndex: number) {
        this.ClearButtonTouchEventListeners(gpadIndex);
        this.ClearJoystickTouchEventListeners(gpadIndex);
        var e_gpad = this.emulatedGamepads[gpadIndex];
        if (e_gpad) {
            delete this.emulatedGamepads[gpadIndex];
            delete this.emulatedGamepadsMetadata[gpadIndex];
            const gpad: EGamepad = {
                ...e_gpad,
                connected: false,
                timestamp: performance.now(),
            }

            // Trigger the (system) gamepad disconnected event on the window object (this will also trigger the window.ongamepaddisconnected function)
            const event = new Event('gamepaddisconnected') as EGamepadEvent;
            event.gamepad = gpad;
            window.dispatchEvent(event);
        } else {
            console.warn("GamepadEmulator Error: Cannot remove emulated gamepad. No emulated gamepad exists at index " + gpadIndex);
        }
    }

    /** emulates pressing a button on an emulated gamepad at the given gamepad button index
     * @param {number} gpadIndex - the index of the emulated gamepad (as returned by navigator.getGamepads()) to press the button on
     * @param {number} buttonIndex - the index of the button to press on the gamepad - pass an array of indexes to control multiple buttons at once
     * @param {number} value - the value to set the button to between 0 and 1 (0 = not pressed, 1 = fully pressed, 0.5 = half pressed) if this value is greater than the pressedThreshold from the constructor, the button will be considered pressed
     * @param {boolean} touched - whether the button is considered "touched" or not, a "pressed" button is always considered "touched"
    */
    PressButton(gpadIndex: number, buttonIndex: number | number[], value: number, touched?: boolean) {
        if (this.emulatedGamepads[gpadIndex] == undefined) throw new Error("Error: PressButton() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        const buttonState = [...(this.emulatedGamepads[gpadIndex]?.buttons || [])]
        const isPressed = value > this.buttonPressThreshold;

        if (Array.isArray(buttonIndex)) {
            const isTouched = isPressed || (touched ?? buttonState[buttonIndex[0]]?.touched) || false;
            for (var i = 0; i < buttonIndex.length; i++) {
                const btnIndex = buttonIndex[i];
                if (btnIndex < 0 || btnIndex >= this.emulatedGamepads[gpadIndex].buttons.length) {
                    console.error("Error: PressButton() - button index " + btnIndex + " out of range, pass a valid index between 0 and " + (this.emulatedGamepads[gpadIndex].buttons.length - 1));
                    continue;
                }
                buttonState[btnIndex] = {
                    pressed: isPressed,
                    value: value || 0,
                    touched: isTouched
                };
            }
        } else {
            const isTouched = isPressed || (touched ?? buttonState[buttonIndex]?.touched) || false;
            if (buttonIndex < 0 || buttonIndex >= this.emulatedGamepads[gpadIndex].buttons.length) {
                console.error("Error: PressButton() - button index " + buttonIndex + " out of range, pass a valid index between 0 and " + (this.emulatedGamepads[gpadIndex].buttons.length - 1));
                return
            }
            buttonState[buttonIndex] = {
                pressed: isPressed,
                value: value || 0,
                touched: isTouched
            };
        }
        Object.defineProperty(this.emulatedGamepads[gpadIndex], "buttons", { value: buttonState, enumerable: true, configurable: true })
    }

    /** emulates moving an axis on the gamepad at the given axis index
     * @param gpadIndex - the index of the emulated gamepad to move the axis on
     * @param axisIndex - the index of the axis to move
     * @param value - the value to set the axis to between -1 and 1 (0 = center, -1 = left/up, 1 = right/down) */
    MoveAxis(gpadIndex: number, axisIndex: number, value: number,) {
        if (this.emulatedGamepads[gpadIndex] == undefined) throw new Error("Error: MoveAxis() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        const axes = [...(this.emulatedGamepads[gpadIndex]?.axes || [])]
        axes[axisIndex] = value
        Object.defineProperty(this.emulatedGamepads[gpadIndex], "axes", { value: axes, enumerable: true, configurable: true })
    }

    /** add event listeners to the html/svg button elements of an onscreen gamepad to emulate gamepad input  when touched, clicked or dragged
    * @param gpadIndex - the index of the emulated gamepad to register events for
    * @param buttonConfigs - an array of config objects that set how each of the buttons on the onscreen gamepad should behave, and how they map to the emulated gamepad buttons. */
    AddButtonTouchEventListeners(gpadIndex: number, buttonConfigs: (ButtonTouchConfig)[]) {
        if (!this.emulatedGamepads[gpadIndex]) throw new Error("Error: AddJoystickTouchEventListeners() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        let removeListenerFuncs: (() => void)[] = [];
        for (var i = 0; i < buttonConfigs.length; i++) {
            const btnConfig = buttonConfigs[i];
            if (!btnConfig) continue;
            const gpadButtonIndexes = btnConfig.buttonIndexes ?? btnConfig.buttonIndex;
            const tapTarget: HTMLElement = btnConfig.tapTarget as HTMLElement;

            if (!tapTarget) {
                console.warn("GamepadEmulator: No tap target in gamepad " + gpadIndex + " display config for button " + gpadButtonIndexes + ", skipping...");
                continue;
            }

            // disable browser default actions like pan & zoom once a pointer is down on the joystick (only works with touchstart)
            const touchStartHandler = (event: TouchEvent) => {
                const touchTarget = event.changedTouches[0].target as HTMLElement;
                if (touchTarget == tapTarget) event.preventDefault();
                else if (touchTarget.parentElement == tapTarget) event.preventDefault();
                // two levels up should be enough to catch most cases...
            }; window.addEventListener("touchstart", touchStartHandler, { passive: false });

            // handle hover events for the button tap target
            const pointerEnterHandler = (e: PointerEvent) => {
                // tell the emulator this button is being "touched", ie: hovered over
                const pressAmt = (e.buttons == 1 ? 1 : 0); // if the pointer is down  (left mouse button is clicked), press the button
                if (!btnConfig.lockTargetWhilePressed || pressAmt == 0) this.PressButton(gpadIndex, gpadButtonIndexes, pressAmt, true);
            }; tapTarget.addEventListener("pointerenter", pointerEnterHandler);

            // handle hover exit events for the button tap target
            const pointerExitHandler = (e: PointerEvent) => {
                // tell the emulator this button is no longer being "touched", ie: not hovered over anymore
                const pressAmt = (e.buttons == 1 ? 1 : 0); // if the pointer is down (left mouse button is clicked)
                if (!btnConfig.lockTargetWhilePressed || pressAmt == 0) this.PressButton(gpadIndex, gpadButtonIndexes, 0, false);
            }; tapTarget.addEventListener("pointerleave", pointerExitHandler);

            // handle pointer cancel events for the button tap target
            const pointerCancelHandler = (e: PointerEvent) => {
                // tell the emulator this button is no longer being "touched", ie: not hovered over anymore
                this.PressButton(gpadIndex, gpadButtonIndexes, 0, false);
            }; tapTarget.addEventListener("pointercancel", pointerCancelHandler);

            // Handle the simple ON / OFF button
            if (btnConfig.type == gamepadButtonType.onOff) {

                // handle pointer down events for the button tap target
                const pointerDownHandler = (e: PointerEvent) => {
                    e.preventDefault();
                    // tell the emulator this button is being pressed, ie: clicked / tapped
                    this.PressButton(gpadIndex, gpadButtonIndexes, 1, true);
                    if (btnConfig.lockTargetWhilePressed) tapTarget.setPointerCapture(e.pointerId);
                    else tapTarget.releasePointerCapture(e.pointerId)
                }; tapTarget.addEventListener("pointerdown", pointerDownHandler);

                // handle pointer up events for the button tap target
                const pointerUpHandler = () => {
                    // tell the emulator this button is no longer being pressed
                    this.PressButton(gpadIndex, gpadButtonIndexes, 0);
                }; tapTarget.addEventListener("pointerup", pointerUpHandler);

                // add a listener removal function to the list of functions to call when removing the event listeners
                removeListenerFuncs.push(function removeListeners() {
                    window.removeEventListener("touchstart", touchStartHandler);
                    tapTarget.removeEventListener("pointerenter", pointerEnterHandler);
                    tapTarget.removeEventListener("pointerleave", pointerExitHandler);
                    tapTarget.removeEventListener("pointerdown", pointerDownHandler);
                    tapTarget.removeEventListener("pointerup", pointerUpHandler);
                    tapTarget.removeEventListener("pointercancel", pointerCancelHandler);
                })

            } else if (btnConfig.type == gamepadButtonType.variable) {

                // Handle the variable (dragged) button
                const removeDragListeners = this.AddDragControlListener(btnConfig as JoystickTouchConfig, (pointerDown: boolean, xValue: number, yValue: number) => {
                    let value = pointerDown ? this.buttonPressThreshold + 0.00001 : 0;
                    value += (btnConfig.directions[gamepadDirection.left] || btnConfig.directions[gamepadDirection.right]) ? Math.abs(xValue) : 0
                    value += (btnConfig.directions[gamepadDirection.up] || btnConfig.directions[gamepadDirection.down]) ? Math.abs(yValue) : 0;
                    // tell the emulator how much this button is being pressed
                    this.PressButton(gpadIndex, gpadButtonIndexes, Math.min(value, 1));
                });

                // add a listener removal function to the list of functions to call when removing the event listeners
                removeListenerFuncs.push(function removeListeners() {
                    window.removeEventListener("touchstart", touchStartHandler);
                    tapTarget.removeEventListener("pointerenter", pointerEnterHandler);
                    tapTarget.removeEventListener("pointerleave", pointerExitHandler);
                    tapTarget.removeEventListener("pointercancel", pointerCancelHandler);
                    removeDragListeners();
                })

            }
        };

        this.emulatedGamepadsMetadata[gpadIndex]!.removeButtonListenersFunc = () => {
            removeListenerFuncs.forEach(func => func());
        }
    }

    /** add event listeners to the html/svg joystick elements of an onscreen gamepad to emulate gamepad input when dragged with a mouse, touch or pen.
    * @param gpadIndex - the index of the emulated gamepad to register events for
    * @param joystickConfigs - an array of config objects that set how each of the joysticks on the onscreen gamepad should behave, and how they map to the emulated gamepad axes. */
    AddJoystickTouchEventListeners(gpadIndex: number, joystickConfigs: JoystickTouchConfig[]) {
        if (!this.emulatedGamepads[gpadIndex]) throw new Error("Error: AddJoystickTouchEventListeners() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        let removeListenerFuncs: (() => void)[] = [];
        for (let i = 0; i < joystickConfigs.length; i++) {
            const config = joystickConfigs[i]
            if (!config) continue;
            if (config.tapTarget == undefined) {
                console.warn("GamepadEmulator: No tap target in gamepad " + gpadIndex + " display config for joystick " + i + ", skipping...");
                continue;
            }
            const removeDragListeners = this.AddDragControlListener(config, (_: boolean, xValue: number, yValue: number) => {
                if (config.xAxisIndex !== undefined) this.MoveAxis(gpadIndex, config.xAxisIndex, xValue);
                if (config.yAxisIndex !== undefined) this.MoveAxis(gpadIndex, config.yAxisIndex, yValue);
            });
            removeListenerFuncs.push(removeDragListeners)
        }

        this.emulatedGamepadsMetadata[gpadIndex]!.removeJoystickListenersFunc = () => {
            removeListenerFuncs.forEach(func => func());
        }
    }

    /** removes event listeners added with AddButtonTouchEventListeners()
    * @param gpadIndex - the index of the emulated gamepad to un-register events for */
    ClearButtonTouchEventListeners(gpadIndex: number) {
        if (this.emulatedGamepadsMetadata[gpadIndex] && this.emulatedGamepadsMetadata[gpadIndex]?.removeButtonListenersFunc) this.emulatedGamepadsMetadata[gpadIndex]!.removeButtonListenersFunc!();
    }

    /** removes event listeners added with AddJoystickTouchEventListeners()
     * @param gpadIndex - the index of the emulated gamepad to un-register events for */
    ClearJoystickTouchEventListeners(gpadIndex: number) {
        if (this.emulatedGamepadsMetadata[gpadIndex] && this.emulatedGamepadsMetadata[gpadIndex]?.removeJoystickListenersFunc) this.emulatedGamepadsMetadata[gpadIndex]!.removeJoystickListenersFunc!();
    }

    protected AddDragControlListener(config: JoystickTouchConfig, callback: (touched: boolean, xValue: number, yValue: number) => void) {
        let touchDetails: TouchDetails = {
            startX: 0,
            startY: 0,
        }
        let activePointerId: number = -1;
        const pointerMoveHandler = (moveEvent: PointerEvent) => {
            var pointerId = moveEvent.pointerId;
            if (activePointerId === pointerId) {
                const xMin = config.directions[gamepadDirection.left] ? -1 : 0;
                const xMax = config.directions[gamepadDirection.right] ? 1 : 0;
                const yMin = config.directions[gamepadDirection.up] ? -1 : 0;
                const yMax = config.directions[gamepadDirection.down] ? 1 : 0;
                const deltaX = moveEvent.clientX - touchDetails.startX;
                const deltaY = moveEvent.clientY - touchDetails.startY;
                let { x, y } = NormalizeClampVector(deltaX, deltaY, config.dragDistance);
                x = Math.max(Math.min(x, xMax), xMin)
                y = Math.max(Math.min(y, yMax), yMin)
                callback(true, x, y);
            }
        }
        const pointerUpHandler = (upEvent: PointerEvent) => {
            if (activePointerId == upEvent.pointerId) {
                document.removeEventListener("pointermove", pointerMoveHandler, false);
                document.removeEventListener("pointerup", pointerUpHandler, false);
                activePointerId = -1;
                callback(false, 0, 0);
            }
        }

        // add the initial event listener
        (config.tapTarget as HTMLElement).addEventListener("pointerdown", (downEvent: PointerEvent) => {
            downEvent.preventDefault();
            touchDetails.startX = downEvent.clientX;
            touchDetails.startY = downEvent.clientY;
            activePointerId = downEvent.pointerId;
            if (config.lockTargetWhilePressed) config.tapTarget.setPointerCapture(downEvent.pointerId);
            else config.tapTarget.releasePointerCapture(downEvent.pointerId);
            callback(true, 0, 0);
            document.addEventListener("pointermove", pointerMoveHandler, false);
            document.addEventListener("pointerup", pointerUpHandler, false);
        });

        // disable browser default actions like pan & zoom once a pointer is down on the joystick (only works with touchstart)
        const touchStartHandler = (event: TouchEvent) => {
            if (event.changedTouches[0].target == config.tapTarget) {
                event.preventDefault();
            }
        }; window.addEventListener("touchstart", touchStartHandler, { passive: false });

        // return a function to disable the event listeners
        return function removeListeners() {
            window.removeEventListener("touchstart", touchStartHandler);
            (config.tapTarget as HTMLElement).removeEventListener("pointerdown", pointerMoveHandler);
        }
    }

    /** returns copy of the passed Gamepad object
     * The axies and buttons arrays are deep copied.
     * Every other property is a shallow copy
     * @param original - the gamepad object to copy */
    protected cloneGamepad(original: EGamepad | Gamepad | null): EGamepad | null {
        // inspired by @maulingmonkey's gamepad library
        if (!original) return original as (EGamepad | null);
        const axesCount = original.axes ? original.axes.length : 0;
        const buttonsCount = original.buttons ? original.buttons.length : 0;

        // clone the gamepad object
        // @ts-ignore
        const clone: EGamepad = {}; //Object.create(Gamepad.prototype)
        for (let key in original) {
            if (key === "axes") {
                const axes = new Array(axesCount);
                for (let i = 0; i < axesCount; i++) {
                    axes[i] = Number(original.axes[i]);
                }
                Object.defineProperty(clone, "axes", { value: axes, enumerable: true, configurable: true });
            } else if (key === "buttons") {
                const buttons = new Array(buttonsCount);
                for (let i = 0; i < buttonsCount; i++) {
                    const btn = original.buttons[i]
                    if (btn == undefined) buttons[i] = btn;
                    else {
                        const pressed = btn.pressed, value = btn.value, touched = btn.touched || false;
                        buttons[i] = { pressed: pressed, value: value, touched: touched };
                    }
                }
                Object.defineProperty(clone, "buttons", { value: buttons, enumerable: true, configurable: true });
            } else {
                //if (Object.prototype.hasOwnProperty.call(original, key))
                Object.defineProperty(clone, key, { get: () => { return (original as any)[key] }, configurable: true, enumerable: true });
            }
        }

        // add extra emulation properties onto the gamepad
        if (!clone.emulation) Object.defineProperty(clone, "emulation", { value: gamepadEmulationState.real, configurable: true, enumerable: true });
        return clone;
    }

    /** Searches for the next available index a new emulated gamepad could go and returns that index
    * this means no emulated gamepad is at that index and either the no real gamepad is at that index, or a real gamepad is at that index, but the @param overlayMode is true. */
    protected nextEmptyEGpadIndex(overlayMode: boolean): number {
        let index = 0;
        if (overlayMode) {
            do {
                if (!this.emulatedGamepads[index]) break;
                index++;
            } while (index < this.emulatedGamepads.length)
        } else {
            const end = Math.max(this.emulatedGamepads.length, this.patchedGpadToRealIndexMap.length);
            do {
                if (!this.emulatedGamepads[index] && this.patchedGpadToRealIndexMap[index] == undefined) break;
                index++;
            } while (index < end);
        }
        return index;
    }

    /** Searches for the next available index a freshly connected real gamepad could go and returns that index
     * this means no real gamepad is mapped to that index and either no emulated gamepad is at that index, or the emulated gamepad is in overlay mode
     * @param startingIndex the index to start searching from */
    protected nextEmptyRealGpadIndex(startingIndex: number): number {
        let index = startingIndex;
        const end = Math.max(this.emulatedGamepads.length, this.patchedGpadToRealIndexMap.length);
        do {
            const emulatedGpadMetadata = this.emulatedGamepadsMetadata[index];
            const realGpadEmptySpot = this.realGpadToPatchedIndexMap[index] == undefined && this.patchedGpadToRealIndexMap[index] == undefined;

            if ((!!emulatedGpadMetadata && emulatedGpadMetadata.overlayMode) || (!emulatedGpadMetadata && realGpadEmptySpot)) break;
            index++;
        } while (index < end);
        return index;
    }

    /** Intercepts gamepadconnected & gamepaddisconnected events and re-sends them with the correct gamepad indecies */
    protected monkeyPatchGamepadEvents() {

        // disable the window.ongamepadconnected event listener:
        let onGamepadConnectedProps: PropertyDescriptor, onGamepadDisconnectedProps: PropertyDescriptor, windowOngamepadconnected: any, windowOngamepaddisconnected: any;
        if (window.hasOwnProperty("ongamepadconnected")) {
            onGamepadConnectedProps = Object.getOwnPropertyDescriptor(window, "ongamepadconnected")!
            onGamepadConnectedProps.configurable = true;
            windowOngamepadconnected = window.ongamepadconnected;
            window.ongamepadconnected = null;
            Object.defineProperty(window, "ongamepadconnected", {
                get: () => function (ev: GamepadEvent) { }, // returns an empty function, so no event is fired
                set: (fn) => { windowOngamepadconnected = fn; },
                configurable: true
            })
        }

        // disable the window.ongamepaddisconnected event listener:
        if (window.hasOwnProperty("ongamepaddisconnected")) {
            onGamepadDisconnectedProps = Object.getOwnPropertyDescriptor(window, "ongamepaddisconnected")!
            onGamepadDisconnectedProps.configurable = true;
            windowOngamepaddisconnected = window.ongamepaddisconnected;
            window.ongamepaddisconnected = null;
            Object.defineProperty(window, "ongamepaddisconnected", {
                get: () => function (ev: GamepadEvent) { }, // returns an empty function, so no event is fired
                set: (fn) => { windowOngamepadconnected = fn; },
                configurable: true
            })
        }

        // fix the gamepadconnected event listener:
        const gamepadConnectedHandler = (e: GamepadEvent) => {
            const gpad = e.gamepad as EGamepad;
            if (gpad && gpad.emulation === undefined) {
                e.stopImmediatePropagation() // prevent future event listeners from firing
                e.preventDefault()

                // fix the gamepad object to be an EGamepad with the correct (mapped) index index
                const clone = this.cloneGamepad(e.gamepad) as EGamepad;
                const gpadIndex = clone.index;
                const mappedIndex = this.nextEmptyRealGpadIndex(gpadIndex);
                this.realGpadToPatchedIndexMap[gpadIndex] = mappedIndex;
                this.patchedGpadToRealIndexMap[mappedIndex] = gpadIndex;
                Object.defineProperty(clone, "index", { get: () => mappedIndex });
                Object.defineProperty(clone, "emulation", { get: () => gamepadEmulationState.real });
                // this.realGamepadCount++;

                // send out the corrected event on the window object
                const newEvent = new Event(e.type || 'gamepadconnected') as EGamepadEvent;
                newEvent.gamepad = clone!
                window.dispatchEvent(newEvent);
            }

            // call the window.ongamepadconnected event listener callback function (since the native version it was disabled)
            if (windowOngamepadconnected) windowOngamepadconnected.call(window, e)
        }; window.addEventListener('gamepadconnected', gamepadConnectedHandler)

        // fix the gamepaddisconnected event listener:
        const gamepadDisconnectedHandler = (e: GamepadEvent) => {
            const raw_gpad = e.gamepad;
            if (raw_gpad && (raw_gpad as EGamepad).emulation === undefined) {
                e.stopImmediatePropagation() // prevent future event listeners from firing
                e.preventDefault()

                // fix the gamepad object to be an EGamepad with the correct (mapped) index
                const clone = this.cloneGamepad(e.gamepad) as EGamepad;
                const mappedIndex = this.realGpadToPatchedIndexMap[clone!.index] || clone!.index;
                Object.defineProperty(clone, "index", { get: () => mappedIndex });
                Object.defineProperty(clone, "emulation", { get: () => gamepadEmulationState.real });
                delete this.realGpadToPatchedIndexMap[clone.index];
                delete this.patchedGpadToRealIndexMap[mappedIndex];
                // this.realGamepadCount--;

                // send out the corrected event on the window object
                // https://stackoverflow.com/questions/36408435/how-to-propagate-event-invalidstateerror-failed-to-execute-dispatchevent-on
                const newEvent = new Event(e.type || 'gamepaddisconnected') as EGamepadEvent;
                newEvent.gamepad = clone;
                window.dispatchEvent(newEvent);
            }

            // call the window.ongamepaddisconnected event listener callback function (since it was disabled)
            if (windowOngamepaddisconnected) windowOngamepaddisconnected.call(window, e)

        }; window.addEventListener("gamepaddisconnected", gamepadDisconnectedHandler)

        // return a cleanup function to enable undoing the monkey patch:
        return function cleanup() {
            window.removeEventListener('gamepadconnected', gamepadConnectedHandler)
            if (window.hasOwnProperty("ongamepadconnected")) {
                Object.defineProperty(window, "ongamepadconnected", onGamepadConnectedProps)
                window.ongamepadconnected = windowOngamepadconnected
            }
            window.removeEventListener("gamepaddisconnected", gamepadDisconnectedHandler)
            if (window.hasOwnProperty("ongamepaddisconnected")) {
                Object.defineProperty(window, "ongamepaddisconnected", onGamepadDisconnectedProps)
                window.ongamepaddisconnected = windowOngamepaddisconnected
            }
        }
    }

    /** overwrite the browser gamepad api getGamepads() to return the emulated gamepad data for gamepad indexes corresponding to emulated gamepads
     * if a real gamepad is found with the same index value as an emulated gamepad, the  the navigator.getGamepads() list will either shift the emulated gamepad's index up to make room for the real gamepad when (emulatedGamepad.overlayMode = false),
     * or it will return the emulated gamepad "overlayed" on the real one where buttons pressed or axes moved on both the real gamepad and the emulated one will show up on that gamepad. */
    protected monkeyPatchGetGamepads() {
        // get a reference to the original getGamepads() function
        const self = this;
        let getNativeGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;
        this.getNativeGamepads = getNativeGamepads;
        navigator.getNativeGamepads = getNativeGamepads || function () { return [] };

        // overwrite the getGamepads() function with our own:
        Object.defineProperty(navigator, "getGamepads", {
            configurable: true,
            value: function () {
                // get the native gamepads from the browser
                let emulatedGpads = self.emulatedGamepads;
                let nativeGpadsRaw = getNativeGamepads != undefined ? (getNativeGamepads.apply(navigator) || []) : [];
                let outputGpads = new Array(Math.max(nativeGpadsRaw.length, emulatedGpads.length)).fill(null);
                for (let i = 0; i < nativeGpadsRaw.length; i++) {
                    const gpad = nativeGpadsRaw[i];
                    if (!gpad) continue;
                    let clone = self.cloneGamepad(gpad);
                    let mappedIndex = self.realGpadToPatchedIndexMap[clone!.index] || clone!.index;
                    Object.defineProperty(clone, "index", { get: () => mappedIndex });
                    outputGpads[mappedIndex] = clone;
                }

                // apply the emulated gamepad data to the mapped native gamepads array
                for (let i = 0; i < emulatedGpads.length; i++) {
                    let n_gpad = outputGpads[i];
                    let e_gpad = emulatedGpads[i];
                    if (e_gpad && n_gpad) {
                        // if both an emulated gamepad and a real one is available for this index, combine their inputs
                        // add a property on the gamepad to indicate that it is both emulated and real
                        Object.defineProperty(outputGpads[i], "emulation", { value: gamepadEmulationState.overlay, configurable: true });

                        // merge button presses:
                        let btnCount = Math.max(n_gpad?.buttons?.length ?? 0, e_gpad.buttons.length);
                        let mergedBtns = new Array(btnCount);
                        for (let btnIdx = 0; btnIdx < btnCount; btnIdx++) {
                            const e_btn = e_gpad?.buttons[btnIdx] || { touched: false, pressed: false, value: 0 };
                            const n_btn = n_gpad?.buttons[btnIdx] || { touched: false, pressed: false, value: 0 };
                            mergedBtns[btnIdx] = {
                                touched: e_btn.touched || n_btn.touched || false,
                                pressed: e_btn.pressed || n_btn.pressed || false,
                                value: Math.max(e_btn.value, n_btn.value) || 0,
                            }
                        }
                        Object.defineProperty(outputGpads[i], "buttons", { value: mergedBtns, enumerable: true, configurable: true })
                        // merge axis values:
                        let axisCount = Math.max(e_gpad.axes.length, n_gpad.axes.length);
                        let mergedAxes = new Array(btnCount)
                        for (let axisIndex = 0; axisIndex < axisCount; axisIndex++) {
                            const e_axis = e_gpad.axes[axisIndex] ?? 0;
                            const n_axis = n_gpad.axes[axisIndex] ?? 0;
                            mergedAxes[axisIndex] = Math.abs(e_axis) > Math.abs(n_axis) ? (e_axis) : (n_axis);
                        }
                        Object.defineProperty(outputGpads[i], "axes", { value: mergedAxes, enumerable: true, configurable: true })

                    } else if (e_gpad) {
                        // if only the emulated gamepad is available, use it
                        // add a property on the gamepad to indicate that it is emulated
                        Object.defineProperty(e_gpad, "emulation", { value: gamepadEmulationState.emulated, enumerable: true, configurable: true });
                        Object.defineProperty(e_gpad, "timestamp", { value: performance.now(), enumerable: true, configurable: true })
                        outputGpads[i] = self.cloneGamepad(e_gpad); // clone the emulated gamepad to prevent it from being modified by the caller and make libraries happy
                    }
                }

                // return the native gamepads array with the emulated gamepad data applied
                return outputGpads;
            },
        })


    }

    /** (destructor) - Cleans up any event listeners made by this class and restores the normal navigator.getGamepad() function and gamepad events */
    cleanup() {
        for (let i = 0; i < this.emulatedGamepads.length; i++) {
            this.ClearButtonTouchEventListeners(i);
            this.ClearJoystickTouchEventListeners(i);
        }
        this.emulatedGamepads = [];
        this.undoEventPatch();
        if (this.getNativeGamepads) Object.defineProperty(navigator, "getGamepads", {
            value: this.getNativeGamepads, configurable: true
        });
        else Object.defineProperty(navigator, "getGamepads", {
            value: undefined, configurable: true
        });
        GamepadEmulator.instanceRunning = false;
        delete navigator.getNativeGamepads;
    }


    // Renamed functions for backwards compatibility

    /** @deprecated AddDisplayButtonEventListeners is now called AddButtonTouchEventListeners */
    AddDisplayButtonEventListeners = this.AddButtonTouchEventListeners

    /** @deprecated AddDisplayJoystickEventListeners is now called AddJoystickTouchEventListeners */
    AddDisplayJoystickEventListeners = this.AddJoystickTouchEventListeners

    /** @deprecated ClearDisplayButtonEventListeners is now called ClearButtonTouchEventListeners */
    ClearDisplayButtonEventListeners = this.ClearButtonTouchEventListeners

    /** @deprecated ClearDisplayJoystickEventListeners is now called ClearJoystickTouchEventListeners */
    ClearDisplayJoystickEventListeners = this.ClearJoystickTouchEventListeners

};


/** @deprecated ButtonConfig is now called ButtonTouchConfig */
export type ButtonConfig = ButtonTouchConfig;

/** @deprecated JoystickConfig is now called JoystickTouchConfig */
export type JoystickConfig = JoystickTouchConfig;

/** @deprecated OnOffButtonConfig is now called OnOffButtonTouchConfig */
export type OnOffButtonConfig = OnOffButtonTouchConfig;

/** @deprecated VariableButtonConfig is now called VariableButtonTouchConfig */
export type VariableButtonConfig = VariableButtonTouchConfig;

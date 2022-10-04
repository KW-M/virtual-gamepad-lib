import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "./enums";

// This Gamepad API interface defines an individual gamepad or other controller, allowing access to information such as button presses, axis positions, and id. Available only in secure contexts.
export interface EGamepad extends Gamepad {
    emulation: gamepadEmulationState | undefined;
    overlayMode: boolean;
    displayId: string;
    connected: boolean;
    timestamp: number;
    index: number;
    buttons: GamepadButton[];
    axes: number[];
}

// This Gamepad API interface contains references to gamepads connected to the system, which is what the gamepad events Window.gamepadconnected and Window.gamepaddisconnected are fired in response to. Available only in secure contexts.
export interface EGamepadEvent extends GamepadEvent {
    gamepad: EGamepad;
}

export interface ButtonConfig {
    type: gamepadButtonType.onOff,
    tapTarget: (HTMLElement | SVGElement)
    buttonIndex: number,
}

export interface VariableButtonConfig {
    type: gamepadButtonType.variable,
    tapTarget: (HTMLElement | SVGElement)
    buttonIndex: number,
    dragDistance: number,
    // what drag directions should result in the gamepad button press value going up
    directions: {
        [gamepadDirection.up]?: boolean;
        [gamepadDirection.down]?: boolean;
        [gamepadDirection.left]?: boolean;
        [gamepadDirection.right]?: boolean;
    }
}

export interface JoystickConfig {
    tapTarget: HTMLElement | SVGElement;
    dragDistance: number;
    xAxisIndex?: number;
    yAxisIndex?: number;
    // what drag directions does this joystick support
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

function NormalizeClampVector(x: number, y: number, max: number) {
    const length = Math.sqrt(x * x + y * y);
    if (length > max) return { x: x / length, y: y / length };
    else return { x: x / max, y: y / max };
}


/** A number of typical buttons recognized by Gamepad API and mapped to
 *  standard controls. Any extraneous buttons will have larger indexes. */
export const DEFAULT_GPAD_BUTTON_COUNT: number = 18

/** A number of typical axes recognized by Gamepad API and mapped to
 * standard controls. Any extraneous axies will have larger indexes.*/
export const DEFAULT_GPAD_AXIS_COUNT: number = 4

/**
 * Class to handle emulated gamepads and injecting them into the browser getGamepads() API. */
export class GamepadEmulator {

    /** the threshold above which a variable button is considered a "pressed" button */
    buttonPressThreshold: number = 0.1

    /** stores a reference to the real, unpatched navigator.getGamepads() function **/
    getNativeGamepads: () => (Gamepad | null)[] = () => []

    /** count of real gamepads connected to the browser */
    realGamepadCount: number = 0

    /** keeps track of how many currently down pointers are on joysticks or variable buttons */
    pointerDownCount: number = 0;

    /** A list of all the emulated gamepads, where the index is the "gamepadIndex" passed when AddEmulatedGamepad() was called (Ie: there may be holes in the list),
     * when an emulated gamepad is "connected" ie: call AddEmulatedGamepad(), it is added to this list at the provided index  (or returns false if there is already an emulated gamepad at that index).
     * when an emulated gamepad is "disconnected" ie: call removeEmulatedGamepad(), it is removed from this list provided index (or returns false if there is already an emulated gamepad at that index). */
    #emulatedGamepads: (EGamepad | null)[] = []

    /** A list of the indecies of all the real gamepads that have ever been conected durring this browser session, where the index is the "gamepadIndex" returned by the native gamepad api, and the value is the index that gamepad should be at in the emulated getGamepads() array */
    #realGamepadMap: number[] = []

    /** Creates a new GamepadEmulator object and monkey patches the browser getGamepads() API and gamepad events to report emulated gamepads
     * You should create the GamepadEmulator object before any other libraries or function that may use the gamepad api
     * @param buttonPressThreshold - the threshold above which a variable button is considered a "pressed" button */
    constructor(buttonPressThreshold: number) {
        this.buttonPressThreshold = buttonPressThreshold || this.buttonPressThreshold
        if (navigator.gpadEmulatorActive) throw new Error("Error: creating GamepadEmulator. Only one GamepadEmulator instance may exist in a page!");
        navigator.gpadEmulatorActive = true;
        this.#monkeyPatchGamepadEvents();
        this.#monkeyPatchGetGamepads();
    }

    /** creates a new emmulated gamepad at the given index as would be read in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to create, pass null to create a new gamepad at the next available index
     * @param {string} overlayMode - if a real gamepad is connected at the same index as this emulated one and overlayMode is true, the emulated gamepad values will get merged or overlayed on the real gamepad button and axis values, otherwise the emulated gamepad will be shifted to the next available index (appear as a separate gamepad from the real gamepad)
     * @param {number} buttonCount - normally 18, the number of buttons on the gamepad
     * @param {number} axisCount - normally 4, the number of axes on the gamepad */
    AddEmulatedGamepad(gpadIndex: number, overlayMode: boolean, buttonCount: number = DEFAULT_GPAD_BUTTON_COUNT, axisCount: number = DEFAULT_GPAD_AXIS_COUNT): EGamepad | false {
        if (gpadIndex === -1 || (!gpadIndex && gpadIndex !== 0)) gpadIndex = this.#nextEmptyEGpadIndex(!overlayMode);
        if (this.#emulatedGamepads[gpadIndex]) return false;

        // create the new gamepad object
        const eGpad: EGamepad = {
            emulation: gamepadEmulationState.emulated,
            overlayMode: overlayMode,
            connected: true,
            timestamp: Math.floor(Date.now() / 1000),
            displayId: "Emulated Gamepad " + gpadIndex,
            id: "Emulated Gamepad " + gpadIndex + " (Xinput STANDARD GAMEPAD)",
            mapping: "standard",
            index: gpadIndex,
            buttons: new Array(buttonCount).fill({ pressed: false, value: 0, touched: false }, 0, buttonCount),
            axes: new Array(axisCount).fill(0, 0, axisCount),
            hapticActuators: []
        };

        // Add the new gamepad object to the list of emulated gamepads
        this.#emulatedGamepads[gpadIndex] = eGpad;

        // Trigger the (system) gamepad connected event on the window object (this will also trigger the window.ongamepadconnected function)
        const event = new Event('gamepadconnected') as EGamepadEvent;
        event.gamepad = eGpad;
        window.dispatchEvent(event);
        return eGpad
    }

    /** removes the emmulated gamepad at the passed index as would be read from the list in navigator.getGamepads
     * @param {number} gpadIndex - the index of the gamepad to remove */
    RemoveEmulatedGamepad(gpadIndex: number) {
        var e_gpad = this.#emulatedGamepads[gpadIndex];
        if (e_gpad) {
            delete this.#emulatedGamepads[gpadIndex];
            let gpads = navigator.getGamepads()
            if (!gpads[gpadIndex]) {
                const gpad: EGamepad = {
                    ...e_gpad,
                    connected: false,
                    timestamp: Math.floor(Date.now() / 1000),
                }

                // Trigger the (system) gamepad disconnected event on the window object (this will also trigger the window.ongamepaddisconnected function)
                const event = new Event('gamepaddisconnected') as EGamepadEvent;
                event.gamepad = gpad;
                window.dispatchEvent(event);
            }
        }
    }

    /** emulates pressing a button on an emulated gamepad at the given gamepad button index
     * @param {number} gpadIndex - the index of the emulated gamepad (as returned by navigator.getGamepads()) to press the button on
     * @param {number} buttonIndex - the index of the button to press on the gamepad
     * @param {number} value - the value to set the button to between 0 and 1 (0 = not pressed, 1 = fully pressed, 0.5 = half pressed) if this value is greater than the pressedThreshold from the constructor, the button will be considered pressed
     * @param {boolean} touched - whether the button is considered "touched" or not, a "pressed" button is always considered "touched"
    */
    PressButton(gpadIndex: number, buttonIndex: number, value: number, touched: boolean) {
        if (this.#emulatedGamepads[gpadIndex] === undefined) throw new Error("Error: PressButton() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        var isPressed = value > this.buttonPressThreshold;
        console.log("pressbutton", gpadIndex, buttonIndex, value, isPressed, touched);
        this.#emulatedGamepads[gpadIndex]!.buttons[buttonIndex] = {
            pressed: isPressed,
            value: value || 0,
            touched: isPressed || touched || false
        };
    }

    /** emulates moving an axis on the gamepad at the given axis index
     * @param gpadIndex - the index of the emulated gamepad to move the axis on
     * @param axisIndex - the index of the axis to move
     * @param value - the value to set the axis to between -1 and 1 (0 = center, -1 = left/up, 1 = right/down)
     */
    MoveAxis(gpadIndex: number, axisIndex: number, value: number,) {
        if (!this.#emulatedGamepads[gpadIndex]) throw new Error("Error: MoveAxis() - no emulated gamepad at index " + gpadIndex + ", pass a valid index, or call AddEmulatedGamepad() first to create an emulated gamepad at that index");
        this.#emulatedGamepads[gpadIndex]!.axes[axisIndex] = value;
    }

    /** add event listeners to the html/svg button elements of an onscreen gamepad to emulate gamepad input
    * @param gpadIndex - the index of the emulated gamepad to register events for
    * @param buttonTapTargets - an array of elements that are the tap targets for the buttons on the onscreen gamepad, in same order as the gamepad api would use. */
    AddDisplayButtonEventListeners(gpadIndex: number, buttonConfigs: (ButtonConfig | VariableButtonConfig)[]) {
        for (var i = 0; i < buttonConfigs.length; i++) {
            const btnConfig = buttonConfigs[i];
            const gpadButtonIndex = btnConfig.buttonIndex;
            const tapTarget = btnConfig.tapTarget;

            if (!tapTarget) {
                console.warn("AddDisplayButtonEventListeners() - no tap target for button index " + gpadButtonIndex + ", skipping");
                continue;
            }

            tapTarget.addEventListener("pointerover", () => {
                // tell the emulator this button is being "touched", ie: hovered over
                this.PressButton(gpadIndex, gpadButtonIndex, 0, true);
            });

            tapTarget.addEventListener("pointerleave", () => {
                // tell the emulator this button is no longer being "touched", ie: not hovered over
                this.PressButton(gpadIndex, gpadButtonIndex, 0, false);
            });

            if (btnConfig.type == gamepadButtonType.onOff) {

                // Handle the simple ON / OFF button
                tapTarget.addEventListener("pointerdown", () => {
                    // tell the emulator this button is being pressed, ie: clicked / tapped
                    this.PressButton(gpadIndex, gpadButtonIndex, 1, true);
                });
                tapTarget.addEventListener("pointerup", () => {
                    // tell the emulator this button is no longer being pressed
                    this.PressButton(gpadIndex, gpadButtonIndex, 0, true);
                });

            } else if (btnConfig.type == gamepadButtonType.variable) {

                // Handle the variable (dragged) button
                const config: JoystickConfig = { ...btnConfig }
                this.#addDragControlListener(config, (pointerDown: boolean, xValue: number, yValue: number) => {
                    let value = pointerDown ? this.buttonPressThreshold + 0.00001 : 0;
                    value += (btnConfig.directions[gamepadDirection.left] || btnConfig.directions[gamepadDirection.right]) ? Math.abs(xValue) : 0
                    value += (btnConfig.directions[gamepadDirection.up] || btnConfig.directions[gamepadDirection.down]) ? Math.abs(yValue) : 0;
                    // tell the emulator how much this button is being pressed
                    this.PressButton(gpadIndex, btnConfig.buttonIndex, Math.min(value, 1), pointerDown);
                });

            }
        };
    }

    AddDisplayJoystickEventListeners(gpadIndex: number, joystickConfigs: JoystickConfig[]) {
        for (let i = 0; i < joystickConfigs.length; i++) {
            const config = joystickConfigs[i]
            this.#addDragControlListener(config, (_: boolean, xValue: number, yValue: number) => {
                if (config.xAxisIndex !== undefined) this.MoveAxis(gpadIndex, config.xAxisIndex, xValue);
                if (config.yAxisIndex !== undefined) this.MoveAxis(gpadIndex, config.yAxisIndex, yValue);
            });
        }
    }

    #addDragControlListener(config: JoystickConfig, callback: (touched: boolean, xValue: number, yValue: number) => void) {
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
            this.pointerDownCount--;
            if (this.pointerDownCount <= 0) {
                this.pointerDownCount = 0;
                document.body.style.touchAction = "auto";
            }
            if (activePointerId == upEvent.pointerId) {
                document.removeEventListener("pointermove", pointerMoveHandler, false);
                document.removeEventListener("pointerup", pointerUpHandler, false);
                activePointerId = -1;

                callback(false, 0, 0);
            }
        }

        // add the initial event listener
        (config.tapTarget as HTMLElement).addEventListener("pointerdown", (downEvent: PointerEvent) => {
            // if (downEvent.target === config.tapTarget) {
            document.body.style.touchAction = "none";
            this.pointerDownCount++;
            touchDetails.startX = downEvent.clientX;
            touchDetails.startY = downEvent.clientY;
            activePointerId = downEvent.pointerId;
            console.log("pointerdown", touchDetails, activePointerId, downEvent.target);
            callback(true, 0, 0);
            document.addEventListener("pointermove", pointerMoveHandler, false);
            document.addEventListener("pointerup", pointerUpHandler, false);
        });
    }

    #cloneGamepad(original: EGamepad | Gamepad | null): EGamepad | null {
        // inspired by @maulingmonkey's gamepad library
        if (!original) return original;
        const axesCount = original.axes ? original.axes.length : 0;
        const buttonsCount = original.buttons ? original.buttons.length : 0;

        // clone the gamepad object
        const clone: EGamepad = Object.create(Gamepad.prototype)
        for (let key in original) {
            if (key === "axes") {
                const axes = new Array(axesCount);
                for (let i = 0; i < axesCount; i++) {
                    axes[i] = Number(original.axes[i]);
                }
                Object.defineProperty(clone, "axes", { value: axes, enumerable: true });
            } else if (key === "buttons") {
                const buttons = new Array(buttonsCount);
                for (let i = 0; i < buttonsCount; i++) {
                    var _a = original.buttons[i], pressed = _a.pressed, value = _a.value, touched = _a.touched;
                    touched = touched || false;
                    buttons[i] = { pressed: pressed, value: value, touched: touched };
                }
                Object.defineProperty(clone, "buttons", { value: buttons, enumerable: true });
            } else if (Object.prototype.hasOwnProperty.call(original, key)) {
                Object.defineProperty(clone, key, { get: () => (original as any)[key] });
            }
        }

        // add extra emulation metadata properties
        if (!clone.emulation) clone.emulation = gamepadEmulationState.real;
        if (!clone.overlayMode) clone.overlayMode = false;
        return clone;
    }

    // getEmulatedGamepadTrueIndex(eGpadIndex: number): number {
    //     const eGpad = this.#emulatedGamepads[eGpadIndex];
    //     if (!eGpad) return -1;
    //     if (eGpad.overlayMode) return eGpad.index;
    //     // else {
    //     //     return Math.max()...this.#emulatedGamepads.map((gpad) => gpad.index)) + 1;
    //     // }
    //     return -1;
    // }

    #nextEmptyEGpadIndex(excludeRealGamepads: boolean): number {
        if (excludeRealGamepads) {
            const emptyEmulatedSpot = this.#emulatedGamepads.indexOf(null, this.realGamepadCount);
            if (emptyEmulatedSpot >= 0) return emptyEmulatedSpot;
            else return Math.max(this.#emulatedGamepads.length, this.realGamepadCount);
        } else {
            const emptyEmulatedSpot = this.#emulatedGamepads.indexOf(null, 0);
            if (emptyEmulatedSpot >= 0) return emptyEmulatedSpot;
            else return this.#emulatedGamepads.length;
        }
    }

    #nextEmptyRealGpadIndex(): number {
        let mappedGpadIndex = this.#realGamepadMap.length; // default to the next empty spot in the list of real gamepads
        for (let i = this.#realGamepadMap.length; i < this.#emulatedGamepads.length; i++) {
            const emulatedGpad = this.#emulatedGamepads[i];
            mappedGpadIndex = i;
            if (emulatedGpad && emulatedGpad.overlayMode) {
                break;
            }
        }
        return mappedGpadIndex;
    }

    #monkeyPatchGamepadEvents() {

        // disable the window.ongamepadconnected event listener:
        let windowOngamepadconnected = window.ongamepadconnected
        Object.defineProperty(window, "ongamepadconnected", {
            get: () => {
                return function (ev: GamepadEvent) {
                    // @ts-ignore
                    if (this == window || !windowOngamepadconnected) return; // disable browser called event
                    windowOngamepadconnected.call(window, ev);
                };
            },
            set: (fn) => {
                windowOngamepadconnected = fn;
            }
        })

        // disable the window.ongamepadconnected event listener:
        let windowOngamepaddisconnected = window.ongamepaddisconnected
        Object.defineProperty(window, "ongamepaddisconnected", {
            get: () => {
                return function (ev: GamepadEvent) {
                    // @ts-ignore
                    if (this == window || !windowOngamepaddisconnected) return;// disable browser called event
                    windowOngamepaddisconnected.call(window, ev);
                };
            },
            set: (fn) => {
                windowOngamepaddisconnected = fn;
            }
        })

        // fix the gamepadconnected event listener:
        window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
            const gpad = e.gamepad as EGamepad;
            if (gpad && gpad.emulation === undefined) {
                e.stopImmediatePropagation() // prevent future event listeners from firing

                // fix the gamepad object to be an EGamepad with the correct (mapped) index index
                const eGpad = this.#cloneGamepad(e.gamepad);
                const newIndex = this.#realGamepadMap[eGpad!.index] = this.#nextEmptyRealGpadIndex();
                eGpad!.index = newIndex;
                eGpad!.emulation = gamepadEmulationState.real;
                eGpad!.overlayMode = false;
                this.realGamepadCount++;

                // send out the corrected event on the window object
                const event = new Event('gamepadconnected') as EGamepadEvent;
                event.gamepad = eGpad!;
                window.dispatchEvent(event);

                // call the window.ongamepadconnected event listener callback function (since it was disabled)
                if (windowOngamepadconnected) windowOngamepadconnected.call(window, event)
            }
        })

        // fix the gamepaddisconnected event listener:
        window.addEventListener("gamepaddisconnected", (e: GamepadEvent) => {
            const gpad = e.gamepad as EGamepad;
            if (gpad && gpad.emulation === undefined) {
                e.stopImmediatePropagation() // prevent future event listeners from firing

                // fix the gamepad object to be an EGamepad with the correct (mapped) index
                const eGpad = this.#cloneGamepad(e.gamepad);
                eGpad!.index = this.#realGamepadMap[eGpad!.index] || eGpad!.index;
                eGpad!.emulation = gamepadEmulationState.real;
                eGpad!.overlayMode = false;
                this.realGamepadCount--;

                // send out the corrected event on the window object
                const event = new Event('gamepaddisconnected') as EGamepadEvent;
                event.gamepad = eGpad!;
                window.dispatchEvent(event);

                // call the window.ongamepaddisconnected event listener callback function (since it was disabled)
                if (windowOngamepaddisconnected) windowOngamepaddisconnected.call(window, event)
            }
        })



    }



    /* overwrite the browser gamepad api getGamepads() to return the emulated gamepad data for gamepad indexes corresponding to emulated gamepads
     * if a real gamepad is found with the same index value as an emulated gamepad, the  the navigator.getGamepads() list will either shift the emulated gamepad's index up to make room for the real gamepad when (emulatedGamepad.overlayMode = false),
     * or it will return the emulated gamepad "overlayed" on the real one where buttons pressed or axies moved on both the real gamepad and the emulated one will show up on that gamepad. */
    #monkeyPatchGetGamepads() {
        let getNativeGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;
        if (getNativeGamepads) this.getNativeGamepads = getNativeGamepads;
        let self = this;
        navigator.getGamepads = function () {
            let nativeGamepadsObjArray = getNativeGamepads != undefined ? self.getNativeGamepads.apply(navigator) : [];
            let nativeGpads = nativeGamepadsObjArray.map((gpad) => {
                let clone = self.#cloneGamepad(gpad);
                return clone;
            });
            let emulatedGpads = self.#emulatedGamepads;
            for (let i = 0; i < emulatedGpads.length; i++) {
                let n_gpad = nativeGpads[i];
                let e_gpad = emulatedGpads[i];
                if (e_gpad && n_gpad) {
                    // if both an emulated gamepad and a real one is available for this index, combine their inputs
                    // add a property on the gamepad to indicate that it is both emulated and real
                    n_gpad.emulation = gamepadEmulationState.mixed;

                    // merge button presses:
                    let btnCount = Math.max(n_gpad.buttons.length, e_gpad.buttons.length);
                    for (let btnIdx = 0; btnIdx < btnCount; btnIdx++) {
                        const e_btn = e_gpad.buttons[btnIdx] || { touched: false, pressed: false, value: 0 };
                        const n_btn = n_gpad.buttons[btnIdx] || { touched: false, pressed: false, value: 0 };
                        (nativeGpads[i] as EGamepad).buttons[btnIdx] = {
                            touched: e_btn.touched || n_btn.touched || false,
                            pressed: e_btn.pressed || n_btn.pressed || false,
                            value: Math.max(e_btn.value, n_btn.value) || 0,
                        }
                    }

                    // merge axis values:
                    let axisCount = Math.max(e_gpad.axes.length, n_gpad.axes.length);
                    for (let axisIndex = 0; axisIndex < axisCount; axisIndex++) {
                        const e_axis = e_gpad.axes[axisIndex] || 0;
                        const n_axis = n_gpad.axes[axisIndex] || 0;
                        (nativeGpads[i] as EGamepad).axes[axisIndex] = Math.abs(e_axis || 0) > Math.abs(n_axis || 0) ? (e_axis || 0) : (n_axis || 0);
                    }
                } else
                    if (e_gpad) {
                        // if only the emulated gamepad is available, use it
                        // add a property on the gamepad to indicate that it is emulated
                        e_gpad.emulation = gamepadEmulationState.emulated;
                        e_gpad.timestamp = Math.floor(Date.now() / 1000);
                        nativeGpads[i] = self.#cloneGamepad(e_gpad); // clone the emulated gamepad to prevent it from being modified by the caller
                    }
            }
            return nativeGpads;
        }
    }

    cleanup() {
        this.#emulatedGamepads = [];
        navigator.getGamepads = this.getNativeGamepads;
        navigator.gpadEmulatorActive = false;
    }
};

import { type EGamepad } from "./GamepadEmulator.js";

declare global {
    interface Window {
        mozRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
        webkitRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
        msRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    }
    interface Navigator {
        mozGetGamepads?: () => Gamepad[];
        webkitGetGamepads?: () => Gamepad[];
        msGetGamepads?: () => Gamepad[];
        gamepadInputEmulation?: string;
        getNativeGamepads?: () => (Gamepad | null)[] | undefined;
    }
}

export interface wrapperConfig {
    /** The (rough) delay between each update of the gamepad state in ms.
     * A value of 0 means the gamepad state will be updated every frame */
    updateDelay?: number,
    /** A range in which axis values closer to zero than this are simply treated as zero
     * Used to prevent noise from analog sticks from registering as changes when they are not being used */
    axisDeadZone?: number;
    /** An array of {@link wrapperButtonConfig} that tell the wrapper how to respond to button changes. Array index corresponds the the index of the button the a native browser gamepad.buttons array as returned from eg: `navigator.getGamepads()[0].buttons` */
    buttonConfigs?: wrapperButtonConfig[];
}

export interface wrapperButtonConfig {
    /** If true, the gamepad wrapper will keep firing button change events, while the button is held down */
    fireWhileHolding: boolean;
}

export interface buttonChangeDetails {
    /** This button was touched this gamepad update */
    touchDown?: boolean;
    /** This button was no longer touched this gamepad update */
    touchUp?: boolean;
    /** This button was pressed this gamepad update */
    pressed?: boolean;
    /** This button was released this gamepad update */
    released?: boolean;
    /** This button was pressed last update and is still pressed
     * (only present if {@link wrapperButtonConfig.fireWhileHolding} was set to true on this button when the {@link GamepadApiWrapper} was initilized)*/
    heldDown?: boolean;
    /** The value of the button changed (e.g. for variable pressure buttons like shoulder triggers) */
    valueChanged?: boolean;
}


export type ButtonChangeCallback = (gpadIndex: number, gpad: EGamepad | Gamepad, changesMask: readonly (buttonChangeDetails | false)[]) => void;

export type AxisChangeCallback = (gpadIndex: number, gpad: EGamepad | Gamepad, changesMask: readonly boolean[]) => void;

export type GamepadEventCallback = (e: GamepadEvent) => void;

/** Wrapper for the Gamepad API that smooths out browser inconsistancies.
 *  Exposes changes to gamepads, buttons and axes as events. */
export class GamepadApiWrapper {
    protected updateDelay: number;
    protected axisDeadZone: number;
    protected buttonConfigs: wrapperButtonConfig[];
    protected currentStateOfGamepads: (Gamepad | EGamepad | undefined)[];
    protected gamepadConnectListeners: GamepadEventCallback[];
    protected gamepadDisconnectListeners: GamepadEventCallback[];
    protected gamepadButtonChangeListeners: ButtonChangeCallback[];
    protected gamepadAxisChangeListeners: AxisChangeCallback[];
    protected _requestAnimationFrame: (callback: FrameRequestCallback) => number;
    protected _getGamepads: () => (Gamepad | null)[];

    /** Create a new GamepadApiWrapper
     * @param config The configuration options for this wrapper @see {@link wrapperConfig} */
    constructor(config: wrapperConfig) {
        this.updateDelay = config.updateDelay || 0;
        this.axisDeadZone = config.axisDeadZone || 0;
        this.buttonConfigs = config.buttonConfigs || [];
        this.currentStateOfGamepads = [];
        this.gamepadConnectListeners = [];
        this.gamepadDisconnectListeners = [];
        this.gamepadButtonChangeListeners = [];
        this.gamepadAxisChangeListeners = [];

        navigator.gamepadInputEmulation = "gamepad"; // Old Microsoft edge fix
        this._requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        this._getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;

        if (this.gamepadApiSupported() || navigator.getNativeGamepads !== undefined) {
            this.tickLoop();
        }
    }

    /** Changes the button configs used by the wrapper (takes effect after the next gamepad update) */
    setButtonsConfig(buttonConfigs: wrapperButtonConfig[]) {
        this.buttonConfigs = buttonConfigs;
    }

    /** Changes the update delay between browser gamepad api checks (takes effect after the next gamepad update)
     * @param delay The new delay between gamepad updates in ms */
    setUpdateDelay(delay: number) {
        this.updateDelay = delay;
    }

    /** Add an event listener for when a gamepad (either real or emulated) is connected
     * @param Callback The calback function to call when a gamepad is connected */
    onGamepadConnect(Callback: GamepadEventCallback) {
        this.gamepadConnectListeners.push(Callback);
        window.addEventListener("gamepadconnected", Callback, true);
        return Callback;
    }

    /** remove an existing event listener for when a gamepad (either real or emulated) is connected
     * @param Callback The calback function to remove (must be the same function passed to onGamepadConnect()) */
    offGamepadConnect(Callback: GamepadEventCallback) {
        this.gamepadConnectListeners = this.gamepadConnectListeners.filter((l) => l !== Callback);
        window.removeEventListener("gamepadconnected", Callback, true);
    }

    /** add an event listener for when a gamepad (either real or emulated) is disconnected
     * @param Callback The calback function to call when a gamepad is disconnected */
    onGamepadDisconnect(Callback: GamepadEventCallback) {
        this.gamepadDisconnectListeners.push(Callback);
        window.addEventListener("gamepaddisconnected", Callback, true);
        return Callback;
    }

    /** remove an existing event listener for when a gamepad (either real or emulated) is disconnected
     * @param Callback The calback function to remove (must be the same function passed to onGamepadDisconnect()) */
    offGamepadDisconnect(Callback: GamepadEventCallback) {
        this.gamepadDisconnectListeners = this.gamepadDisconnectListeners.filter((l) => l !== Callback);
        window.removeEventListener("gamepaddisconnected", Callback, true);
    }

    /** add an event listener for each time a gamepad axis changes.
     * The callback function will be called with the gamepad index, the gamepad object, and a boolean array of the changed axes,
     * The callback is called separately for each gamepad where axes have changed.
     * @param Callback The calback function to call when a gamepad axis state changes */
    onGamepadAxisChange(Callback: AxisChangeCallback) {
        this.gamepadAxisChangeListeners.push(Callback);
        return Callback;
    }

    /** offGamepadAxisChange: remove an existing event listener for when a gamepad axis changes
     * @param Callback The calback function to remove (must be the same function passed to onGamepadAxisChange()) */
    offGamepadAxisChange(Callback: AxisChangeCallback) {
        this.gamepadAxisChangeListeners = this.gamepadAxisChangeListeners.filter((l) => l !== Callback);
    }

    /**onGamepadButtonChange add an event listener for each time a gamepad button changes.
     * The callback function will be called with the gamepad index, the gamepad object, and a array of the changed buttons containing details about how the button transitioned
     * or false if the button state didn't change this frame. Callback is called separately for each gamepad where buttons have changed.
     * @param Callback The calback function to call when a gamepad button state changes */
    onGamepadButtonChange(Callback: ButtonChangeCallback) {
        this.gamepadButtonChangeListeners.push(Callback);
        return Callback;
    }

    /** offGamepadButtonChange: remove an existing event listener for when a gamepad button changes
     * @param Callback The calback function to remove (must be the same function passed to onGamepadButtonChange()) */
    offGamepadButtonChange(Callback: ButtonChangeCallback) {
        this.gamepadButtonChangeListeners = this.gamepadButtonChangeListeners.filter((l) => l !== Callback);
    }

    /** gamepadApiSupported: returns true if the native gamepad api is supported by the browser context */
    gamepadApiSupported() {
        const getGamepads = navigator.getNativeGamepads || navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;
        if (getGamepads != null && (typeof getGamepads) === (typeof function () { })) {
            try {
                // Firefox still exposes the gamepad api when in insecure contexts, but always returns nothing or an empty array, so it's not actually supported.
                // Additionally, strict browser permissions may cause getGamepads() to throw the SecurityError DOMException.
                const gpads = getGamepads.apply(navigator);
                return gpads != null && (gpads[0] !== undefined || gpads.length !== 0 || window.isSecureContext);
            } catch (e) {
                return false;
            }
        } else return false;
    }

    /** returns the value of navigator.getGamepads() in a cross-browser compatible way
     * @returns An array of gamepad objects (including any emulated gamepads if the GamepadEmulator was set up), or an empty array if the gamepad api is not supported or gampad permissions haven't been granted. */
    getGamepads(): (null | Gamepad | EGamepad)[] {
        const gg: (() => (null | EGamepad | Gamepad)[] | null) = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;
        return !!gg && (typeof gg) === (typeof function () { }) ? (gg.apply(navigator) || []) : [];
    }

    /** Returns the result of navigator.getGamepads() from the last update
     * @param forceUpdate If true, navigator.getGamepads() will be called inmediately before returning, if gamepad changes happened since the last update, this will cause those change events to fire.
     * @returns An array of gamepad objects, or an empty array if the gamepad api is not supported */
    getCurrentGamepadStates(forceUpdate: boolean = false) {
        if (forceUpdate) this.checkForGamepadChanges();
        return this.currentStateOfGamepads;
    }

    /** (destructor) - Cleans up any event listeners and stops the gamepad check loop. Do not re-use class instance after calling cleanup(). */
    cleanup() {
        this.updateDelay = -1;
        this.gamepadConnectListeners.forEach(callback => window.removeEventListener("gamepadconnected", callback, true));
        this.gamepadDisconnectListeners.forEach(callback => window.removeEventListener("gamepaddisconnected", callback, true));
        this.gamepadConnectListeners = [];
        this.gamepadDisconnectListeners = [];
        this.gamepadButtonChangeListeners = [];
        this.gamepadAxisChangeListeners = [];
    }

    protected tickLoop() {
        if (this.updateDelay < 0) return; // exit if negative delay is set (used to signal cleanup)
        this.checkForGamepadChanges();
        if (this.updateDelay == 0) {
            requestAnimationFrame(this.tickLoop.bind(this));
        } else {
            setTimeout(() => {
                requestAnimationFrame(this.tickLoop.bind(this));
            }, this.updateDelay)
        }
    }

    protected checkForGamepadChanges() {
        let gamepads = this.getGamepads();
        for (var gi = 0; gi < gamepads.length; gi++) {
            let gamepad = gamepads[gi];
            if (!gamepad) continue;
            // if (!this.currentStateOfGamepads[gi]) this.currentStateOfGamepads[gi] = gamepad;

            this.checkForAxisChanges(gi, gamepad);
            this.checkForButtonChanges(gi, gamepad);

            // clear the state for a fresh run
            this.currentStateOfGamepads[gi] = gamepad;
        }
    }

    protected checkForAxisChanges(gamepadIndex: number, gpad: EGamepad | Gamepad) {
        let axisState = gpad.axes;
        if (axisState.length == 0) return;

        const lastGamepadState = this.currentStateOfGamepads[gamepadIndex];
        let lastAxisState = lastGamepadState?.axes || [];
        let axesChangeMask: boolean[] = [];

        let i, somethingChanged = false;
        for (i = 0; i < axisState.length; i++) {
            let axisValue = axisState[i] || 0;
            let lastAxisValue = lastAxisState[i] || 0;
            if (axisValue != lastAxisValue) {
                let inDeadZone = Math.abs(axisValue) < this.axisDeadZone && Math.abs(lastAxisValue) < this.axisDeadZone;
                if (inDeadZone) continue;
                axesChangeMask[i] = true;
                somethingChanged = true;
            } else {
                axesChangeMask[i] = false;
            }
        }

        // send out event if one or more axes changed
        if (somethingChanged) {
            this.gamepadAxisChangeListeners.forEach(callback => callback(gamepadIndex, gpad, axesChangeMask));
        }
    }

    protected checkForButtonChanges(gpadIndex: number, gpad: EGamepad | Gamepad) {
        let btnState: readonly GamepadButton[] = gpad.buttons;
        if (btnState.length == 0) return;

        const lastGamepadState = this.currentStateOfGamepads[gpadIndex];
        const lastBtnsState: readonly GamepadButton[] = lastGamepadState?.buttons || btnState;
        const buttonChanges: (buttonChangeDetails | false)[] = new Array(btnState.length).fill(false);

        let atLeastOneButtonChanged = false;
        for (let bi = 0; bi < btnState.length; bi++) {

            let somethingChanged = false;
            const button: GamepadButton = btnState[bi] || { pressed: false, value: 0, touched: false };
            const lastButtonState: GamepadButton = lastBtnsState[bi] || { pressed: false, value: 0, touched: false };
            const buttonConfig: wrapperButtonConfig = this.buttonConfigs[bi] || {} as wrapperButtonConfig;
            const btnChangeMask: buttonChangeDetails = {};

            if (button.touched && !lastButtonState.touched) {
                btnChangeMask.touchDown = true;
                somethingChanged = true;
            } else if (!button.touched && lastButtonState.touched) {
                btnChangeMask.touchUp = true;
                somethingChanged = true;
            }

            if (button.pressed && !lastButtonState.pressed) {
                btnChangeMask.pressed = true
                somethingChanged = true;
            } else if (!button.pressed && lastButtonState.pressed) {
                btnChangeMask.released = true
                somethingChanged = true;
            }

            if (buttonConfig.fireWhileHolding && button.pressed && lastButtonState.pressed) {
                btnChangeMask.heldDown = true;
                somethingChanged = true;
            }

            if (button.value != lastButtonState.value) {
                btnChangeMask.valueChanged = true;
                somethingChanged = true;
            }

            if (somethingChanged) {
                atLeastOneButtonChanged = true;
                buttonChanges[bi] = btnChangeMask
            } else {
                buttonChanges[bi] = false;
            }
        }

        // send out event if one or more buttons changed
        if (atLeastOneButtonChanged) {
            this.gamepadButtonChangeListeners.forEach(callback => callback(gpadIndex, gpad, buttonChanges));
        }
    }

}

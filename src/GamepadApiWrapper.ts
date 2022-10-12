import { EGamepad } from "./GamepadEmulator.js";

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
        gpadEmulatorActive?: boolean;
    }
}

export interface wrapperConfig {
    /** The (rough) delay between each update of the gamepad state in ms.
     * A value of 0 means the gamepad state will be updated every frame */
    updateDelay?: number,
    /** A range in which axis values closer to zero than this are simply treated as zero
     * Used to prevent noise from analog sticks from registering as changes when they are not being used */
    axisDeadZone?: number;
    /** An array of {@link wrapperButtonConfig} that tell the wrapper how to respond to button changes. Should be in the same order as buttons are listed in a native browser {@link Gamepad.buttons} list. */
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
    /** The value of the button changed (eg for variable pressure buttons like shoulder triggers) */
    valueChanged?: boolean;
}


export type ButtonChangeCallback = (gpadIndex: number, gpad: EGamepad | Gamepad, changesMask: (buttonChangeDetails | false)[]) => void;

export type AxisChangeCallback = (gpadIndex: number, gpad: EGamepad | Gamepad, changesMask: boolean[]) => void;

export type GamepadEventCallback = (e: GamepadEvent) => void;

/** Wrapper for the Gamepad API that smooths out browser inconsistancies.
 *  Exposes changes to gamepads, buttons and axes as events. */
export class GamepadApiWrapper {
    protected updateDelay: number;
    protected axisDeadZone: number;
    protected buttonConfigs: wrapperButtonConfig[];
    protected currentStateOfGamepads: Gamepad[];
    protected gamepadConnectListeners: GamepadEventCallback[];
    protected gamepadDisconnectListeners: GamepadEventCallback[];
    protected gamepadButtonChangeListeners: ButtonChangeCallback[];
    protected gamepadAxisChangeListeners: AxisChangeCallback[];

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
        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        navigator.getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads || navigator.msGetGamepads;

        if (this.gamepadApiSupported()) {
            this.tickLoop();
        }
    }

    /** Changes the button configs used by the wrapper (will only take effect after the next gamepad update) */
    setButtonsConfig(buttonConfigs: wrapperButtonConfig[]) {
        this.buttonConfigs = buttonConfigs;
    }

    /** add an event listener for when a gamepad (either real or emulated) is connected
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

    /** gamepadApiSupported: returns true if the gamepad api is supported by the browser context */
    gamepadApiSupported() {
        return !!navigator.getGamepads && !!navigator.getGamepads(); // firefox still exposes the gamepad api when in insecure contexts, but does not return anything, so it's not "supported".
    }

    /** Returns the result of navigator.getGamepads() from the last update
     * @param forceUpdate If true, navigator.getGamepads() will be called inmediately before returning, if gamepad changes happened since the last update, this will cause those change events to fire.
     * @returns An array of gamepad objects, or an empty array if the gamepad api is not supported */
    getCurrentGamepadStates(forceUpdate: boolean = false) {
        if (forceUpdate) this.checkForGamepadChanges();
        return this.currentStateOfGamepads;
    }

    protected tickLoop() {
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
        let gamepads = navigator.getGamepads();
        for (var gi = 0; gi < gamepads.length; gi++) {
            let gamepad = gamepads[gi];
            if (!gamepad) continue;
            if (!this.currentStateOfGamepads[gi]) this.currentStateOfGamepads[gi] = gamepad;

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
        let lastAxisState = lastGamepadState.axes || [];
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
        const lastBtnsState: readonly GamepadButton[] = lastGamepadState.buttons || btnState;
        let buttonChanges: (buttonChangeDetails | false)[] = [];

        let bi, atLeastOneButtonChanged = false;
        for (bi = 0; bi < btnState.length; bi++) {

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

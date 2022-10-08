export class GamepadApiWrapper {
    updateDelay;
    axisDeadZone;
    buttonConfigs;
    lastStateOfGamepads;
    changeMaskOfGamepads;
    gamepadConnectListeners;
    gamepadDisconnectListeners;
    gamepadButtonChangeListeners;
    gamepadAxisChangeListeners;
    /** Create a new GamepadApiWrapper
     * @param buttonConfig The configuration of the gamepad buttons
     * @param updateDelay The delay between each update of the gamepad state in ms, if zero, the gamepad state will be updated on every animation frame */
    constructor(config) {
        this.updateDelay = config.updateDelay || 0;
        this.axisDeadZone = config.axisDeadZone || 0;
        this.buttonConfigs = config.buttonConfigs || [];
        this.lastStateOfGamepads = [];
        this.changeMaskOfGamepads = [];
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
    /** changes the button configs (will only take effect after the next gamepad update) */
    set buttonsConfig(buttonConfigs) {
        this.buttonConfigs = buttonConfigs;
    }
    /** add an event listener for when a gamepad (either real or emulated) is connected
     * @param Listener The calback function to call when a gamepad is connected */
    onGamepadConnect(Listener) {
        this.gamepadConnectListeners.push(Listener);
        window.addEventListener("gamepadconnected", Listener, true);
    }
    /** remove an existing event listener for when a gamepad (either real or emulated) is connected
     * @param Listener The calback function to remove (must be the same function passed to onGamepadConnect()) */
    offGamepadConnect(Listener) {
        this.gamepadConnectListeners = this.gamepadConnectListeners.filter((l) => l !== Listener);
        window.removeEventListener("gamepadconnected", Listener, true);
    }
    /** add an event listener for when a gamepad (either real or emulated) is disconnected
     * @param Listener The calback function to call when a gamepad is disconnected */
    onGamepadDisconnect(Listener) {
        this.gamepadDisconnectListeners.push(Listener);
        window.addEventListener("gamepaddisconnected", Listener, true);
    }
    /** remove an existing event listener for when a gamepad (either real or emulated) is disconnected
     * @param Listener The calback function to remove (must be the same function passed to onGamepadDisconnect()) */
    offGamepadDisconnect(Listener) {
        this.gamepadDisconnectListeners = this.gamepadDisconnectListeners.filter((l) => l !== Listener);
        window.removeEventListener("gamepaddisconnected", Listener, true);
    }
    /** add an event listener for each time a gamepad axis changes.
     * The callback function will be called with the gamepad index, the gamepad object, and a boolean array of the changed axes,
     * The callback is called separately for each gamepad where axes have changed.
     * @param Listener The calback function to call when a gamepad axis state changes */
    onGamepadAxisChange(Listener) {
        this.gamepadAxisChangeListeners.push(Listener);
        return Listener;
    }
    /** offGamepadAxisChange: remove an existing event listener for when a gamepad axis changes
     * @param Listener The calback function to remove (must be the same function passed to onGamepadAxisChange()) */
    offGamepadAxisChange(Listener) {
        this.gamepadAxisChangeListeners = this.gamepadAxisChangeListeners.filter((l) => l !== Listener);
    }
    /**onGamepadButtonChange add an event listener for each time a gamepad button changes.
     * The callback function will be called with the gamepad index, the gamepad object, and a array of the changed buttons containing details about how the button transitioned
     * or false if the button state didn't change this frame. Callback is called separately for each gamepad where buttons have changed.
     * @param Listener The calback function to call when a gamepad button state changes */
    onGamepadButtonChange(Listener) {
        this.gamepadButtonChangeListeners.push(Listener);
        return Listener;
    }
    /** offGamepadButtonChange: remove an existing event listener for when a gamepad button changes
     * @param Listener The calback function to remove (must be the same function passed to onGamepadButtonChange()) */
    offGamepadButtonChange(Listener) {
        this.gamepadButtonChangeListeners = this.gamepadButtonChangeListeners.filter((l) => l !== Listener);
    }
    /** gamepadApiSupported: returns true if the gamepad api is supported by the browser context */
    gamepadApiSupported() {
        return !!navigator.getGamepads && !!navigator.getGamepads(); // firefox still exposes the gamepad api when in insecure contexts, but does not return anything, so it's not "supported".
    }
    tickLoop() {
        this.checkForGamepadChanges();
        if (this.updateDelay == 0) {
            requestAnimationFrame(this.tickLoop.bind(this));
        }
        else {
            setTimeout(() => {
                requestAnimationFrame(this.tickLoop.bind(this));
            }, this.updateDelay);
        }
    }
    checkForGamepadChanges() {
        let gamepads = navigator.getGamepads();
        for (var gi = 0; gi < gamepads.length; gi++) {
            let gamepad = gamepads[gi];
            if (!gamepad)
                continue;
            if (!this.lastStateOfGamepads[gi])
                this.lastStateOfGamepads[gi] = gamepad;
            this.checkForAxisChanges(gi, gamepad);
            this.checkForButtonChanges(gi, gamepad);
            // clear the state for a fresh run
            this.lastStateOfGamepads[gi] = gamepad;
        }
    }
    checkForAxisChanges(gamepadIndex, gpad) {
        let axisState = gpad.axes;
        if (axisState.length == 0)
            return;
        const lastGamepadState = this.lastStateOfGamepads[gamepadIndex];
        let lastAxisState = lastGamepadState.axes || [];
        let axesChangeMask = [];
        let i, somethingChanged = false;
        for (i = 0; i < axisState.length; i++) {
            let axisValue = axisState[i] || 0;
            let lastAxisValue = lastAxisState[i] || 0;
            let inDeadZone = Math.abs(axisValue) < this.axisDeadZone;
            if (!inDeadZone && axisValue != lastAxisValue) {
                axesChangeMask[i] = true;
                somethingChanged = true;
            }
            else {
                axesChangeMask[i] = false;
            }
        }
        // send out event if one or more axes changed
        if (somethingChanged) {
            this.gamepadAxisChangeListeners.forEach(callback => callback(gamepadIndex, gpad, axesChangeMask));
        }
    }
    checkForButtonChanges(gpadIndex, gpad) {
        let btnState = gpad.buttons;
        if (btnState.length == 0)
            return;
        const lastGamepadState = this.lastStateOfGamepads[gpadIndex];
        const lastBtnsState = lastGamepadState.buttons || btnState;
        let buttonChanges = [];
        let bi, atLeastOneButtonChanged = false;
        for (bi = 0; bi < btnState.length; bi++) {
            let somethingChanged = false;
            const button = btnState[bi] || { pressed: false, value: 0, touched: false };
            const lastButtonState = lastBtnsState[bi] || { pressed: false, value: 0, touched: false };
            const buttonConfig = this.buttonConfigs[bi] || {};
            const btnChangeMask = {};
            if (button.touched && !lastButtonState.touched) {
                btnChangeMask.touchDown = true;
                somethingChanged = true;
            }
            else if (!button.touched && lastButtonState.touched) {
                btnChangeMask.touchUp = true;
                somethingChanged = true;
            }
            if (button.pressed && !lastButtonState.pressed) {
                btnChangeMask.pressed = true;
                somethingChanged = true;
            }
            else if (!button.pressed && lastButtonState.pressed) {
                btnChangeMask.released = true;
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
                buttonChanges[bi] = btnChangeMask;
            }
            else {
                buttonChanges[bi] = false;
            }
        }
        // send out event if one or more buttons changed
        if (atLeastOneButtonChanged) {
            this.gamepadButtonChangeListeners.forEach(callback => callback(gpadIndex, gpad, buttonChanges));
        }
    }
}

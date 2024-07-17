export enum gamepadDirection {
    up = "up",
    down = "down",
    left = "left",
    right = "right",
}

export enum gamepadButtonType {
    onOff = "onOff",
    variable = "variable",
}

export enum gamepadEmulationState {
    real = "real",
    emulated = "emulated",
    overlay = "overlay",
}

/** Enum holds the index in the gamepad buttons array for standard xbox controller buttons
 * @example Get the button state for the A button of the first gamepad:
 * navigator.getGamepads()[0].buttons[xboxButtonMap.A]
 */
export enum xboxButtonMap {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,
    LShoulder = 4,
    RShoulder = 5,
    LTrigger = 6,
    RTrigger = 7,
    Back = 8,
    Start = 9,
    LStick = 10,
    RStick = 11,
    DPadUp = 12,
    DPadDown = 13,
    DPadLeft = 14,
    DPadRight = 15,
    Xbox = 16,
}

/** Enum holds the index in the gamepad buttons array for standard playstation controller buttons
 * @example // Get the button state for the Cross button of the first gamepad:
 * navigator.getGamepads()[0].buttons[playStationButtonMap.Cross]
 */
export enum playStationButtonMap {
    Cross = 0,
    Circle = 1,
    Square = 2,
    Triangle = 3,
    L1 = 4,
    R1 = 5,
    L2 = 6,
    R2 = 7,
    Share = 8,
    Options = 9,
    LStick = 10,
    RStick = 11,
    DPadUp = 12,
    DPadDown = 13,
    DPadLeft = 14,
    DPadRight = 15,
    PlayStation = 16,
}

/** Enum holds the index in the gamepad axes array for standard controller axes (two thumb sticks)
 * @example // Get the axis state for the left thumbstick horizontal axis of the first gamepad:
 * navigator.getGamepads()[0].axes[standardGpadAxesMap.LStickX]
 */
export enum standardGpadAxesMap {
    LStickX = 0,
    LStickY = 1,
    RStickX = 2,
    RStickY = 3,
}

export const standardGpadButtonMap = xboxButtonMap;
export const xboxAxesMap = standardGpadAxesMap;
export const playStationAxesMap = standardGpadAxesMap;

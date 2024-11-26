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
 * @example Get the button state for the A button of the first connected gamepad:
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
    /* Generally not available to browsers because it is used by OS vendors (eg: Xbox Game Bar, Steam HUD). */
    Xbox = 16,
}

/** Enum holds the index in the gamepad buttons array for standard playstation controller buttons
 * @example // Get the button state for the Cross/X button of the first connected gamepad:
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
    /* Generally not available to browsers because it is used by OS vendors (eg: Xbox Game Bar, Steam HUD). */
    PlayStation = 16,
}

export enum standardGpadButtonMap {
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
    /* Generally not available to browsers because it is used by OS vendors (eg: Xbox Game Bar, Steam HUD). */
    Vendor = 16,
}
export type gpadButtonMapType = xboxButtonMap | playStationButtonMap | standardGpadButtonMap;

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
export const xboxAxesMap = standardGpadAxesMap; // Xbox controller axes are the same as standard controller axes
export const playStationAxesMap = standardGpadAxesMap; // PlayStation controller axes are the same as standard controller axes
export type gpadAxesMapType = typeof xboxAxesMap | typeof playStationAxesMap | standardGpadAxesMap;

/**
 * Enum holds the class names used to style & refer to various parts of the example gamepad SVGs
 * To refer to SVG elements for specific buttons in the example gamepad SVGs, use a child query selector:
 * ```js
 *  let xButtonHighlight = gpadRootSVGElement.querySelector(PRESET_SVG_GPAD_BTN_IDS[xboxButtonMap.X] + " ." + PRESET_SVG_GPAD_CLASS.ButtonHighlight);
 * ```
 * @see PRESET_SVG_GPAD_BTN_IDS
 * NOTE: Specific button tap-targets must be queried separately using {@link PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS}
 */
export enum PRESET_SVG_GPAD_CLASS {
    TapTarget = "gpad-tap-target",
    ButtonIcon = "gpad-btn-icon",
    ButtonShadow = "gpad-shadow",
    ButtonHighlight = "gpad-highlight",
    ButtonBackground = "gpad-btn-bg",
    DirectionHighlight = "gpad-direction-highlight",
    Thumbstick = "gpad-thumbstick",
    GpadBaseShape = "gpad-base",
    StickBaseShape = "gpad-stick-base",
}

/**
 * Holds the SVG element ids of button display elements in the example gamepad SVGs
 *  in the same order as the standard button map & browser gpad api
 */
export const PRESET_SVG_GPAD_BTN_IDS = [
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
    "dpad_up",
    "dpad_down",
    "dpad_left",
    "dpad_right",
];

/**
 * Holds the SVG element ids of button tap/touch targets in the example gamepad SVGs
 *  in the same order as the standard button map & browser gpad api
 */
export const PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS = PRESET_SVG_GPAD_BTN_IDS.map((id) => id + "_tap_target");

/**
 * Holds a mapping from the SVG element ids of button tap/touch targets in the example gamepad SVGs
 * specifically for the dpad buttons, including diagonals which are non-standard buttons,
 * that can be settup to trigger both the up & left, up & right, down & right etc... buttons
 * simultaneously when tapped. The value is an array of the indexes of the buttons that should be triggered.
 */
export const PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES = {
    //     "dpad_up_tap_target": [standardGpadButtonMap.DPadUp],
    //     "dpad_down_tap_target": [standardGpadButtonMap.DPadDown],
    //     "dpad_left_tap_target": [standardGpadButtonMap.DPadLeft],
    //     "dpad_right_tap_target": [standardGpadButtonMap.DPadRight],
    "dpad_up_left_tap_target": [standardGpadButtonMap.DPadUp, standardGpadButtonMap.DPadLeft],
    "dpad_up_right_tap_target": [standardGpadButtonMap.DPadUp, standardGpadButtonMap.DPadRight],
    "dpad_down_left_tap_target": [standardGpadButtonMap.DPadDown, standardGpadButtonMap.DPadLeft],
    "dpad_down_right_tap_target": [standardGpadButtonMap.DPadDown, standardGpadButtonMap.DPadRight],
};

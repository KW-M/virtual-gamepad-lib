export {
    setupPresetInteractiveGamepad,
    type interactiveGamepadPresetConfig
} from "./helpers.js"

export {
    GamepadApiWrapper,
    type AxisChangeCallback,
    type ButtonChangeCallback,
    type buttonChangeDetails,
    type wrapperConfig,
    type wrapperButtonConfig,
    type GamepadEventCallback
} from "./GamepadApiWrapper.js";

export {
    GamepadDisplay,
    type GamepadDisplayJoystick,
    type GamepadDisplayOnOffButton,
    type GamepadDisplayVariableButton,
    type GamepadDisplayButton,
    type ButtonDisplayFunction,
    type JoystickDisplayFunction,
    type DisplayGamepadConfig,
} from "./GamepadDisplay.js";

export {
    GamepadEmulator,
    DEFAULT_GPAD_BUTTON_COUNT,
    DEFAULT_GPAD_AXIS_COUNT,
    type ButtonTouchConfig,
    type OnOffButtonTouchConfig,
    type VariableButtonTouchConfig,
    type JoystickTouchConfig,
    type EGamepad,
    type EGamepadEvent,
    type JoystickConfig,
    // DEPRECATED EXPORTS
    type ButtonConfig,
    type OnOffButtonConfig,
    type VariableButtonConfig,
} from "./GamepadEmulator.js";

export {
    CenterTransformOrigin,
    CenterTransformOriginDebug,
    NormalizeClampVector
} from "./utilities.js";

export {
    gamepadButtonType,
    gamepadDirection,
    gamepadEmulationState,
    standardGpadAxesMap,
    xboxAxesMap,
    playStationAxesMap,
    standardGpadButtonMap,
    playStationButtonMap,
    xboxButtonMap,
    PRESET_SVG_GPAD_BTN_IDS,
    PRESET_SVG_GPAD_BTN_TAP_TARGET_IDS,
    PRESET_SVG_GPAD_CLASS,
    PRESET_SVG_GPAD_DPAD_DIAGONAL_TAP_TARGET_IDS_TO_BTN_INDEXES,
    type gpadAxesMapType,
    type gpadButtonMapType
} from "./enums.js";

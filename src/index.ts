import { gamepadButtonType, gamepadDirection, gamepadEmulationState, playStationAxesMap, standardGpadAxesMap, standardGpadButtonMap, xboxAxesMap, playStationButtonMap, xboxButtonMap } from "./enums.js";
import { GamepadEmulator, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT } from "./GamepadEmulator.js";
import { GamepadApiWrapper } from "./GamepadApiWrapper.js";
import { GamepadDisplay } from "./GamepadDisplay.js";
import { CenterTransformOrigin, CenterTransformOriginDebug, NormalizeClampVector } from "./utilities.js";

// import types
import type { GamepadDisplayJoystick, GamepadDisplayVariableButton, GamepadDisplayButton, ButtonDisplayFunction, JoystickDisplayFunction, DisplayGamepadConfig } from "./GamepadDisplay.js";
import type { ButtonConfig, VariableButtonConfig, JoystickConfig, EGamepad, EGamepadEvent } from "./GamepadEmulator.js";
import type { AxisChangeCallback, ButtonChangeCallback, buttonChangeDetails, wrapperConfig, wrapperButtonConfig, GamepadEventCallback } from "./GamepadApiWrapper.js";

// export everything
export { GamepadApiWrapper, GamepadDisplay, GamepadEmulator, gamepadButtonType, gamepadDirection, gamepadEmulationState, CenterTransformOrigin, CenterTransformOriginDebug, NormalizeClampVector, DEFAULT_GPAD_BUTTON_COUNT, DEFAULT_GPAD_AXIS_COUNT, playStationAxesMap, standardGpadAxesMap, standardGpadButtonMap, xboxAxesMap, playStationButtonMap, xboxButtonMap };
export type { GamepadDisplayJoystick, GamepadDisplayVariableButton, GamepadDisplayButton, ButtonDisplayFunction, JoystickDisplayFunction, ButtonConfig, VariableButtonConfig, JoystickConfig, EGamepad, EGamepadEvent, GamepadEventCallback, AxisChangeCallback, ButtonChangeCallback, buttonChangeDetails, wrapperConfig, wrapperButtonConfig, DisplayGamepadConfig }

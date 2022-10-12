import { GamepadApiWrapper, wrapperButtonConfig } from "../src/GamepadApiWrapper";
import { GamepadEmulator } from "../src/GamepadEmulator";
import { test, expect } from "vitest";


// @ts-ignore
interface privateGamepadApiWrapper extends GamepadApiWrapper {
    updateDelay: number;
    buttonConfigs: wrapperButtonConfig[];
}

test("GamepadApiWrapper", () => {
    const buttonConfigs = [
        {
            fireWhileHolding: false,
            ExtraDataStuff: "ExtraDataStuff"
        },
        {
            fireWhileHolding: true,
            ExtraDataStuff: 3
        }
    ];


    const gpadEmulator = new GamepadEmulator(0.1);
    // @ts-ignore
    const gpadApi = new GamepadApiWrapper({
        buttonConfigs: buttonConfigs,
        updateDelay: 0,
    }) as privateGamepadApiWrapper;
    expect(gpadApi).toBeInstanceOf(GamepadApiWrapper);
    gpadApi.setButtonsConfig(buttonConfigs);
    expect(gpadApi.buttonConfigs).toEqual(buttonConfigs);
    expect(gpadApi.updateDelay).toEqual(0);
    expect(gpadApi.gamepadApiSupported()).not.toBeFalsy();
})

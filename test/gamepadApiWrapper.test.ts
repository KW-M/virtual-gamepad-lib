import { GamepadApiWrapper } from "../src/GamepadApiWrapper";
import { GamepadEmulator } from "../src/GamepadEmulator";
import { test, expect } from "vitest";

test("gamepadApiWrapper", () => {
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
    const gpadApi = new GamepadApiWrapper({
        buttonConfigs: buttonConfigs,
        updateDelay: 0,
    });
    expect(gpadApi).toBeInstanceOf(GamepadApiWrapper);
    gpadApi.buttonConfigs = buttonConfigs;
    expect(gpadApi.buttonConfigs).toEqual(buttonConfigs);
    expect(gpadApi.updateDelay).toEqual(0);
    expect(gpadApi.gamepadApiSupported()).not.toBeFalsy();
})

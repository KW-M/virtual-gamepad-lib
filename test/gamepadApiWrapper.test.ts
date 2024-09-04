import { g } from "vitest/dist/suite-BWgaIsVn.js";
import { GamepadApiWrapper, buttonChangeDetails, wrapperButtonConfig } from "../src/GamepadApiWrapper";
import { EGamepad, GamepadEmulator } from "../src/GamepadEmulator";
import { test, expect, } from "vitest";

// @ts-expect-error
interface privateGamepadApiWrapper extends GamepadApiWrapper {
    updateDelay: number;
    buttonConfigs: wrapperButtonConfig[];
}



test("GamepadApiWrapper w/o GamepadEmulator", () => {
    const getGamepads = window.navigator.getGamepads;

    // @ts-expect-error
    const gpadApi = new GamepadApiWrapper({
        buttonConfigs: [],
        updateDelay: 0,
    }) as privateGamepadApiWrapper;
    expect(gpadApi.gamepadApiSupported()).not.toBeFalsy();
    Object.defineProperty(window.navigator, "getGamepads", { value: undefined });
    expect(gpadApi.gamepadApiSupported()).toBeFalsy();
    Object.defineProperty(window.navigator, "getGamepads", { value: () => null });
    expect(gpadApi.gamepadApiSupported()).toBeFalsy();
    Object.defineProperty(window.navigator, "getGamepads", { value: () => [1] });
    expect(gpadApi.gamepadApiSupported()).not.toBeFalsy();
    Object.defineProperty(window.navigator, "getGamepads", { value: getGamepads });
})

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

    // @ts-expect-error
    const gpadApi = new GamepadApiWrapper({
        updateDelay: 0,
    }) as privateGamepadApiWrapper;

    expect(gpadApi).toBeInstanceOf(GamepadApiWrapper);
    expect(gpadApi.buttonConfigs).toEqual([]);
    gpadApi.setButtonsConfig(buttonConfigs);
    expect(gpadApi.buttonConfigs).toEqual(buttonConfigs);
    expect(gpadApi.updateDelay).toEqual(0);
    gpadApi.setUpdateDelay(20)
    expect(gpadApi.updateDelay).toEqual(20);
    expect(gpadApi.gamepadApiSupported()).not.toBeFalsy();
    gpadEmulator.cleanup();
})

interface mockGpadBtnEvent {
    gpadIndex: number,
    gpad: EGamepad | Gamepad,
    changesMask: (buttonChangeDetails | false)[]
}

const getGpadButtonUpdate = (gpadApi, timeout: number = 3000): Promise<mockGpadBtnEvent> => {
    return new Promise((resolve, reject) => {
        gpadApi.onGamepadButtonChange((gpadIndex: number, gpad: EGamepad | Gamepad, changesMask: (buttonChangeDetails | false)[]) => {
            resolve({ gpadIndex, gpad, changesMask });
        })
        setTimeout(() => {
            reject("Timeout");
        }, timeout);
    })
}

const sleepFor = function (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test("GamepadApiWrapper fireWhileHolding", async () => {
    const buttonConfigs = [
        { fireWhileHolding: false },
        { fireWhileHolding: true }
    ];

    const gpadEmulator = new GamepadEmulator(0.1);
    gpadEmulator.AddEmulatedGamepad(0, true, 5, 2);

    // @ts-expect-error
    const gpadApi = new GamepadApiWrapper({
        buttonConfigs: buttonConfigs,
        updateDelay: 10,
    }) as privateGamepadApiWrapper;


    async function listenerFunc() {
        expect(gpadApi.getCurrentGamepadStates()[0].buttons[0]).toEqual({ pressed: false, value: 0, touched: false } as GamepadButton);
        const a = await getGpadButtonUpdate(gpadApi);
        expect(a.gpadIndex).toEqual(0);
        expect(gpadApi.getCurrentGamepadStates()[0].buttons[0]).toEqual({ pressed: true, value: 1, touched: true } as GamepadButton);
        expect(a.changesMask[0]).toEqual({ pressed: true, heldDown: undefined, released: undefined, touchDown: true, valueChanged: true, touchUp: undefined } as buttonChangeDetails);
        const b = await getGpadButtonUpdate(gpadApi);
        expect(b.gpadIndex).toEqual(0);
        expect(gpadApi.getCurrentGamepadStates()[0].buttons[0]).toEqual({ pressed: true, value: 1, touched: true } as GamepadButton);
        expect(b.changesMask[0]).toEqual({ pressed: true, heldDown: true, released: undefined, touchDown: undefined, valueChanged: undefined, touchUp: undefined } as buttonChangeDetails);
        const c = await getGpadButtonUpdate(gpadApi);
        expect(c.gpadIndex).toEqual(0);
        expect(gpadApi.getCurrentGamepadStates()[0].buttons[0]).toEqual({ pressed: false, value: 0, touched: false } as GamepadButton);
        expect(c.changesMask[0]).toEqual({ pressed: undefined, heldDown: undefined, released: true, touchDown: undefined, valueChanged: undefined, touchUp: true } as buttonChangeDetails);
    }

    listenerFunc();
    await sleepFor(10);
    gpadEmulator.PressButton(0, 0, 1, false);
    await sleepFor(20);
    gpadEmulator.PressButton(0, 0, 0, false);

    gpadEmulator.cleanup();
})


test("GamepadApiWrapper cleanup", async () => {
    const buttonConfigs = [
        { fireWhileHolding: false },
        { fireWhileHolding: false },
        { fireWhileHolding: false },
        { fireWhileHolding: true },
        { fireWhileHolding: false },
        { fireWhileHolding: false },
    ];

    const gpadEmulator = new GamepadEmulator(0.1);
    gpadEmulator.AddEmulatedGamepad(1, true, 6, 2);

    // @ts-expect-error
    const gpadApi = new GamepadApiWrapper({
        buttonConfigs: buttonConfigs,
        updateDelay: 10,
    }) as privateGamepadApiWrapper;


    async function listenerFunc() {
        expect(gpadApi.getCurrentGamepadStates()[1].buttons[2]).toEqual({ pressed: false, value: 0, touched: false } as GamepadButton);
        expect(gpadApi.getCurrentGamepadStates()[1].buttons[5]).toEqual({ pressed: false, value: 0, touched: false } as GamepadButton);
        const a = await getGpadButtonUpdate(gpadApi);
        expect(a.gpadIndex).toEqual(1);
        expect(gpadApi.getCurrentGamepadStates()[1].buttons[2]).toEqual({ pressed: false, value: 0, touched: false } as GamepadButton);
        expect(gpadApi.getCurrentGamepadStates()[1].buttons[5]).toEqual({ pressed: true, value: 1, touched: true } as GamepadButton);
        expect(a.changesMask[5]).toEqual({ pressed: true, heldDown: undefined, released: undefined, touchDown: true, valueChanged: true, touchUp: undefined } as buttonChangeDetails);
        await expect(getGpadButtonUpdate(gpadApi))
            .rejects
            .toThrow('Timeout');
    }

    listenerFunc();
    await sleepFor(1);
    gpadEmulator.PressButton(1, 5, 1, true);
    await sleepFor(1);
    gpadApi.cleanup();
    gpadEmulator.PressButton(1, 5, 0.1, true);
    gpadEmulator.cleanup();
});

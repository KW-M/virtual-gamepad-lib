
import { DEFAULT_GPAD_AXIS_COUNT, DEFAULT_GPAD_BUTTON_COUNT, GamepadEmulator } from "../src/gamepadEmulator";
import { test, expect } from "vitest";


test("creation & cleanup", () => {
    // mock getGamepads() since we don't have a real browser environment:
    navigator.getGamepads = function () {
        return [null, null, null];
    }
    let ref = navigator.getGamepads;
    expect(navigator.getGamepads).toEqual(ref); // sanity check

    // create a new emulator:
    const gpad = new GamepadEmulator(0.1);
    expect(gpad).toBeDefined();
    expect(navigator.getGamepads).not.toEqual(ref);
    expect(navigator.getGamepads()).toEqual([null, null, null]);
    expect(() => { new GamepadEmulator(0.1) }).toThrowError();

    // cleanup and restore the default getGamepads function (mocked in this case):
    gpad.cleanup();
    expect(navigator.getGamepads).toEqual(ref);
})



test("add/remove emulated gamepads", () => {
    const gamepadEmu = new GamepadEmulator(0.1);
    expect(gamepadEmu.emulatedGamepads).toEqual([]);
    gamepadEmu.AddEmulatedGamepad(0);
    expect(gamepadEmu.emulatedGamepads.length).toEqual(1);
    gamepadEmu.AddEmulatedGamepad(2, DEFAULT_GPAD_BUTTON_COUNT + 1, DEFAULT_GPAD_AXIS_COUNT + 3);
    expect(gamepadEmu.emulatedGamepads.length).toEqual(3);
    expect(gamepadEmu.emulatedGamepads[1]).toBeUndefined();
    expect(gamepadEmu.emulatedGamepads[2]).not.toBeUndefined();
    const gpad = gamepadEmu.emulatedGamepads[2]
    expect(gpad.buttons.length).toEqual(DEFAULT_GPAD_BUTTON_COUNT + 1);
    expect(gpad.axes.length).toEqual(DEFAULT_GPAD_AXIS_COUNT + 3);
    gamepadEmu.RemoveEmulatedGamepad(0);
    gamepadEmu.RemoveEmulatedGamepad(2);
    // expect(gamepadEmu.emulatedGamepads.length).toEqual(0);
    gamepadEmu.cleanup();
});


test("getGamepads() patch", async () => {
    navigator.getGamepads = function () {
        return [null, null, null];
    }

    let addGpadFlag: any = false;
    window.ongamepadconnected = (gpad) => { addGpadFlag = gpad };
    // window.addEventListener("gamepadconnected", (gpad) => { addGpadFlag = gpad });
    //
    const gamepadEmu = new GamepadEmulator(0.1);
    expect(navigator.getGamepads()).toEqual([null, null, null]);
    expect(addGpadFlag).toEqual(false);

    gamepadEmu.AddEmulatedGamepad(1);
    expect(navigator.getGamepads()).not.toEqual([null, null, null]);
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(addGpadFlag).not.toEqual(false)

    // test axes:
    expect(navigator.getGamepads()[1]?.axes).toEqual([0, 0, 0, 0]);
    gamepadEmu.MoveAxis(1, 0, 0.59);
    gamepadEmu.MoveAxis(1, 2, 1);
    gamepadEmu.MoveAxis(1, 3, 0.001);
    expect(navigator.getGamepads()[1]?.axes).toEqual([0.59, 0, 1, 0.001]);
    gamepadEmu.MoveAxis(1, 0, 0);
    expect(navigator.getGamepads()[1]?.axes).toEqual([0, 0, 1, 0.001]);
    expect(() => { gamepadEmu.MoveAxis(50, 0, 0.0001) }).toThrowError();
    expect(navigator.getGamepads()[2]?.axes).toBeUndefined();

    // test buttons:
    expect(navigator.getGamepads()[1]?.buttons[17]).toEqual({ pressed: false, touched: false, value: 0 });
    gamepadEmu.PressButton(1, 17, 0.0001, false);
    expect(navigator.getGamepads()[1]?.buttons[17]).toEqual({ pressed: false, touched: false, value: 0.0001 });
    gamepadEmu.PressButton(1, 17, 0.0001, true);
    expect(navigator.getGamepads()[1]?.buttons[17]).toEqual({ pressed: false, touched: true, value: 0.0001 });
    gamepadEmu.PressButton(1, 17, 1, false);
    expect(navigator.getGamepads()[1]?.buttons[17]).toEqual({ pressed: true, touched: true, value: 1.0 });
    gamepadEmu.PressButton(1, 17, 0, false);
    expect(navigator.getGamepads()[1]?.buttons[17]).toEqual({ pressed: false, touched: false, value: 0 });
    gamepadEmu.PressButton(1, 17, 0.0001, false);
    expect(() => { gamepadEmu.PressButton(0, 0, 0.0001, false) }).toThrowError();
    expect(navigator.getGamepads()[0]?.buttons).toBeUndefined();
    expect(navigator.getGamepads()[1]?.buttons[0]).toEqual({ pressed: false, touched: false, value: 0 });
});

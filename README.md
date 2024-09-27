<p align="center">
  <img src="./README.assets/virtual-gamepad-logo-moshed.gif" />
    <!-- <img src="./README.assets/virtual-gamepad-logo-moshed.jpg" /> -->
  <h1 align="center">Virtual Gamepad Lib</h1>
</p>

[![Licence](https://badgen.net/npm/license/virtual-gamepad-lib?color=cyan)](./LICENCE)
[![TypeScript](https://badgen.net/badge/icon/typescript?icon=typescript&label)](https://www.typescriptlang.org/)
[![NPM Bundle Size](https://badgen.net/bundlephobia/minzip/virtual-gamepad-lib?color=pink)](https://bundlephobia.com/result?p=virtual-gamepad-lib)
[![NPM Download Count](https://badgen.net/npm/dm/virtual-gamepad-lib)](https://www.npmjs.com/package/virtual-gamepad-lib)
[![NPM Version](https://badgen.net/npm/v/virtual-gamepad-lib)](https://www.npmjs.com/package/virtual-gamepad-lib)

[EXAMPLES & DEMOS](https://kw-m.github.io/virtual-gamepad-lib/) | [DOCS](https://kw-m.github.io/virtual-gamepad-lib/docs/) | [GETTING STARTED](#getting-started) | [CHANGELOG](./changes.md)

All the parts needed to display and emulate interactive virtual gamepads on the web for multi-touch, mouse, keyboard, or simulated interaction.

**Features:**

- Compatible with any gamepad library or game engine that uses the browser Gamepad API.
- Download our premade SVG gamepads or make your own fully unique onscreen gamepad with SVG or HTML elements.
- Display the state of any number of gamepads onscreen.
- Mock gamepads to test your game interactively in the browser.

## Modules

Each module can be used separately, but they work best together!

### [GamepadEmulator](https://kw-m.github.io/virtual-gamepad-lib/docs/modules/GamepadEmulator.html) - _[Source](./src/GamepadEmulator.ts)_

Add emulated gamepads to the browser Gamepad API. Emulated gamepads are controlled from any source - like mouse, keyboard or multiplayer game events. Use with the GamepadDisplay module for drop in multi-touch and mouse interaction.

### [GamepadDisplay](https://kw-m.github.io/virtual-gamepad-lib/docs/modules/GamepadDisplay.html) - _[Source](./src/GamepadDisplay.ts)_

Display the state of any gamepad (emulated or not) in SVG or HTML in a very customizable way.

### [GamepadApiWrapper](https://kw-m.github.io/virtual-gamepad-lib/docs/modules/GamepadApiWrapper.html) - _[Source](./src/GamepadApiWrapper.ts)_

Receive the state of any gamepad as a series of customizable events.

<br>

## Getting Started

### Installation

```bash
npm install virtual-gamepad-lib
```

### Importing

```typescript
import {
  GamepadApiWrapper, // gamepad
  GamepadEmulator,
  GamepadDisplay,
  CenterTransformOrigin, CenterTransformOriginDebug, // utilities
  gamepadButtonType, gamepadDirection, gamepadEmulationState, // ... enums
} from "virtual-gamepad-lib";
// typescript types can be imported just the same with
import type { ... } from 'virtual-gamepad-lib';

/* ------ OR if using common.js ------- */
const {
  GamepadApiWrapper,
  /* etc... */
} = require('virtual-gamepad-lib');

```

If using a bundler with "moduleResolution" set to "NodeNext" or "Node16" or greater in jsconfig.json or tsconfig.json, you can import the modules separately like this:

```typescript
import { GamepadEmulator } from "virtual-gamepad-lib/GamepadEmulator";
import { GamepadDisplay } from "virtual-gamepad-lib/GamepadDisplay";
import { GamepadApiWrapper } from "virtual-gamepad-lib/GamepadApiWrapper";
import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "virtual-gamepad-lib/enums";
import { CenterTransformOrigin, CenterTransformOriginDebug } from "virtual-gamepad-lib/utilities";
// typescript types can be imported just the same with import type { ... } from 'virtual-gamepad-lib/...';

/* ------ OR if using common.js ------- */
const { GamepadEmulator } = require("virtual-gamepad-lib/GamepadEmulator");
/* etc... */
```

Otherwise, you can import the modules separately like this:

```typescript
import { GamepadApiWrapper } from "virtual-gamepad-lib/dist/GamepadApiWrapper";
import { GamepadEmulator } from "virtual-gamepad-lib/dist/GamepadEmulator";
import { GamepadDisplay } from "virtual-gamepad-lib/dist/GamepadDisplay";
import { gamepadButtonType, gamepadDirection, gamepadEmulationState } from "virtual-gamepad-lib/dist/enums";
import { CenterTransformOrigin, CenterTransformOriginDebug } from "virtual-gamepad-lib/dist/utilities";
// typescript types can be imported just the same with import type { ... } from 'virtual-gamepad-lib/dist/...';

/* ------ OR if using common.js ------- */
const { GamepadEmulator } = require("virtual-gamepad-lib/dist/cjs/GamepadEmulator");
/* etc... */
```

## Usage

**See the [code examples](./examples)
which are live demos at [kw-m.github.io/virtual-gamepad-lib](https://kw-m.github.io/virtual-gamepad-lib/)**

<br/>

## SVG Authoring Tips

**Making custom svg gamepads for display on screen can be a bit tricky, but here are some tips to make it easier:**

- Download example vector gamepads from the [assets](assets) folder:
  - [Affinity Suite](assets/Affinity) (original)
  - [Adobe Creative Suite](assets/Photoshop_Converted)
  - [SVG](assets/svg/originals)
- Export the gamepad as an svg and copy the full contents **_inline_** into your html or add the full svg contents to the page at runtime.
- In your vector graphics program, name your layers with this format: `svgElementId` or `svgElementId.svgElementClass` to make it easier to split the id and class attributes in the exported svg with the automated SVGO plugin below or the regex find and replace below.
- Use the export option "flatten transforms" or "use absolute positioning" in your vector graphics program **OR** Wrap an empty group around any part of your svg that you want to apply css transforms to and make sure the element you wish to animate within the empty group is labeled with a recognizable id. Without an empty group, any css driven transforms may overwrite the transforms applied by your vector graphics program - see [this question](https://stackoverflow.com/a/70823308) and [this solution](https://stackoverflow.com/a/49413393).
- Use the centerTransformOrigin() function in [utilities.ts](./src/utilities.ts) on all elements you wish to rotate or scale using css. This will allow you to use css transforms based on the center of the element rather than the center of the svg.
  - Alternatively set the css properties: `transform-origin: center center; transform-box: fill-box` on these svg elements; Note that this won't play nice in some browsers or with all vector program exports (especially matrix transforms).
- Make sure your tap zones (.e.g around buttons or joysticks) are the only elements that are tapable / clickable, not parent elements or groups. This can be done by setting the css property `pointer-events: all` on the tap targets and `pointer-events: none` on all other SVG elements. If you don't do this, the browser default drag behaviors will not be correctly disabled on joysticks & buttons.
- If you want to use a custom cursor, make sure to set the css property `cursor: none` on the svg tap elements. This will prevent the browser from displaying the default cursor when hovering over the svg.

### Exporting SVG from Adobe Illustrator:

See: [https://www.youtube.com/watch?v=bWcweY66DL8](https://www.youtube.com/watch?v=bWcweY66DL8)

![Adobe SVG Export](./README.assets/Adobe-SVG-Export.png)

### Exporting SVG from Affinity Designer & Affinity Photo:

![Affinity SVG Export](./README.assets/Affinity-SVG-Export.png)

### [SVGO](https://github.com/svg/svgo) / [SVGOMG](https://jakearchibald.github.io/svgomg/) Options:

**Auto** (_recommened_)

Use the pre-configured SVGO config in the source github repo. It will optimize the svgs while retaining compatiblity with css & js interaction. Use the config with the SVGO CLI. The config file is located at: [svgo.config.js](./svgo.config.js) which imports [svgo-IdClassSplitterPlugin.js](./svgo-IdClassSplitterPlugin.js).
See the optimize:svg npm script in the package.json for an example of how to use the config with the SVGO CLI.

**Manual** (_not recommened_)

- This method will not avoid ID collisions between svgs on a page like the SVGO CLI config in the project source does
- **Disable** `Clean IDs` to keep the `id` attributes of the SVG elements from your editor
- **Disable** `Remove ViewBox` to keep the `viewBox` attribute, which makes scaling the SVG easier
- **Disable** `Remove Unknowns & Defaults` as this can remove the `id` and `class` attributes even if `Clean IDs` is off
- **Disable** `Remove unneeded group attrs` and `collapse useless groups` if you used empty groups to alllow css transforms apply correctly to svg elements.
- **Disable** `Remove hidden elements` if you used transparent or hidden elements as touch targets or bounding boxes
- **Disable** `Merge Paths` if you used overlapping paths that should be separate elements on the gamepad, eg: touch targets for the d-pad or buttons
- **Disable** `Remove title` or `Remove desc` if the title or description is relavant for acessability

If you format your layer names in the format `elementId.elementClass`, you can use the following regular expression to extract the elementId and elementClass from the layer name (The pre-configured SVGO config has a improved version of this inbuilt, but you can do this manually with find and replace):

**Example:**

```html
<path id="right_highlight.gpad-highlight" />
becomes
<path id="right_highlight" class="gpad-highlight" />
```

**Find (Regex):**

```perl
/id="([^"\.]*)(?:"|(?:.([^"\.]*)"))/g
```

**Replace:**

```perl
id="$1" class="$2"
```

## Contributing

Contributions are welcome!
This project is still in early development, so there are many ways to contribute.

- [Report bugs](https://github.com/KW-M/virtual-gamepad-lib/issues) - If you find a bug, please report it in the issues section.
- [Contribute Documentation](https://github.com/KW-M/virtual-gamepad-lib/)
  - Checkout a fork of the project and run `npm run docs:dev` to view the docs locally, then edit comments in the source code or README and submit a pull request!
- [Contribute Code](https://github.com/KW-M/virtual-gamepad-lib/)
  - This project uses PNPM for package management, so download a copy first. Or use NPM or Yarn if you prefer, just replace PNPM with NPM or YARN when running the scripts in package.json. (eg: `pnpm run build` becomes `npm run build`)
  - Checkout a fork of the project, add new features or bugfixes and `pnpm run test:lib`, `pnpm run build:lib` to build the library, and `pnpm run dev:examples` to check the examples are working locally. Run `precompile:examples` and submit a pull request!

NPM / PNPM / Yarn scripts:

- build:lib - Build the library
- build:docs - Build the documentation
- optimize:svg - Run SVGO on the SVGs in the [assets/svg/originals](./assets/svg/originals) folder
- precompile:examples - Precompile the TS examples to JS for folks who don't use typescript - Run this before submitting a PR
- dev:examples - Start a dev server for the examples
- build:examples - Build the examples
- preview:examples - Preview the examples once built

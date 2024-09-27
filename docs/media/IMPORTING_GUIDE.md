### Importing

Recommend (but not required): Using a bundler with "moduleResolution" set to "NodeNext" or "Node16" or greater in your jsconfig.json or tsconfig.json.

```typescript
import {
  GamepadApiWrapper,
  GamepadEmulator,
  GamepadDisplay,
  CenterTransformOrigin, CenterTransformOriginDebug, // utilities
  gamepadButtonType, gamepadDirection, gamepadEmulationState, // enums
} from "virtual-gamepad-lib";
// typescript types can be imported just the same with
import type { ... } from 'virtual-gamepad-lib';

/* ------ OR if using common.js ------- */
const {
  GamepadApiWrapper,
  /* etc... */
} = require('virtual-gamepad-lib');

```

Importing separately

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

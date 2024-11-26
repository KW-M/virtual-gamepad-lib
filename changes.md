# 0.3.0 - Nov 21 2024

- New preset functions make it easy to get started with the preset gamepad SVG and customize later.
- Support for 8-way dpads (diagonal directions) - see custom gamepads example
- Improved consistancy & file size for default gamepad SVGs - SVGs and necessary CSS can now be imported from the NPM library for use with bundlers & build tools.
- Improved & Updated SVG Optimization script to SVGO 2
  - This is the recomended way to create custom svg gamepads.
  - Now supports proper global collison hash prefixes and correct layer name parsing from Adobe Suite, Afffinity Suite & Others.
  - Can be imported from the NPM library
- Improved vector SVG authoring tips.

DEPRICATED:

- Joystick direction arrows/"highlights" have are depricated to be removed in the next release - they are fairly niche feature that can easily be re-implemented with extraData in the joystick config and a custom joystickDisplayFunction and

# 0.2.0 - Sep 27 2024

- Rearranged package structure to no longer require importing packages from /dist
- All classes now have cleanup() destructor functions.

DEPRICATED:

- importing from /dist folder is deprecated but will still be supported until a major release.

  # 0.1.1 - July 13 2024

- Documentation consistancy improvements
- Vitest browser testing working again.
- Dependency update to latest versions
- Added convenience enums for standard Xbox & PlayStation controller button maps and axes maps.
- Add support for displaying only a subset of gamepad buttons or axes in the GamepadDisplay (unused buttons should be set to undefined in the GamepadDisplay config button array).

  # 0.0.4 - Oct 11 2022

- Initial release

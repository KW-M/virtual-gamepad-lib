# 0.2.0 - Sep 27 2024

- Rearranged package structure to no longer require importing packages from /dist
- importing from /dist folder is deprecated but will still be supported until a major release.
- All classes now have cleanup() destructor functions.

  # 0.1.1 - July 13 2024

- Documentation consistancy improvements
- Vitest browser testing working again.
- Dependency update to latest versions
- Added convenience enums for standard Xbox & PlayStation controller button maps and axes maps.
- Add support for displaying only a subset of gamepad buttons or axes in the GamepadDisplay (unused buttons should be set to undefined in the GamepadDisplay config button array).

  # 0.0.4 - Oct 11 2022

- Initial release

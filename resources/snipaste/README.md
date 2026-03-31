Place internal Snipaste binaries here if you want packaged builds to launch a bundled copy first.

Supported lookup order:

- macOS: `resources/snipaste/darwin-arm64/Snipaste.app/...` -> `resources/snipaste/darwin-x64/Snipaste.app/...` -> `resources/snipaste/darwin/Snipaste.app/...`
- Windows: `resources/snipaste/win32-arm64/Snipaste.exe` -> `resources/snipaste/win32-x64/Snipaste.exe` -> `resources/snipaste/win32/Snipaste.exe`
- Linux: `resources/snipaste/linux-arm64/snipaste` -> `resources/snipaste/linux-x64/snipaste` -> `resources/snipaste/linux/snipaste`

If no bundled binary is found, ClawX falls back to the system-installed Snipaste.

/* FuelPro Windows Launcher - Compile with: gcc FuelPro.c -o FuelPro.exe */
#include <windows.h>
#include <stdio.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    /* Show splash message */
    MessageBox(NULL,
        "FuelPro - Fuel Management System\n\n"
        "Click OK to launch FuelPro in your browser.\n\n"
        "Website: https://3d3tjxc5r2qoc.kimi.page\n\n"
        "To install as desktop app:\n"
        "1. In Chrome/Edge, click menu (3 dots)\n"
        "2. Select 'Install FuelPro'\n\n"
        "FuelPro - Fuel Management System",
        "FuelPro v1.0.0", MB_OK | MB_ICONINFORMATION);

    /* Try Chrome first */
    HINSTANCE result = ShellExecute(NULL, "open",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "--app=https://3d3tjxc5r2qoc.kimi.page --start-maximized",
        NULL, SW_SHOWMAXIMIZED);

    if ((INT_PTR)result <= 32) {
        /* Try Edge */
        result = ShellExecute(NULL, "open",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "--app=https://3d3tjxc5r2qoc.kimi.page --start-maximized",
            NULL, SW_SHOWMAXIMIZED);
    }

    if ((INT_PTR)result <= 32) {
        /* Fallback: default browser */
        ShellExecute(NULL, "open",
            "https://3d3tjxc5r2qoc.kimi.page",
            NULL, NULL, SW_SHOWNORMAL);
    }

    return 0;
}

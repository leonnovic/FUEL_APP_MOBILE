# FuelPro - Fuel Management System Launcher
# Run: Right-click -> "Run with PowerShell"

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  FuelPro - Fuel Management System" -ForegroundColor Cyan
Write-Host "  https://3d3tjxc5r2qoc.kimi.page" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""

# Check for Chrome
$chromePaths = @(
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
)

# Check for Edge
$edgePaths = @(
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)

$fuelProUrl = "https://3d3tjxc5r2qoc.kimi.page"
$launched = $false

# Try Chrome first
foreach ($chrome in $chromePaths) {
    if (Test-Path $chrome) {
        Write-Host "Launching FuelPro in Chrome..." -ForegroundColor Green
        Start-Process $chrome -ArgumentList "--app=`"$fuelProUrl`"","--start-maximized"
        $launched = $true
        break
    }
}

# Fallback to Edge
if (-not $launched) {
    foreach ($edge in $edgePaths) {
        if (Test-Path $edge) {
            Write-Host "Launching FuelPro in Microsoft Edge..." -ForegroundColor Green
            Start-Process $edge -ArgumentList "--app=`"$fuelProUrl`"","--start-maximized"
            $launched = $true
            break
        }
    }
}

# Fallback to default browser
if (-not $launched) {
    Write-Host "Launching FuelPro in default browser..." -ForegroundColor Yellow
    Start-Process $fuelProUrl
}

Write-Host ""
Write-Host "FuelPro is launching!" -ForegroundColor Green
Write-Host ""
Write-Host "To install as a desktop app:" -ForegroundColor Cyan
Write-Host "  1. Open Chrome/Edge menu (three dots)"
Write-Host "  2. Select 'Install FuelPro' or 'Apps > Install'"
Write-Host ""
Start-Sleep -Seconds 2

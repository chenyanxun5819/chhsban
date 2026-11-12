Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Sync omr_core from core/ to functions/
Remove-Item -Recurse -Force .\functions\omr_core -ErrorAction SilentlyContinue
Copy-Item -Recurse .\core\omr_core .\functions\omr_core
Write-Host "Synced core\\omr_core -> functions\\omr_core"

# Ensure functions/layouts/ exists (created by tools/generate_sheet.py)
# This directory contains *.layout.json files needed at runtime
if (-not (Test-Path .\functions\layouts)) {
    Write-Host "Warning: functions\\layouts directory not found. Run tools\\generate_sheet.py to create templates."
} else {
    Write-Host "functions\\layouts directory confirmed."
}

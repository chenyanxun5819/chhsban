Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Remove-Item -Recurse -Force .\functions\omr_core -ErrorAction SilentlyContinue
Copy-Item -Recurse .\core\omr_core .\functions\omr_core
Write-Host "Synced core\\omr_core -> functions\\omr_core"

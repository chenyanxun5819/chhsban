Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

pwsh -File .\scripts\sync_core.ps1
firebase deploy

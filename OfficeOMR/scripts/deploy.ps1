Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 固定回到项目根目录（scripts 的上一层）
Set-Location (Split-Path -Parent $PSScriptRoot)

# 在当前 PowerShell 里直接执行，不再另外启动 pwsh
& "$PSScriptRoot\sync_core.ps1"

gcloud functions deploy recognize_sheet `
	--gen2 `
	--project=officeomr-fe542 `
	--region=us-central1 `
	--runtime=python311 `
	--source=functions `
	--entry-point=recognize_sheet `
	--trigger-http `
	--allow-unauthenticated `
	--memory=1GiB `
	--timeout=120s `
	--max-instances=3 `
	--min-instances=0 `
	--remove-env-vars=STORAGE_BUCKET

if ($LASTEXITCODE -ne 0) { throw "gcloud deploy 失败 (exit code $LASTEXITCODE)" }
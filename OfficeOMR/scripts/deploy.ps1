Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

pwsh -File .\scripts\sync_core.ps1
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
	--timeout=540s `
	--max-instances=3 `
	--min-instances=0 `
	--set-env-vars=STORAGE_BUCKET=officeomr-fe542.firebasestorage.app

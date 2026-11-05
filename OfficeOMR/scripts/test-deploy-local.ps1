# OfficeOMR local deployment test script
# Validate deployment config before pushing to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OfficeOMR Local Deployment Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Firebase login
Write-Host "  Firebase login status..." -NoNewline
firebase projects:list > $null 2>&1
if ($?) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "  Run: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Syncing omr_core..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .\functions\omr_core -ErrorAction SilentlyContinue
Copy-Item -Recurse .\core\omr_core .\functions\omr_core
Write-Host "  omr_core synced" -ForegroundColor Green

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

Write-Host "  Python core..." -NoNewline
pip install -e .\core -e .\sheetgen > $null 2>&1
if ($?) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host "  Python functions..." -NoNewline
pip install -r .\functions\requirements.txt > $null 2>&1
if ($?) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Python imports..." -ForegroundColor Yellow

Write-Host "  omr_core..." -NoNewline
python -c "from omr_core.pipeline import recognize" 2> $null
if ($?) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host "  sheetgen..." -NoNewline
python -c "from sheetgen import build" 2> $null
if ($?) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host ""
Write-Host "Running deployment..." -ForegroundColor Yellow
Write-Host ""

firebase deploy --only functions --project officeomr-fe542

if ($?) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS: Local deployment test passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready to push to GitHub for auto-deploy." -ForegroundColor Green
    Write-Host ""
    Write-Host "Steps:"
    Write-Host "  1. git add ."
    Write-Host "  2. git commit -m 'Update OfficeOMR'"
    Write-Host "  3. git push origin main"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "FAILED: Local deployment test failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check errors above and fix before pushing." -ForegroundColor Red
    Write-Host ""
    exit 1
}

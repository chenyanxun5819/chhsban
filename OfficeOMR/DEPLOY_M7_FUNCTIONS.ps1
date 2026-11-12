# =============================================================================
# M7 Cloud Functions Deployment Script
# =============================================================================
# 
# PURPOSE: Deploy all fixed M7 Cloud Functions to Firebase
#
# REQUIRED: Run this script on YOUR LOCAL MACHINE with:
#   1. Firebase CLI installed: npm install -g firebase-tools
#   2. Google account with Firebase project access
#   3. This script in the OfficeOMR project root
#
# FIXES DEPLOYED:
#   - firestore.rules: Removed security vulnerability (dangerous update permission)
#   - callables_m7.py: Rewritten with proper @https_fn.on_call decorators
#   - Authentication: Added require_auth() + verify_job_ownership()
#   - Function registration: Added M7 function imports in main.py
#   - Dependencies: Added firebase-functions==0.5.0 to requirements.txt
#
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         M7 Cloud Functions Deployment Script                   ║" -ForegroundColor Cyan
Write-Host "║              (Fixed Critical Security Issues)                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Firebase CLI
Write-Host "[1/5] Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please install: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Firebase CLI version: $firebaseVersion" -ForegroundColor Green

# Step 2: Login to Firebase
Write-Host ""
Write-Host "[2/5] Authenticating with Firebase..." -ForegroundColor Yellow
Write-Host "  → This will open a browser window for Google login" -ForegroundColor Cyan
firebase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Firebase login failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Authentication successful" -ForegroundColor Green

# Step 3: Verify Firebase project
Write-Host ""
Write-Host "[3/5] Verifying Firebase project..." -ForegroundColor Yellow
$projects = firebase projects:list 2>&1
if ($projects -match "officeomr-fe542") {
    Write-Host "  ✓ Project 'officeomr-fe542' found" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find 'officeomr-fe542' project" -ForegroundColor Red
    Write-Host "Available projects:" -ForegroundColor Yellow
    $projects
    exit 1
}

# Step 4: Deploy Firestore Rules
Write-Host ""
Write-Host "[4/5] Deploying Firestore Security Rules..." -ForegroundColor Yellow
Write-Host "  → Fixing critical security vulnerability" -ForegroundColor Cyan
firebase deploy --only firestore:rules
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Firestore rules deployment failed!" -ForegroundColor Red
    Write-Host "Please check firebase-debug.log" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Firestore rules deployed successfully" -ForegroundColor Green

# Step 5: Deploy Cloud Functions
Write-Host ""
Write-Host "[5/5] Deploying M7 Cloud Functions..." -ForegroundColor Yellow
Write-Host "  → This will deploy 6 callable functions:" -ForegroundColor Cyan
Write-Host "     1. uploadAnswerKeyByImage" -ForegroundColor Gray
Write-Host "     2. uploadAnswerKeyManually" -ForegroundColor Gray
Write-Host "     3. getAnswerKey" -ForegroundColor Gray
Write-Host "     4. recognizeAndGradeSheet" -ForegroundColor Gray
Write-Host "     5. batchRecognizeSheets" -ForegroundColor Gray
Write-Host "     6. cleanupJobStudentData" -ForegroundColor Gray
Write-Host "  → Estimated time: 3-5 minutes" -ForegroundColor Cyan

firebase deploy --only functions
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cloud Functions deployment failed!" -ForegroundColor Red
    Write-Host "Please check firebase-debug.log" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ Cloud Functions deployed successfully" -ForegroundColor Green

# Success!
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOYMENT COMPLETED SUCCESSFULLY!                ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Verify functions in Firebase Console:"
Write-Host "   https://console.firebase.google.com/project/officeomr-fe542/functions"
Write-Host ""
Write-Host "2. Test the M7 workflow:"
Write-Host "   - Open: http://localhost:3000/m7.html"
Write-Host "   - Sign in as teacher"
Write-Host "   - Create exam and upload answer key"
Write-Host "   - Upload student answer sheets"
Write-Host ""
Write-Host "3. Monitor function logs:"
Write-Host "   firebase functions:log"
Write-Host ""
Write-Host "SECURITY FIXES DEPLOYED:" -ForegroundColor Green
Write-Host "✓ firestore.rules: Removed unsafe update permission"
Write-Host "✓ callables_m7.py: Proper @https_fn.on_call decorators"
Write-Host "✓ Authentication: require_auth() + verify_job_ownership()"
Write-Host "✓ Authorization: Only job owner or super_admin can access"
Write-Host ""

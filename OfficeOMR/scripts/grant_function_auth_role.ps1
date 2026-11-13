# 给 Cloud Functions 的运行时服务账号补上 roles/firebaseauth.admin
#
# 用途：callables_m6.py 的 claimAccess / revokeTeacher 需要调用
#       auth.set_custom_user_claims() / auth.revoke_refresh_tokens()。
#       gen2 函数以 Compute Engine 默认服务账号执行
#       （本次为 601814582794-compute@developer.gserviceaccount.com），
#       若该 SA 没有 roles/firebaseauth.admin，会报：
#         Failed to set custom claims: ... (INSUFFICIENT_PERMISSION)
#
# 前置：先在本机执行 `firebase login`（脚本会复用 Firebase CLI 的凭证）。
#
# 用法：pwsh -File .\scripts\grant_function_auth_role.ps1

$ErrorActionPreference = 'Stop'

$proj = 'officeomr-fe542'
$sa = 'serviceAccount:601814582794-compute@developer.gserviceaccount.com'
$role = 'roles/firebaseauth.admin'

$cfgPath = "$env:USERPROFILE\.config\configstore\firebase-tools.json"
if (-not (Test-Path $cfgPath)) {
  throw "找不到 Firebase CLI 凭证，请先执行 firebase login"
}
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$tok = $cfg.tokens.access_token
if (-not $tok) {
  throw "Firebase CLI 没有可用 token，请重新执行 firebase login"
}
$h = @{ Authorization = "Bearer $tok"; 'Content-Type' = 'application/json' }

$base = "https://cloudresourcemanager.googleapis.com/v1/projects/$proj"
$getUri = "$base" + ':getIamPolicy'
$pol = Invoke-RestMethod -Uri $getUri -Method POST -Headers $h -Body '{}' -TimeoutSec 90

$hasRole = $false
$parts = @()
foreach ($b in @($pol.bindings)) {
  if ($null -eq $b) { continue }
  $r = $b.role
  if (-not $r) { continue }
  $mems = @($b.members) | Where-Object { $_ -ne $null -and $_ -ne '' }
  if ($r -eq $role -and ($mems -contains $sa)) { $hasRole = $true }
  $memJson = ($mems | ForEach-Object { '"' + $_ + '"' }) -join ','
  $parts += ('{"role":"' + $r + '","members":[' + $memJson + ']}')
}

if ($hasRole) {
  Write-Host "SKIP  已是成员: $role for $sa"
  exit 0
}

$parts += ('{"role":"' + $role + '","members":["' + $sa + '"]}')
$body = '{"policy":{"bindings":[' + ($parts -join ',') + '],"etag":"' + "$($pol.etag)" + '"}}'
$setUri = "$base" + ':setIamPolicy'
Invoke-RestMethod -Uri $setUri -Method POST -Headers $h -Body $body -TimeoutSec 90 | Out-Null
Write-Host "OK    已授予 $role 给 $sa（其余绑定原样保留）"

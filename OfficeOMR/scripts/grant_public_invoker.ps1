# 将所有函式的 Cloud Run 服务设为公开（allUsers -> roles/run.invoker）
#
# 用途：firebase-tools 15.36.0 的 updateV2Function 没有处理 callable 的 invoker
#       （src/deploy/functions/release/fabricator.js 第 421-441 行），
#       所以「更新」部署时不会把 Cloud Run 的 IAM 设为公开，
#       导致前端 httpsCallable 出现 CORS 失败 / 403。
#       本脚本直接调用 Cloud Run v1 IAM API 修正。
#
# 前置：先在本机执行 `firebase login`（脚本会复用 Firebase CLI 的凭证）。
#
# 用法：pwsh -File .\scripts\grant_public_invoker.ps1

$ErrorActionPreference = 'Stop'

$proj = 'officeomr-fe542'
$loc = 'us-central1'
$role = 'roles/run.invoker'
$member = 'allUsers'

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
$base = "https://run.googleapis.com/v1/projects/$proj/locations/$loc/services"

$list = Invoke-RestMethod -Uri $base -Headers $h -TimeoutSec 60
$names = @($list.items | ForEach-Object { $_.metadata.name })
Write-Host "找到 $($names.Count) 个 Cloud Run 服务"

foreach ($n in $names) {
  try {
    $getUri = "$base/$n" + ':getIamPolicy'
    $pol = Invoke-RestMethod -Uri $getUri -Method GET -Headers $h -TimeoutSec 60

    $has = $false
    $parts = @()
    foreach ($b in @($pol.bindings)) {
      if ($null -eq $b) { continue }
      $r = $b.role
      if (-not $r) { continue }
      $mems = @($b.members) | Where-Object { $_ -ne $null -and $_ -ne '' }
      if ($r -eq $role -and ($mems -contains $member)) { $has = $true }
      $memJson = ($mems | ForEach-Object { '"' + $_ + '"' }) -join ','
      $parts += ('{"role":"' + $r + '","members":[' + $memJson + ']}')
    }
    if ($has) {
      Write-Host "SKIP  $n (已是公开)"
      continue
    }
    $parts += ('{"role":"' + $role + '","members":["' + $member + '"]}')
    $body = '{"policy":{"bindings":[' + ($parts -join ',') + '],"etag":"' + "$($pol.etag)" + '"}}'

    $setUri = "$base/$n" + ':setIamPolicy'
    Invoke-RestMethod -Uri $setUri -Method POST -Headers $h -Body $body -TimeoutSec 60 | Out-Null
    Write-Host "OK    $n (已设为公开)"
  } catch {
    Write-Warning "FAIL  $n : $($_.Exception.Message)"
  }
}

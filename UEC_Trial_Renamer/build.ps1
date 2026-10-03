# 封装成 Windows 可执行程式（在专案根目录用 PowerShell 执行）
#   pwsh -ExecutionPolicy Bypass -File .\build.ps1
#
# 产出：dist\UEC_Trial_Renamer\UEC_Trial_Renamer.exe（整个资料夹一起复制给别人用）
#       dist\UEC_Trial_Renamer.zip

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. 用干净的虚拟环境，避免把电脑里其他套件（pandas、scipy…）一起打包进去
# 固定用 Python 3.12：rapidocr_onnxruntime（onnxruntime）目前还没有 3.14 的 wheel，
# 系统预设 python 若是更新的版本会在安装依赖时失败。
if (-not (Test-Path ".venv")) {
    py -3.12 -m venv .venv
}
$py = ".\.venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install -r requirements.txt pyinstaller

# 2. 打包（onedir：启动比 onefile 快，模型档不用每次解压）
& $py -m PyInstaller --noconfirm --clean --onedir --windowed `
    --name UEC_Trial_Renamer `
    --paths src `
    --collect-all rapidocr_onnxruntime `
    --exclude-module pandas --exclude-module scipy --exclude-module matplotlib `
    src\gui.py

# 3. 设定档与水印图放在 exe 旁边（使用者可以自己改）
$dist = "dist\UEC_Trial_Renamer"
Copy-Item -Recurse -Force config "$dist\config"
Copy-Item -Recurse -Force assets "$dist\assets"
Copy-Item -Force README.md "$dist\README.md"

# 4. 压缩
$zip = "dist\UEC_Trial_Renamer.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$dist\*" -DestinationPath $zip

Write-Host ""
Write-Host "完成：$dist\UEC_Trial_Renamer.exe" -ForegroundColor Green
Write-Host "压缩档：$zip" -ForegroundColor Green

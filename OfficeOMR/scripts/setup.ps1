Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .\core -e .\sheetgen
pip install pytest

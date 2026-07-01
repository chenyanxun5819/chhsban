# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\MSI\\Documents\\2025_affairs\\學術結果登記\\学术上传python\\sms_app\\main_app.py'],
    pathex=[],
    binaries=[],
    datas=[('C:\\Users\\MSI\\Documents\\2025_affairs\\學術結果登記\\学术上传python\\sms_app\\ui\\styles.qss', 'ui'), ('C:\\Users\\MSI\\Documents\\2025_affairs\\學術結果登記\\学术上传python\\sms_app\\template.xlsx', '.'), ('C:\\Users\\MSI\\Documents\\2025_affairs\\學術結果登記\\学术上传python\\sms_app\\assets', 'assets')],
    hiddenimports=['selenium', 'webdriver_manager', 'openpyxl', 'cryptography', 'cryptography.fernet', 'PyQt6.QtWebEngineWidgets'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SMSUploader_v2.0',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='C:\\Users\\MSI\\Documents\\2025_affairs\\學術結果登記\\学术上传python\\sms_app\\assets\\icon.ico',
)

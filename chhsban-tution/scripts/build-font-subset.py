#!/usr/bin/env python3
"""
產生套印 PDF 用的中文字型子集（assets/NotoSansTC-subset.otf）。

背景：
- pdf-lib 內建字型（Helvetica 等）不支援中文，套印申請表時若不指定字型，
  遇到中文字元會直接報錯（WinAnsi cannot encode ...）。
- 完整的 Noto Sans TC 字型檔約 16MB，直接塞進 Worker 程式包會逼近甚至超過
  Cloudflare Workers 的程式大小限制，因此改成子集後存進 KV（ASSETS_KV），
  執行時讀取，不隨程式碼一起部署。
- 已測試確認 @pdf-lib/fontkit 對 Noto Sans CJK 這種 CID-keyed CFF 字型的
  「執行時再次子集化」（embedFont 的 subset: true）會靜默漏字（中文完全消失，
  只留英數字），所以改成這裡先用 fonttools 子集化一次，
  之後在 pdf-generator.ts 用 embedFont(bytes, { subset: false }) 整份嵌入，
  不要再讓 fontkit 二次子集化。

字元涵蓋範圍：Big5 可解碼的全部字元（約 13800 字，涵蓋繁體中文姓名/常用字），
足以覆蓋教師姓名、科目、學生姓名等動態內容。

用法：
  1. 安裝套件： pip install fonttools
  2. 下載來源字型（SIL Open Font License，可自由重新散佈）：
     curl -L -o /tmp/NotoSansTC-Regular.otf \
       https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/TraditionalChinese/NotoSansCJKtc-Regular.otf
  3. 執行本腳本： python scripts/build-font-subset.py /tmp/NotoSansTC-Regular.otf
     會在 assets/NotoSansTC-subset.otf 產生子集字型（約 3.4MB）。
  4. 上傳到 KV（正式環境也要跑一次）：
     wrangler kv key put --namespace-id=<ASSETS_KV id> "noto-sans-tc-subset" \
       --path=assets/NotoSansTC-subset.otf
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build_charset() -> str:
    chars = set()
    for lead in range(0xA1, 0xFA):
        for trail in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
            try:
                ch = bytes([lead, trail]).decode("big5")
                if ch.isprintable():
                    chars.add(ch)
            except Exception:
                pass
    for cp in range(0x20, 0x7F):
        chars.add(chr(cp))
    chars.update("－、。，：；！？「」『』（）【】《》…—·・")
    return "".join(sorted(chars))


def main():
    if len(sys.argv) != 2:
        print("用法: python build-font-subset.py <來源字型路徑（NotoSansTC-Regular.otf）>")
        sys.exit(1)

    source_font = Path(sys.argv[1])
    if not source_font.exists():
        print(f"找不到來源字型: {source_font}")
        sys.exit(1)

    charset_path = ROOT / "scripts" / ".charset-cache.txt"
    charset_path.write_text(build_charset(), encoding="utf-8")

    output_path = ROOT / "assets" / "NotoSansTC-subset.otf"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(source_font),
            f"--text-file={charset_path}",
            f"--output-file={output_path}",
            "--no-hinting",
            "--desubroutinize",
            "--layout-features=",
            "--name-IDs=",
            "--drop-tables+=DSIG",
            "--recalc-bounds",
            "--recalc-timestamp",
        ],
        check=True,
    )

    charset_path.unlink(missing_ok=True)
    print(f"已產生 {output_path}（{output_path.stat().st_size / 1024 / 1024:.2f} MB）")


if __name__ == "__main__":
    main()

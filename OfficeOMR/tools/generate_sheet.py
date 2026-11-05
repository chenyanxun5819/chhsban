"""
命令行工具：生成答案纸

用法：
  python -m tools.generate_sheet --template T100-A4-v1 --school "学校名" --exam "考试名" --subject "科目" --id-digits 5 --options 5 --out output/

输出：
  - output/T100-A4-v1.pdf
  - output/T100-A4-v1.layout.json
  - output/T100-A4-v1.preview.png
"""

import argparse
import json
from pathlib import Path
from sheetgen.layout import TemplatePresets
from sheetgen.builder import build_sheet


def validate_params(args):
    """验证参数的硬性约束"""
    errors = []
    
    # 模板检查
    if args.template not in ("T100-A4-v1", "T060-A4-v1"):
        errors.append(f"Unknown template: {args.template}. Must be T100-A4-v1 or T060-A4-v1")
    
    # 证号位数检查
    if not (1 <= args.id_digits <= 12):
        errors.append(f"id_digits must be 1-12, got {args.id_digits}")
    
    # 选项数检查
    if args.options not in (4, 5):
        errors.append(f"options must be 4 or 5, got {args.options}")
    
    if errors:
        print("\n❌ 参数验证失败：")
        for err in errors:
            print(f"   - {err}")
        raise ValueError("参数验证失败")


def main():
    parser = argparse.ArgumentParser(description="OfficeOMR 答案纸生成器")
    parser.add_argument(
        "--template",
        default="T100-A4-v1",
        choices=["T100-A4-v1", "T060-A4-v1"],
        help="答案纸版型（默认 T100-A4-v1）",
    )
    parser.add_argument("--school", default="学校名称", help="学校名称")
    parser.add_argument("--exam", default="考试名称", help="考试名称")
    parser.add_argument("--subject", default="科目", help="科目名称")
    parser.add_argument("--id-digits", type=int, default=5, help="证号位数（默认 5）")
    parser.add_argument(
        "--options",
        type=int,
        default=5,
        choices=[4, 5],
        help="选项数（默认 5）",
    )
    parser.add_argument(
        "--name-line",
        action="store_true",
        default=True,
        help="包含姓名手写线（默认启用）",
    )
    parser.add_argument("--out", default="./", help="输出目录（默认当前目录）")
    
    args = parser.parse_args()
    
    # 验证参数
    validate_params(args)
    
    # 创建输出目录
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"📝 生成答案纸：{args.template}")
    print(f"   学校：{args.school}")
    print(f"   考试：{args.exam}")
    print(f"   科目：{args.subject}")
    print(f"   证号位数：{args.id_digits}，选项数：{args.options}")
    
    # 生成布局
    if args.template == "T100-A4-v1":
        layout = TemplatePresets.T100_A4_v1(
            id_digits=args.id_digits,
            option_count=args.options,
            include_name_line=args.name_line,
        )
    else:  # T060-A4-v1
        layout = TemplatePresets.T060_A4_v1(
            id_digits=args.id_digits,
            option_count=args.options,
            include_name_line=args.name_line,
        )
    
    # 执行硬性约束检查
    check_layout_constraints(layout)
    
    # 生成 PDF、PNG、JSON
    pdf_bytes, png_bytes, layout_json = build_sheet(
        layout,
        school_name=args.school,
        exam_name=args.exam,
        subject_name=args.subject,
    )
    
    # 保存文件
    pdf_path = out_dir / f"{args.template}.pdf"
    json_path = out_dir / f"{args.template}.layout.json"
    png_path = out_dir / f"{args.template}.preview.png"
    
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"✓ PDF 已保存：{pdf_path}")
    
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(layout_json)
    print(f"✓ Layout JSON 已保存：{json_path}")
    
    with open(png_path, "wb") as f:
        f.write(png_bytes)
    print(f"✓ 预览 PNG 已保存：{png_path}")
    
    print("\n✅ 答案纸生成完成！")


def check_layout_constraints(layout):
    """
    执行硬性约束检查（PLAN.md 5.3 节）
    
    - 气泡直径 ≥ 3.8 mm
    - 同一行相邻选项圆心距 ≥ 6 mm
    - 相邻题行距 ≥ 6.8 mm
    - 回印格与相邻题行距 ≥ 1.2 mm
    """
    errors = []
    
    # 检查气泡直径
    for q in layout.questions:
        for bubble in q.bubbles:
            if bubble.r * 2 < 3.8:  # 直径 = 半径 * 2
                errors.append(f"题 {q.q} 选项 {bubble.opt}：气泡直径 {bubble.r * 2:.2f} < 3.8 mm")
    
    # 检查选项间距
    for q in layout.questions:
        bubbles = sorted(q.bubbles, key=lambda b: b.cx)
        for i in range(len(bubbles) - 1):
            dist = bubbles[i + 1].cx - bubbles[i].cx
            if dist < 6.0:
                errors.append(
                    f"题 {q.q} {bubbles[i].opt}-{bubbles[i + 1].opt}：距离 {dist:.2f} < 6.0 mm"
                )
    
    # 检查题行距
    if layout.questions:
        prev_q = None
        for q in layout.questions:
            if prev_q and q.bubbles and prev_q.bubbles:
                row_dist = q.bubbles[0].cy - prev_q.bubbles[0].cy
                if row_dist < 6.8 and row_dist > 0:
                    errors.append(
                        f"题 {prev_q.q}-{q.q}：行距 {row_dist:.2f} < 6.8 mm"
                    )
            prev_q = q
    
    # 检查回印格
    for q in layout.questions:
        fs = q.feedback_slot
        if q.bubbles:
            max_bubble_x = max(b.cx for b in q.bubbles) + max(b.r for b in q.bubbles)
            feedback_left = fs["x"]
            gap = feedback_left - max_bubble_x
            if gap < 1.2:
                errors.append(
                    f"题 {q.q}：回印格与气泡距离 {gap:.2f} < 1.2 mm"
                )
    
    if errors:
        print("\n⚠️  硬性约束警告（可能需要调整参数）：")
        for err in errors:
            print(f"   - {err}")
    else:
        print("\n✓ 所有硬性约束检查通过")


if __name__ == "__main__":
    main()


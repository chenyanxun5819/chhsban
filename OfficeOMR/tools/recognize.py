"""CLI entrypoint for recognition."""

import argparse
import json
import sys
from pathlib import Path

from omr_core import pipeline, schema
from sheetgen.layout import TemplatePresets


def main():
    """Recognize OMR sheet from image or PDF file."""
    parser = argparse.ArgumentParser(
        description="Recognize student answers from OMR sheet scan"
    )
    parser.add_argument(
        "input",
        type=str,
        help="Input image or PDF file path"
    )
    parser.add_argument(
        "--template",
        default="T100-A4-v1",
        help="Template ID (default: T100-A4-v1)"
    )
    parser.add_argument(
        "--page",
        type=int,
        default=0,
        help="Page index for PDF input (default: 0)"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        help="Output JSON file path (if not set, print to stdout)"
    )
    parser.add_argument(
        "--debug-image",
        type=str,
        help="Save annotated debug image to this path"
    )
    parser.add_argument(
        "--config",
        type=str,
        help="Config YAML file path (default: core/omr_core/config.default.yaml)"
    )
    
    args = parser.parse_args()
    
    # Validate input file
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Load layout template
    try:
        if args.template == "T100-A4-v1":
            layout = TemplatePresets.T100_A4_v1()
        elif args.template == "T060-A4-v1":
            layout = TemplatePresets.T060_A4_v1()
        else:
            print(f"Error: Unknown template: {args.template}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Error loading template: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Load config
    try:
        if args.config:
            config = pipeline.load_config(args.config)
        else:
            config = pipeline.load_config()
    except Exception as e:
        print(f"Error loading config: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Read input file
    try:
        with open(input_path, "rb") as f:
            image_bytes = f.read()
    except Exception as e:
        print(f"Error reading input file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Run recognition
    try:
        result = pipeline.recognize(
            image_bytes=image_bytes,
            layout=layout,
            config=config,
            template_id=args.template,
            page_index=args.page,
            save_debug_image=args.debug_image
        )
    except Exception as e:
        print(f"Error during recognition: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Output result
    result_json = result.model_dump_json(indent=2)
    
    if args.output:
        try:
            with open(args.output, "w") as f:
                f.write(result_json)
            print(f"Result saved to {args.output}", file=sys.stderr)
        except Exception as e:
            print(f"Error writing output: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(result_json)
    
    # Exit with appropriate code
    if result.status == "failed":
        sys.exit(1)
    elif result.status == "needs_review":
        sys.exit(0)  # Not an error, just needs review
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()

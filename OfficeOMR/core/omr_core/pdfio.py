"""Image/PDF reading with pypdfium2."""

import os
import logging
from pathlib import Path
from typing import Generator

import cv2
import numpy as np
import pypdfium2 as pdfium

logger = logging.getLogger(__name__)


def read_pdf_as_images(pdf_bytes: bytes, target_dpi: int = 300) -> Generator[np.ndarray, None, None]:
    """
    Convert PDF to grayscale images (300 DPI by default).
    
    Args:
        pdf_bytes: Raw PDF file bytes
        target_dpi: Target DPI for rendering (default 300)
        
    Yields:
        Grayscale numpy array for each page
        
    Raises:
        ValueError: If PDF is invalid or no pages found
    """
    try:
        pdf = pdfium.PdfDocument(pdf_bytes)
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")
    
    if len(pdf) == 0:
        raise ValueError("PDF has no pages")
    
    # Standard A4 dimensions: 210 × 297 mm
    # At 300 DPI: 1 inch = 25.4 mm, so 210 mm = 2480 px, 297 mm = 3508 px
    # pypdfium2 uses scale factor (1.0 = 72 DPI by default)
    scale_factor = target_dpi / 72.0
    
    for page_idx, page in enumerate(pdf):
        try:
            # Render page with specified DPI
            bitmap = page.render(scale=scale_factor, rotation=0)
            
            # Convert bitmap to PIL image, then to numpy array
            pil_image = bitmap.to_pil()
            image_array = np.asarray(pil_image)
            
            # pypdfium2 returns RGB; convert to grayscale
            if len(image_array.shape) == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = image_array
            
            yield gray
        except Exception as e:
            logger.warning(f"Failed to render page {page_idx}: {e}")
            continue


def read_image_file(file_path: str | Path, target_dpi: int = 300) -> Generator[np.ndarray, None, None]:
    """
    Read image file and yield normalized grayscale image(s).
    
    For multi-page formats like PDF, yields each page separately.
    For single-page formats (JPG, PNG), yields once.
    
    Args:
        file_path: Path to image or PDF file
        target_dpi: Target DPI (used for DPI-dependent validation)
        
    Yields:
        Grayscale numpy array for each image/page
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    suffix = file_path.suffix.lower()
    
    # Read as PDF
    if suffix == ".pdf":
        with open(file_path, "rb") as f:
            yield from read_pdf_as_images(f.read(), target_dpi)
        return
    
    # Read as image (JPG, PNG, etc.)
    img = cv2.imread(str(file_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Failed to read image: {file_path}")
    
    yield img


def read_bytes(data: bytes, filename: str = "unknown") -> Generator[np.ndarray, None, None]:
    """
    Read from raw bytes, auto-detecting format.
    
    Args:
        data: Raw file bytes
        filename: Filename hint for format detection (e.g., "scan.pdf", "photo.jpg")
        
    Yields:
        Grayscale numpy array for each image/page
    """
    suffix = Path(filename).suffix.lower()
    
    # Try PDF first
    if suffix == ".pdf":
        yield from read_pdf_as_images(data)
        return
    
    # Try image format
    img_array = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_GRAYSCALE)
    if img_array is not None:
        yield img_array
        return
    
    # If image decode failed, try PDF as fallback
    try:
        yield from read_pdf_as_images(data)
    except Exception as e:
        raise ValueError(f"Failed to decode as image or PDF: {e}")

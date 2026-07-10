"""
VELTRIX Icon Generator
======================
Run this script once to regenerate all application icons from the source logo.
Requires: pip install Pillow

Usage:
    python create_icons.py
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, sys

ICONS_DIR = os.path.join(os.path.dirname(__file__), "assets", "icons")

# Source JPEG (try project root first, then python_app root)
_candidates = [
    os.path.join(os.path.dirname(__file__), "..", "assets", "icons",
                 "WhatsApp_Image_2026-07-09_at_11.23.56.jpeg"),
]
SOURCE_JPEG = next((p for p in _candidates if os.path.exists(os.path.abspath(p))), None)


def draw_v_logo(size: int, bg_dark: bool = False, include_text: bool = False) -> Image.Image:
    """
    Draw a VELTRIX-style 'V' logo programmatically.
    Used as fallback when source JPEG is not available.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    bg_color = (10, 15, 26, 255) if bg_dark else (255, 255, 255, 255)
    d.rectangle([0, 0, size, size], fill=bg_color)

    pad = size * 0.08
    mid_x = size / 2
    top_y = size * 0.06
    bot_y = size * (0.70 if not include_text else 0.58)
    arm_w = size * 0.18

    pts_left = [
        (pad, top_y), (pad + arm_w, top_y),
        (mid_x + arm_w * 0.3, bot_y), (mid_x - arm_w * 0.1, bot_y),
    ]
    d.polygon(pts_left, fill=(30, 100, 200, 255))

    hi_l = [
        (pad + arm_w * 0.15, top_y), (pad + arm_w * 0.45, top_y),
        (mid_x + arm_w * 0.05, bot_y - size*0.02), (mid_x - arm_w * 0.05, bot_y - size*0.02),
    ]
    d.polygon(hi_l, fill=(80, 180, 255, 200))

    rx = size - pad
    pts_right = [
        (rx - arm_w, top_y), (rx, top_y),
        (mid_x + arm_w * 0.3, bot_y), (mid_x - arm_w * 0.1, bot_y),
    ]
    d.polygon(pts_right, fill=(140, 155, 175, 255))

    slash_w = size * 0.065
    inner_top_y = top_y + size * 0.25
    slash_pts = [
        (mid_x - slash_w * 0.6, inner_top_y), (mid_x + slash_w * 0.6, inner_top_y),
        (mid_x + slash_w * 0.2, bot_y), (mid_x - slash_w * 0.2, bot_y - size*0.04),
    ]
    d.polygon(slash_pts, fill=(0, 160, 240, 220))

    spike_pts = [
        (rx - arm_w * 0.4, top_y), (rx + size*0.04, top_y - size*0.04),
        (mid_x + arm_w * 1.2, bot_y * 0.6), (mid_x + arm_w * 0.8, bot_y * 0.6),
    ]
    d.polygon(spike_pts, fill=(100, 115, 130, 220))

    if include_text:
        text = "VELTRIX"
        font_size = int(size * 0.15)
        for path in [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "C:/Windows/Fonts/arialbd.ttf",
        ]:
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except Exception:
                continue
        else:
            font = ImageFont.load_default()

        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        tx = (size - tw) / 2
        ty = bot_y + size * 0.04
        d.text((tx+2, ty+2), text, font=font, fill=(0, 0, 0, 160))
        d.text((tx, ty), text, font=font, fill=(40, 50, 65, 255))
        pre = "VELTR"
        pre_w = d.textbbox((0, 0), pre, font=font)[2]
        d.text((tx + pre_w, ty), "IX", font=font, fill=(30, 130, 220, 255))
        lh = max(2, int(size * 0.008))
        ly = ty + (bbox[3] - bbox[1]) + size*0.012
        d.rectangle([tx + tw*0.1, ly, tx + tw*0.9, ly + lh], fill=(30, 130, 220, 255))
        d.rectangle([tx + tw*0.55, ly, tx + tw*0.9, ly + lh], fill=(0, 200, 255, 200))

    return img.filter(ImageFilter.GaussianBlur(size * 0.006))


def generate_from_source(source_path: str) -> dict:
    """Generate icons from source JPEG, removing white background."""
    img = Image.open(source_path).convert("RGBA")
    data = img.getdata()
    new_data = []
    for r, g, b, a in data:
        new_data.append((r, g, b, 0) if r > 230 and g > 230 and b > 230 else (r, g, b, a))
    img.putdata(new_data)
    return img


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    use_source = SOURCE_JPEG is not None

    if use_source:
        print(f"Using source: {SOURCE_JPEG}")
        base = generate_from_source(SOURCE_JPEG)
    else:
        print("Source JPEG not found — generating logo programmatically")
        base = None

    # app.png 256×256
    if base:
        png = base.resize((256, 256), Image.LANCZOS)
    else:
        png = draw_v_logo(256, bg_dark=False)
    png.save(os.path.join(ICONS_DIR, "app.png"), "PNG")
    print("✓ app.png")

    # app.ico multi-size
    sizes = [(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]
    if base:
        frames = [base.resize(s, Image.LANCZOS) for s in sizes]
    else:
        frames = [draw_v_logo(s[0], bg_dark=False) for s in sizes]
    frames[-1].save(
        os.path.join(ICONS_DIR, "app.ico"),
        format="ICO", sizes=sizes, append_images=frames[:-1],
    )
    print("✓ app.ico (multi-size)")

    # logo_full.png 512×512 (for splash screen — uses uploaded logo)
    if base:
        full = base.resize((512, 512), Image.LANCZOS)
    else:
        full = draw_v_logo(512, bg_dark=True, include_text=True)
    full.save(os.path.join(ICONS_DIR, "logo_full.png"), "PNG")
    print("✓ logo_full.png")

    # logo_small.png 80×80 (for about dialog)
    if base:
        sm = base.resize((80, 80), Image.LANCZOS)
    else:
        sm = draw_v_logo(80, bg_dark=False)
    sm.save(os.path.join(ICONS_DIR, "logo_small.png"), "PNG")
    print("✓ logo_small.png")

    print("\nAll icons generated:", ICONS_DIR)


if __name__ == "__main__":
    main()

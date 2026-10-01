#!/usr/bin/env python3
"""Turn photos from staff (iPhone .HEIC, huge JPEGs, PNG screenshots of photos) into web-ready JPEGs
with the repo's naming, ready to list in js/data.js:

    python3 .claude/skills/add-content/to_jpg.py IN [IN ...] --out assets/Restaurants/CasaMar --prefix rest_casamar

writes assets/Restaurants/CasaMar/rest_casamar_1.jpg, _2.jpg, ... in the order given (a folder as IN
means every image in it, sorted by name). A relative --out is inside the repo this script belongs to
(--root to change), wherever you run it from; IN paths are relative to the current folder. At the
end it prints the new paths ready to paste into "gallery". Each output is rotated upright (EXIF orientation),
converted to sRGB, shrunk so the long edge is at most --max px (default 2400: enough for the 1600w
derivative, without committing 5 MB camera files), saved as JPEG quality --quality (default 85) with
NO metadata (drops GPS/location). Existing files are never overwritten: numbering continues after
the highest <prefix>_<n> already in --out unless --start is given.

Use it for photos only. Logos/wordmarks stay PNG (they go in the item's "logo" field; copy them as-is).

HEIC needs the pillow-heif package:  python3 -m pip install pillow-heif
(Pillow >= 10 is already required by scripts/build-images.py.)
"""
import argparse
import io
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]  # .claude/skills/add-content/to_jpg.py -> repo root

try:
    from PIL import Image, ImageCms, ImageOps
except ImportError:
    sys.exit("Needs Pillow:  python3 -m pip install Pillow pillow-heif")
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIF = True
except ImportError:
    HEIF = False

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}


def to_srgb(im):
    icc = im.info.get("icc_profile")
    if not icc:
        return im.convert("RGB")
    try:
        src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        return ImageCms.profileToProfile(im.convert("RGB"), src, ImageCms.createProfile("sRGB"), outputMode="RGB")
    except Exception:  # broken/unsupported profile: keep the pixels as they are
        return im.convert("RGB")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("inputs", nargs="+", help="image files or folders")
    ap.add_argument("--out", required=True, help="destination folder, e.g. assets/Restaurants/CasaMar")
    ap.add_argument("--prefix", required=True, help="file name prefix, e.g. rest_casamar -> rest_casamar_1.jpg")
    ap.add_argument("--start", type=int, help="first number (default: after the highest existing <prefix>_<n>)")
    ap.add_argument("--max", type=int, default=2400, help="max long edge in px (default 2400)")
    ap.add_argument("--quality", type=int, default=85, help="JPEG quality (default 85)")
    ap.add_argument("--root", default=str(REPO), help="repo a relative --out is resolved in (default: this script's repo)")
    a = ap.parse_args()
    root = Path(a.root).resolve()

    if not re.fullmatch(r"[a-z0-9]+(?:_[a-z0-9]+)*", a.prefix):
        sys.exit(f"--prefix {a.prefix!r}: use lowercase letters, digits and single underscores (e.g. rest_casamar)")
    files = []
    for s in a.inputs:
        p = Path(s)
        if p.is_dir():
            files += sorted(f for f in p.iterdir() if f.suffix.lower() in IMG_EXT)
        elif p.is_file():
            files.append(p)
        else:
            sys.exit(f"not found: {s}")
    if not files:
        sys.exit("no images found")
    heic = [f for f in files if f.suffix.lower() in (".heic", ".heif")]
    if heic and not HEIF:
        sys.exit(f"{len(heic)} HEIC file(s) but pillow-heif is not installed:  python3 -m pip install pillow-heif\n"
                 "(or export them from Photos as JPEG and run this again on the JPEGs)")

    out = Path(a.out)
    out = (out if out.is_absolute() else root / out).resolve()
    try:
        rel = out.relative_to(root)
    except ValueError:
        rel = None
    if rel is None or not rel.parts or rel.parts[0] != "assets":
        sys.exit(f"--out {a.out!r} resolves to {out}, which is not under {root / 'assets'}.\n"
                 "Use a path like assets/Restaurants/CasaMar (it is resolved inside the repo).")
    if any(part.startswith("_") for part in rel.parts):
        sys.exit("--out must not contain a folder starting with '_' (GitHub Pages drops those)")
    out.mkdir(parents=True, exist_ok=True)
    taken = [int(m.group(1)) for f in out.iterdir() if (m := re.fullmatch(re.escape(a.prefix) + r"_(\d+)\.(?:jpe?g|png|webp)", f.name, re.I))]
    n = a.start if a.start is not None else (max(taken) + 1 if taken else 1)

    failed, made = 0, []
    for f in files:
        dest = out / f"{a.prefix}_{n}.jpg"
        while dest.exists():
            n += 1
            dest = out / f"{a.prefix}_{n}.jpg"
        try:
            with Image.open(f) as im:
                im = ImageOps.exif_transpose(im)
                im = to_srgb(im)
                im.thumbnail((a.max, a.max), Image.LANCZOS)
                im.save(dest, "JPEG", quality=a.quality, optimize=True, progressive=True)
        except Exception as e:  # noqa: BLE001 — report and keep going
            print(f"  ERROR {f}: {type(e).__name__}: {e}")
            failed += 1
            continue
        kb = dest.stat().st_size // 1024
        made.append(dest.relative_to(root).as_posix())
        print(f"  {f.name} -> {made[-1]}  {im.width}x{im.height}  {kb} KB"
              + ("   (under 800 px wide: fine in the gallery, not as the hero, gallery[0])" if im.width < 800 else ""))
        n += 1
    print(f"{len(files) - failed} converted, {failed} failed.")
    if made:
        print('For "gallery" in js/data.js (hero first; reorder as needed):')
        print(",\n".join(f'            "{p}"' for p in made))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

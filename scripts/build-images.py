#!/usr/bin/env python3
"""Image pipeline for the Iberostar Aruba guest app (spec v4, section A).

Run by hand from anywhere, like scripts/verify.js:

    python3 scripts/build-images.py              # photos, logos, brand marks, PDFs, media.js
    python3 scripts/build-images.py --video      # also re-encode the golf video to 720p
    python3 scripts/build-images.py --contact    # also write a logo-spotting contact sheet
    python3 scripts/build-images.py --force      # re-encode everything, ignoring what exists

Needs Python 3.9+ and Pillow >= 10 (with WebP). `node` is used to read js/data.js the same
way verify.js does (a pure-Python fallback exists). `pdfinfo` and `ffmpeg`/`ffprobe` are
optional: when they are missing the script prints "skipped" and carries on.

What it writes (all committed to git):
  assets/img/<slug>-<h8>-<w>.webp     resized WebP derivatives of every photo/logo
  assets/img/<slug>-<h8>-poster.webp  video poster (frame at 3 s)
  assets/Logos/logo_iberostar_{ink,ivory}.png, icon-maskable-512.png, startup-<w>x<h>.png
  assets/Hotels/Tierra/golf_tierra_720.mp4                     (--video only)
  js/media.js                         the MEDIA map the app reads (optional at runtime)
  .nojekyll                           so GitHub Pages serves every path as-is

Idempotent: derivative names carry sha1(source)[:8], so an unchanged source is never
re-encoded, and js/media.js is only rewritten when its content changes. Files in assets/img
that no current source maps to are pruned (that directory is wholly generated).

The app works without any of this: when js/media.js is missing, or has no entry for a path,
it falls back to the original file.
"""

import argparse
import base64
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

try:
    from PIL import Image, ImageCms, ImageDraw, ImageFont, ImageOps, features
except ImportError:  # pragma: no cover
    sys.exit("build-images.py needs Pillow >= 10:  python3 -m pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "img"           # never an _-prefixed dir (Jekyll drops those)
MEDIA_JS = ROOT / "js" / "media.js"
DATA_JS = ROOT / "js" / "data.js"

# Mirror of TODAY_HERO in js/app.js (spec B.1 "Phase sky"). Keep these literal and in sync:
# staff may swap a hero photo by editing both lists and re-running this script.
TODAY_HERO = {
    "morning": "assets/Hotels/Joia/hotel_joia_9.jpg",
    "day": "assets/Hotels/Joia/hotel_joia_1.jpg",
    "sunset": "assets/Restaurants/Zima/rest_zima_1.jpg",
    "night": "assets/Restaurants/Zima/rest_zima_1.jpg",
}

PHOTO_WIDTHS = (480, 800, 1600)
LOGO_WIDTHS = (160, 320)            # 160 per spec; 320 so 72px tiles stay sharp at 3x DPR
QUALITY = {160: 85, 320: 85, 480: 72, 800: 72, 1600: 78}   # by tier; native widths use the next tier up
NATIVE_MIN_GAIN = 1.10              # only add a native-width variant if it beats the largest tier by 10%
LQIP_WIDTH, LQIP_QUALITY = 24, 40
POSTER_WIDTH, POSTER_QUALITY, POSTER_AT = 1280, 75, 3.0

BRAND_SRC = "assets/Logos/logo_club.png"
INK, IVORY, WHITE, NAVY = (0x0B, 0x1F, 0x33), (0xF4, 0xEF, 0xE4), (0xFF, 0xFF, 0xFF), (0x07, 0x13, 0x1F)
BRAND_HEIGHT = 84                   # 3x of the 28px header height (spec asks 2x; 3x is crisp on iPhones)
STARTUP_SIZES = [(1170, 2532), (1179, 2556), (1290, 2796), (750, 1334)]
STARTUP_MARK_FRACTION = 0.34        # mark width as a fraction of screen width
MASKABLE_SIZE, MASKABLE_SAFE = 512, 0.60

# Video: the 720p re-encode replaces the 22.9 MB original in data.js (Tierra, TierraGolf).
VIDEO_720 = {"assets/Hotels/Tierra/golf_tierra_720.mp4": "assets/Hotels/Tierra/golf_tierra.mp4"}
FFMPEG_720 = ["-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
              "-movflags", "+faststart", "-an"]

SRGB = None  # lazily created ImageCms sRGB profile (per process)


# --------------------------------------------------------------------------- helpers

def rel(p):
    return Path(p).resolve().relative_to(ROOT).as_posix()


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0


def slug_for(path):
    """assets/Restaurants/Gianni's Ristorante/rest_giannis_1.jpg -> restaurants-gianni-s-ristorante-rest-giannis-1"""
    p = path[len("assets/"):] if path.startswith("assets/") else path
    p = os.path.splitext(p)[0].lower()
    return re.sub(r"[^a-z0-9]+", "-", p).strip("-")


def sha8(path):
    h = hashlib.sha1()
    with open(ROOT / path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:8]


def which(name):
    return shutil.which(name)


def atomic_save(img, dest, fmt, **kw):
    """Write to a temp name and rename, so an interrupted run never leaves a truncated file
    that a later run would 'skip' as already existing."""
    dest = Path(dest)
    tmp = dest.with_name(f".tmp-{os.getpid()}-{dest.name}")
    img.save(tmp, fmt, **kw)
    os.replace(tmp, dest)
    return dest.stat().st_size


def plan_widths(width, tiers):
    """Widths to emit for a source `width` px wide: every tier below it (never upscale); if a
    tier had to be skipped, add one variant at the native width instead."""
    kept = [t for t in tiers if t < width]
    if len(kept) < len(tiers):
        if not kept or width >= kept[-1] * NATIVE_MIN_GAIN:
            kept.append(width)
    return sorted(set(kept))


def quality_for(w):
    if w in QUALITY:
        return QUALITY[w]
    for t in sorted(QUALITY):
        if w <= t:
            return QUALITY[t]
    return QUALITY[max(QUALITY)]


# --------------------------------------------------------------------------- catalog

def load_catalog():
    """Return defaultData from js/data.js. Same approach as verify.js (node), with a
    pure-Python fallback (data.js is strict JSON once comments are removed)."""
    src = DATA_JS.read_text(encoding="utf-8")
    if which("node"):
        code = ("const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');"
                "const g={};new Function('g',s.replace('const defaultData','g.defaultData'))(g);"
                "process.stdout.write(JSON.stringify(g.defaultData));")
        r = subprocess.run(["node", "-e", code, str(DATA_JS)], capture_output=True, text=True)
        if r.returncode == 0:
            return json.loads(r.stdout)
        print("  ! node could not load js/data.js, trying the Python parser:", r.stderr.strip()[:200])
    body = src[src.index("{", src.index("defaultData")):]
    body = re.sub(r"^\s*//.*$", "", body, flags=re.M)
    body = body[: body.rindex("}") + 1]
    body = re.sub(r",(\s*[}\]])", r"\1", body)
    return json.loads(body)


def collect(data):
    """Map every referenced file to the roles it plays."""
    photos, gallery0, logos, pdfs, videos = {}, set(), {}, {}, {}
    for key, it in data.items():
        if not isinstance(it, dict):
            continue
        for i, p in enumerate(it.get("gallery") or []):
            if isinstance(p, str) and p:
                photos.setdefault(p, key)
                if i == 0:
                    gallery0.add(p)
        for f in ("logo", "partnerLogo"):
            p = it.get(f)
            if isinstance(p, str) and p:
                logos.setdefault(p, key)
        if isinstance(it.get("pdf"), str) and it["pdf"]:
            pdfs.setdefault(it["pdf"], key)
        for d in it.get("pdfs") or []:
            if isinstance(d, dict) and isinstance(d.get("url"), str) and d["url"]:
                pdfs.setdefault(d["url"], key)
        if isinstance(it.get("video"), str) and it["video"]:
            videos.setdefault(it["video"], key)
    for p in TODAY_HERO.values():
        photos.setdefault(p, "TODAY_HERO")
        gallery0.add(p)
    return photos, gallery0, logos, pdfs, videos


def read_existing_media():
    """Parse the previous js/media.js (our own JSON-in-JS output) to reuse per-file results."""
    if not MEDIA_JS.exists():
        return {}
    try:
        txt = MEDIA_JS.read_text(encoding="utf-8")
        body = txt[txt.index("{"): txt.rindex("}") + 1]
        return json.loads(body)
    except Exception as e:  # corrupt or hand-edited: just rebuild
        print(f"  ! could not parse existing js/media.js ({e}); rebuilding every entry")
        return {}


# --------------------------------------------------------------------------- image work

def srgb_profile():
    global SRGB
    if SRGB is None:
        SRGB = ImageCms.createProfile("sRGB")
    return SRGB


def open_normalized(path):
    """Open, apply EXIF orientation, convert to sRGB, and return an RGB or RGBA image
    (RGBA only when transparency is actually used)."""
    im = Image.open(ROOT / path)
    im.load()
    icc = im.info.get("icc_profile")
    im = ImageOps.exif_transpose(im)
    has_alpha = im.mode in ("RGBA", "LA", "PA", "RGBa", "La") or (im.mode == "P" and "transparency" in im.info)
    if has_alpha:
        im = im.convert("RGBA")
    elif im.mode not in ("RGB", "CMYK"):
        im = im.convert("RGB")
    # Colour management: convert anything that is not sRGB (Display P3, Adobe RGB, CMYK...)
    if icc:
        try:
            src_prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = (ImageCms.getProfileDescription(src_prof) or "").strip()
            if im.mode == "CMYK" or "srgb" not in desc.lower():
                alpha = im.getchannel("A") if im.mode == "RGBA" else None
                base = im if im.mode == "CMYK" else im.convert("RGB")
                base = ImageCms.profileToProfile(base, src_prof, srgb_profile(), outputMode="RGB",
                                                 renderingIntent=ImageCms.Intent.PERCEPTUAL)
                if alpha is not None:
                    base.putalpha(alpha)
                im = base
        except Exception:
            pass  # unreadable profile: treat as sRGB
    if im.mode == "CMYK":
        im = im.convert("RGB")
    if im.mode == "RGBA":
        lo = im.getchannel("A").getextrema()[0]
        if lo >= 250:  # alpha present but unused: flatten onto the dominant colour
            bg = Image.new("RGB", im.size, dominant_rgb(im))
            bg.paste(im, mask=im.getchannel("A"))
            im = bg
    return im


def dominant_rgb(im):
    if im.mode == "RGBA":
        r, g, b, a = im.convert("RGBa").resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
        if a == 0:
            return (255, 255, 255)
        return tuple(min(255, round(c * 255 / a)) for c in (r, g, b))
    return im.convert("RGB").resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))


def resized(im, w):
    if w >= im.width:
        return im
    h = max(1, round(im.height * w / im.width))
    return im.resize((w, h), Image.Resampling.LANCZOS, reducing_gap=3.0)


def process_image(job):
    """Worker: build every derivative for one source file. Returns the MEDIA entry plus stats."""
    path, h8, widths_tiers, need_q, force = job
    im = open_normalized(path)
    W, H = im.size
    slug = slug_for(path)
    ident = f"{slug}-{h8}"
    widths = plan_widths(W, widths_tiers)
    written, sizes = 0, {}
    for w in widths:
        dest = OUT_DIR / f"{ident}-{w}.webp"
        if dest.exists() and not force:
            sizes[w] = dest.stat().st_size
            continue
        sizes[w] = atomic_save(resized(im, w), dest, "WEBP", quality=quality_for(w), method=6)
        written += 1
    c = "#%02x%02x%02x" % dominant_rgb(im)
    entry = {"id": ident, "w": W, "h": H, "v": widths, "c": c}
    if need_q:
        entry["q"] = lqip(im)
    return path, entry, written, sizes


def lqip(im):
    small = resized(im, LQIP_WIDTH)
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=LQIP_QUALITY, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


# --------------------------------------------------------------------------- brand marks

def brand_alpha():
    """Alpha channel of logo_club.png cropped to its bbox (the full IBEROSTAR lockup)."""
    src = Image.open(ROOT / BRAND_SRC).convert("RGBA")
    a = src.getchannel("A")
    return a.crop(a.getbbox())


def mark(alpha, colour, height=None, width=None):
    if height:
        width = round(alpha.width * height / alpha.height)
    elif width:
        height = round(alpha.height * width / alpha.width)
    a = alpha.resize((width, height), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", a.size, colour + (255,))
    out.putalpha(a)
    return out


def build_brand(force):
    """Ink/ivory header logos, the maskable icon and iOS startup images. Fixed names; rebuilt
    when missing, older than logo_club.png, or with --force."""
    src_m = (ROOT / BRAND_SRC).stat().st_mtime
    script_m = Path(__file__).stat().st_mtime
    outputs = []

    def stale(p):
        return force or not p.exists() or p.stat().st_mtime < max(src_m, script_m)

    alpha = brand_alpha()
    logos = ROOT / "assets" / "Logos"
    for name, colour in (("logo_iberostar_ink.png", INK), ("logo_iberostar_ivory.png", IVORY)):
        p = logos / name
        if stale(p):
            atomic_save(mark(alpha, colour, height=BRAND_HEIGHT), p, "PNG", optimize=True)
            outputs.append((p, True))
        else:
            outputs.append((p, False))

    p = logos / "icon-maskable-512.png"
    if stale(p):
        canvas = Image.new("RGBA", (MASKABLE_SIZE, MASKABLE_SIZE), NAVY + (255,))
        m = mark(alpha, WHITE, width=round(MASKABLE_SIZE * MASKABLE_SAFE))
        canvas.alpha_composite(m, ((MASKABLE_SIZE - m.width) // 2, (MASKABLE_SIZE - m.height) // 2))
        atomic_save(canvas.convert("RGB"), p, "PNG", optimize=True)
        outputs.append((p, True))
    else:
        outputs.append((p, False))

    for (w, h) in STARTUP_SIZES:
        p = logos / f"startup-{w}x{h}.png"
        if stale(p):
            canvas = Image.new("RGBA", (w, h), NAVY + (255,))
            m = mark(alpha, IVORY, width=round(w * STARTUP_MARK_FRACTION))
            canvas.alpha_composite(m, ((w - m.width) // 2, (h - m.height) // 2))
            atomic_save(canvas.convert("RGB"), p, "PNG", optimize=True)
            outputs.append((p, True))
        else:
            outputs.append((p, False))
    return outputs


# --------------------------------------------------------------------------- pdf / video

def pdf_meta(path, cached):
    f = ROOT / path
    if not f.exists():
        return None
    size = f.stat().st_size
    if cached and cached.get("bytes") == size and "pages" in cached:
        return cached
    entry = {"bytes": size}
    if which("pdfinfo"):
        r = subprocess.run(["pdfinfo", str(f)], capture_output=True, text=True)
        m = re.search(r"^Pages:\s+(\d+)", r.stdout, re.M)
        if m:
            entry["pages"] = int(m.group(1))
    return entry


def probe_duration(path):
    if not which("ffprobe"):
        return None
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                        "default=nw=1:nk=1", str(ROOT / path)], capture_output=True, text=True)
    try:
        return round(float(r.stdout.strip()))
    except ValueError:
        return None


def encode_720(force, log):
    """--video: re-encode each original to 720p H.264 (faststart, no audio)."""
    for dst, src in VIDEO_720.items():
        d, s = ROOT / dst, ROOT / src
        if not s.exists():
            log(f"  video  {src}: source missing, skipped")
            continue
        if d.exists() and not force and d.stat().st_mtime >= s.stat().st_mtime:
            log(f"  video  {dst}: exists ({human(d.stat().st_size)}), kept")
            continue
        if not which("ffmpeg"):
            log("  video  ffmpeg not found: skipped")
            return
        log(f"  video  encoding {dst} from {human(s.stat().st_size)} original (preset slow, takes a few minutes)...")
        tmp = d.with_name(".tmp-" + d.name)
        t = time.time()
        r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(s), *FFMPEG_720, str(tmp)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            tmp.unlink(missing_ok=True)
            log(f"  video  ffmpeg failed: {r.stderr.strip()[:300]}")
            continue
        os.replace(tmp, d)
        log(f"  video  wrote {dst}: {human(d.stat().st_size)} in {time.time() - t:.0f}s")


def video_entry(path, cached, force, log):
    """Poster (frame at 3 s of the best-quality source) + duration, for a referenced video."""
    if not (ROOT / path).exists():
        return None
    if not which("ffmpeg") or not which("ffprobe"):
        log(f"  video  {path}: ffmpeg/ffprobe not found, poster/duration skipped")
        return cached or None
    src = VIDEO_720.get(path, path)
    if not (ROOT / src).exists():
        src = path
    poster = f"assets/img/{slug_for(src)}-{sha8(src)}-poster.webp"
    if cached and cached.get("poster") == poster and (ROOT / poster).exists() and not force:
        return cached
    if force or not (ROOT / poster).exists():
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(POSTER_AT), "-i", str(ROOT / src),
                            "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"],
                           capture_output=True)
        if r.returncode != 0 or not r.stdout:
            log(f"  video  {path}: could not grab a poster frame")
            return None
        im = Image.open(io.BytesIO(r.stdout)).convert("RGB")
        atomic_save(resized(im, POSTER_WIDTH), ROOT / poster, "WEBP", quality=POSTER_QUALITY, method=6)
    entry = {"poster": poster}
    dur = probe_duration(path)
    if dur:
        entry["dur"] = dur
    return entry


# --------------------------------------------------------------------------- contact sheet

def colour_count(path):
    im = Image.open(ROOT / path)
    im = ImageOps.exif_transpose(im).convert("RGB").resize((64, 64), Image.Resampling.LANCZOS)
    return len(set(im.getdata() if not hasattr(im, "get_flattened_data") else im.get_flattened_data()))


def contact_sheet(data, out):
    cells = []
    for key, it in data.items():
        g = (it.get("gallery") or [])[:2]
        for i, p in enumerate(g):
            if (ROOT / p).exists():
                cells.append((key, i, p))
    tw, th, lab, cols = 220, 165, 34, 6
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + lab)), (250, 250, 250))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for n, (key, i, p) in enumerate(cells):
        x, y = (n % cols) * tw, (n // cols) * (th + lab)
        im = ImageOps.exif_transpose(Image.open(ROOT / p)).convert("RGB")
        im.thumbnail((tw - 8, th - 8))
        sheet.paste(im, (x + (tw - im.width) // 2, y + (th - im.height) // 2))
        cc = colour_count(p)
        colour = (200, 30, 30) if cc < 1600 else (40, 40, 40)
        draw.text((x + 6, y + th), f"{key} [{i}]  {cc} colours", fill=colour, font=font)
        draw.text((x + 6, y + th + 14), os.path.basename(p)[:34], fill=(110, 110, 110), font=font)
    sheet.save(out)
    return out, len(cells)


# --------------------------------------------------------------------------- media.js

def write_media_js(img, pdf, video):
    lines = ["// GENERATED by scripts/build-images.py — do not edit",
             "// Derivative widths, intrinsic size, dominant colour (c) and LQIP (q) per source path,",
             "// keyed exactly as written in js/data.js. Optional at runtime: the app falls back to originals.",
             "const MEDIA = {"]

    def block(name, d, last):
        lines.append(f'"{name}": {{')
        keys = sorted(d)
        for i, k in enumerate(keys):
            comma = "," if i < len(keys) - 1 else ""
            lines.append(f"{json.dumps(k)}: {json.dumps(d[k], separators=(',', ':'))}{comma}")
        lines.append("}" + ("" if last else ","))

    block("img", img, False)
    block("pdf", pdf, False)
    block("video", video, True)
    lines.append("};")
    txt = "\n".join(lines) + "\n"
    old = MEDIA_JS.read_text(encoding="utf-8") if MEDIA_JS.exists() else None
    if old == txt:
        return False
    MEDIA_JS.write_text(txt, encoding="utf-8")
    return True


# --------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--contact", action="store_true", help="write a contact sheet of gallery[0]/[1] (not committed)")
    ap.add_argument("--out", default="/tmp/ib-contact.png", help="contact sheet path (default /tmp/ib-contact.png)")
    ap.add_argument("--video", action="store_true", help="re-encode the golf video to 720p (slow, needs ffmpeg)")
    ap.add_argument("--force", action="store_true", help="re-encode every output even if it exists")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 2, help="parallel workers")
    args = ap.parse_args()

    t0 = time.time()
    log = print
    if not features.check("webp"):
        sys.exit("This Pillow build has no WebP support.")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    nojekyll = ROOT / ".nojekyll"
    if not nojekyll.exists():
        nojekyll.write_text("")
        log("  wrote .nojekyll")

    data = load_catalog()
    photos, gallery0, logos, pdfs, videos = collect(data)
    log(f"Catalog: {len(data)} items, {len(photos)} photos, {len(logos)} logos, {len(pdfs)} PDFs, {len(videos)} video(s)")

    if args.video:
        encode_720(args.force, log)

    prev = read_existing_media()
    prev_img = prev.get("img", {}) if isinstance(prev, dict) else {}

    # ---- images: decide per source what (if anything) needs encoding
    sources = {}
    missing = []
    for p in list(photos) + list(logos):
        if p in sources:
            continue
        if not (ROOT / p).is_file():
            missing.append(p)
            continue
        tiers = tuple(sorted(set((PHOTO_WIDTHS if p in photos else ()) + (LOGO_WIDTHS if p in logos else ()))))
        sources[p] = (tiers, p in gallery0)

    media_img, jobs, reused = {}, [], 0
    orig_bytes = 0
    for p, (tiers, need_q) in sources.items():
        orig_bytes += (ROOT / p).stat().st_size
        h8 = sha8(p)
        old = prev_img.get(p)
        if (not args.force and old and old.get("id") == f"{slug_for(p)}-{h8}"
                and old.get("v") == plan_widths(old.get("w", 0), tiers)
                and (not need_q or old.get("q"))
                and all((OUT_DIR / f"{old['id']}-{w}.webp").exists() for w in old["v"])):
            e = dict(old)
            if not need_q:
                e.pop("q", None)
            media_img[p] = e
            reused += 1
        else:
            jobs.append((p, h8, tiers, need_q, args.force))

    written = 0
    if jobs:
        log(f"Encoding {len(jobs)} source image(s) with {args.jobs} worker(s)...")
        with ProcessPoolExecutor(max_workers=max(1, args.jobs)) as ex:
            for n, (p, entry, w, _sizes) in enumerate(ex.map(process_image, jobs, chunksize=1), 1):
                media_img[p] = entry
                written += w
                if n % 20 == 0 or n == len(jobs):
                    log(f"  {n}/{len(jobs)} done")

    # ---- PDFs and video
    prev_pdf = prev.get("pdf", {}) if isinstance(prev, dict) else {}
    media_pdf = {}
    if not which("pdfinfo"):
        log("  pdf    pdfinfo not found: page counts skipped (byte sizes still recorded)")
    for p in pdfs:
        m = pdf_meta(p, prev_pdf.get(p))
        if m:
            media_pdf[p] = m
        else:
            missing.append(p)

    prev_vid = prev.get("video", {}) if isinstance(prev, dict) else {}
    media_video = {}
    for v in list(videos) + [d for d in VIDEO_720 if (ROOT / d).exists()]:
        if v in media_video:
            continue
        e = video_entry(v, prev_vid.get(v), args.force, log)
        if e:
            media_video[v] = e
        elif not (ROOT / v).exists():
            missing.append(v)

    # ---- brand marks, icons, startup images
    brand = build_brand(args.force)

    # ---- prune derivatives that no current source maps to
    keep = {f"{e['id']}-{w}.webp" for e in media_img.values() for w in e["v"]}
    keep |= {Path(e["poster"]).name for e in media_video.values() if e.get("poster")}
    pruned = 0
    for f in OUT_DIR.iterdir():
        if f.is_file() and f.name not in keep:
            f.unlink()
            pruned += 1

    changed = write_media_js(media_img, media_pdf, media_video)

    # ---- sanity: every id/variant file referenced by media.js exists
    bad = [f"{e['id']}-{w}.webp" for e in media_img.values() for w in e["v"]
           if not (OUT_DIR / f"{e['id']}-{w}.webp").exists()]
    bad += [e["poster"] for e in media_video.values() if e.get("poster") and not (ROOT / e["poster"]).exists()]

    # ---- summary
    def total_at(width):
        """Bytes if every photo were served at `width` (or its largest variant below that)."""
        s = 0
        for p, e in media_img.items():
            if p not in photos:
                continue
            w = next((x for x in e["v"] if x >= width), e["v"][-1])
            s += (OUT_DIR / f"{e['id']}-{w}.webp").stat().st_size
        return s

    deriv_total = sum(f.stat().st_size for f in OUT_DIR.iterdir() if f.is_file())
    photo_orig = sum((ROOT / p).stat().st_size for p in media_img if p in photos)
    q_sizes = [len(e["q"]) for e in media_img.values() if e.get("q")]
    log("")
    log("Summary")
    log(f"  sources      {len(media_img)} images ({human(orig_bytes)} originals): {reused} reused, {len(jobs)} encoded, {written} file(s) written")
    log(f"  photos       {sum(1 for p in media_img if p in photos)} = {human(photo_orig)} as originals"
        f" -> {human(total_at(480))} at 480w, {human(total_at(800))} at 800w, {human(total_at(1600))} at 1600w")
    for p in sorted(logos):
        if p in media_img:
            e = media_img[p]
            log(f"  logo         {p}: {human((ROOT / p).stat().st_size)} -> {human((OUT_DIR / (e['id'] + '-' + str(e['v'][0]) + '.webp')).stat().st_size)} at {e['v'][0]}w")
    if q_sizes:
        log(f"  lqip         {len(q_sizes)} inline previews, {min(q_sizes)}-{max(q_sizes)} chars (avg {sum(q_sizes) // len(q_sizes)})")
    log(f"  assets/img   {sum(1 for f in OUT_DIR.iterdir() if f.is_file())} files, {human(deriv_total)}; {pruned} orphan(s) pruned")
    log(f"  pdf          {len(media_pdf)} PDFs ({sum(1 for e in media_pdf.values() if 'pages' in e)} with page counts)")
    for v, e in media_video.items():
        log(f"  video        {v}: {human((ROOT / v).stat().st_size)}, {e.get('dur', '?')} s, poster {e.get('poster', 'none')}")
    for p, new in brand:
        log(f"  brand        {rel(p)} {p.stat().st_size // 1024 or 1} KB {'(written)' if new else '(up to date)'}")
    log(f"  js/media.js  {MEDIA_JS.stat().st_size // 1024} KB {'(updated)' if changed else '(unchanged)'}")
    unref = [s for d, s in VIDEO_720.items() if (ROOT / d).exists() and d not in videos and s in videos]
    for s in unref:
        log(f"  NOTE         js/data.js still references {s}; point it at the 720p file.")
    for m in missing:
        log(f"  MISSING      {m} (referenced in js/data.js but not on disk)")
    for b in bad:
        log(f"  ERROR        {b} is referenced by js/media.js but does not exist")
    if args.contact:
        out, n = contact_sheet(data, args.out)
        log(f"  contact      {out} ({n} images; red labels = fewer than 1,600 colours, likely a logo)")
    log(f"Done in {time.time() - t0:.1f}s")
    return 1 if (bad or missing) else 0


if __name__ == "__main__":
    sys.exit(main())

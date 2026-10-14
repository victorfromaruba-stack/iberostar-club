"""Assemble Show-Up Academy from src/ into one HTML file.

    python3 src/build.py                 artifact format (no doctype; the host wraps it) -> ../index.html
    python3 src/build.py --page          full page for GitHub Pages (noindex, manifest, icons) -> ../index.html
    python3 src/build.py --out FILE      write somewhere else

The voice notes' timed transcripts (CLIPS) come from clips.json, made by build_clips.py from the
Whisper transcript. Every Script line is checked against the sentences it points at, so a wrong
clip/from/to fails the build instead of playing the wrong words.
"""
import json, re, subprocess, sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
ARGS = sys.argv[1:]
PAGE = "--page" in ARGS
OUT = Path(ARGS[ARGS.index("--out") + 1]) if "--out" in ARGS else ROOT / "index.html"
CLIPS = SRC / "clips.json"
JS = ["icons.js", "mascot.js", "content-pre.js", "levels.js", "content-post.js", "app.js", "team.js", "boot.js"]
FONTS = ("https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800"
         "&family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap")

clips = json.loads(CLIPS.read_text(encoding="utf-8"))
script = "\n".join((SRC / f).read_text(encoding="utf-8").strip() for f in JS)
clips_js = json.dumps(clips, ensure_ascii=False, separators=(",", ":"))
script, n = re.subn(r"/\*CLIPS\*/\[\]/\*CLIPS-END\*/", lambda m: f"/*CLIPS*/{clips_js}/*CLIPS-END*/", script)
assert n == 1, "CLIPS marker not found in content-post.js"
assert "</script" not in script.lower(), "a </script> inside the code would end the script tag"

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Staff training for OPCs: Aruba guest qualifications and the Open House invitation pitch.">
<meta name="theme-color" content="#00838a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Show-Up">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-512.png" type="image/png">
<link rel="apple-touch-icon" href="icon-180.png">
<style>:root{padding-top:env(safe-area-inset-top,0px)}body{margin:0}img{max-width:100%}</style>
"""
page = f"""<title>Show-Up Academy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{(SRC / "style.css").read_text(encoding="utf-8").strip()}
</style>
{"</head>" + chr(10) + "<body>" if PAGE else ""}
<main id="app"></main>
<canvas id="fx" aria-hidden="true" hidden></canvas>
<script>
"use strict";
{script}
</script>
{"</body>" + chr(10) + "</html>" if PAGE else ""}"""
if PAGE:
    page = HEAD + page
out = OUT
out.write_text(page.rstrip() + "\n", encoding="utf-8")

# Check: the script parses, and every Script line matches the sentences it plays.
check = r"""
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[1], "utf8");
const code = html.slice(html.indexOf('"use strict";'), html.lastIndexOf("</script>"));
new vm.Script(code);  // throws on a syntax error
const body = code.slice(0, code.indexOf("/* ---------- Scenario generator"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(body.replace(/^const (SCRIPT|CLIPS|SCRIPT_LINES|MAP_STEPS) =/gm, "var $1 =").replace(/^const /gm, "var "), ctx);
const words = s => s.toLowerCase().replace(/[^a-z0-9$' ]+/g, " ").split(/\s+/).filter(Boolean);
let bad = 0, n = 0;
const clipText = (c, a, b) => { const k = ctx.CLIPS.find(x => x.id === c); return k.s.slice(a, b + 1).map(x => x[1]).join(" "); };
const items = [];
for (const st of ctx.SCRIPT){
  for (const l of st.lines) items.push([l.id, l.clip, l.from, l.to, l.text]);
  if (st.dont) items.push([st.step + " (don't)", st.dont.clip, st.dont.from, st.dont.to, st.dont.text]);
}
for (const [id, c, a, b, text] of items){
  n++;
  const heard = clipText(c, a, b), w = words(text), h = new Set(words(heard));
  const hit = w.filter(x => h.has(x)).length / w.length;
  if (hit < 0.6){ bad++; console.log(`MISMATCH ${id} ${c}:${a}-${b} ${Math.round(hit*100)}%\n  app:   ${text}\n  voice: ${heard}`); }
}
console.log(`${n} script lines checked against the voice notes, ${bad} mismatched`);
process.exit(bad ? 1 : 0);
"""
r = subprocess.run(["node", "-e", check, str(out)], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
if r.returncode:
    print(r.stderr.strip()[-2000:])
    sys.exit("build check failed")
lint = subprocess.run(["node", str(SRC / "lint_content.js"), str(out)], capture_output=True, text=True)
print(lint.stdout.strip())
if lint.returncode:
    sys.exit("content check failed")
print(f"wrote {out} ({out.stat().st_size:,} bytes)")

#!/usr/bin/env python3
"""Generate README image assets for dsh-contract-stance (docs/assets/).

Outputs (idempotent overwrite):
  dsh-contract-stance-flow-light.svg / dsh-contract-stance-flow-dark.svg
      Hero pipeline diagram. Two hand-written SVG files (vector — never
      rasterized to webp). Text inside is command-surface tokens only
      (`material`, `contract_stance`, `rules/contract-stance.yaml`,
      `CS-001..CS-007`, `report`, ...), so all five README languages share the
      same pair.

The plugin has no browser half and carries no benchmark data, so there is no
UI screenshot and no evidence chart. The pre-existing single-theme
`dsh-contract-stance-flow.svg` and `dsh-contract-stance-hero.png` are kept on
disk for external links (no 404s) and are no longer referenced by the READMEs.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow (for the CJK font probe that guards any future localized
           raster asset; the two SVGs themselves are plain text).
"""
from __future__ import annotations

import os
import sys
from xml.sax.saxutils import escape

from PIL import ImageFont  # noqa: F401  (kept so the probe below is honest)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badges labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
ORANGE = {"light": "#bc4c00", "dark": "#d29922"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a", track="#eaeef2"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e", track="#21262d"),
}

# --- CJK font probe: Chinese must never render as tofu boxes ----------------
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",    # SimHei
    r"C:\Windows\Fonts\Deng.ttf",      # DengXian
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]
FONT_PATH = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
if FONT_PATH is None:
    sys.exit("FATAL: no CJK font found (looked for msyh.ttc, simhei.ttf, "
             "Deng.ttf, Noto Sans CJK, PingFang). Refusing to render Chinese "
             "as tofu boxes; install one of the probed fonts and re-run.")


def font(size: int) -> "ImageFont.FreeTypeFont":
    return ImageFont.truetype(FONT_PATH, size)


# ---------------------------------------------------------------------------
# Hero pipeline SVG (light + dark)
# ---------------------------------------------------------------------------
# Four stages of the real host-side pipeline: the material (a clause-stance
# register), the single registered tool and its rule pack, the seven rules,
# and the report the model reads.
FLOW_NODES = [
    ("material", "JSON | YAML"),
    ("contract_stance", "rules/contract-stance.yaml"),
    ("CS-001..CS-007", "direct | derived"),
    ("report", "markdown + reportJson"),
]


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 400
    nw, nh, gap = 220, 96, 55
    x0, y0 = 70, 150
    accents = [s["border"], FAMILY, ORANGE[skin], GREEN[skin]]
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="dsh-contract-stance pipeline">',
        '<title>dsh-contract-stance pipeline</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="60" y="62" fill="{s["text"]}" '
        f'font-family="ui-sans-serif,system-ui,sans-serif" font-size="30" '
        f'font-weight="700">dsh-contract-stance</text>',
        f'<text x="60" y="94" fill="{s["sub"]}" '
        f'font-family="ui-monospace,monospace" font-size="16">'
        f'contract_stance · rules/contract-stance.yaml · CS-001..CS-007</text>',
        f'<line x1="60" y1="116" x2="1140" y2="116" stroke="{s["border"]}"/>',
    ]
    for i, (label, sub) in enumerate(FLOW_NODES):
        x = x0 + i * (nw + gap)
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accents[i]}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 40}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="16" font-weight="700">{escape(label)}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 68}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="12">{escape(sub)}</text>')
        if i < len(FLOW_NODES) - 1:
            ax = x + nw + 6
            ay = y0 + nh // 2
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 12}" stroke="{s["sub"]}" '
                f'stroke-width="3"/>')
            parts.append(
                f'<path d="M{ax + gap - 14} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')
    # skipped branch: rules whose vocabulary ships empty report themselves
    bx, bw, by, bh = 345, 690, 292, 52
    for cx in (x0 + 2 * (nw + gap) + nw // 2, x0 + 3 * (nw + gap) + nw // 2):
        parts.append(
            f'<path d="M{cx} {y0 + nh}v{by - y0 - nh}" '
            f'stroke="{FAMILY}" stroke-width="2" stroke-dasharray="5 5"/>')
    parts.append(
        f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="{bx + bw // 2}" y="{by + 32}" fill="{s["text"]}" '
        f'text-anchor="middle" font-family="ui-monospace,monospace" '
        f'font-size="14">skipped: CS-002 | CS-003 values: []</text>')
    parts.append(
        f'<text x="60" y="378" fill="{s["sub"]}" '
        f'font-family="ui-monospace,monospace" font-size="13">'
        f'excerpt: verbatim · kind: direct | derived-from-principle · '
        f'severity: warn | info</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        with open(os.path.join(OUT, f"dsh-contract-stance-flow-{skin}.svg"),
                  "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    print("wrote 2 SVG assets to docs/assets/")


if __name__ == "__main__":
    main()

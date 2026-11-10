#!/usr/bin/env python3
"""Generate the README visuals for dsh-contract-stance.

Outputs (idempotent overwrite):

  docs/assets/dsh-contract-stance-hero-{zh,en}-{light,dark}.webp   (1440x576, Pillow)
  docs/assets/dsh-contract-stance-flow-v5-{light,dark}.svg         (1100x660, hand-written SVG)

Both images are derived from the pipeline the repository actually ships:

  material (JSON | YAML: contract header + one row per clause)
    -> parseTable + canonicaliseRow      (authored column names -> canonical fields)
    -> runTableCheck against rules/contract-stance.yaml
       (7 rules; the pack is validated on load: verbatim excerpt >= 8 chars,
        kind caps the severity)
    -> issues[] for rules that ran, skipped[] for rules that could not run
    -> buildView -> markdown + reportJson (+ the fixed disclaimer)

Hero  - one register row as a dossier card. Its clause-text cell is hollow and
        carries CS-001; the values around it are the sample row from
        samples/quickstart/input/CS-001-unsafe.json (可谈 / 中 / 退让底线 /
        王经理 / 第 8.2 条) and the summary line is that sample's real output
        (warn 1, skipped 2). Nothing about the plugin is invented.

Flow  - grammar: "one read-only register sheet + a rule-pack annotation rail +
        a two-channel report bar". Each rail stamp pairs the rule id with the
        field it reads and its check kind - text/presence, text/containsAny,
        stance/enum, riskLevel/enum, fallback+owner/conditionalPresence,
        clauseNo/unique, header/headerPresence. Outcomes are the real
        quickstart result: CS-001 -> 1 issue; CS-002 and CS-003 -> skipped
        (their value lists ship empty); the remaining four -> no diff.
        Deliberately not a chain of boxes with arrows.

Every string is measured before it is drawn; the script refuses to write an
image whose text would overflow its box (see CHECKS at the end of the run).

Run:  python scripts/gen-readme-assets.py
Needs: Python 3, Pillow. Chrome/Edge is used only for the manual render check.
"""
from __future__ import annotations

import math
import os
import sys
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

F_SANS = r"C:\Windows\Fonts\msyh.ttc"
F_SANS_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
F_MONO = r"C:\Windows\Fonts\consola.ttf"
F_MONO_BOLD = r"C:\Windows\Fonts\consolab.ttf"

for _path in (F_SANS, F_SANS_BOLD, F_MONO, F_MONO_BOLD):
    if not os.path.exists(_path):
        sys.exit(f"FATAL: required font missing: {_path}")

W, H = 1440, 576

# --- family palette -------------------------------------------------------
# family accent #4B67B4 (dark #8496f5); light base #f9f6fd -> #e4eaf8;
# dark base #131a2a -> #0c1016.
HERO = {
    "light": dict(
        bg_top=(249, 246, 253), bg_bot=(228, 234, 248),
        ink=(21, 20, 32), sub=(74, 79, 100), faint=(126, 130, 150),
        accent=(75, 103, 180), accent_soft=(236, 235, 249),
        card=(255, 255, 255), border=(226, 223, 240),
        divider=(219, 216, 235),
        hollow=(244, 241, 254),
        warn=(176, 83, 9), warn_soft=(253, 241, 227),
        warn_border=(228, 178, 116), warn_text=(138, 84, 26),
        mute_bg=(243, 241, 248), mute_ink=(116, 120, 138),
        pill=(255, 255, 255), pill_border=(226, 222, 240),
        shadow=(24, 18, 48),
    ),
    "dark": dict(
        bg_top=(19, 26, 42), bg_bot=(12, 16, 22),
        ink=(237, 241, 252), sub=(160, 170, 198), faint=(128, 138, 168),
        accent=(132, 150, 245), accent_soft=(35, 44, 74),
        card=(26, 34, 51), border=(44, 54, 80),
        divider=(40, 50, 74),
        hollow=(35, 44, 74),
        warn=(240, 180, 95), warn_soft=(52, 40, 25),
        warn_border=(122, 91, 45), warn_text=(233, 190, 120),
        mute_bg=(30, 39, 59), mute_ink=(146, 156, 184),
        pill=(36, 46, 70), pill_border=(52, 64, 92),
        shadow=(0, 0, 0),
    ),
}

HERO_TEXT = {
    "zh": dict(
        kicker="DeepSeek Harness 插件 · 合同条款立场核对",
        title="dsh-contract-stance",
        value=["谈判前，看清每一处缺项", "哪一行、哪一栏，指得出来"],
        sub=["一页台账：表头 + 每条款一行；七条规则核对栏位与取值口径。",
             "空清单不静默通过——未执行的规则逐条进 skipped。"],
        meta="contract_stance · CS-001..CS-007 · rules/contract-stance.yaml",
        footer="Apache-2.0 · 只读材料 · 不联网 · 不调用模型",
        card_title="台账 · 第 1 行",
        card_pill="必保 是",
        card_sub="第 8.2 条 · 逾期付款违约金",
        labels=["条款原文", "本方立场", "风险等级", "退让底线", "谈判责任人", "条款号"],
        values=[None, "可谈", "中", "比例可降至万分之三，须增加…", "王经理", "第 8.2 条"],
        empty="（空）",
        slip1="CS-001 · presence · row 1 · text",
        slip2="warn · found 空",
        summary=[("error 0", "mute"), ("warn 1", "warn"),
                 ("info 0", "mute"), ("skipped 2", "skip")],
        source="示例行：samples/quickstart/input/CS-001-unsafe.json",
        zh_labels=True,
    ),
    "en": dict(
        kicker="DeepSeek Harness plugin · contract clause stance",
        title="dsh-contract-stance",
        value=["Every gap gets a row and a column.", "Nothing gets a verdict."],
        sub=["Reads a clause-stance register: header + one row per clause,",
             "then lists what each of seven rules finds missing."],
        meta="contract_stance · CS-001..CS-007 · rules/contract-stance.yaml",
        footer="Apache-2.0 · read-only · no network · no model calls",
        card_title="Register · row 1",
        card_pill="mustHave 是",
        card_sub="Clause 8.2 · payment-delay penalty",
        labels=["text", "stance", "riskLevel", "fallback", "owner", "clauseNo"],
        values=[None, "可谈", "中", "比例可降至万分之三，须增加…", "王经理", "第 8.2 条"],
        empty="(empty)",
        slip1="CS-001 · presence · row 1 · text",
        slip2="warn · found empty",
        summary=[("error 0", "mute"), ("warn 1", "warn"),
                 ("info 0", "mute"), ("skipped 2", "skip")],
        source="Sample row: samples/quickstart/input/CS-001-unsafe.json",
        zh_labels=False,
    ),
}

_FONTS: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
CHECKS: list[tuple[str, float, float]] = []


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    key = (path, size)
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(path, size)
    return _FONTS[key]


def sans(size: int) -> ImageFont.FreeTypeFont:
    return font(F_SANS, size)


def sans_b(size: int) -> ImageFont.FreeTypeFont:
    return font(F_SANS_BOLD, size)


def mono(size: int) -> ImageFont.FreeTypeFont:
    return font(F_MONO, size)


def mono_b(size: int) -> ImageFont.FreeTypeFont:
    return font(F_MONO_BOLD, size)


def tw(text: str, f: ImageFont.FreeTypeFont) -> float:
    return f.getlength(text)


def check(name: str, text: str, f: ImageFont.FreeTypeFont, limit: float) -> None:
    """Record a text/box pair; any overflow fails the run (see main)."""
    CHECKS.append((name, tw(text, f), limit))


def mix(c1, c2, t: float):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


# --- Pillow helpers -------------------------------------------------------
def add_shadow(img, box, radius, dy=10, blur=18, alpha=38, color=(24, 18, 48)):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((box[0], box[1] + dy, box[2], box[3] + dy),
                        radius=radius, fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def hero_bg(theme: str) -> Image.Image:
    p = HERO[theme]
    small = Image.new("RGB", (72, 72))
    px = small.load()
    top, bot = p["bg_top"], p["bg_bot"]
    for y in range(72):
        for x in range(72):
            t = (0.70 * y + 0.30 * x) / 71.0
            px[x, y] = mix(top, bot, t)
    img = small.resize((W, H), Image.BICUBIC).convert("RGBA")

    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deco)
    if theme == "light":
        dd.ellipse((1040, -190, 1630, 400),
                   fill=mix(p["bg_top"], (255, 255, 255), 0.72) + (120,))
        arc = p["accent"] + (20,)
    else:
        dd.ellipse((1040, -190, 1630, 400),
                   fill=mix(p["bg_top"], p["accent"], 0.10) + (130,))
        arc = p["accent"] + (26,)
    cx, cy, r = 96, 596, 214
    for off in (0, 36, 72):
        dd.arc((cx - r - off, cy - r - off, cx + r + off, cy + r + off),
               208, 332, fill=arc, width=2)
    deco = deco.filter(ImageFilter.GaussianBlur(26))
    img.alpha_composite(deco)
    return img


def _arc(cx, cy, r, a0, a1, steps=10):
    pts = []
    for k in range(1, steps + 1):
        a = math.radians(a0 + (a1 - a0) * k / steps)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _stroke_dashed(d, pts, color, width, dash=7.0, gap=4.5):
    on = True
    remain = dash
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        seg = math.hypot(x1 - x0, y1 - y0)
        if seg <= 0.01:
            continue
        t = 0.0
        while t < seg - 0.01:
            step = min(remain, seg - t)
            if on:
                a = (x0 + (x1 - x0) * t / seg, y0 + (y1 - y0) * t / seg)
                b = (x0 + (x1 - x0) * (t + step) / seg,
                     y0 + (y1 - y0) * (t + step) / seg)
                d.line([a, b], fill=color, width=width)
            t += step
            remain -= step
            if remain <= 0.01:
                on = not on
                remain = dash if on else gap


def dashed_round_rect(d, box, radius, color, width=2, dash=7.0, gap=4.5):
    x0, y0, x1, y1 = box
    r = min(radius, (x1 - x0) / 2 - 0.5, (y1 - y0) / 2 - 0.5)
    pts = [(x0 + r, y0), (x1 - r, y0)]
    pts += _arc(x1 - r, y0 + r, r, -90, 0)
    pts.append((x1, y1 - r))
    pts += _arc(x1 - r, y1 - r, r, 0, 90)
    pts.append((x0 + r, y1))
    pts += _arc(x0 + r, y1 - r, r, 90, 180)
    pts.append((x0, y0 + r))
    pts += _arc(x0 + r, y0 + r, r, 180, 270)
    pts.append((x0 + r, y0))
    _stroke_dashed(d, pts, color, width, dash, gap)


def rr(d, box, radius, **kw):
    """Pillow needs integer geometry; this keeps the layout in floats."""
    b = tuple(int(round(v)) for v in box)
    r = int(round(min(radius, (b[2] - b[0]) / 2, (b[3] - b[1]) / 2)))
    d.rounded_rectangle(b, radius=r, **kw)
    return b


def pill(d, x, y, h, text, f, fg, bg, padx=12, border=None, border_w=1.4):
    w = tw(text, f) + padx * 2
    rr(d, (x, y, x + w, y + h), h / 2, fill=bg, outline=border,
       width=int(round(border_w)))
    d.text((x + padx, y + h / 2 + 0.5), text, font=f, fill=fg, anchor="lm")
    return w


def draw_hero(lang: str, theme: str) -> Image.Image:
    t = HERO_TEXT[lang]
    p = HERO[theme]
    img = hero_bg(theme)

    card = (884, 56, 1392, 520)
    add_shadow(img, card, 22, dy=16, blur=28, alpha=44 if theme == "light" else 96,
               color=p["shadow"])
    d = ImageDraw.Draw(img)
    rr(d, card, 22, fill=p["card"], outline=p["border"], width=2)

    # ---- left column -----------------------------------------------------
    kf = sans(19)
    kw = tw(t["kicker"], kf)
    check(f"hero/{lang}/{theme}/kicker", t["kicker"], kf, 820)
    rr(d, (64, 58, 64 + kw + 62, 96), 19, fill=p["pill"],
       outline=p["pill_border"], width=2)
    d.ellipse((79, 73, 86, 80), fill=p["accent"])
    d.text((64 + 32, 77), t["kicker"], font=kf, fill=p["accent"], anchor="lm")

    title_f = sans_b(79)
    check(f"hero/{lang}/{theme}/title", t["title"], title_f, 812)
    d.text((64, 202), t["title"], font=title_f, fill=p["ink"], anchor="ls")

    value_f = sans_b(40)
    for i, line in enumerate(t["value"]):
        check(f"hero/{lang}/{theme}/value{i}", line, value_f, 800)
        d.text((64, 276 + i * 50), line, font=value_f, fill=p["ink"], anchor="ls")

    sub_f = sans(25)
    for i, line in enumerate(t["sub"]):
        check(f"hero/{lang}/{theme}/sub{i}", line, sub_f, 800)
        d.text((64, 386 + i * 32), line, font=sub_f, fill=p["sub"], anchor="ls")

    meta_f = mono(21)
    check(f"hero/{lang}/{theme}/meta", t["meta"], meta_f, 800)
    d.text((64, 470), t["meta"], font=meta_f, fill=p["faint"], anchor="ls")

    d.line((64, 496, 820, 496), fill=p["divider"], width=1)
    foot_f = sans(20)
    check(f"hero/{lang}/{theme}/footer", t["footer"], foot_f, 780)
    d.text((64, 532), t["footer"], font=foot_f, fill=p["faint"], anchor="ls")

    # ---- right card: one register row -----------------------------------
    lx = 908
    d.text((lx, 100), t["card_title"], font=sans_b(20), fill=p["ink"], anchor="ls")
    pf = sans(14)
    pw = tw(t["card_pill"], pf) + 26
    rr(d, (1368 - pw, 82, 1368, 108), 13, fill=p["accent_soft"])
    d.text((1368 - pw / 2, 95.5), t["card_pill"], font=pf, fill=p["accent"],
           anchor="mm")
    d.text((lx, 130), t["card_sub"], font=sans(16), fill=p["sub"], anchor="ls")
    d.line((lx, 146, 1368, 146), fill=p["divider"], width=1)

    label_f = sans(15) if t["zh_labels"] else mono(14)
    value_f = sans(17)
    row_y = [182, 224, 266, 308, 350, 392]
    for i, (label, value) in enumerate(zip(t["labels"], t["values"])):
        y = row_y[i]
        check(f"hero/{lang}/{theme}/label{i}", label, label_f, 92)
        d.text((lx, y), label, font=label_f, fill=p["faint"], anchor="ls")
        if value is None:
            box = (1010, 160, 1130, 190)
            dashed_round_rect(d, box, 10, p["accent"], width=2, dash=6, gap=4)
            d.text(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2 + 1),
                   t["empty"], font=sans(15), fill=p["accent"], anchor="mm")
        else:
            check(f"hero/{lang}/{theme}/value{i}", value, value_f, 356)
            d.text((1010, y), value, font=value_f, fill=p["ink"], anchor="ls")

    slip = (908, 414, 1368, 470)
    rr(d, slip, 14, fill=p["warn_soft"], outline=p["warn_border"], width=2)
    rr(d, (913, 422, 918, 462), 2.5, fill=p["warn"])
    slip_f1 = mono(13.5)
    check(f"hero/{lang}/{theme}/slip1", t["slip1"], slip_f1, 430)
    d.text((924, 436), t["slip1"], font=slip_f1, fill=p["warn"], anchor="ls")
    slip_f2 = sans(13.5)
    d.text((924, 458), t["slip2"], font=slip_f2, fill=p["warn_text"], anchor="ls")

    sx = 908
    sum_f = mono(14)
    for text, kind in t["summary"]:
        if kind == "warn":
            fg, bg = p["warn"], p["warn_soft"]
        elif kind == "skip":
            fg, bg = p["accent"], p["accent_soft"]
        else:
            fg, bg = p["mute_ink"], p["mute_bg"]
        w = pill(d, sx, 482, 24, text, sum_f, fg, bg, padx=11)
        sx += w + 8

    src_f = sans(14)
    check(f"hero/{lang}/{theme}/source", t["source"], src_f, 508)
    d.text((884, 544), t["source"], font=src_f, fill=p["faint"], anchor="ls")
    return img


# --- flow SVG -------------------------------------------------------------
SANS_FAM = ("'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',"
            "'Source Han Sans SC',sans-serif")
MONO_FAM = ("Consolas,'Cascadia Mono','SFMono-Regular','Menlo',"
            "ui-monospace,monospace")

FLOW = {
    "light": dict(
        bg1="#f9f6fd", bg2="#e4eaf8", card="#ffffff", border="#e3e1f0",
        ink="#171821", sub="#565b6b", faint="#8b8fa3",
        accent="#4B67B4", accent_soft="#ecebf9",
        warn="#B0530A", warn_soft="#FDF1E3", warn_border="#E6B87C",
        ok="#1F7A4A", ok_soft="#EAF7EF",
        line="#d8d6e6", spine="#c9c7dd",
        shadow="#1b1533", shadow_op="0.10",
    ),
    "dark": dict(
        bg1="#131a2a", bg2="#0c1016", card="#1a2233", border="#2b3650",
        ink="#e9edf9", sub="#9aa6c4", faint="#7c88a6",
        accent="#8496f5", accent_soft="#232c4a",
        warn="#F0B45F", warn_soft="#342819", warn_border="#7A5B2D",
        ok="#6FD39A", ok_soft="#1C2F26",
        line="#2b3650", spine="#39456a",
        shadow="#000000", shadow_op="0.45",
    ),
}

# (rule id, field it reads, check kind, outcome, outcome class)
FLOW_STAMPS = [
    ("CS-001", "text", "presence", "1 issue", "warn"),
    ("CS-002", "stance", "enum", "skipped", "skip"),
    ("CS-003", "riskLevel", "enum", "skipped", "skip"),
    ("CS-004", "fallback + owner", "conditionalPresence", "no diff", "ok"),
    ("CS-005", "clauseNo", "unique", "no diff", "ok"),
    ("CS-006", "header", "headerPresence", "no diff", "ok"),
    ("CS-007", "text", "containsAny", "no diff", "ok"),
]

FLOW_FIELDS = [
    ("text", None),
    ("stance", "可谈"),
    ("riskLevel", "中"),
    ("fallback", "比例可降至万分之三，须增加…"),
    ("owner", "王经理"),
    ("clauseNo", "第 8.2 条"),
]


def mixed_w(text: str, size: int, mono_font: bool = True, bold: bool = False) -> float:
    if mono_font:
        path = F_MONO_BOLD if bold else F_MONO
    else:
        path = F_SANS_BOLD if bold else F_SANS
    f = font(path, size)
    total = 0.0
    for ch in text:
        total += size if ord(ch) >= 0x2E80 else f.getlength(ch)
    return total


class Svg:
    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.body: list[str] = []

    def add(self, chunk: str) -> None:
        self.body.append(chunk)

    def text(self, x, y, s, size, fill, mono_font=True, bold=False,
             anchor="start", ls=None, opacity=None):
        attr = []
        if anchor != "start":
            attr.append(f'text-anchor="{anchor}"')
        if bold:
            attr.append('font-weight="700"')
        if ls is not None:
            attr.append(f'letter-spacing="{ls}"')
        if opacity is not None:
            attr.append(f'opacity="{opacity}"')
        fam = MONO_FAM if mono_font else SANS_FAM
        self.add(f'<text x="{x:g}" y="{y:g}" fill="{fill}" '
                 f'font-family="{fam}" font-size="{size:g}" '
                 f'{" ".join(attr)}>{escape(s)}</text>')

    def rrect(self, x, y, w, h, r, fill, stroke=None, sw=1.5, dash=None,
              extra=""):
        st = f' stroke="{stroke}" stroke-width="{sw:g}"' if stroke else ' stroke="none"'
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" '
                 f'rx="{r:g}" fill="{fill}"{st}{da}{extra}/>')

    def line(self, x1, y1, x2, y2, stroke, sw=1.5, dash=None, cap="round"):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" '
                 f'stroke="{stroke}" stroke-width="{sw:g}" '
                 f'stroke-linecap="{cap}"{da}/>')

    def path(self, d, stroke, sw=1.5, fill="none", dash=None, cap="round"):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<path d="{d}" stroke="{stroke}" stroke-width="{sw:g}" '
                 f'fill="{fill}" stroke-linecap="{cap}" '
                 f'stroke-linejoin="round"{da}/>')

    def circle(self, cx, cy, r, fill, stroke=None, sw=1.4):
        st = f' stroke="{stroke}" stroke-width="{sw:g}"' if stroke else ""
        self.add(f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{fill}"{st}/>')

    def render(self) -> str:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" '
                f'height="{self.h}" viewBox="0 0 {self.w} {self.h}" '
                f'role="img" aria-label="dsh-contract-stance structure">\n'
                + "\n".join(self.body) + "\n</svg>\n")


def flow_svg(theme: str) -> str:
    p = FLOW[theme]
    s = Svg(1100, 660)
    s.add('<defs>'
          '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
          f'<stop offset="0" stop-color="{p["bg1"]}"/>'
          f'<stop offset="1" stop-color="{p["bg2"]}"/>'
          '</linearGradient>'
          '<filter id="sh" x="-10%" y="-14%" width="120%" height="134%">'
          f'<feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="{p["shadow"]}" '
          f'flood-opacity="{p["shadow_op"]}"/>'
          '</filter>'
          '</defs>')
    s.add(f'<rect width="1100" height="660" fill="url(#bg)"/>')

    def chk(name, text, size, mono_font, limit, bold=False):
        CHECKS.append((f"flow/{theme}/{name}",
                       mixed_w(text, size, mono_font, bold), limit))

    # --- header -----------------------------------------------------------
    chk("kicker", "CLAUSE-LEVEL · 7 RULES · ISSUES + SKIPPED", 14, True, 700, True)
    s.text(44, 46, "CLAUSE-LEVEL · 7 RULES · ISSUES + SKIPPED", 14, p["accent"],
           bold=True, ls=1.1)
    chk("title", "dsh-contract-stance", 27, True, 640, True)
    s.text(44, 80, "dsh-contract-stance", 27, p["ink"], bold=True)
    sub = ("Seven rules sit on the columns they read; every finding comes back "
           "as row + column.")
    chk("sub", sub, 14.5, False, 700)
    s.text(44, 104, sub, 14.5, p["sub"], mono_font=False)

    meta1 = "rules/contract-stance.yaml · pack 2026.1"
    meta2 = "contract_stance · JSON | YAML · file | material"
    chk("meta1", meta1, 14, True, 420)
    chk("meta2", meta2, 14, True, 440)
    s.text(1056, 46, meta1, 14, p["faint"], anchor="end")
    s.text(1056, 68, meta2, 14, p["faint"], anchor="end")
    s.line(44, 120, 1056, 120, p["line"], 1.2)

    # --- one annotated register sheet ------------------------------------
    card = (44, 140, 1012, 408)
    s.add(f'<rect x="{card[0]}" y="{card[1]}" width="{card[2]}" height="{card[3]}" '
          f'rx="20" fill="{p["card"]}" filter="url(#sh)"/>')
    s.rrect(card[0], card[1], card[2], card[3], 20, "none", p["border"], 1.6)
    s.line(648, 160, 648, 528, p["line"], 1.2)

    s.text(68, 162, "MATERIAL · REGISTER (READ-ONLY)", 14, p["accent"], bold=True)
    tokens = "contractName · party · contractNo · version"
    chk("header-tokens", tokens, 14, True, 520)
    s.text(68, 188, tokens, 14, p["faint"])
    header_vals = "某某设备采购合同 · 某某公司 · HT-2026-018 · 第 3 轮谈判稿"
    chk("header-values", header_vals, 17, False, 520)
    s.text(68, 212, header_vals, 17, p["ink"], mono_font=False)
    s.line(68, 226, 620, 226, p["line"], 1.2)

    banner = "row 1 · clauseNo 第 8.2 条 · topic 逾期付款违约金"
    chk("banner", banner, 17, True, 520, True)
    s.text(68, 254, banner, 17, p["ink"], bold=True)

    rows = [286, 328, 370, 412, 454, 496]
    for i, (field, value) in enumerate(FLOW_FIELDS):
        y = rows[i]
        chk(f"field{i}", field, 14, True, 108)
        s.text(68, y, field, 14, p["faint"])
        if value is None:
            s.rrect(180, 270, 120, 30, 10, p["accent_soft"], p["accent"], 1.6,
                    dash="6 4")
            s.text(240, 290, "（空）", 15, p["accent"], mono_font=False,
                   anchor="middle")
        else:
            chk(f"value{i}", value, 17, False, 430)
            s.text(180, y, value, 17, p["ink"], mono_font=False)

    note = "columns normalised: case · spaces · _ · - — material never rewritten"
    chk("card-note", note, 14, False, 520)
    s.text(68, 530, note, 14, p["faint"], mono_font=False)

    # --- rule-pack rail ---------------------------------------------------
    s.text(668, 162, "RULE PACK · FIELD · KIND · OUTCOME", 14, p["accent"],
           bold=True)

    y0, step, sh = 178, 47, 42
    for i, (rid, field, kind, outcome, cls) in enumerate(FLOW_STAMPS):
        y = y0 + i * step
        center = y + sh / 2
        if cls == "warn":
            fg, bg, accent = p["warn"], p["warn_soft"], p["warn"]
        elif cls == "skip":
            fg, bg, accent = p["accent"], p["accent_soft"], p["accent"]
        else:
            fg, bg, accent = p["ok"], p["ok_soft"], p["ok"]

        s.add(f'<rect x="668" y="{y}" width="372" height="{sh}" rx="11" '
              f'fill="{p["card"]}" stroke="{p["border"]}" stroke-width="1.3"/>')
        s.add(f'<rect x="668" y="{y + 8}" width="4" height="{sh - 16}" rx="2" '
              f'fill="{accent}"/>')
        chk(f"stamp{i}-id", rid, 17, True, 120, True)
        s.text(684, y + 19, rid, 17, p["ink"], bold=True)
        chk(f"stamp{i}-field", field, 16.5, True, 240)
        s.text(744, y + 19, field, 16.5, p["ink"])
        chk(f"stamp{i}-kind", kind, 14, True, 240)
        s.text(684, y + 37, kind, 14, p["faint"])
        chk(f"stamp{i}-out", outcome, 16, False, 110)
        s.text(1024, y + 37, outcome, 16, fg, mono_font=False, anchor="end")

    note1 = "excerpt must be verbatim, ≥ 8 chars"
    note2 = "kind → cap: derived = warn, institutional = info"
    chk("rail-note1", note1, 14, False, 356)
    chk("rail-note2", note2, 14, False, 356)
    s.text(668, 522, note1, 14, p["faint"], mono_font=False)
    s.text(668, 538, note2, 14, p["faint"], mono_font=False)

    # --- report bar -------------------------------------------------------
    bar = (44, 566, 1012, 62)
    s.add(f'<rect x="{bar[0]}" y="{bar[1]}" width="{bar[2]}" height="{bar[3]}" '
          f'rx="18" fill="{p["card"]}" filter="url(#sh)"/>')
    s.rrect(bar[0], bar[1], bar[2], bar[3], 18, "none", p["border"], 1.6)

    s.text(68, 590, "REPORT", 14, p["accent"], bold=True)
    s.text(68, 614, "returned to the model", 14, p["faint"], mono_font=False)

    pa = "issues[] · 1"
    pb = "skipped[] · 2"
    wa = mixed_w(pa, 15, True) + 24
    wb = mixed_w(pb, 15, True) + 24
    chk("pill-a", pa, 15, True, 160)
    chk("pill-b", pb, 15, True, 160)
    s.rrect(300, 578, wa, 20, 10, p["warn_soft"], p["warn_border"], 1.2)
    s.text(300 + wa / 2, 592, pa, 15, p["warn"], anchor="middle")
    s.rrect(300, 602, wb, 20, 10, p["accent_soft"], p["accent"], 1.2)
    s.text(300 + wb / 2, 616, pb, 15, p["accent"], anchor="middle")

    s.line(300 + wa, 588, 452, 588, p["spine"], 1.4)
    s.line(300 + wb, 612, 452, 612, p["spine"], 1.4)
    s.line(452, 588, 452, 612, p["spine"], 1.4)
    s.line(452, 600, 466, 600, p["spine"], 1.4)
    s.add(f'<path d="M474 600 l-8 -4.6 v9.2 z" fill="{p["spine"]}"/>')

    rp = "markdown · reportJson"
    rw = mixed_w(rp, 16.5, True) + 30
    chk("report-pill", rp, 16.5, True, 260)
    s.rrect(474, 582, rw, 36, 18, p["card"], p["border"], 1.4)
    s.text(474 + rw / 2, 605, rp, 16.5, p["ink"], anchor="middle")

    summary = "error 0 · warn 1 · info 0 · skipped 2"
    chk("summary", summary, 14, True, 320)
    s.text(1028, 590, summary, 14, p["faint"], anchor="end")
    s.text(1028, 614, "no verdict · skipped ≠ clean", 14, p["sub"],
           mono_font=False, anchor="end")

    return s.render()


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    written: list[str] = []

    for theme in ("light", "dark"):
        svg = flow_svg(theme)
        path = os.path.join(OUT, f"dsh-contract-stance-flow-v5-{theme}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(svg)
        written.append(path)

    for lang in ("zh", "en"):
        for theme in ("light", "dark"):
            img = draw_hero(lang, theme)
            path = os.path.join(
                OUT, f"dsh-contract-stance-hero-{lang}-{theme}.webp")
            img.convert("RGB").save(path, "WEBP", quality=90, method=6)
            written.append(path)

    bad = [c for c in CHECKS if c[1] > c[2] + 0.01]
    if bad:
        print("layout overflow (text wider than its box):")
        for name, width, limit in bad:
            print(f"  - {name}: {width:.1f} > {limit:.1f}")
        return 1

    print(f"layout checks: {len(CHECKS)} text boxes fit")
    for path in written:
        print(f"wrote {os.path.relpath(path, ROOT)} "
              f"({os.path.getsize(path)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Commit Canvas — marketing poster compositor.
Composes REAL product theme screenshots into branded posters.
Brand: bg #0B0C10 · accent #E2FF3A · mono + bold sans · blueprint grid.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SHOTS = "/home/user/posters/shots"
OUT = "/home/user/posters"
os.makedirs(OUT, exist_ok=True)

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FMB = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

BG = (11, 12, 16)
BG2 = (14, 16, 22)
SURF = (18, 20, 28)
LINE = (35, 39, 53)
LINE2 = (46, 51, 68)
INK = (233, 235, 243)
INK2 = (155, 161, 181)
INK3 = (104, 112, 137)
ACC = (226, 255, 58)

THEMES = ["midnight", "neon", "paper", "terminal", "aurora", "blueprint", "mono", "sunset"]
THEME_TAG = {
    "midnight": "the signature",
    "neon": "high voltage",
    "paper": "editorial print",
    "terminal": "phosphor",
    "aurora": "northern light",
    "blueprint": "drafting table",
    "mono": "gallery white",
    "sunset": "golden hour",
}


def fnt(path, size):
    return ImageFont.truetype(path, size)


def ls_width(d, s, font, ls):
    return sum(d.textlength(c, font=font) + ls for c in s) - ls


def ls_text(d, xy, s, font, fill, ls=0, anchor=None):
    """letter-spaced text drawn char by char. anchor 'ra' right-aligns."""
    x, y = xy
    if anchor == "ra":
        x = x - ls_width(d, s, font, ls)
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + ls
    return x


def center_ls(d, W, y, s, font, fill, ls):
    total = sum(d.textlength(c, font=font) + ls for c in s) - ls
    x = (W - total) / 2
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + ls


def grid_bg(img, cell=44, alpha=14, mask_top=None):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    W, H = img.size
    for x in range(0, W, cell):
        d.line([(x, 0), (x, H)], fill=(46, 51, 68, alpha), width=1)
    for y in range(0, H, cell):
        d.line([(0, y), (W, y)], fill=(46, 51, 68, alpha), width=1)
    img.alpha_composite(ov)


def glow(img, cx, cy, r, rgb, strength=26):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for i in range(r, 0, -4):
        a = int(strength * (1 - i / r))
        d.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(rgb[0], rgb[1], rgb[2], a))
    img.alpha_composite(ov)


def round_mask(size, rad):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=rad, fill=255)
    return m


def paste_rounded(base, shot, box, rad=18, border=LINE2, bw=2):
    x, y, w, h = box
    sh = shot.convert("RGB").resize((w, h), Image.LANCZOS)
    m = round_mask((w, h), rad)
    base.paste(sh, (x, y), m)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle([x - bw, y - bw, x + w + bw, y + h + bw], radius=rad + bw,
                        outline=border, width=bw)


def crop_hero(path, aspect):
    """crop center-top of a hero shot to the given aspect (w/h)."""
    im = Image.open(path).convert("RGB")
    W, H = im.size
    # focus on the upper 2/3 where title+chips live
    top = int(H * 0.06)
    usable_h = int(H * 0.80)
    w = W
    h = int(w / aspect)
    if h > usable_h:
        h = usable_h
        w = int(h * aspect)
    x = (W - w) // 2
    return im.crop((x, top, x + w, top + h))


def brand_row(d, x, y, scale=1.0, light=INK):
    # small logo mark + wordmark
    s = int(26 * scale)
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(6 * scale), outline=LINE2, width=2)
    d.line([(x + s * .25, y + s * .72), (x + s * .4, y + s * .72), (x + s * .4, y + s * .3),
            (x + s * .62, y + s * .3)], fill=LINE2, width=2)
    d.ellipse([x + s * .2 - 2, y + s * .72 - 2, x + s * .2 + 2, y + s * .72 + 2], fill=ACC)
    d.ellipse([x + s * .78 - 2, y + s * .26 - 2, x + s * .78 + 2, y + s * .26 + 2], fill=ACC)
    d.text((x + s + 12, y + s * .5), "commit canvas", font=fnt(FB, int(17 * scale)),
           fill=light, anchor="lm")


# ─────────────────────────────────────────────────────────────
# 1. THEME GRID (landscape 1600x1000)
# ─────────────────────────────────────────────────────────────
def poster_themes_grid():
    W, H = 1600, 1160
    img = Image.new("RGBA", (W, H), BG + (255,))
    grid_bg(img, cell=44, alpha=12)
    glow(img, int(W * .85), -100, 420, ACC, 16)
    d = ImageDraw.Draw(img)

    brand_row(d, 60, 54)
    ls_text(d, (W - 60, 66), "ONE REPO · EIGHT EDITIONS", fnt(FMB, 15), ACC, ls=4, anchor="ra")

    d.text((60, 130), "Your code has", font=fnt(FB, 62), fill=INK)
    d.text((60, 200), "a story.", font=fnt(FB, 62), fill=INK)
    # accent stroke on "story."
    d.text((60, 320), "Every theme below is the same real Flask story —", font=fnt(FR, 20), fill=INK2)
    d.text((60, 350), "re-skinned live, no re-render, no mockups.", font=fnt(FR, 20), fill=INK2)

    # grid 4 x 2
    m, gap = 60, 20
    tw = (W - 2 * m - 3 * gap) // 4
    th = 250
    y0 = 440
    for i, t in enumerate(THEMES):
        col, row = i % 4, i // 4
        x = m + col * (tw + gap)
        y = y0 + row * (th + gap + 34)
        shot = crop_hero(os.path.join(SHOTS, t + "-hero.png"), tw / th)
        paste_rounded(img, shot, (x, y, tw, th), rad=14, border=LINE2, bw=2)
        dd = ImageDraw.Draw(img)
        dd.text((x + 2, y + th + 10), t, font=fnt(FMB, 17), fill=INK)
        dd.text((x + tw, y + th + 12), THEME_TAG[t], font=fnt(FM, 13), fill=INK3, anchor="ra")

    fy = H - 56
    d2 = ImageDraw.Draw(img)
    d2.line([(60, fy - 18), (W - 60, fy - 18)], fill=LINE, width=1)
    ls_text(d2, (60, fy), "YOUR CODE HAS A STORY", fnt(FMB, 15), INK3, ls=4)
    d2.text((W - 60, fy), "ahmadrrrtx.github.io/commit-canvas", font=fnt(FM, 15), fill=INK2, anchor="ra")
    img.convert("RGB").save(os.path.join(OUT, "poster-themes-grid.png"), optimize=True)
    print("poster-themes-grid.png")


# ─────────────────────────────────────────────────────────────
# 2. THEME SPOTLIGHT (portrait 1080x1350)
# ─────────────────────────────────────────────────────────────
def poster_spotlight(theme):
    W, H = 1080, 1350
    img = Image.new("RGBA", (W, H), BG + (255,))
    grid_bg(img, cell=44, alpha=12)
    glow(img, int(W * .8), 60, 380, ACC, 14)
    d = ImageDraw.Draw(img)

    brand_row(d, 70, 70)
    ls_text(d, (70, 200), "THE " + theme.upper() + " EDITION", fnt(FMB, 16), ACC, ls=4)
    d.text((70, 240), "Your code has", font=fnt(FB, 66), fill=INK)
    d.text((70, 316), "a story.", font=fnt(FB, 66), fill=INK)
    d.text((70, 430), "The same real repository, told in " + THEME_TAG[theme] + ".",
           font=fnt(FR, 21), fill=INK2)

    # big screenshot
    sx, sy, sw = 70, 490, W - 140
    shh = 640
    shot = crop_hero(os.path.join(SHOTS, theme + "-hero.png"), sw / shh)
    paste_rounded(img, shot, (sx, sy, sw, shh), rad=20, border=LINE2, bw=2)

    d = ImageDraw.Draw(img)
    fy = H - 70
    d.line([(70, fy - 22), (W - 70, fy - 22)], fill=LINE, width=1)
    ls_text(d, (70, fy), "COMMIT CANVAS", fnt(FMB, 16), INK3, ls=4)
    d.text((W - 70, fy), "one command · zero cloud", font=fnt(FM, 15), fill=INK2, anchor="ra")
    img.convert("RGB").save(os.path.join(OUT, f"poster-{theme}.png"), optimize=True)
    print(f"poster-{theme}.png")


# ─────────────────────────────────────────────────────────────
# 3. FEATURE LANDSCAPE (1600x900)
# ─────────────────────────────────────────────────────────────
def poster_feature(shot_name, kicker, title1, title2, sub):
    W, H = 1600, 900
    img = Image.new("RGBA", (W, H), BG + (255,))
    grid_bg(img, cell=44, alpha=12)
    glow(img, 120, H, 420, ACC, 14)
    d = ImageDraw.Draw(img)

    brand_row(d, 60, 56)
    ls_text(d, (60, 200), kicker, fnt(FMB, 16), ACC, ls=4)
    d.text((60, 240), title1, font=fnt(FB, 56), fill=INK)
    d.text((60, 308), title2, font=fnt(FB, 56), fill=INK)
    # wrap sub
    y = 400
    words = sub.split()
    line = ""
    for w_ in words:
        trial = (line + " " + w_).strip()
        if d.textlength(trial, font=fnt(FR, 20)) > 520 and line:
            d.text((60, y), line, font=fnt(FR, 20), fill=INK2); y += 30; line = w_
        else:
            line = trial
    if line:
        d.text((60, y), line, font=fnt(FR, 20), fill=INK2); y += 30
    d.text((60, y + 20), "ahmadrrrtx.github.io/commit-canvas", font=fnt(FM, 16), fill=ACC)

    sx, sy, sw, shh = 660, 130, 880, 640
    shot = Image.open(os.path.join(SHOTS, shot_name)).convert("RGB")
    # crop to box aspect
    tw, th = sw, shh
    WW, HH = shot.size
    a = tw / th
    w = WW; h = int(w / a)
    if h > HH:
        h = HH; w = int(h * a)
    shot = shot.crop(((WW - w) // 2, (HH - h) // 2, (WW - w) // 2 + w, (HH - h) // 2 + h))
    paste_rounded(img, shot, (sx, sy, sw, shh), rad=20, border=LINE2, bw=2)

    d = ImageDraw.Draw(img)
    d.line([(60, H - 60), (W - 60, H - 60)], fill=LINE, width=1)
    ls_text(d, (60, H - 44), "YOUR CODE HAS A STORY", fnt(FMB, 15), INK3, ls=4)
    d.text((W - 60, H - 44), "real data · real history", font=fnt(FM, 15), fill=INK2, anchor="ra")
    slug = shot_name.replace("-hero", "").replace(".png", "")
    img.convert("RGB").save(os.path.join(OUT, f"poster-{slug}.png"), optimize=True)
    print(f"poster-{slug}.png")


if __name__ == "__main__":
    poster_themes_grid()
    for t in ["midnight", "paper", "sunset", "neon"]:
        poster_spotlight(t)
    poster_feature("midnight-machine.png", "THE FLAGSHIP", "Watch the whole", "life unfold.",
                   "Scrub or press play and the project assembles itself — commits, contributors and languages, month by month.")
    poster_feature("midnight-share.png", "PROOF OF WORK", "A certificate", "worth sharing.",
                   "Every story ends in a share card built for feeds — rendered locally, nothing uploaded.")

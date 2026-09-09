#!/usr/bin/env python3
"""Commit Canvas — single hero marketing poster (for a social post).
Real sunset-theme screenshot + real stats, cinematic brand language.
Outputs portrait 1080x1350 and square 1080x1080.
"""
import os
from PIL import Image, ImageDraw, ImageFont

SHOTS = "/home/user/posters/shots"
OUT = "/home/user/posters"

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FMB = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

BG = (11, 12, 16); LINE = (35, 39, 53); LINE2 = (46, 51, 68)
INK = (233, 235, 243); INK2 = (155, 161, 181); INK3 = (104, 112, 137)
ACC = (226, 255, 58)


def fnt(p, s):
    return ImageFont.truetype(p, s)


def ls(d, x, y, s, font, fill, sp=0, right=None):
    if right is not None:
        w = sum(d.textlength(c, font=font) + sp for c in s) - sp
        x = right - w
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + sp


def grid_bg(img, cell=44, a=12):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    W, H = img.size
    for x in range(0, W, cell):
        d.line([(x, 0), (x, H)], fill=(46, 51, 68, a), width=1)
    for y in range(0, H, cell):
        d.line([(0, y), (W, y)], fill=(46, 51, 68, a), width=1)
    img.alpha_composite(ov)


def glow(img, cx, cy, r, rgb, s=22):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(r, 0, -4):
        d.ellipse([cx - i, cy - i, cx + i, cy + i],
                  fill=(rgb[0], rgb[1], rgb[2], int(s * (1 - i / r))))
    img.alpha_composite(ov)


def rmask(size, rad):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=rad, fill=255)
    return m


def brand(d, x, y, sc=1.0):
    s = int(26 * sc)
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(6 * sc), outline=LINE2, width=2)
    d.line([(x + s * .25, y + s * .72), (x + s * .4, y + s * .72), (x + s * .4, y + s * .3),
            (x + s * .62, y + s * .3)], fill=LINE2, width=2)
    d.ellipse([x + s * .2 - 2, y + s * .72 - 2, x + s * .2 + 2, y + s * .72 + 2], fill=ACC)
    d.ellipse([x + s * .78 - 2, y + s * .26 - 2, x + s * .78 + 2, y + s * .26 + 2], fill=ACC)
    d.text((x + s + 12, y + s * .5), "commit canvas", font=fnt(FB, int(17 * sc)), fill=INK, anchor="lm")


def gitgraph(d, x, y, w, accent=ACC):
    """small decorative commit-graph motif"""
    d.line([(x, y), (x + w, y)], fill=LINE2, width=2)
    d.line([(x + w * .25, y), (x + w * .45, y - 26), (x + w, y - 26)], fill=LINE2, width=2)
    for px, py, hot in [(0, 0, 1), (.2, 0, 0), (.25, 0, 1), (.5, 0, 0),
                        (.45, -26, 1), (.75, -26, 0), (1, -26, 1), (1, 0, 1)]:
        cx, cy = x + w * px, y + py
        r = 5 if hot else 4
        col = accent if hot else INK3
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)


def chip(d, x, y, num, label):
    fN, fL = fnt(FMB, 26), fnt(FM, 13)
    sp = 1
    nw = d.textlength(num, font=fN)
    lw = sum(d.textlength(c, font=fL) + sp for c in label) - sp
    w = int(max(nw, lw) + 48); h = 84
    d.rounded_rectangle([x, y, x + w, y + h], radius=14, fill=(18, 20, 28, 255), outline=LINE2, width=2)
    d.text((x + w / 2, y + 30), num, font=fN, fill=ACC, anchor="mm")
    lx = x + w / 2 - lw / 2
    for ch in label:
        d.text((lx, y + 56), ch, font=fL, fill=INK3)
        lx += d.textlength(ch, font=fL) + sp
    return w


def crop_hero(path, aspect):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    top = int(H * 0.06); usable = int(H * 0.80)
    w = W; h = int(w / aspect)
    if h > usable:
        h = usable; w = int(h * aspect)
    x = (W - w) // 2
    return im.crop((x, top, x + w, top + h))


def build(W, H, out):
    u = H / 1350.0
    img = Image.new("RGBA", (W, H), BG + (255,))
    grid_bg(img)
    glow(img, int(W * .85), -80, 420, ACC, 16)
    glow(img, int(W * .1), H + 60, 380, ACC, 10)
    d = ImageDraw.Draw(img)
    M = 76

    brand(d, M, int(60 * u))
    ls(d, W - M, int(70 * u), "GIT HISTORY → CINEMATIC STORY", fnt(FMB, 14), ACC, sp=3, right=W - M)

    hf = int(74 * (0.86 if u < 0.9 else 1.0))
    hy = int(150 * u)
    d.text((M, hy), "Your code has", font=fnt(FB, hf), fill=INK)
    d.text((M, hy + int(hf * 1.14)), "a story.", font=fnt(FB, hf), fill=INK)
    sx = M + d.textlength("a ", font=fnt(FB, hf))
    d.text((sx, hy + int(hf * 1.14)), "story.", font=fnt(FB, hf), fill=ACC)

    subf = int(21 * (0.92 if u < 0.9 else 1.0))
    d.text((M, hy + int(hf * 2.4)), "Turn any repository into a cinematic, shareable story —", font=fnt(FR, subf), fill=INK2)
    d.text((M, hy + int(hf * 2.4) + 30), "chapters, a time machine, a developer fingerprint.", font=fnt(FR, subf), fill=INK2)

    sw = W - 2 * M
    shh = int(H * 0.38)
    sy = hy + int(hf * 2.4) + 78
    shot = crop_hero(os.path.join(SHOTS, "sunset-hero.png"), sw / shh)
    glow(img, W // 2, sy + shh // 2, int(shh * .9), (255, 158, 100), 12)
    m = rmask((sw, shh), 22)
    img.paste(shot.resize((sw, shh), Image.LANCZOS), (M, sy), m)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([M - 2, sy - 2, M + sw + 2, sy + shh + 2], radius=24, outline=LINE2, width=2)
    d.rounded_rectangle([M + 18, sy + 18, M + 18 + 132, sy + 58], radius=20, fill=(22, 13, 20, 255), outline=(78, 44, 65), width=2)
    d.text((M + 18 + 66, sy + 38), "sunset edition", font=fnt(FM, 14), fill=(255, 158, 100), anchor="mm")

    cy = sy + shh + int(36 * u)
    x = M
    for num, lab in [("5,597", "COMMITS"), ("859", "CONTRIBUTORS"), ("16", "YEARS")]:
        x += chip(d, x, cy, num, lab) + 16

    gy = cy + int(84 + 46 * u)
    gitgraph(d, M, gy, 220)
    d.text((M, gy + 26), "one command · one file · zero cloud", font=fnt(FM, 16), fill=INK2)

    fy = H - int(60 * u)
    d.line([(M, fy - 22), (W - M, fy - 22)], fill=LINE, width=1)
    ls(d, M, fy, "YOUR CODE HAS A STORY", fnt(FMB, 15), INK3, sp=4)
    d.text((W - M, fy), "ahmadrrrtx.github.io/commit-canvas", font=fnt(FM, 15), fill=INK2, anchor="ra")

    img.convert("RGB").save(out, optimize=True)
    print(os.path.basename(out))


if __name__ == "__main__":
    build(1080, 1350, os.path.join(OUT, "poster-hero.png"))
    build(1080, 1080, os.path.join(OUT, "poster-hero-square.png"))

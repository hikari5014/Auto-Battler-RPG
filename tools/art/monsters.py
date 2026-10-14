# 3.24 Gemini 怪物 → assets/img/monsters-hd.png（每隻一格 96px，腳底對齊、面向左、加 1px 深色外框）
# 順序跟 tools/art/monsters.json 一樣；flip = 原圖面向右，要左右翻
import sys, os, json
from PIL import Image
from slice import slice_sheet, slice_grid
INBOX, OUT = sys.argv[1], sys.argv[2]
cfg = json.load(open(os.path.join(os.path.dirname(__file__), 'monsters.json')))
T, PAD = 96, 3
OL = (24, 14, 30, 255)
def outline(im):
    a = im.getchannel('A').point(lambda v: 255 if v > 127 else 0)
    im.putalpha(a)
    px = im.load(); w, h = im.size
    ol = Image.new('RGBA', im.size, (0, 0, 0, 0)); op = ol.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                op[x, y] = OL
    ol.alpha_composite(im)
    return ol
cells = []
for sheet in cfg['sheets']:
    src = os.path.join(INBOX, sheet['file'])
    parts = slice_grid(src, *sheet['grid']) if 'grid' in sheet else slice_sheet(src, len(sheet['keys']))
    for i, k in enumerate(sheet['keys']):
        im = parts[i]
        if i in sheet.get('flip', []): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        im = im.crop(im.getbbox())
        s = (T - PAD * 2) / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (T, T), (0, 0, 0, 0))
        c.alpha_composite(im, ((T - im.width) // 2, T - PAD - im.height))
        cells.append((k, outline(c)))
cols = 8
sheet = Image.new('RGBA', (T * cols, T * ((len(cells) + cols - 1) // cols)), (0, 0, 0, 0))
for i, (k, c) in enumerate(cells): sheet.paste(c, ((i % cols) * T, (i // cols) * T))
sheet.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT, optimize=True)
print(json.dumps({k: i for i, (k, _) in enumerate(cells)}))

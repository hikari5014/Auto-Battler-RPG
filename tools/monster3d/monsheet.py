# 3.22 3D 怪物圖集 monsters3d.png：每隻一列 8 格（0-3 走路、4-7 攻擊），64px，加 1px 深色外框
import json, base64, io, sys
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]
d = {**json.load(open(D + '/mon3d.json')), **json.load(open(D + '/mon5.json'))}
order = ['skull', 'darkmage', 'wraith', 'zombie', 'deathknight', 'pumpkin', 'witch']
T = 64; OL = (24, 14, 30, 255)
sheet = Image.new('RGBA', (T * 8, T * len(order)), (0, 0, 0, 0))
for r, k in enumerate(order):
    for c, u in enumerate(d[k]):
        im = Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
        im.putalpha(im.getchannel('A').point(lambda v: 255 if v > 110 else 0))
        px = im.load(); w, h = im.size
        ol = Image.new('RGBA', im.size, (0, 0, 0, 0)); op = ol.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    op[x, y] = OL
        ol.alpha_composite(im)
        sheet.paste(ol, (c * T, r * T))
sheet.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT, optimize=True)
print('ok', sheet.size)

# 3.21 KayKit 英雄圖集：左右鏡像 + 1px 深色外框 + 調色盤壓縮；另外裁出半身頭像
import json, base64, io, sys
from PIL import Image
D, OUT, FACE = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(D + '/kkheroes.json'))
order = [h[0] for h in json.load(open(D + '/kkmap.json'))['heroes']]
T, C, P = 64, 20, 34
OL = (24, 14, 30, 255)
sheet = Image.new('RGBA', (T * C, T * len(order)), (0, 0, 0, 0))
for r, k in enumerate(order):
    for c, u in enumerate(d[k]):
        im = Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
        im.putalpha(im.getchannel('A').point(lambda v: 255 if v > 110 else 0))
        px = im.load(); w, h = im.size
        ol = Image.new('RGBA', im.size, (0, 0, 0, 0)); op = ol.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    op[x, y] = OL
        ol.alpha_composite(im)
        sheet.paste(ol, (c * T, r * T))
q = sheet.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
q.save(OUT, optimize=True)
# 頭像：第 0 格，頭（上半部）置中
face = Image.new('RGBA', (P * len(order), P), (0, 0, 0, 0))
for r in range(len(order)):
    t = sheet.crop((0, r * T, T, r * T + T))
    x0, y0, x1, y1 = t.getchannel('A').getbbox()
    a = t.getchannel('A').crop((0, y0, T, y0 + 20)); pa = a.load()
    xs = [x for y in range(a.height) for x in range(a.width) if pa[x, y]]
    cx = sum(xs) // len(xs)
    left = max(0, min(T - P, cx - P // 2)); top = max(0, y0 - 1)
    face.paste(t.crop((left, top, left + P, top + P)), (r * P, 0))
face.save(FACE, optimize=True)
print('ok', sheet.size)

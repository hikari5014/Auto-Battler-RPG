# 3.22 新坐騎圖集 mounts3d-2.png（8 欄 × 4 列，64px，加外框）＋每格嘴巴位置（頭朝右：上半部最右邊的點）
import json, base64, io, sys
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]
d = json.load(open(D + '/newm.json'))
order = ['zebra', 'fox', 'llama', 'bull']
T = 64; OL = (26, 16, 32, 255)
sheet = Image.new('RGBA', (T * 8, T * 4), (0, 0, 0, 0))
mouth = {}
for r, k in enumerate(order):
    mouth[k] = []
    for c, u in enumerate(d[k]):
        im = Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
        im.putalpha(im.getchannel('A').point(lambda v: 255 if v > 100 else 0))
        px = im.load(); w, h = im.size
        ol = Image.new('RGBA', im.size, (0, 0, 0, 0)); op = ol.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    op[x, y] = OL
        ol.alpha_composite(im)
        sheet.paste(ol, (c * T, r * T))
        x0, y0, x1, y1 = im.getchannel('A').getbbox()
        lim = y0 + (y1 - y0) * 0.45
        best = max(((x, y) for y in range(y0, int(lim) + 1) for x in range(w) if px[x, y][3]), key=lambda q: (q[0], -q[1]))
        mouth[k].append([best[0] + 0.5, best[1] + 2.5])
sheet.save(OUT, optimize=True)
json.dump(mouth, open(D + '/newmouth.json', 'w'))
print('ok', json.dumps(mouth))

# 把 3D 渲染的格子拼成 8x4 的坐騎圖集，加 1px 深色外框，做成像素風
import json, base64, io, sys
from PIL import Image
D = sys.argv[1]; OUT = sys.argv[2]
d = json.load(open(D + '/strips.json'))
order = ['horse', 'wolf', 'bird', 'drake']
T = 64
sheet = Image.new('RGBA', (T * 8, T * 4), (0, 0, 0, 0))
OL = (26, 16, 32, 255)
for r, k in enumerate(order):
    for c, u in enumerate(d[k]):
        im = Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v > 100 else 0)
        im.putalpha(a)
        px = im.load(); w, h = im.size
        ol = Image.new('RGBA', im.size, (0, 0, 0, 0)); op = ol.load()
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    op[x, y] = OL
        ol.alpha_composite(im)
        sheet.paste(ol, (c * T, r * T))
sheet.save(OUT, optimize=True)
big = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST)
bg = Image.new('RGBA', big.size, (60, 120, 80, 255)); bg.alpha_composite(big); bg.save(D + '/../mounts3d-preview.png')
print('ok', sheet.size)

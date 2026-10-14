# 把切好的素材排成一張預覽圖（灰底＋編號），檢查有沒有切錯
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; T = int(sys.argv[3]) if len(sys.argv) > 3 else 160
fs = sorted(f for f in os.listdir(d) if f.endswith('.png'))
cols = min(6, len(fs)); rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGBA', (cols * T, rows * (T + 14)), (70, 90, 70, 255)); dr = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    im = Image.open(os.path.join(d, f)).convert('RGBA'); im.thumbnail((T - 4, T - 4))
    x, y = (i % cols) * T, (i // cols) * (T + 14)
    sh.alpha_composite(im, (x + (T - im.width) // 2, y + 14 + (T - im.height) // 2)); dr.text((x + 3, y + 1), f'{os.path.basename(d)}-{i}', fill=(255, 255, 0, 255))
sh.save(out)

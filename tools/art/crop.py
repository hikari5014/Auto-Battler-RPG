# 3.26 插圖類（卡片、橫幅、立繪）照格子切：每格去掉外圍的分隔線／黑邊，再內縮一點去掉圓角，存成 JPEG
# 用法：python3 crop.py 圖.png 輸出資料夾 列x欄 寬x高 [前綴]
import sys, os
import numpy as np
from PIL import Image
src, dst, grid, size = sys.argv[1:5]; prefix = sys.argv[5] if len(sys.argv) > 5 else ''
R, C = map(int, grid.split('x')); W, H = map(int, size.split('x'))
os.makedirs(dst, exist_ok=True)
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
IW, IH = im.size
# 分隔線／背景通常很暗或很白：找出「有內容」的範圍
def content_box(cell):
    lum = cell.mean(axis=2)
    sat = cell.max(axis=2) - cell.min(axis=2)
    real = ((lum > 28) & (lum < 245)) | (sat > 40)
    rows = np.where(real.mean(axis=1) > 0.5)[0]; cols = np.where(real.mean(axis=0) > 0.5)[0]
    if not len(rows) or not len(cols): return 0, 0, cell.shape[1], cell.shape[0]
    return cols[0], rows[0], cols[-1] + 1, rows[-1] + 1
n = 0
for r in range(R):
    for c in range(C):
        x0, y0, x1, y1 = c * IW // C, r * IH // R, (c + 1) * IW // C, (r + 1) * IH // R
        bx0, by0, bx1, by1 = content_box(a[y0:y1, x0:x1])
        ins = int(min(bx1 - bx0, by1 - by0) * 0.03)
        cell = im.crop((x0 + bx0 + ins, y0 + by0 + ins, x0 + bx1 - ins, y0 + by1 - ins))
        # 裁成目標比例（置中）再縮放
        tw = cell.width; th = round(tw * H / W)
        if th > cell.height: th = cell.height; tw = round(th * W / H)
        cell = cell.crop(((cell.width - tw) // 2, (cell.height - th) // 2, (cell.width - tw) // 2 + tw, (cell.height - th) // 2 + th)).resize((W, H), Image.LANCZOS)
        cell.save(os.path.join(dst, f'{prefix}{n}.jpg'), quality=80, optimize=True, progressive=True); n += 1
print(src, n)

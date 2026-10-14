# 3.26 彈珠台底圖：黑底上並排的直條圖，用「跟背景顏色差多少」找出每一條（很暗的星空也找得到）
import sys, os
import numpy as np
from PIL import Image
src, dst, prefix = sys.argv[1:4]; W, H = 360, 640
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
bg = np.median(np.concatenate([a[:5].reshape(-1, 3), a[-5:].reshape(-1, 3)]), axis=0)
diff = np.abs(a - bg).sum(axis=2) > 18
colon = diff.mean(axis=0) > 0.3
# 找出 4 條最寬的空隙，把 5 條圖分開（很暗的圖中間斷斷續續也不怕）
N = int(sys.argv[4]) if len(sys.argv) > 4 else 5
xs = np.where(colon)[0]; L, Rr = xs[0], xs[-1] + 1
gaps, s = [], None
for x in range(L, Rr + 1):
    v = x < Rr and colon[x]
    if not v and s is None: s = x
    if v and s is not None: gaps.append((x - s, s, x)); s = None
cuts = sorted(sorted(gaps, reverse=True)[:N - 1], key=lambda g: g[1])
edges = [L] + [c for g in cuts for c in (g[1], g[2])] + [Rr]
runs = [(edges[i], edges[i + 1]) for i in range(0, len(edges), 2)]
for i, (x0, x1) in enumerate(runs):
    rows = np.where(diff[:, x0:x1].mean(axis=1) > 0.3)[0]
    y0, y1 = rows[0], rows[-1] + 1
    ins = int((x1 - x0) * 0.04)
    cell = im.crop((x0 + ins, y0 + ins, x1 - ins, y1 - ins))
    tw = cell.width; th = round(tw * H / W)
    if th > cell.height: th = cell.height; tw = round(th * W / H)
    cell = cell.crop(((cell.width - tw) // 2, (cell.height - th) // 2, (cell.width - tw) // 2 + tw, (cell.height - th) // 2 + th)).resize((W, H), Image.LANCZOS)
    cell.save(os.path.join(dst, f'{prefix}{i}.jpg'), quality=78, optimize=True, progressive=True)
print(src, len(runs))

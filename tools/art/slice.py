# 3.24 把 Gemini 生的格子圖切成一個一個素材：洋紅色背景去背 → 找出每個物件 → 依「由上到下、由左到右」排序
# 用法：python3 slice.py 圖.png 輸出資料夾 預期個數 [--keep-bg]
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def bgness(a):
    # 洋紅程度 0~1：紅、藍都高、綠很低
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b * 1.25) - g
    return np.clip((m - 60) / 70, 0, 1) * (r > 140)

def slice_grid(path, rows, cols):
    # 備用：直接照格子平均切（物件黏在一起、自動找不到時用）
    im = Image.open(path).convert('RGB'); W, H = im.size
    a = np.asarray(im).astype(np.float32)
    rgba = np.dstack([a, (1 - bgness(a)) * 255]).astype(np.uint8)
    out = []
    for r in range(rows):
        for c in range(cols):
            cell = rgba[r * H // rows:(r + 1) * H // rows, c * W // cols:(c + 1) * W // cols].copy()
            fg = cell[..., 3] > 127
            lab, k = ndi.label(ndi.binary_dilation(fg, iterations=3))
            if k:
                big = 1 + int(np.argmax(ndi.sum(fg, lab, range(1, k + 1))))
                cell[..., 3] = np.where(lab == big, cell[..., 3], 0)
            out.append(Image.fromarray(cell).crop(Image.fromarray(cell).getbbox() or (0, 0, 1, 1)))
    return out

def slice_sheet(path, n, pad=0.04):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    bg = bgness(a)
    fg = bg < 0.5
    # 去掉零碎雜點，再把同一個物件的碎塊黏在一起
    fg = ndi.binary_opening(fg, iterations=1)
    glue = ndi.binary_dilation(fg, iterations=max(4, int(min(im.size) * 0.012)))
    lab, k = ndi.label(glue)
    objs = ndi.find_objects(lab)
    areas = ndi.sum(fg, lab, range(1, k + 1))
    cand = sorted([(areas[i], objs[i], i + 1) for i in range(k)], key=lambda t: -t[0])[:n]
    if len(cand) < n: print(f'!! {os.path.basename(path)}: 只找到 {len(cand)} 個（預期 {n}）')
    boxes = [(s[0].start, s[0].stop, s[1].start, s[1].stop, li) for _, s, li in cand]
    # 排序：先依中心 y 分列，同一列再依 x
    boxes.sort(key=lambda b: (b[0] + b[1]) / 2)
    rows, cur = [], []
    for b in boxes:
        if cur and (b[0] + b[1]) / 2 - np.mean([(c[0] + c[1]) / 2 for c in cur]) > (b[1] - b[0]) * 0.5: rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    order = [b for r in rows for b in sorted(r, key=lambda b: b[2])]
    alpha = (1 - bg) * 255
    rgba = np.dstack([a, alpha]).astype(np.uint8)
    out = []
    for y0, y1, x0, x1, li in order:
        crop = rgba[y0:y1, x0:x1].copy()
        mask = (lab[y0:y1, x0:x1] == li)
        crop[..., 3] = np.where(mask, crop[..., 3], 0)
        out.append(Image.fromarray(crop))
    return out

if __name__ == '__main__':
    src, dst, n = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(dst, exist_ok=True)
    parts = slice_grid(src, *map(int, n.split('x'))) if 'x' in n else slice_sheet(src, int(n))
    for i, c in enumerate(parts): c.save(os.path.join(dst, f'{i:02d}.png'))

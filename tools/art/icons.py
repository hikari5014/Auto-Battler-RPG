# 3.25 Gemini 圖示 → assets/img/icons-hd.png（每個 64px、16 欄）＋ js/icons-hd.js（名稱 → 編號）
# 順序與名稱在 tools/art/icons.json；圖少畫的（例如只畫了 8 個）就跳過，遊戲會繼續用舊圖示
import sys, os, json
from PIL import Image
from slice import slice_sheet, slice_grid
INBOX, OUT_PNG, OUT_JS = sys.argv[1:4]
cfg = json.load(open(os.path.join(os.path.dirname(__file__), 'icons.json')))
T, PAD, COLS = 64, 2, 16
cells, idx = [], {}
for sh in cfg['sheets']:
    src = os.path.join(INBOX, sh['file'])
    parts = slice_grid(src, *sh['grid']) if 'grid' in sh else slice_sheet(src, len(sh['keys']))
    for k, im in zip(sh['keys'], parts):
        im = im.crop(im.getbbox())
        a = im.getchannel('A').point(lambda v: 255 if v > 110 else 0); im.putalpha(a)
        s = (T - PAD * 2) / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (T, T), (0, 0, 0, 0)); c.alpha_composite(im, ((T - im.width) // 2, (T - im.height) // 2))
        idx[k] = len(cells); cells.append(c)
sheet = Image.new('RGBA', (T * COLS, T * ((len(cells) + COLS - 1) // COLS)), (0, 0, 0, 0))
for i, c in enumerate(cells): sheet.paste(c, ((i % COLS) * T, (i // COLS) * T))
sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT_PNG, optimize=True)
open(OUT_JS, 'w').write('// 3.25 自動產生（tools/art/icons.py）：Gemini 新圖示在 icons-hd.png 的位置\nexport const IX = ' + json.dumps(idx, ensure_ascii=False) + ';\n'
  + "// 有新圖示就回傳 ['ix', 編號]，沒有就回傳原本的圖示\nexport const ix = (key, fallback) => (key in IX ? ['ix', IX[key]] : fallback);\n")
print(len(cells), 'icons')

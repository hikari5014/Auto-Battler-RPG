# 平衡測試工具（3.0 起）

遊戲內建 `window.__test.sim(opts)`：不畫畫面，用機器人跑完一整局（約 0.4 秒），結束後存檔會還原。

```
python3 -m http.server 8765          # 在專案根目錄
node tools/balance/gensaves.mjs      # 產生 5 種進度的存檔（fresh / early / midlite / mid / late）到 saves/
node tools/balance/sim.cjs saves/mid.json blade,archer hell 4 10   # 存檔 英雄 難度 章節 局數
python3 tools/balance/ana.py 結果.txt 600   # 「戰力 ÷ 推薦戰力」對勝率的表
```

目標（一般機器人）：戰力 = 推薦 100% 時勝率約 60～75%；80% 時約 40～50%；60% 以下低於 35%。

// 新手教學：第一次玩時，用「光圈＋對話框」一步一步指出要做什麼
// 步驟：拖曳倒球杯 → 倍率門 → 接球杯 → （打完第一波）商店
export class Tutorial {
  // ctx：{ save, writeSave, game, board, toCss(x, y) → 畫面像素座標 }
  constructor(ctx) {
    this.c = ctx;
    this.el = document.getElementById('coach');
    this.ring = this.el.querySelector('.coach-ring');
    this.bubble = this.el.querySelector('.coach-bubble');
    this.text = this.el.querySelector('.coach-text');
    this.btn = this.el.querySelector('.coach-btn');
    this.step = null;
    this.btn.addEventListener('click', () => this.next());
  }

  get active() { return !this.c.save.tutorialDone; }

  // 開始一局時呼叫：等 1.2 秒讓玩家看一下畫面再開始教
  onRunStart() {
    if (!this.active) return;
    this.queue = ['drag', 'gate', 'cup'];
    setTimeout(() => this.show(this.queue.shift()), 1200);
  }

  // 玩家第一次拖曳彈珠台
  onDrag() {
    if (this.step !== 'drag') return;
    this.hide();
    setTimeout(() => this.queue.length && this.show(this.queue.shift()), 2500);
  }

  onShop() {
    if (!this.active || this.shopShown) return;
    this.shopShown = true;
    setTimeout(() => this.show('shop'), 600);
  }

  show(step) {
    const { game, board, toCss } = this.c;
    if (!game.run && step !== 'shop') return;
    this.step = step;
    let target, text, needTap = true;
    if (step === 'drag') {
      target = toCss(board.px, board.top + 12);
      text = '按住下方的彈珠台<b>左右拖曳</b>，控制倒球的杯子往哪裡倒';
      needTap = false;
    } else if (step === 'gate') {
      const g = board.gates.find(g => g.base && g.row === 0) || board.gates[0];
      target = toCss(g.x + g.w / 2, board.gateY(g.row));
      text = '小球穿過<b>倍率門</b>會變多！把杯子對準門倒球';
    } else if (step === 'cup') {
      target = toCss(board.cupX, board.cupY + 20);
      text = '掉進下面的<b>紅杯子</b>，球幣 x2；掉到地上只算 1 倍';
    } else if (step === 'shop') {
      target = null;
      text = '用接到的<b>球幣</b>買技能，一次可以買好幾張。買完按「下一波」繼續戰鬥';
    }
    game.paused = step !== 'drag'; // 拖曳那步不暫停，讓玩家直接試
    this.el.classList.remove('hidden');
    this.el.classList.toggle('no-ring', !target);
    if (target) {
      this.ring.style.left = target.x + 'px';
      this.ring.style.top = target.y + 'px';
      // 對話框放在光圈的上方或下方，避免蓋住目標
      const below = target.y < window.innerHeight * 0.55;
      this.bubble.style.top = below ? target.y + 46 + 'px' : '';
      this.bubble.style.bottom = below ? '' : window.innerHeight - target.y + 46 + 'px';
    } else {
      this.bubble.style.top = '18%';
      this.bubble.style.bottom = '';
    }
    this.text.innerHTML = text;
    this.btn.classList.toggle('hidden', !needTap);
    this.el.classList.toggle('pass', !needTap); // 拖曳步驟：讓觸控穿過去
  }

  next() {
    const step = this.step;
    this.hide();
    if (step === 'shop') {
      this.finish();
      return;
    }
    this.c.game.paused = false;
    if (this.queue.length) setTimeout(() => this.show(this.queue.shift()), 900);
  }

  hide() {
    this.el.classList.add('hidden');
    this.step = null;
    if (this.c.game.run) this.c.game.paused = false;
  }

  finish() {
    this.c.save.tutorialDone = true;
    this.c.writeSave(this.c.save);
  }

  // 設定頁「重看教學」
  reset() {
    this.c.save.tutorialDone = false;
    this.shopShown = false;
    this.c.writeSave(this.c.save);
  }
}

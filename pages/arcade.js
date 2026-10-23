/* ============================================================
   SYNC RACE — Playground
   Four small games on one canvas: Stack, Breaker, Snake, Merge.
   Keyboard, mouse and touch all work. Best scores are kept in
   this browser only (localStorage, wrapped in try/catch).
   ============================================================ */
(() => {
  'use strict';

  const stage   = document.getElementById('stage');
  const canvas  = document.getElementById('arcadeCanvas');
  const ctx     = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ov-title');
  const ovText  = document.getElementById('ov-text');
  const ovBtn   = document.getElementById('ov-btn');
  const scoreEl = document.getElementById('hud-score');
  const bestEl  = document.getElementById('hud-best');
  const extraEl = document.getElementById('hud-extra');
  const helpEl  = document.getElementById('game-help');
  const tabs    = [...document.querySelectorAll('[data-game]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1;

  /* ---------- helpers ---------- */
  const rand  = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  const store = {
    get(k) { try { return Number(localStorage.getItem('srcs-best-' + k)) || 0; } catch (e) { return 0; } },
    set(k, v) { try { localStorage.setItem('srcs-best-' + k, String(v)); } catch (e) {} },
  };

  // Colours follow the site theme (day / evening).
  let C = {};
  function readTheme() {
    const s = getComputedStyle(document.documentElement);
    const v = n => s.getPropertyValue(n).trim();
    C = {
      bg: v('--sunk'), surface: v('--surface'), ink: v('--ink'), dust: v('--dust'), hair: v('--hair'),
      lamp: v('--lamp'), blue: v('--blue'), lampSoft: v('--lamp-soft'), blueSoft: v('--blue-soft'),
      dark: document.documentElement.classList.contains('dark'),
    };
  }
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function rr(x, y, w, h, r) {           // rounded rect path
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(str, x, y, size, color, align = 'center', font = 'Jost', weight = 500) {
    ctx.font = `${weight} ${size}px ${font}, system-ui, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  /* ---------- shared particles (bursts) ---------- */
  let sparks = [];
  function burst(x, y, color, n = 12, speed = 160) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * .3, speed);
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color, r: rand(1.5, 3.5) });
    }
  }
  function updateSparks(dt) {
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt * 1.6; }
    sparks = sparks.filter(p => p.life > 0);
  }
  function drawSparks() {
    for (const p of sparks) {
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ============================================================
     GAME 1 — STACK
     Tap at the right moment. Whatever hangs over gets cut off.
     ============================================================ */
  const Stack = {
    id: 'stack', name: 'Stack',
    help: 'Tap, click or press Space to drop the block. Line it up perfectly to keep it full width.',
    start: 'Tap to drop. Stack as high as you can.',
    init() {
      this.bh = Math.max(18, H / 16);
      const w0 = W * .5;
      this.blocks = [{ x: (W - w0) / 2, w: w0, hue: 12 }];
      this.debris = [];
      this.cam = 0;
      this.perfect = 0; this.flash = 0; this.msg = ''; this.msgT = 0;
      this.dead = false; this.fall = null;
      this.next();
    },
    level() { return this.blocks.length - 1; },
    hueFor(i) { return (12 + i * 7) % 360; },
    next() {
      const top = this.blocks[this.blocks.length - 1];
      const fromLeft = this.blocks.length % 2 === 0;
      this.cur = { x: fromLeft ? -top.w * .3 : W - top.w * .7, w: top.w, dir: fromLeft ? 1 : -1, hue: this.hueFor(this.blocks.length) };
      this.speed = (W / 3.2) * (1 + Math.min(this.level(), 40) * .035);
    },
    drop() {
      if (this.dead) return;
      const top = this.blocks[this.blocks.length - 1], c = this.cur;
      const tol = Math.max(3, W * .008);
      let x = c.x, w = c.w;
      if (Math.abs(c.x - top.x) <= tol) {
        x = top.x; w = top.w; this.perfect++;
        this.flash = 1;
        if (this.perfect >= 3) { w = Math.min(W * .5, w + W * .02); x = top.x - (w - top.w) / 2; }
        this.msg = this.perfect > 1 ? `Perfect ×${this.perfect}` : 'Perfect'; this.msgT = 1;
        Game.add(this.perfect > 1 ? 2 : 1);
      } else {
        const l = Math.max(c.x, top.x), r = Math.min(c.x + c.w, top.x + top.w);
        if (r <= l) {                         // missed completely
          this.dead = true; this.fall = { x: c.x, w: c.w, y: this.yFor(this.blocks.length), vy: 0, hue: c.hue };
          setTimeout(() => Game.over(), reduced ? 0 : 700);
          return;
        }
        const cutX = c.x < top.x ? c.x : r, cutW = c.w - (r - l);
        this.debris.push({ x: cutX, w: cutW, y: this.yFor(this.blocks.length), vy: 0, vx: (c.x < top.x ? -1 : 1) * 40, hue: c.hue, rot: 0 });
        x = l; w = r - l; this.perfect = 0;
        Game.add(1);
      }
      this.blocks.push({ x, w, hue: c.hue });
      this.next();
    },
    yFor(i) { return H - (i + 1) * this.bh; },        // world y of block i (before camera)
    update(dt) {
      const c = this.cur;
      if (!this.dead) {
        c.x += c.dir * this.speed * dt;
        if (c.x > W - c.w * .7) { c.x = W - c.w * .7; c.dir = -1; }
        if (c.x < -c.w * .3) { c.x = -c.w * .3; c.dir = 1; }
      }
      const target = Math.max(0, (this.blocks.length + 1) * this.bh - H * .55);
      this.cam = lerp(this.cam, target, Math.min(1, dt * 6));
      for (const d of this.debris) { d.vy += 1400 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.rot += d.vx * .0004; }
      this.debris = this.debris.filter(d => d.y - this.cam < H + 200);
      if (this.fall) { this.fall.vy += 1400 * dt; this.fall.y += this.fall.vy * dt; }
      this.flash = Math.max(0, this.flash - dt * 3);
      this.msgT = Math.max(0, this.msgT - dt * 1.2);
    },
    slab(x, y, w, hue, alpha = 1) {
      const h = this.bh;
      ctx.globalAlpha = alpha;
      const light = C.dark ? 58 : 64;
      ctx.fillStyle = `hsl(${hue} 78% ${light}%)`;
      rr(x, y, w, h - 2, Math.min(6, h / 3)); ctx.fill();
      ctx.fillStyle = `hsl(${hue} 78% ${light + 10}%)`;
      rr(x, y, w, Math.max(3, h * .28), Math.min(6, h / 3)); ctx.fill();
      ctx.globalAlpha = 1;
    },
    draw() {
      const cam = this.cam;
      const first = Math.max(0, Math.floor((cam - this.bh) / this.bh) - 1);
      for (let i = first; i < this.blocks.length; i++) {
        const b = this.blocks[i], y = this.yFor(i) + cam;
        if (y > H + this.bh) continue;
        this.slab(b.x, y, b.w, b.hue);
      }
      if (this.flash > 0) {
        const t = this.blocks[this.blocks.length - 1], y = this.yFor(this.blocks.length - 1) + cam;
        ctx.strokeStyle = `rgba(255,255,255,${this.flash})`; ctx.lineWidth = 3;
        rr(t.x - 4, y - 4, t.w + 8, this.bh + 6, 8); ctx.stroke();
      }
      for (const d of this.debris) {
        ctx.save(); ctx.translate(d.x + d.w / 2, d.y + cam + this.bh / 2); ctx.rotate(d.rot);
        this.slab(-d.w / 2, -this.bh / 2, d.w, d.hue, .85); ctx.restore();
      }
      if (!this.dead) this.slab(this.cur.x, this.yFor(this.blocks.length) + cam, this.cur.w, this.cur.hue);
      if (this.fall) this.slab(this.fall.x, this.fall.y + cam, this.fall.w, this.fall.hue);
      if (this.msgT > 0) {
        ctx.globalAlpha = this.msgT;
        text(this.msg, W / 2, H * .18 - (1 - this.msgT) * 20, Math.max(18, W * .04), C.lamp, 'center', 'Marcellus', 400);
        ctx.globalAlpha = 1;
      }
      text(String(this.level()), W / 2, H * .09, Math.max(30, W * .07), C.ink, 'center', 'Jost', 300);
    },
    tap() { this.drop(); },
    key(k) { if (k === ' ' || k === 'Enter' || k === 'ArrowDown') { this.drop(); return true; } },
    resize() { /* positions are absolute; a resize mid-game just restarts */ },
  };

  /* ============================================================
     GAME 2 — BREAKER
     Keep the ball up, clear the wall.
     ============================================================ */
  const Breaker = {
    id: 'breaker', name: 'Breaker',
    help: 'Move with the mouse, a finger or the arrow keys. Click, tap or press Space to launch.',
    start: 'Clear the wall. Three lives.',
    init() { this.levelN = 1; this.lives = 3; this.buildLevel(); this.resetBall(); },
    buildLevel() {
      const cols = W < 520 ? 7 : 10, rows = Math.min(3 + this.levelN, 8);
      const pad = W * .04, gap = Math.max(4, W * .008), top = H * .12;
      const bw = (W - pad * 2 - gap * (cols - 1)) / cols, bh = Math.max(14, H * .045);
      this.bricks = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const tough = this.levelN > 1 && r < Math.min(this.levelN - 1, 3);
        this.bricks.push({ x: pad + c * (bw + gap), y: top + r * (bh + gap), w: bw, h: bh, hp: tough ? 2 : 1, row: r });
      }
      this.pw = Math.max(70, W * .16); this.ph = Math.max(10, H * .025);
      this.px = (W - this.pw) / 2; this.py = H - this.ph - H * .05;
      this.shake = 0;
    },
    resetBall() {
      this.br = Math.max(6, W * .011);
      this.stuck = true;
      this.bx = this.px + this.pw / 2; this.by = this.py - this.br - 1;
      this.spd = (W * .62 + H * .2) * (1 + (this.levelN - 1) * .1);
      this.vx = 0; this.vy = 0;
    },
    launch() {
      if (!this.stuck) return;
      this.stuck = false;
      const a = rand(-.35, .35) - Math.PI / 2;
      this.vx = Math.cos(a) * this.spd; this.vy = Math.sin(a) * this.spd;
    },
    keys: {},
    update(dt) {
      const move = W * 1.1 * dt;
      if (this.keys.left)  this.px -= move;
      if (this.keys.right) this.px += move;
      this.px = clamp(this.px, 0, W - this.pw);
      if (this.stuck) { this.bx = this.px + this.pw / 2; this.by = this.py - this.br - 1; return; }

      const steps = Math.ceil((this.spd * dt) / (this.br * .8));
      const sdt = dt / steps;
      for (let s = 0; s < steps; s++) {
        this.bx += this.vx * sdt; this.by += this.vy * sdt;
        const r = this.br;
        if (this.bx < r) { this.bx = r; this.vx = Math.abs(this.vx); }
        if (this.bx > W - r) { this.bx = W - r; this.vx = -Math.abs(this.vx); }
        if (this.by < r) { this.by = r; this.vy = Math.abs(this.vy); }
        // paddle
        if (this.vy > 0 && this.by + r >= this.py && this.by + r <= this.py + this.ph + r && this.bx >= this.px - r && this.bx <= this.px + this.pw + r) {
          const hit = clamp((this.bx - (this.px + this.pw / 2)) / (this.pw / 2), -1, 1);
          const a = -Math.PI / 2 + hit * 1.05;
          this.vx = Math.cos(a) * this.spd; this.vy = Math.sin(a) * this.spd;
          this.by = this.py - r - .5;
        }
        // bricks
        for (const b of this.bricks) {
          if (b.hp <= 0) continue;
          const nx = clamp(this.bx, b.x, b.x + b.w), ny = clamp(this.by, b.y, b.y + b.h);
          const dx = this.bx - nx, dy = this.by - ny;
          if (dx * dx + dy * dy > r * r) continue;
          const ox = Math.min(this.bx + r - b.x, b.x + b.w - (this.bx - r));
          const oy = Math.min(this.by + r - b.y, b.y + b.h - (this.by - r));
          if (ox < oy) { this.vx = -this.vx; this.bx += this.vx > 0 ? ox : -ox; }
          else { this.vy = -this.vy; this.by += this.vy > 0 ? oy : -oy; }
          b.hp--;
          const col = this.colorFor(b);
          if (b.hp <= 0) { burst(b.x + b.w / 2, b.y + b.h / 2, col, 14, 220); Game.add(10 * this.levelN); this.shake = .12; }
          else Game.add(5);
          this.spd *= 1.004; const m = Math.hypot(this.vx, this.vy); this.vx *= this.spd / m; this.vy *= this.spd / m;
          break;
        }
        if (this.by - r > H) {
          this.lives--; Game.extra(`Lives ${this.lives}`);
          if (this.lives <= 0) { Game.over(); return; }
          this.resetBall(); return;
        }
      }
      if (this.bricks.every(b => b.hp <= 0)) {
        this.levelN++; Game.extra(`Lives ${this.lives} · Level ${this.levelN}`);
        this.buildLevel(); this.resetBall();
      }
      this.shake = Math.max(0, this.shake - dt);
    },
    colorFor(b) { return b.hp > 1 ? C.blue : (b.row % 2 ? '#FF9A6B' : C.lamp); },
    draw() {
      ctx.save();
      if (this.shake > 0 && !reduced) ctx.translate(rand(-2, 2), rand(-2, 2));
      for (const b of this.bricks) {
        if (b.hp <= 0) continue;
        ctx.fillStyle = this.colorFor(b);
        rr(b.x, b.y, b.w, b.h, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(b.x, b.y, b.w, b.h * .35, 5); ctx.fill();
      }
      ctx.fillStyle = C.ink; rr(this.px, this.py, this.pw, this.ph, this.ph / 2); ctx.fill();
      ctx.fillStyle = C.lamp; ctx.beginPath(); ctx.arc(this.bx, this.by, this.br, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (this.stuck && Game.state === 'play') text('Tap or press Space to launch', W / 2, H * .62, Math.max(13, W * .022), C.dust);
    },
    pointer(x) { this.px = clamp(x - this.pw / 2, 0, W - this.pw); },
    tap() { this.launch(); },
    key(k, down) {
      if (k === 'ArrowLeft' || k === 'a') { this.keys.left = down; return true; }
      if (k === 'ArrowRight' || k === 'd') { this.keys.right = down; return true; }
      if (down && (k === ' ' || k === 'ArrowUp' || k === 'w')) { this.launch(); return true; }
    },
    extraLabel() { return `Lives ${this.lives} · Level ${this.levelN}`; },
  };

  /* ============================================================
     GAME 3 — SNAKE
     ============================================================ */
  const Snake = {
    id: 'snake', name: 'Snake',
    help: 'Arrow keys or WASD to turn. On a phone, swipe. Don\'t hit the walls or yourself.',
    start: 'Eat, grow, don\'t bite your tail.',
    init() {
      this.cols = W < 520 ? 16 : 24;
      this.cell = W / this.cols; this.rows = Math.floor(H / this.cell);
      this.offY = (H - this.rows * this.cell) / 2;
      const y = Math.floor(this.rows / 2);
      this.body = [{ x: 5, y }, { x: 4, y }, { x: 3, y }];
      this.dir = { x: 1, y: 0 }; this.queue = [];
      this.t = 0; this.step = .12; this.pulse = 0;
      this.placeFood();
    },
    placeFood() {
      let f;
      do { f = { x: Math.floor(rand(0, this.cols)), y: Math.floor(rand(0, this.rows)) }; }
      while (this.body.some(s => s.x === f.x && s.y === f.y));
      this.food = f;
    },
    turn(d) {
      const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
      if (d.x === -last.x && d.y === -last.y) return;
      if (d.x === last.x && d.y === last.y) return;
      if (this.queue.length < 3) this.queue.push(d);
    },
    update(dt) {
      this.pulse += dt * 4;
      this.t += dt;
      while (this.t >= this.step) {
        this.t -= this.step;
        if (this.queue.length) this.dir = this.queue.shift();
        const h = this.body[0], n = { x: h.x + this.dir.x, y: h.y + this.dir.y };
        if (n.x < 0 || n.y < 0 || n.x >= this.cols || n.y >= this.rows || this.body.some((s, i) => i < this.body.length - 1 && s.x === n.x && s.y === n.y)) {
          burst((h.x + .5) * this.cell, this.offY + (h.y + .5) * this.cell, C.lamp, 20, 200);
          Game.over(); return;
        }
        this.body.unshift(n);
        if (n.x === this.food.x && n.y === this.food.y) {
          Game.add(1);
          burst((n.x + .5) * this.cell, this.offY + (n.y + .5) * this.cell, C.blue, 10, 140);
          this.step = Math.max(.055, .12 - Game.score * .0022);
          this.placeFood();
        } else this.body.pop();
      }
    },
    draw() {
      const c = this.cell, oy = this.offY;
      ctx.fillStyle = C.dark ? 'rgba(255,255,255,.025)' : 'rgba(30,36,48,.03)';
      for (let y = 0; y < this.rows; y++) for (let x = (y % 2); x < this.cols; x += 2) ctx.fillRect(x * c, oy + y * c, c, c);
      // food
      const fr = c * (.32 + Math.sin(this.pulse) * .04);
      ctx.fillStyle = C.lamp; ctx.beginPath(); ctx.arc((this.food.x + .5) * c, oy + (this.food.y + .5) * c, fr, 0, Math.PI * 2); ctx.fill();
      // body
      const n = this.body.length;
      this.body.forEach((s, i) => {
        const t = i / Math.max(1, n - 1);
        ctx.fillStyle = `hsl(${lerp(208, 222, t)} ${C.dark ? 62 : 70}% ${lerp(C.dark ? 62 : 42, C.dark ? 46 : 60, t)}%)`;
        const p = c * .08;
        rr(s.x * c + p, oy + s.y * c + p, c - p * 2, c - p * 2, c * .3); ctx.fill();
      });
      // eyes
      const h = this.body[0], ex = (h.x + .5) * c, ey = oy + (h.y + .5) * c;
      const px = -this.dir.y, py = this.dir.x;
      ctx.fillStyle = '#fff';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + this.dir.x * c * .15 + px * s * c * .18, ey + this.dir.y * c * .15 + py * s * c * .18, c * .1, 0, Math.PI * 2); ctx.fill(); }
    },
    key(k, down) {
      if (!down) return;
      const m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[k];
      if (m) { this.turn({ x: m[0], y: m[1] }); return true; }
    },
    swipe(dx, dy) { this.turn({ x: dx, y: dy }); },
  };

  /* ============================================================
     GAME 4 — MERGE
     Slide the tiles. Equal numbers join. Reach 2048.
     ============================================================ */
  const Merge = {
    id: 'merge', name: 'Merge',
    help: 'Arrow keys, WASD or swipe to slide every tile. Matching numbers merge. Reach 2048.',
    start: 'Slide, match, merge. How far can you get?',
    N: 4,
    init() {
      this.grid = Array.from({ length: this.N }, () => Array(this.N).fill(null));
      this.ghosts = []; this.anim = 1; this.won = false;
      this.spawn(); this.spawn();
    },
    empties() { const e = []; for (let r = 0; r < this.N; r++) for (let c = 0; c < this.N; c++) if (!this.grid[r][c]) e.push([r, c]); return e; },
    spawn() {
      const e = this.empties(); if (!e.length) return;
      const [r, c] = e[Math.floor(Math.random() * e.length)];
      this.grid[r][c] = { v: Math.random() < .9 ? 2 : 4, r, c, pr: r, pc: c, born: 0, pop: 0 };
    },
    move(dr, dc) {
      if (this.anim < 1) this.finishAnim();
      const N = this.N; let moved = false, gained = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const t = this.grid[r][c]; if (t) { t.pr = r; t.pc = c; t.merged = false; t.born = 1; t.pop = 0; } }
      const rs = [...Array(N).keys()], cs = [...Array(N).keys()];
      if (dr > 0) rs.reverse(); if (dc > 0) cs.reverse();
      for (const r of rs) for (const c of cs) {
        const t = this.grid[r][c]; if (!t) continue;
        let nr = r, nc = c;
        while (true) {
          const tr = nr + dr, tc = nc + dc;
          if (tr < 0 || tc < 0 || tr >= N || tc >= N) break;
          const o = this.grid[tr][tc];
          if (!o) { nr = tr; nc = tc; continue; }
          if (o.v === t.v && !o.merged && !t.merged) {
            this.grid[r][c] = null;
            o.v *= 2; o.merged = true; o.pop = 1; gained += o.v;
            this.ghosts.push({ v: t.v, pr: r, pc: c, r: tr, c: tc });
            moved = true; nr = null;
          }
          break;
        }
        if (nr === null) continue;
        if (nr !== r || nc !== c) { this.grid[r][c] = null; this.grid[nr][nc] = t; t.r = nr; t.c = nc; moved = true; }
      }
      if (!moved) return;
      this.anim = 0;
      if (gained) Game.add(gained);
      this.spawn();
      if (!this.won && this.grid.flat().some(t => t && t.v >= 2048)) { this.won = true; Game.extra('2048! Keep going'); }
      if (!this.canMove()) setTimeout(() => Game.over(), 350);
    },
    canMove() {
      const N = this.N;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const t = this.grid[r][c]; if (!t) return true;
        if (c + 1 < N && this.grid[r][c + 1] && this.grid[r][c + 1].v === t.v) return true;
        if (r + 1 < N && this.grid[r + 1][c] && this.grid[r + 1][c].v === t.v) return true;
      }
      return false;
    },
    finishAnim() { this.anim = 1; this.ghosts = []; },
    update(dt) {
      if (this.anim < 1) { this.anim = Math.min(1, this.anim + dt / (reduced ? .001 : .11)); if (this.anim >= 1) this.ghosts = []; }
      for (const t of this.grid.flat()) if (t) { if (this.anim >= 1) { t.born = Math.min(1, t.born + dt / .14); t.pop = Math.max(0, t.pop - dt / .18); } }
    },
    palette(v) {
      const steps = ['#F6E7DC','#F9D9C6','#FFB99A','#FF9A74','#FF7E5E','#FF6F4E','#F2603F','#7FB0DC','#4F93CF','#2C7BC0','#1D6AAE','#16508A'];
      const i = Math.min(steps.length - 1, Math.log2(v) - 1);
      return steps[i];
    },
    draw() {
      const N = this.N, size = Math.min(W, H) * .9, x0 = (W - size) / 2, y0 = (H - size) / 2;
      const gap = size * .025, cs = (size - gap * (N + 1)) / N;
      ctx.fillStyle = C.dark ? 'rgba(255,255,255,.05)' : 'rgba(30,36,48,.06)';
      rr(x0, y0, size, size, 14); ctx.fill();
      ctx.fillStyle = C.dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { rr(x0 + gap + c * (cs + gap), y0 + gap + r * (cs + gap), cs, cs, 10); ctx.fill(); }
      const t = this.anim, ease = 1 - (1 - t) * (1 - t);
      const drawTile = (v, r, c, scale = 1) => {
        const x = x0 + gap + c * (cs + gap), y = y0 + gap + r * (cs + gap);
        const s = cs * scale, o = (cs - s) / 2;
        ctx.fillStyle = this.palette(v); rr(x + o, y + o, s, s, 10); ctx.fill();
        const digits = String(v).length;
        text(String(v), x + cs / 2, y + cs / 2 + 1, cs * (digits < 3 ? .42 : digits < 4 ? .34 : .27) * scale, v <= 4 ? '#5A3A2A' : '#fff', 'center', 'Jost', 600);
      };
      for (const g of this.ghosts) drawTile(g.v, lerp(g.pr, g.r, ease), lerp(g.pc, g.c, ease));
      for (const tl of this.grid.flat()) {
        if (!tl) continue;
        const r = lerp(tl.pr, tl.r, ease), c = lerp(tl.pc, tl.c, ease);
        let sc = 1;
        if (t >= 1) { sc = tl.born < 1 ? .4 + .6 * tl.born : 1 + Math.sin(tl.pop * Math.PI) * .1; }
        else if (tl.born === 0) continue;   // new tile appears after the slide
        drawTile(tl.v, r, c, sc);
      }
    },
    key(k, down) {
      if (!down) return;
      const m = { ArrowUp: [-1, 0], w: [-1, 0], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, -1], a: [0, -1], ArrowRight: [0, 1], d: [0, 1] }[k];
      if (m) { this.move(m[0], m[1]); return true; }
    },
    swipe(dx, dy) { this.move(dy, dx); },
  };

  const GAMES = { stack: Stack, breaker: Breaker, snake: Snake, merge: Merge };

  /* ============================================================
     SHELL — state, score, overlay, input, loop
     ============================================================ */
  const Game = {
    cur: Stack, state: 'ready', score: 0, best: 0,
    select(id) {
      this.cur = GAMES[id] || Stack;
      tabs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.game === this.cur.id)));
      helpEl.textContent = this.cur.help;
      try { history.replaceState(null, '', '#' + this.cur.id); } catch (e) {}
      this.ready();
    },
    ready() {
      this.state = 'ready'; this.score = 0; sparks = [];
      this.best = store.get(this.cur.id);
      this.cur.init();
      this.hud();
      this.extra(this.cur.extraLabel ? this.cur.extraLabel() : '');
      this.show(this.cur.name, this.cur.start, 'Play');
    },
    play() {
      if (this.state === 'over') { this.cur.init(); this.score = 0; sparks = []; }
      this.state = 'play';
      this.extra(this.cur.extraLabel ? this.cur.extraLabel() : '');
      this.hud(); this.hide();
      stage.focus({ preventScroll: true });
    },
    add(n) { this.score += n; this.hud(); },
    extra(s) { extraEl.textContent = s || ''; },
    over() {
      if (this.state !== 'play') return;
      this.state = 'over'; this.overAt = performance.now();
      const isBest = this.score > this.best;
      if (isBest) { this.best = this.score; store.set(this.cur.id, this.score); renderBests(); }
      this.hud();
      this.show(isBest && this.score > 0 ? 'New best!' : 'Game over', `You scored ${this.score}.${isBest ? '' : ' Best: ' + this.best + '.'}`, 'Play again');
    },
    hud() { scoreEl.textContent = this.score; bestEl.textContent = Math.max(this.best, this.score); },
    show(t, s, b) { ovTitle.textContent = t; ovText.textContent = s; ovBtn.textContent = b; overlay.hidden = false; },
    hide() { overlay.hidden = true; },
  };

  function renderBests() {
    document.querySelectorAll('[data-best]').forEach(el => { el.textContent = store.get(el.dataset.best) || '—'; });
  }

  /* ---------- sizing ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const changed = Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (changed && Game.state !== 'play') { Game.cur.init(); }
    else if (changed && Game.state === 'play') { Game.state = 'over'; Game.ready(); }
  }
  new ResizeObserver(() => resize()).observe(canvas);

  /* ---------- input ---------- */
  tabs.forEach(b => b.addEventListener('click', () => Game.select(b.dataset.game)));
  ovBtn.addEventListener('click', () => Game.play());

  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let down = null;
  canvas.addEventListener('pointerdown', e => {
    if (Game.state !== 'play') return;
    const p = pos(e); down = { ...p, t: performance.now() };
    if (Game.cur.pointer) Game.cur.pointer(p.x);
    if (Game.cur.tap) { Game.cur.tap(); }
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (Game.state !== 'play' || !Game.cur.pointer) return;
    if (e.pointerType === 'mouse' || down) Game.cur.pointer(pos(e).x);
  });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const p = pos(e), dx = p.x - down.x, dy = p.y - down.y; down = null;
    if (Game.state !== 'play' || !Game.cur.swipe) return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) Game.cur.swipe(Math.sign(dx), 0); else Game.cur.swipe(0, Math.sign(dy));
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  const norm = k => (k.length === 1 ? k.toLowerCase() : k);
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,select,textarea,[contenteditable]')) return;
    const k = norm(e.key);
    const inStage = stage.contains(document.activeElement);
    if (Game.state !== 'play') {
      if (inStage && k.startsWith('Arrow') && document.activeElement !== ovBtn) e.preventDefault();
      if (inStage && (k === ' ' || k === 'Enter') && document.activeElement !== ovBtn) {
        e.preventDefault();
        if (Game.state === 'over' && performance.now() - (Game.overAt || 0) < 800) return;   // don't restart by accident
        Game.play();
      }
      return;
    }
    if (k === 'Escape' || k === 'p') { pause(); return; }
    if (Game.cur.key && Game.cur.key(k, true)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { if (Game.state === 'play' && Game.cur.key) Game.cur.key(norm(e.key), false); });

  function pause() {
    if (Game.state !== 'play') return;
    Game.state = 'paused';
    if (Breaker.keys) Breaker.keys = {};
    Game.show('Paused', 'Take your time.', 'Resume');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  // Pause when the game scrolls out of view
  new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) pause(); }), { threshold: .25 }).observe(stage);

  // Override play() for paused state so the game isn't reset
  const basePlay = Game.play.bind(Game);
  Game.play = function () {
    if (this.state === 'paused') { this.state = 'play'; this.hide(); stage.focus({ preventScroll: true }); return; }
    basePlay();
  };

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
    if (W && H) {
      if (Game.state === 'play') Game.cur.update(dt);
      else if (Game.cur === Stack && Game.state === 'over') Stack.update(dt);   // let the last block fall
      if (Game.cur === Merge && Game.state !== 'play') Merge.update(dt);
      updateSparks(dt);
      ctx.clearRect(0, 0, W, H);
      Game.cur.draw();
      drawSparks();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- start ---------- */
  readTheme();
  resize();
  renderBests();
  Game.select((location.hash || '').slice(1) in GAMES ? location.hash.slice(1) : 'stack');
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => readTheme());
})();

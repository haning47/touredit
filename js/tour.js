/* ==================================================================
   環景導覽共用程式（瀏覽頁 index.html 與編輯器 editor.html 共用）
   使用 Photo Sphere Viewer 5.15.1 與 Markers 外掛

   tour.json 結構：
   {
     "title": "導覽名稱",
     "cameraHeight": 1.5,              // 拍攝時鏡頭離地高度（公尺）
     "start": "場景 id",
     "areas": [
       { "id": "campus", "name": "校園巡禮", "start": "場景 id",
         "plan": { "image": "plans/campus.jpg", "imgW": 1200, "imgH": 800, "scale": 0.05 },  // 選填：平面底圖，scale = 每像素幾公尺
         "scenes": [
           { "id": "s1", "name": "校門口", "file": "panos/s1.jpg",
             "x": 12.5, "y": 30.2,       // 在平面圖上的位置（公尺），y 往上為正
             "heading": 90,              // 照片正中央朝向的方位（度），0 = 平面圖上方，順時針
             "view":  { "yaw": 0, "pitch": 0 },
             "links": [
               { "to": "s2" },                              // 自動：依兩點座標算出白圈
               { "to": "s9", "yaw": -98.5, "pitch": 5 }     // 手動：自己放的位置（跨區域、樓梯）
             ],
             "tags":  [ { "yaw": 10, "pitch": 5, "title": "標題", "text": "說明", "images": [] } ] }
         ] }
     ]
   }
   yaw 往右為正、pitch 往上為正，單位都是「度」。
================================================================== */

export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
export const norm180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
export const norm360 = (d) => ((d % 360) + 360) % 360;
export const round1 = (x) => Math.round(x * 10) / 10;
export const round2 = (x) => Math.round(x * 100) / 100;
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FLOOR_LIMIT = -3;   // 手動白圈 pitch 低於這個角度就畫在地上
const RING_R = 0.42;             // 地上白圈半徑（公尺）
const CURSOR_R = 0.3;            // 滑鼠游標圈半徑

export const placed = (s) => !!s && Number.isFinite(s.x) && Number.isFinite(s.y);
export const isManual = (l) => Number.isFinite(l.yaw) && Number.isFinite(l.pitch);

/* ------------------------------------------------------------ 資料 */
export class Tour {
  constructor(data) {
    this.data = data;
    this.reindex();
  }
  reindex() {
    this.byId = new Map();
    this.areaById = new Map();
    for (const a of this.data.areas) for (const s of a.scenes) {
      this.byId.set(s.id, s);
      this.areaById.set(s.id, a);
    }
  }
  get H() { return Number(this.data.cameraHeight) || 1.5; }
  scene(id) { return this.byId.get(id); }
  areaOf(id) { return this.areaById.get(id); }
  areaStart(area) {
    return (area.start && this.areaOf(area.start) === area && this.scene(area.start)) || area.scenes[0] || null;
  }
  firstScene() {
    const s = this.scene(this.data.start);
    if (s) return s;
    for (const a of this.data.areas) {
      const t = this.areaStart(a);
      if (t) return t;
    }
    return null;
  }
}

/* ------------------------------------------------------------ 幾何 */
/* 平面圖上從 a 看向 (x, y) 的方位角（度，平面圖上方 = 0，順時針） */
export function bearing(a, x, y) {
  return deg(Math.atan2(x - a.x, y - a.y));
}

export function floorDistance(pitchDeg, H) {
  return Math.min(25, Math.max(0.5, H / Math.tan(rad(-pitchDeg))));
}

/* 連結在照片上的位置：手動白圈直接用 yaw/pitch，自動白圈依兩點座標計算 */
export function linkGeom(tour, scene, link) {
  if (isManual(link)) return { yaw: link.yaw, pitch: link.pitch, manual: true };
  const t = tour.scene(link.to);
  if (!t || !placed(scene) || !placed(t) || tour.areaOf(t.id) !== tour.areaOf(scene.id)) return null;
  const dist = Math.hypot(t.x - scene.x, t.y - scene.y);
  const b = bearing(scene, t.x, t.y);
  return {
    yaw: norm180(b - (scene.heading || 0)),
    pitch: -deg(Math.atan2(tour.H, Math.max(dist, 0.3))),
    dist,
    bearing: b,
    auto: true,
  };
}

/* 地上以 (yaw, pitch) 那一點為圓心、半徑 r 公尺的圓 → 照片上的多邊形 */
export function floorRing(yawDeg, pitchDeg, H, r = RING_R, n = 36) {
  const d = floorDistance(pitchDeg, H);
  const cx = d * Math.sin(rad(yawDeg));
  const cy = d * Math.cos(rad(yawDeg));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const px = cx + r * Math.cos(t);
    const py = cy + r * Math.sin(t);
    pts.push([Math.atan2(px, py), -Math.atan2(H, Math.hypot(px, py))]);
  }
  return pts;
}

/* ------------------------------------------------------------ 標記 */
export function tagHtml(tag, resolve) {
  const imgs = (tag.images || []).map((p) => `<img src="${esc(resolve(p))}" alt="">`).join('');
  const body = String(tag.text || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
  return `<article class="tag-panel">${imgs}<h2>${esc(tag.title)}</h2>${body}</article>`;
}

/* 直立圓圈裡箭頭的方向（度，0 = 往前、順時針）；沒設定就是往前 */
export function arrowStyle(link) {
  const a = Number(link && link.arrow);
  return Number.isFinite(a) && a % 360 !== 0 ? ` style="--arrow:${a}deg"` : '';
}

/* 回傳 null 表示這個連結目前畫不出來（例如自動白圈但還沒放到平面圖） */
export function linkMarker(tour, scene, link, i, selected = false) {
  const g = linkGeom(tour, scene, link);
  if (!g) return null;
  const t = tour.scene(link.to);
  const fromArea = tour.areaOf(scene.id);
  const toArea = t && tour.areaOf(t.id);
  const label = t ? '前往 ' + t.name + (toArea && toArea !== fromArea ? '（' + toArea.name + '）' : '') : '連結的場景不存在';
  const cls = (selected ? ' is-selected' : '') + (t ? '' : ' is-broken');
  const base = {
    id: 'link-' + i,
    tooltip: { content: esc(label), position: 'top center' },
    data: { type: 'link', index: i },
  };
  if (g.pitch <= FLOOR_LIMIT) {
    return { ...base, polygon: floorRing(g.yaw, g.pitch, tour.H), className: 'floor-ring' + cls, zIndex: 5 };
  }
  return {
    ...base,
    position: { yaw: rad(g.yaw), pitch: rad(g.pitch) },
    html: `<span class="go-ring"${arrowStyle(link)}></span>`,
    size: { width: 46, height: 46 },
    anchor: 'center center',
    className: 'go-marker' + cls,
    zIndex: 6,
  };
}

export function tagMarker(tag, i, { selected = false, content = null } = {}) {
  const m = {
    id: 'tag-' + i,
    position: { yaw: rad(tag.yaw), pitch: rad(tag.pitch) },
    html: '<span class="tag-dot"></span>',
    size: { width: 28, height: 28 },
    anchor: 'center center',
    className: 'tag-marker' + (selected ? ' is-selected' : ''),
    tooltip: { content: esc(tag.title || '（未命名標籤）'), position: 'top center' },
    data: { type: 'tag', index: i },
    zIndex: 20,
  };
  if (content) m.content = content;
  return m;
}

export function cursorMarker() {
  return {
    id: 'cursor',
    polygon: floorRing(0, -30, 1.5, CURSOR_R, 24),
    className: 'floor-cursor',
    opacity: 0,
    data: { type: 'cursor' },
    zIndex: 1,
  };
}

/* 到達 to 時要面向哪裡：
   自動白圈 → 延續行進方向；
   手動白圈 → 若 to 有連回 from 的白圈，就背對它；
   都沒有 → to 自己設定的進入視角。 */
export function arrivalPosition(tour, from, to, link) {
  const g = from && link && linkGeom(tour, from, link);
  if (g && g.auto && Number.isFinite(to.heading)) {
    return { yaw: rad(norm180(g.bearing - to.heading)), pitch: rad(-4) };
  }
  const back = from && (to.links || []).find((l) => l.to === from.id);
  const bg = back && linkGeom(tour, to, back);
  if (bg) return { yaw: rad(norm180(bg.yaw + 180)), pitch: rad(-4) };
  return viewOf(to);
}

export function viewOf(scene) {
  const v = scene.view || { yaw: 0, pitch: 0 };
  return { yaw: rad(v.yaw || 0), pitch: rad(v.pitch || 0) };
}

/* ------------------------------------------------------------ 移動 */
export class Navigator {
  /**
   * @param o.viewer   Photo Sphere Viewer 實體
   * @param o.markers  Markers 外掛實體
   * @param o.tour     Tour
   * @param o.resolve  檔案路徑 → 網址
   * @param o.build    (scene) => 標記陣列
   * @param o.onChange (scene) => void
   */
  constructor(o) {
    Object.assign(this, o);
    this.current = null;
    this.busy = false;
  }

  refresh() {
    if (this.current) this.markers.setMarkers(this.build(this.current).filter(Boolean));
  }

  async show(scene, position, transition, zoom) {
    const opts = { position, caption: scene.name, transition, showLoader: true };
    if (zoom !== undefined) opts.zoom = zoom;
    await this.viewer.setPanorama(this.resolve(scene.file), opts);
    this.current = scene;
    this.refresh();
    this.onChange?.(scene);
    this.preload(scene);
  }

  preload(scene) {
    for (const l of scene.links || []) {
      const t = this.tour.scene(l.to);
      if (!t) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = this.resolve(t.file);
    }
  }

  /* 沿著連結走過去：先轉向、往前推近，再淡入下一張 */
  async walk(link) {
    const t = this.tour.scene(link.to);
    const g = this.current && linkGeom(this.tour, this.current, link);
    if (!t || !g || this.busy) return;
    this.busy = true;
    const from = this.current;
    try {
      const zoom = this.viewer.getZoomLevel();
      this.hideCursor();
      await this.viewer.animate({
        yaw: rad(g.yaw),
        pitch: rad(Math.max(-12, Math.min(8, g.pitch))),
        zoom: Math.min(100, zoom + 12),
        speed: 600,
      });
      this.markers.clearMarkers();
      await this.show(t, arrivalPosition(this.tour, from, t, link), { speed: 700, rotation: false, effect: 'fade' }, zoom);
    } catch (e) {
      console.error(e);
      this.refresh();
    } finally {
      this.busy = false;
    }
  }

  /* 直接跳到某個場景（下拉選單、平面圖），保留目前面向的方位 */
  async jump(id) {
    const t = this.tour.scene(id);
    if (!t || this.busy) return;
    if (this.current && t.id === this.current.id) return;
    this.busy = true;
    try {
      let pos = viewOf(t);
      const c = this.current;
      if (c && Number.isFinite(c.heading) && Number.isFinite(t.heading) && this.tour.areaOf(c.id) === this.tour.areaOf(t.id)) {
        const b = c.heading + deg(this.viewer.getPosition().yaw);
        pos = { yaw: rad(norm180(b - t.heading)), pitch: 0 };
      }
      this.markers.clearMarkers();
      await this.show(t, pos, { speed: 500, rotation: false, effect: 'black' });
    } catch (e) {
      console.error(e);
      this.refresh();
    } finally {
      this.busy = false;
    }
  }

  /* 點地面：找出那個方向最接近的連結 */
  linkToward(yawDeg, pitchDeg) {
    if (!this.current || pitchDeg > -2) return null;
    let best = null;
    for (const l of this.current.links || []) {
      if (!this.tour.scene(l.to)) continue;
      const g = linkGeom(this.tour, this.current, l);
      if (!g) continue;
      const dy = Math.abs(norm180(g.yaw - yawDeg));
      if (dy < 25 && (!best || dy < best.dy)) best = { l, dy };
    }
    return best && best.l;
  }

  hideCursor() {
    try { this.markers.updateMarker({ id: 'cursor', opacity: 0 }); } catch (e) { /* 沒有游標圈 */ }
  }

  /* 滑鼠在地面上移動時，顯示跟著走的圈（觸控裝置不顯示） */
  attachCursor(container, isEnabled = () => true) {
    let raf = 0;
    let last = null;
    container.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!this.current || this.busy || !last) return;
        if (!isEnabled()) { this.hideCursor(); return; }
        const r = container.getBoundingClientRect();
        let pos;
        try {
          pos = this.viewer.dataHelper.viewerCoordsToSphericalCoords({ x: last.clientX - r.left, y: last.clientY - r.top });
        } catch (err) { return; }
        const p = pos && deg(pos.pitch);
        if (!pos || p > -4 || floorDistance(p, this.tour.H) > 12) { this.hideCursor(); return; }
        try {
          this.markers.updateMarker({ id: 'cursor', opacity: 1, polygon: floorRing(deg(pos.yaw), p, this.tour.H, CURSOR_R, 24) });
        } catch (err) { /* 標記尚未建立 */ }
      });
    });
    container.addEventListener('pointerleave', () => this.hideCursor());
  }
}

/* ------------------------------------------------------------ 平面圖 */
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * 平面圖：座標單位是公尺，y 往上為正（畫面上方 = 方位 0 度）。
 * 瀏覽頁用來顯示小地圖，編輯器用來拖曳拍攝點、連線、設定比例尺。
 */
export class PlanView {
  constructor(svg, { tour, resolve = (p) => p, onNode = null, zoomable = false, labels = 'all' } = {}) {
    this.svg = svg;
    this.tour = tour;
    this.resolve = resolve;
    this.onNode = onNode;
    this.labels = labels;
    this.area = null;
    this.current = null;
    this.viewYaw = 0;
    this.highlight = new Set();
    this.vb = null;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (zoomable) this.enableZoom();
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.render());
      this.ro.observe(svg);
    }
  }

  setArea(area) {
    if (area !== this.area) { this.area = area; this.vb = null; }
    this.render();
  }
  setCurrent(scene, yawDeg = this.viewYaw) {
    this.current = scene;
    this.viewYaw = yawDeg;
    this.drawCone();
  }
  setView(yawDeg) {
    this.viewYaw = yawDeg;
    this.drawCone();
  }

  /* 底圖在世界座標中的範圍 */
  imageRect() {
    const p = this.area?.plan;
    if (!p || !p.image || !p.imgW || !p.scale) return null;
    return { x: 0, y: 0, w: p.imgW * p.scale, h: p.imgH * p.scale };
  }
  bounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    const r = this.imageRect();
    if (r) { add(r.x, r.y); add(r.x + r.w, r.y + r.h); }
    for (const s of this.area?.scenes || []) if (placed(s)) add(s.x, s.y);
    if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 20, h: 12 };
    const m = Math.max(1.5, 0.08 * Math.max(x1 - x0, y1 - y0));
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    return { x: x0, y: y0, w: Math.max(4, x1 - x0), h: Math.max(3, y1 - y0) };
  }
  fit() { this.vb = null; this.render(); }

  /* 世界座標 (x, y) ↔ SVG 座標 (x, -y) */
  toWorld(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: -p.y };
  }
  unit() {
    const w = this.svg.clientWidth || 300;
    const h = this.svg.clientHeight || 200;
    const vb = this.vb || this.bounds();
    return Math.max(vb.w / w, vb.h / h);   // 每像素幾公尺
  }

  enableZoom() {
    this.svg.addEventListener('wheel', (e) => {
      if (!this.area) return;
      e.preventDefault();
      const vb = this.vb || this.bounds();
      const p = this.toWorld(e.clientX, e.clientY);
      const k = Math.exp(e.deltaY * 0.0015);
      const w = Math.min(2000, Math.max(2, vb.w * k));
      const h = vb.h * (w / vb.w);
      this.vb = { x: p.x - (p.x - vb.x) * (w / vb.w), y: p.y - (p.y - vb.y) * (h / vb.h), w, h };
      this.render();
    }, { passive: false });
    let pan = null;
    this.svg.addEventListener('pointerdown', (e) => {
      if (e.target !== this.svg && !e.target.closest('.pv-bg')) return;
      if (this.panBlocked?.()) return;
      pan = { x: e.clientX, y: e.clientY, vb: { ...(this.vb || this.bounds()) }, moved: false };
      this.svg.setPointerCapture(e.pointerId);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (!pan) return;
      const u = this.unit();
      const dx = (e.clientX - pan.x) * u;
      const dy = (e.clientY - pan.y) * u;
      if (Math.abs(dx) + Math.abs(dy) > 2 * u) pan.moved = true;
      this.vb = { ...pan.vb, x: pan.vb.x - dx, y: pan.vb.y + dy };
      this.render();
    });
    const end = (e) => {
      if (!pan) return;
      if (pan.moved) this.suppressClick = true;
      pan = null;
      try { this.svg.releasePointerCapture(e.pointerId); } catch (err) { /* 已釋放 */ }
      setTimeout(() => { this.suppressClick = false; }, 0);
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
  }

  render() {
    const svg = this.svg;
    svg.innerHTML = '';
    if (!this.area) return;
    const vb = this.vb || this.bounds();
    svg.setAttribute('viewBox', `${vb.x} ${-(vb.y + vb.h)} ${vb.w} ${vb.h}`);
    const u = this.unit();

    const bg = svgEl('g', { class: 'pv-bg' }, svg);
    svgEl('rect', { x: vb.x - vb.w, y: -(vb.y + vb.h) - vb.h, width: vb.w * 3, height: vb.h * 3, class: 'pv-backdrop' }, bg);
    const r = this.imageRect();
    if (r) {
      svgEl('image', { href: this.resolve(this.area.plan.image), x: r.x, y: -(r.y + r.h), width: r.w, height: r.h, preserveAspectRatio: 'none', class: 'pv-image' }, bg);
    } else {
      const step = vb.w > 80 ? 10 : vb.w > 30 ? 5 : 1;
      const g = svgEl('g', { class: 'pv-grid' }, bg);
      for (let x = Math.ceil(vb.x / step) * step; x <= vb.x + vb.w; x += step) svgEl('line', { x1: x, y1: -(vb.y + vb.h), x2: x, y2: -vb.y }, g);
      for (let y = Math.ceil(vb.y / step) * step; y <= vb.y + vb.h; y += step) svgEl('line', { x1: vb.x, y1: -y, x2: vb.x + vb.w, y2: -y }, g);
    }

    const links = svgEl('g', { class: 'pv-links' }, svg);
    const seen = new Set();
    for (const s of this.area.scenes) {
      if (!placed(s)) continue;
      for (const l of s.links || []) {
        const t = this.tour.scene(l.to);
        if (!placed(t) || this.tour.areaOf(t.id) !== this.area) continue;
        const key = [s.id, t.id].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const manual = isManual(l) && !(t.links || []).some((b) => b.to === s.id && !isManual(b));
        svgEl('line', { x1: s.x, y1: -s.y, x2: t.x, y2: -t.y, class: 'pv-link' + (manual ? ' manual' : ''), 'data-a': s.id, 'data-b': t.id }, links);
      }
    }

    this.coneLayer = svgEl('g', { class: 'pv-cone-layer' }, svg);
    this.extraLayer = svgEl('g', { class: 'pv-extra' }, svg);

    const nodes = svgEl('g', { class: 'pv-nodes' }, svg);
    for (const s of this.area.scenes) {
      if (!placed(s)) continue;
      const isCur = this.current && this.current.id === s.id;
      const g = svgEl('g', {
        class: 'pv-node' + (isCur ? ' here' : '') + (this.highlight.has(s.id) ? ' hl' : '') + (Number.isFinite(s.heading) ? '' : ' no-heading'),
        'data-id': s.id,
        transform: `translate(${s.x} ${-s.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': s.name,
      }, nodes);
      const title = svgEl('title', {}, g);
      title.textContent = s.name;
      svgEl('circle', { r: (isCur ? 8 : 6.5) * u, 'stroke-width': 2 * u }, g);
      if (this.labels === 'all' || (this.labels === 'current' && isCur)) {
        const t = svgEl('text', { y: -11 * u, 'font-size': 11.5 * u, 'stroke-width': 3 * u }, g);
        t.textContent = s.name;
      }
      if (this.onNode) {
        g.addEventListener('click', (e) => { if (!this.suppressClick) this.onNode(s, e); });
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.onNode(s, e); });
      }
    }
    this.drawCone();
    this.onRender?.();
  }

  drawCone() {
    if (!this.coneLayer) return;
    this.coneLayer.innerHTML = '';
    const s = this.current;
    if (!s || !placed(s) || this.tour.areaOf(s.id) !== this.area) return;
    const u = this.unit();
    const rr = 42 * u;
    const b = (Number.isFinite(s.heading) ? s.heading : 0) + this.viewYaw;
    const half = 32;
    const pt = (a) => [s.x + rr * Math.sin(rad(a)), -(s.y + rr * Math.cos(rad(a)))];
    const [x1, y1] = pt(b - half);
    const [x2, y2] = pt(b + half);
    svgEl('path', {
      d: `M${s.x} ${-s.y} L${x1} ${y1} A${rr} ${rr} 0 0 1 ${x2} ${y2} Z`,
      class: 'pv-cone' + (Number.isFinite(s.heading) ? '' : ' unknown'),
    }, this.coneLayer);
  }
}

/* Photo Sphere Viewer 介面文字 */
export const LANG = {
  zoom: '縮放', zoomOut: '縮小', zoomIn: '放大', fullscreen: '全螢幕', close: '關閉',
  twoFingers: '請用兩指移動畫面', ctrlZoom: '按住 Ctrl 再捲動可縮放', loadError: '全景圖載入失敗',
};

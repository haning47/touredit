/* ==================================================================
   環景導覽共用程式（瀏覽頁 index.html 與編輯器 editor.html 共用）
   使用 Photo Sphere Viewer 5.15.1 與 Markers 外掛

   tour.json 結構：
   {
     "title": "導覽名稱",
     "cameraHeight": 1.5,          // 拍攝時鏡頭離地高度（公尺），決定地上白圈的遠近
     "start": "場景 id",            // 一打開時的場景
     "areas": [
       { "id": "campus", "name": "校園巡禮", "start": "場景 id",
         "scenes": [
           { "id": "campus-0", "name": "校門口", "file": "panos/campus-0.jpg",
             "view":  { "yaw": 0, "pitch": 0 },                       // 進入時的視角（度）
             "links": [ { "yaw": -98.5, "pitch": -20, "to": "campus-2" } ],
             "tags":  [ { "yaw": 10, "pitch": 5, "title": "標題", "text": "說明\n第二段",
                          "images": ["images/xxx.jpg"] } ] }
         ] }
     ]
   }
   yaw：往右為正；pitch：往上為正，單位都是「度」。
   連結的 pitch 低於 -3 度時畫成地上的白圈，否則畫成直立的圓圈（例如樓梯往上）。
================================================================== */

export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
export const norm180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
export const round1 = (x) => Math.round(x * 10) / 10;
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FLOOR_LIMIT = -3;   // 連結 pitch 低於這個角度就畫在地上
const RING_R = 0.42;             // 地上白圈半徑（公尺）
const CURSOR_R = 0.3;            // 滑鼠游標圈半徑

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
export function floorDistance(pitchDeg, H) {
  return Math.min(25, Math.max(0.5, H / Math.tan(rad(-pitchDeg))));
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

export function linkMarker(tour, scene, link, i, selected = false) {
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
  if (link.pitch <= FLOOR_LIMIT) {
    return { ...base, polygon: floorRing(link.yaw, link.pitch, tour.H), className: 'floor-ring' + cls, zIndex: 5 };
  }
  return {
    ...base,
    position: { yaw: rad(link.yaw), pitch: rad(link.pitch) },
    html: '<span class="go-ring"></span>',
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
   若 to 有一個連回 from 的白圈，就背對它（等於延續走路的方向）；
   否則用 to 自己設定的進入視角。 */
export function arrivalPosition(from, to) {
  const back = from && (to.links || []).find((l) => l.to === from.id);
  if (back) return { yaw: rad(norm180(back.yaw + 180)), pitch: rad(-4) };
  const v = to.view || { yaw: 0, pitch: 0 };
  return { yaw: rad(v.yaw || 0), pitch: rad(v.pitch || 0) };
}

export function viewOf(scene) {
  const v = scene.view || { yaw: 0, pitch: 0 };
  return { yaw: rad(v.yaw || 0), pitch: rad(v.pitch || 0) };
}

/* ------------------------------------------------------------ 移動 */
export class Navigator {
  /**
   * @param {object} o
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
    if (this.current) this.markers.setMarkers(this.build(this.current));
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
    if (!t || this.busy || !this.current) return;
    this.busy = true;
    const from = this.current;
    try {
      const zoom = this.viewer.getZoomLevel();
      this.hideCursor();
      await this.viewer.animate({
        yaw: rad(link.yaw),
        pitch: rad(Math.max(-12, Math.min(8, link.pitch))),
        zoom: Math.min(100, zoom + 12),
        speed: 600,
      });
      this.markers.clearMarkers();
      await this.show(t, arrivalPosition(from, t), { speed: 700, rotation: false, effect: 'fade' }, zoom);
    } catch (e) {
      console.error(e);
      this.refresh();
    } finally {
      this.busy = false;
    }
  }

  /* 直接跳到某個場景（下拉選單、場景列表） */
  async jump(id) {
    const t = this.tour.scene(id);
    if (!t || this.busy) return;
    if (this.current && t.id === this.current.id) return;
    this.busy = true;
    try {
      this.markers.clearMarkers();
      await this.show(t, viewOf(t), { speed: 500, rotation: false, effect: 'black' });
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
      const dy = Math.abs(norm180(l.yaw - yawDeg));
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

/* Photo Sphere Viewer 介面文字 */
export const LANG = {
  zoom: '縮放', zoomOut: '縮小', zoomIn: '放大', fullscreen: '全螢幕', close: '關閉',
  twoFingers: '請用兩指移動畫面', ctrlZoom: '按住 Ctrl 再捲動可縮放', loadError: '全景圖載入失敗',
};

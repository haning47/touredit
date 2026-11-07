# 松山高中環景導覽（Photo Sphere Viewer）

## 溝通規則（一定要遵守）

- **一律用繁體中文**，包含工作過程中的說明文字。不用英文、不用簡體。
- **需要使用者按「允許」的動作，事先說明**：先用白話講清楚要做什麼、會影響到哪裡（使用者的電腦、GitHub，或只在 Claude 自己的工作區），再執行。沒說明的話，使用者會先拒絕。
- **不要 commit 或 push 到 GitHub**（repo：haning47/VR），由使用者自己操作。
- **不要刪除使用者的檔案**。真的需要刪除時，先說明要刪哪些、為什麼，取得同意後才動手。
- **改程式時 `psv`、`touredit`、`ssshlib` 三個地方都要同步更新**（`ssshlib` 是圖書館二樓的原始導覽資料夾，在 Google 共用雲端硬碟 `H:\共用雲端硬碟\資訊組共用\Claude 工具包6000塊好好用\校園導覽\VR\ssshlib`；device_bash 掛載不到它，要用 device_stage_files／device_commit_files 寫入，也無法在那裡改名或刪檔）。使用者以 `touredit` 當作最新程式的來源，會自己把 `index.html`、`editor.html`、`js\`、`css\`、`lib\` 複製到其他導覽資料夾（例如 `VR\test`）。不要叫他複製整個 `touredit`（裡面有 `.git`），也不要另外做批次檔，他覺得那樣更麻煩。
- **保留游標白圈**：滑鼠在地面上移動時跟著出現的白圈是使用者要的，不要移除或改掉。

## 位置

| 項目 | 位置 |
|---|---|
| 網站 repo | GitHub `haning47/VR`，GitHub Pages：`https://haning47.github.io/VR/` |
| 舊站（Marzipano） | `/VR/home/`（首頁）、校園巡禮、視聽大樓，都還在 repo 裡 |
| 新站（本專案） | `https://haning47.github.io/VR/psv/` ← 本機 `D:\OneDrive - sssh.tp.edu.tw\Github\VR\psv` |
| 編輯器本機副本 | `D:\OneDrive - sssh.tp.edu.tw\Github\touredit`（只有程式檔） |

- 拍攝器材是 RICOH THETA X，照片為 2:1 全景圖（equirectangular）。
- 本機使用編輯器的方式：在 `touredit` 執行 `python -m http.server 8000`，開 `http://localhost:8000/editor.html`，按「開啟資料夾」選 `VR\psv`。
- 也可以直接用線上的 `https://haning47.github.io/VR/psv/editor.html`。
- 直接雙擊開檔（file://）不能用，因為 ES module 會被瀏覽器擋。

## 檔案結構（psv 資料夾）

| 檔案 | 用途 |
|---|---|
| `index.html` | 導覽頁：全螢幕全景、左上角「區域」「地點」下拉選單、左下角平面圖小地圖（可縮放、拖曳，有「放大地圖」按鈕）。網址後面接 `#場景id` 可以直接跳到該場景 |
| `editor.html` | 編輯器，用 File System Access API 直接讀寫使用者選的資料夾。需要電腦版 Chrome 或 Edge，透過 https 或 localhost 開啟 |
| `js/tour.js` | 共用邏輯：Tour、Navigator、PlanView、白圈幾何計算 |
| `css/tour.css` | 白圈、標籤、平面圖的樣式 |
| `css/psv.css` | Photo Sphere Viewer 本身的樣式（複製進來的，不要改） |
| `lib/` | Photo Sphere Viewer 與 three.js 的程式檔（不要改） |
| `tour.json` | 所有資料 |
| `panos/` | 全景圖 |
| `images/` | 標籤裡的圖片 |
| `plans/` | 平面圖底圖 |

函式庫放在 repo 裡的 `lib/`（2026-11-01 起，不再從 jsDelivr 載入），用 importmap 指向：`lib/three-0.185.1/`（three.module.js、three.core.js）、`lib/photo-sphere-viewer-5.15.1/`（core.js、markers-plugin.js、gyroscope-plugin.js、stereo-plugin.js），內容和 npm 上的版本完全相同，不要修改。使用者選擇了固定版本的穩定做法，沒被要求就不要升級。編輯器的 `VIEWER_FILES` 也包含這些 lib 檔案，存檔時缺少會自動補上。

## tour.json 格式

```json
{
  "title": "松山高中720環景",
  "cameraHeight": 1.5,
  "start": "home-0",
  "areas": [
    {
      "id": "campus",
      "name": "校園巡禮",
      "start": "campus-0",
      "plan": { "image": "plans/campus-xxxx.jpg", "imgW": 2000, "imgH": 1000, "scale": 0.01 },
      "scenes": [
        {
          "id": "campus-0",
          "name": "校門口",
          "file": "panos/campus-0.jpg",
          "x": 3.2, "y": 3.4, "heading": 90,
          "view": { "yaw": 0, "pitch": 0 },
          "links": [
            { "to": "campus-1" },
            { "to": "audio-0", "yaw": -120.1, "pitch": -18.4 }
          ],
          "tags": [
            { "yaw": -52.6, "pitch": 32.7, "title": "圖書館", "text": "一樓展覽\n二樓書庫", "images": ["images/campus-0-1-1.jpg"] }
          ]
        }
      ]
    }
  ]
}
```

- 角度都用「度」。`yaw` 是照片內的水平角（正值往右），`pitch` 是垂直角（正值往上）。
- `x`、`y` 的單位是公尺，`y` 往北（平面圖上方）。
- `heading` 是照片正中央（yaw 0）朝向的方位：0 是平面圖上方，順時針。
- `plan`：底圖左下角在 (0, 0)，寬度 = `imgW × scale` 公尺（`scale` 是每像素幾公尺）。沒有底圖時顯示方格。
- `x`、`y`、`heading`、`plan` 都可以省略。沒有的場景就和舊版一樣，只用手動白圈。
- 標籤的 `text` 每一行是一段。
- 場景可以有 `"transit": true`（過渡場景，2026-11-06 加入）：只用來讓兩個場景之間移動順一點。導覽頁的「地點」選單不列出；站在上面時，選單最上面多一項「往 ○○」（value `__toward`）：`towardMain()` 取面朝角度最接近的白圈，用 `destScene()` 找下一個主要場景，轉身（position-updated）時即時更新，判斷不出來就用 `nearestMain()`（平面圖最近，沒放平面圖就沿白圈最少步）。打開選單時先清空，選「往 ○○」或同一個也會跳過去，小地圖不畫它的點和名稱（線條照畫，站在上面時只顯示目前位置），`areaStart()` 會跳過它。白圈提示和 VR 標籤用 `destScene()` 往前找下一個主要場景的名稱，遇到岔路就用過渡場景自己的名稱。編輯器：場景設定有勾選框，清單標「過渡」，平面圖照常顯示（灰色小點，`PlanView showTransit: true`）。
- 通往過渡場景的白圈（`linkMarker` 加 class `to-transit`）：2026-11-07 起和主要場景的白圈完全一樣（使用者要求「不論主要或過渡都比照 Matterport」），不再隱藏；`to-transit` class 保留但沒有樣式。
- 標籤的 `text` 裡，`https://` 網址自動變成超連結，`[顯示文字](https://網址)` 只顯示文字；都開新分頁（`linkify()`，其餘文字一律跳脫，不能寫 HTML）。
- 標籤可以有 `"video": "YouTube 網址"`：用 youtube-nocookie 嵌入在說明面板最上方，支援 watch、youtu.be、shorts、embed、live 網址與 `t=`／`start=` 起始秒數（`youtubeEmbed()`）。PSV 關閉面板時會清空內容，影片會停止。

## 白圈規則

- **自動白圈 `{ "to": id }`**：兩個場景在同一區域、而且都有 `x`、`y` 時，依座標計算。
  - 方位角 bearing = atan2(dx, dy)
  - yaw = bearing − heading
  - pitch = −atan(cameraHeight ÷ 距離)
- **手動白圈 `{ "to", "yaw", "pitch" }`**：放在畫面上點的位置。用於跨區域、樓梯、尚未放到平面圖的場景。從 Marzipano 轉過來的連結全部是手動白圈。
- 手動白圈的 `pitch` ≤ −3° 時畫成地上的透視白圈（`.floor-ring`），否則畫成直立的圓圈（`.go-ring`）。
- 地上白圈的樣子照科館 Matterport（2026-11-07，從 Matterport showcase 程式讀出的數值）：半徑 0.2 公尺（`RING_R`）；`floorPuck()` 回傳外緣 97%、內緣 65% 兩個圓，CSS `fill-rule: evenodd` 挖空中心，白環 `rgba(255,255,255,0.64)`，1px 淡黑邊 `rgba(0,0,0,0.12)` 代替 Matterport 內外各 3% 的黑邊（0.10／0.13）。整體透明度：`body.tour-view`（導覽頁、編輯器預覽）平常 0.3，滑鼠指到或 `.near` 時 0.3 秒內變 1；編輯器編輯時 0.9（Matterport 編輯模式也是 0.9）；選取時橘色 0.85。VR 的白圈貼圖（`vrRing()`）也改成同樣比例，但一律完整顯示。滑鼠的游標白圈（`.floor-cursor`）也用 `floorPuck()`，同樣大小、同樣白環樣式，顯示時 100%（2026-11-07 使用者要求）。直立的 `.go-ring` 沒改。
- PSV 會在標記元素上寫 inline `opacity: 1`，所以 CSS 的 opacity 都要 `!important`。
- 白圈中間鏤空，瀏覽器只在白環上才算 hover，所以「前往 ○○」改由程式判斷（2026-11-07 使用者回報範圍太小）：`Navigator.linkUnder(yaw, pitch, viewerX, viewerY)` = 地面上離圓心 `RING_HIT`（0.3 m）內，或畫面上離圓心 `RING_HIT_PX`（18 px）內；`attachCursor()` 用它呼叫 `showTip()`（`showMarkerTooltip` 固定顯示，tooltip class `link-tip` 設 `pointer-events: none`），並讓那個白圈變亮。點地面改用 `linkAt()`（先 `linkUnder`，沒有才 `linkToward` 找方向），導覽頁和編輯器預覽都是，確保顯示的和走去的是同一個。
- 白圈可以有 `"arrow": 度數`：直立圓圈裡箭頭的方向，0 = 往前，順時針（90 往右、180 往後、270 往左），省略就是往前。地上的白圈不顯示箭頭。編輯器選取白圈時有 8 個方向按鈕。從 Marzipano 轉來的白圈已依原本的 `rotation` 帶回（2026-11-01）。
- 自動白圈如果無法計算（缺座標、不同區域），就不顯示，不會報錯。
- **抵達方向**（2026-11-01 起的優先順序）：
  - 白圈有 `"arrive": {yaw, pitch}`（這條路線指定的方向）→ 用它。
  - 目標場景 `"fixedView": true` → 一律用目標的 `view`。
  - 其餘照下面的規則：
  - 自動白圈：用 bearing − 目標的 heading，延續前進的方向。
  - 手動白圈：如果有回程白圈，用回程方向 + 180°。
  - 都沒有：用目標場景的 `view`。
- 用下拉選單、平面圖、網址跳轉時，一律用目標場景的 `view`（進入視角）。舊的「保持同一個世界方向」已取消，使用者覺得難以預測。
- 編輯器「設為進入視角」會先問套用範圍：從剛才走來的那條路線（寫入該白圈的 `arrive`）、選單跳來（`view`）、或一律（`view` + `fixedView`）。`Navigator.arrivedBy` 記錄最後一次走白圈的來源。
- 平面圖上：自動白圈畫實線，手動白圈畫虛線。

## Cardboard VR（導覽頁，2026-11-04 加入）

- 官方 StereoPlugin + GyroscopePlugin（5.15.1，`touchmove: false`），navbar 的 `stereo` 按鈕只在有陀螺儀的裝置出現；陀螺儀需要 https（GitHub Pages 可以，手機連 localhost 不行），iPhone 會先問動作權限。
- `js/tour.js` 的 `CardboardVR` 處理官方外掛不足的地方：
  - 官方外掛遇到 `stop-all`（換場景、animate 都會觸發）就關掉 VR 和陀螺儀 → 改寫兩個外掛實體的 `handleEvent`，VR 中忽略 `stop-all`。
  - 官方外掛點螢幕就離開 → VR 中點螢幕（Cardboard 按鈕）＝ 立刻選目前看著的白圈。
  - 官方外掛會 `hideAllMarkers()`，HTML／SVG 標記也無法分左右眼 → VR 中 `build()` 改回傳 `markersFor()`：每個白圈一個 `imageLayer`（canvas 畫的白圈＋箭頭＋目的地名稱），正下方 pitch −80° 一塊「離開 VR」（跟著面向轉）。標籤在 VR 中不顯示。
  - 注視：左右眼中央各一個 `.vr-reticle`，對準白圈 7° 內 1.5 秒（外圈進度）就走；低頭 pitch < −65° 1.5 秒就離開；離開全螢幕（返回鍵）也會離開。
  - VR 中走路 `walk()`：不轉動畫面、`setPanorama` 不帶 position（帶了會觸發 stop-all），載入後 `face(抵達 yaw)`：設定位置並把陀螺儀 `alphaOffset` 歸零重算，讓手機目前方向對到抵達方向。
  - 剛進 VR 或剛抵達時 `needRelease`：視線要先離開白圈一次才開始計時，避免一抵達就連續走。
- 左右眼畫面不用官方 StereoEffect（它把畫面切兩半，中心距離＝手機寬度一半，寬手機會對不上鏡片、重影）：`CardboardVR.effect()` 接管繪圖，兩眼用同一個相機（全景照沒有深度），兩個畫面中心相距 `sep` 像素（預設手機寬度 × 0.42），外側留黑邊。準心跟著 `layout()` 放。
- VR 畫面上方「⚙ 調整眼鏡」：左右距離（±4 px）、畫面大小（PSV zoom ±5）、預設、完成、離開 VR；存在 localStorage `sssh-tour-vr`（每支手機各自記）。這些按鈕攔下 pointer／touch／click，不會被當成 Cardboard 按鈕。離開 VR 恢復原本的 zoom。
- `body.vr-on` 時隱藏標題列和小地圖（iPhone 的全螢幕是模擬的，蓋不住外面的元素）。

## 編輯器功能

- **區域與場景**：
  - 「匯入區域」（2026-11-01 加入）：選另一個導覽資料夾（showDirectoryPicker，唯讀），勾選區域後 `importAreas()` 複製全景圖、標籤圖片、平面圖底圖；區域／場景 id 或檔名重複就改名；連到沒匯入場景的白圈拿掉。之後要儲存才寫入；可復原。給同仁的建議：用新的空資料夾製作，不要複製這個資料夾，也不要兩人同時編同一個資料夾。測試掛鉤 `window.tourEditor.importAreas(handle, areas)`。
  - 區域可以新增、重新命名、刪除。
  - 場景用拖曳全景照片新增，寬度超過 8192 會自動縮小。
  - 每個場景可以換圖、改名、移到別的區域（會清除 x、y）、設起點、調整順序、刪除。
- **工具列左邊的「區域」「地點」選單**：只用來切換畫面。右側場景設定的「移到其他區域」才是搬移場景，選了要再按「移動」確認（2026-11-01 加入，因為使用者曾誤以為是切換用）。
- **場景工具**（2026-11-07 從全景畫面上方移到平面圖右邊一直欄 `.toolbar#toolbar`，在 `.planbox` 裡、`.plan-main` 的右邊，寬 216 px，放不下會捲動）：區域、地點選單（標籤和選單同一列）；設為進入視角、＋ 手動白圈、＋ 標籤（可放多張圖片）、預覽模式排成兩欄（`.tb-grid`，`#view-choice` 展開在第一列下面、橫跨兩欄）；平面圖的對準拍攝點、整張底圖和提示文字（＋／－ 按鈕使用者要求刪掉，用滾輪或手機兩指縮放） `#plan-hint` 也在這一欄。按鈕用一般的 `.btn small`。平面圖上方 `.plan-bar` 固定一行（使用者要平面圖儘量大）：標題太長用「…」，太窄時可以左右捲動。全景畫面上方因此空出來，`#hint` 改在 top 12px；不再需要 `keepClearOfPanel`。
- **平面圖區**（中間下方，可以拖曳調整高度）：
  - 縮放：滑鼠滾輪、手機兩指（編輯器沒有 ＋／－ 按鈕；導覽頁小地圖仍有）；拖曳空白處移動（放置、比例尺模式也可以拖，拖過不算點擊）。預設「對準拍攝點」（PlanView `fitTo: 'points'`），「整張底圖」顯示整張圖。
  - 設定底圖：最大 4000 px，存成 `plans/<區域id>-<時間>.jpg`，透明的 PNG 會加白底。
  - 比例尺（2026-11-07 起）：設定時把點的兩點和實際距離存成 `plan.scaleRef = { a: [px, py], b: [px, py], m: 公尺 }`（底圖像素、左上角為原點）；再按「比例尺」時 `decoratePlan()` 用橘色線＋兩端圓點＋「○ 公尺」畫出來，點第一個新點時消失。換底圖會產生新的 plan 物件，scaleRef 一起清掉。在這之前設定的區域沒有 scaleRef，要重設一次才會顯示。
  - 比例尺：點兩點、輸入實際距離，所有拍攝點會跟著一起縮放。
  - 尚未放置：點場景名稱，再點平面圖放置。點可以拖曳移動，位置以 0.01 m 為單位。
  - 點一下拍攝點（沒拖動，4 px 以內）＝ 切換到那個場景，和「地點」選單一樣（2026-11-07 修正：`setupPlanEditing()` 按下時 `setPointerCapture`，放開後 click 會落在 svg 而不是點上，所以改在 pointerup 沒拖動時直接呼叫 `onPlanNode()`，並用 `plan.suppressClick` 擋掉後面那次 click）。
  - 自動連線：把距離 ≤ N 公尺、還沒連線的點雙向連起來。
  - 連線模式：點兩個點就新增或取消連線；點一條線就刪除（只刪自動白圈）。
- **右側「位置與方向」**：
  - 方向可以直接輸入，或用 ±1°、±5° 微調。
  - 「點地面校正」：選一個參考拍攝點，在全景畫面上點那個參考點腳架所在的地面，就會反算 heading。照片估計的距離和平面圖差超過 35% 時會提醒。
  - 「用這些白圈推算方向」：用手動白圈的方向和目標座標推算 heading（取圓形平均）。
  - 「改成自動白圈」「從平面圖移除」。
- **復原／重做**（2026-11-01 加入）：右上角按鈕、Ctrl+Z／Ctrl+Y（Ctrl+Shift+Z）；焦點在輸入框時交給瀏覽器的文字復原。`markDirty()` 會排程記錄整份 `data` 的 JSON 快照（0.4 秒內合併，最多 200 步），`restoreSnapshot()` 就地替換 `data` 內容後 `tour.reindex()`、重畫畫面，保留目前場景與平面圖縮放；復原後不再被引用的圖檔加進 `pendingDeletes`。只存在記憶體，開資料夾時 `resetHistory()`。
- **儲存**：
  - 刪除的場景、圖片、換掉的底圖，按儲存時才真的刪除（`pendingDeletes`）。`referenced()` 包含 `plan.image`。
  - 資料夾缺少程式檔時會自動補上，但不會覆蓋已經存在的舊程式檔。
- **測試掛鉤**：`window.tourEditor = { openProject, open, tour, data }`。可以把資料複製進 OPFS（`navigator.storage.getDirectory()`），再用 `openProject` 開啟，做自動測試。

## 目前資料狀態（以實際的 tour.json 為準）

- 3 個區域，都是從舊的 Marzipano 網站轉換過來的：
  - `home` 首頁：1 個場景（`home-0`）
  - `campus` 校園巡禮：18 個場景（`campus-0` ～ `campus-17`）
  - `audio` 視聽大樓：5 個場景
- 全景圖是把 Marzipano 的立方體圖磚轉回 2:1 格式的。
- 全景圖檔名（2026-11-07 起）：每個區域一個資料夾，`panos/區域名稱/場景名稱.jpg`，檔名不再加區域（`panoPath(area, name)`、`safeName()`，重複加 -2）。編輯器新增、換圖、匯入時用這個規則；改場景名稱（輸入框 change 時）、改區域名稱、移到別的區域時，`syncPanoName()` 會把圖另存到新路徑、舊檔加進 `pendingDeletes`，儲存時才刪，可以復原。儲存刪舊檔後，如果 `panos/<區域>` 資料夾空了也一併移除。psv 全部 4 個區域（37 張）與 ssshlib 圖書館二樓（11 張）都已搬進資料夾；psv 的 panos 根目錄只剩沒用到的舊圖（使用者要保留）。超過 4 MB 的圖已縮成 6144 寬、JPEG 品質 84。
- 目前都還沒有放到平面圖上（沒有 x、y、heading），所有白圈都是手動白圈。
- 2026-10-31 更新到「平面圖版」程式，`psv` 和 `touredit` 的 5 個程式檔都已經換成新版。使用者是否已經 push，要問他。
- 另外有一個「走廊範例」（`sssh-tour-plan.zip` 裡的 `demo/`），是合成的走廊照片，已經放好平面圖、座標和方向，用來示範效果。

## 下一步

使用者要開始用平面圖模式編輯真實的校園場景：放底圖、比例尺、放置拍攝點、連線、校正方向，或把舊的手動白圈轉成自動白圈。依使用者實際遇到的問題協助。

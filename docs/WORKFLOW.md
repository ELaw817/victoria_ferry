# 製作流程 · 分工 · Git

> 兩個人、兩個新手、一隻碼頭遊戲。
> 呢份文件答三條問題：邊個做咩、Git 點用、啲嘢點樣合埋一齊。

---

## 1. 開工前必須處理嘅事

### 1.1 專案要搬出 OneDrive

專案而家喺 `C:\Users\<你>\OneDrive\Documents\...`。

**OneDrive 會同步 `.git` 資料夾**，會導致：

- git 報 `fatal: not a git repository`
- 出現 `style-DESKTOP-ABC123.css` 呢類衝突副本
- repo 中途損壞

**做法**：搬去 `C:\dev\ferry`（或者任何非 OneDrive 位置）。備份交俾 GitHub，唔需要 OneDrive。

### 1.2 兩個人都要裝 git

```powershell
winget install --id Git.Git -e --source winget
```

裝完**關咗終端再開**（PATH 才會更新）。驗證：

```powershell
git --version
```

---

## 2. 分工

### 2.1 原則：按檔案分，唔係按「你寫 code 我畫圖」

| | **A：規則組** | **B：畫面組** |
|---|---|---|
| 檔案 | `js/rules.js`<br>`js/game.js`<br>`test/sim.js` | `index.html`<br>`css/style.css`<br>`js/ui.js` |
| 內容 | 數值、票價、生成客人、遊戲狀態、動作、自動測試 | 版面、顏色、動畫、按鈕、所有文字 |
| 驗證方法 | `node test/sim.js` + 試玩 | 開瀏覽器即刻見到 |
| 適合 | 喜歡計數、調平衡 | 喜歡睇到成果、有審美 |

### 2.2 為什麼可以平行做

兩邊嘅接觸面只有一樣嘢：**`G`（遊戲狀態）**。

```
A 維持 G 嘅形狀  ──►  B 讀 G 畫出嚟
```

只要 `G` 唔亂改，兩個人可以完全平行，唔會撞。

**鐵律：改 `G` 之前一定要同對方講。**

### 2.3 一個功能橫跨兩邊

以 v0.2「八達通」為例：

**第一步：一齊定 contract（5 分鐘）**

```
客人物件加 pay: 'cash' | 'octopus'
八達通付款時，stage 會變成 'tap'
tapCard() 有 5% 機會失敗，失敗要再撳
```

**第二步：各自做**

- A 改 `game.js`：`collect()` 見到 octopus 就 `stage='tap'`；加 `tapCard()`
- B 改 `ui.js`：`stage==='tap'` 就顯示「拍卡」畫面

**兩個人都冇改對方嘅檔。**

### 2.4 第三個人

C 做 **內容／關卡設計**：年代表、航線、票種、客人對白。

呢啲全部放喺新檔 `js/content.js`，由 C 一個人擁有；A 喺 `game.js` 讀佢。又係獨立檔，又唔會撞。

---

## 3. GitHub 設定（一次性）

### 3.1 A：開 repo

1. GitHub → New repository
2. 名稱：`ferry`（或者你嘅遊戲名）
3. **Public**（咁就可以用免費 GitHub Pages，即刻有 URL）
4. **唔好** tick「Add a README」（我哋已經有）
5. Create

### 3.2 A：推上 GitHub

```powershell
cd C:\dev\ferry
git init -b main
git add .
git commit -m "v0.1 售票員原型"
git remote add origin https://github.com/<你嘅用戶名>/ferry.git
git push -u origin main
```

### 3.3 A：加 B 做協作者

GitHub repo → Settings → Collaborators → Add people → 輸入 B 嘅 GitHub 用戶名。

### 3.4 B：接受邀請 + clone

1. 收 email，撳「Accept invitation」
2. 然後：

```powershell
cd C:\dev
git clone https://github.com/<A嘅用戶名>/ferry.git
cd ferry
```

### 3.5 兩個人都要設定身份（一次）

```powershell
git config --global user.name "你嘅名"
git config --global user.email "你嘅email"
```

> 用同一個 email 註冊 GitHub，commit 才會計落你個帳戶。

---

## 4. 每日流程

### 4.1 四句口訣

```powershell
git pull                                    # 開工前：攞最新
# ... 做嘢 ...
git add -A
git commit -m "加咗八達通拍卡"
git pull                                    # push 前：再攞一次
git push
```

### 4.2 規矩

| 規矩 | 原因 |
|---|---|
| 做完一個小功能就 commit | 做咗一日冇 commit，好易一鑊泡 |
| 唔好留未 commit 嘅嘢過夜 | 同上 |
| push 之前自己開一次 `index.html` | main 爛咗，兩個人都做唔到嘢 |
| commit message 用中文都得 | 講「做咗咩」就夠，唔使靚 |
| 只改自己嘅檔 | 避免衝突 |

### 4.3 commit message 例子

```
加咗八達通拍卡
調快咗客到嘅速度
修好找續計錯 10 倍嘅 bug
改咗結算畫面配色
```

---

## 5. 啲嘢點樣合埋一齊

### 5.1 Git 係逐行合併

唔係「邊個嘅檔贏」，而係逐行比較。

| 情況 | 結果 |
|---|---|
| 你改 `ui.js`，佢改 `game.js` | ✅ 自動合併（99% 情況） |
| 同一個檔，改咗唔同位置 | ✅ 通常自動 |
| 同一個檔，改咗同一行 | ⚠️ 衝突，要人手揀 |

### 5.2 衝突係咩樣

```js
<<<<<<< HEAD
const boatSec = 45;      // 你嘅版本
=======
const boatSec = 40;      // 對方嘅版本
>>>>>>> origin/main
```

**做法**：

1. 揀一個（或者自己寫個新嘅）
2. 刪走 `<<<<<<<`、`=======`、`>>>>>>>` 三行
3. `git add <個檔>`
4. `git commit`

### 5.3 避免衝突嘅唯一方法

**一個檔，一個主人。**

按第 2 節個表分，基本上唔會撞。真係要改對方嘅檔，先講聲。

---

## 6. 製作流程

### 6.1 大循環：一版 1–2 星期

```
① 定一句話目標
      ↓
② 改 GAME.md，定 contract
      ↓
③ 各自做自己嘅檔（平行）
      ↓
④ 每日 10 分鐘 sync
      ↓
⑤ 合併
      ↓
⑥ 兩個人都要玩，然後調數值
      ↓
⑦ 放上網
      ↓
⑧ 收貨，定下一版
```

**每一版都要滿足：有得玩、有 URL 俾朋友玩。**

呢個係新手專案唯一唔會爛尾嘅方法 —— 因為你每隔兩星期就有嘢可以俾人玩，唔會做半年都未有成品。

### 6.2 每日節奏

| 時間 | 做咩 |
|---|---|
| 開工 | `git pull` |
| 做嘢 | 只改自己嘅檔 |
| 中途 | 每個小功能 commit 一次 |
| 收工 | `commit` + `push` + WhatsApp 講一句 |
| 每日 10 分鐘 | 今日做咩、有咩卡住、要唔要改 contract |

### 6.3 兩個新手最易死嘅三件事

| 陷阱 | 後果 | 解法 |
|---|---|---|
| 唔 commit | 做咗一日，一鑊泡 | 每個小功能 commit |
| 兩個改同一個檔 | 衝突大戰 | 一檔一主人 |
| 改完唔試就 push | main 爛咗 | push 前開一次 `index.html` |

---

## 7. 部署（有 URL 俾人玩）

### GitHub Pages（免費，最簡單）

1. repo → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main`，folder: `/ (root)`
4. Save

等一兩分鐘，就會有 `https://<用戶名>.github.io/ferry/`

**注意**：Private repo 要用 GitHub Pages 需要付費 plan。所以我哋建議 Public repo。

### 如果一定要 private

用 **Cloudflare Pages**（免費、支援 private repo）。設定多幾步，但一樣係 push 就自動 deploy。

---

## 8. 而家要定嘅五樣嘢

| # | 要定 | 建議 |
|---|---|---|
| 1 | 專案名 | 要有（開 repo 用）。暫定《船期》 |
| 2 | 邊個做 repo owner | 邊個 GitHub 先開好就邊個做，之後可以轉 |
| 3 | 邊個做 A、邊個做 B | 按興趣，唔係按能力 |
| 4 | 專案放邊 | `C:\dev\ferry`（離開 OneDrive） |
| 5 | 用咩溝通 | WhatsApp group 就夠 |

**可以遲啲定**：美術風格、音效、deploy 平台細節、第三個人點分工、商業化。

---

## 9. 換電腦／新同伴點接手

### 9.1 走之前（舊電腦）

```powershell
cd C:\dev\ferry
git status        # 要顯示 "nothing to commit, working tree clean"
git push          # 有嘢未推就推
```

**唔好帶住未 commit 嘅嘢走。**

### 9.2 新電腦設定

```powershell
# 1. 裝 git
winget install --id Git.Git -e --source winget

# 2. 攞落嚟（唔好放 OneDrive）
mkdir C:\dev
cd C:\dev
git clone https://github.com/ELaw817/victoria_ferry.git ferry
cd ferry

# 3. 設身份
git config user.name "ELaw817"
git config user.email "ELaw817@users.noreply.github.com"
```

### 9.3 喺新電腦開工

1. 喺 **`C:\dev\ferry`** 開 OpenCode
2. 第一句同 AI 講：

> 讀 `docs/STATUS.md`、`docs/GAME.md`、`docs/WORKFLOW.md`，然後繼續做 v0.2。

**新電腦 = 新對話 = AI 完全冇記憶。** 佢淨係知 repo 入面嘅嘢，所以 `docs/STATUS.md` 一定要最新。

### 9.4 每次開工／收工

```powershell
git pull          # 開工前
# ... 做嘢 ...
git add -A
git commit -m "做咗咩"
git push          # 收工
```

### 9.5 三條紀律

1. **同一時間只喺一部機做。** 兩部機同時改就要 merge，新手會亂。
2. **唔好留未 commit 嘅嘢過夜。**
3. **兩部機都唔好放 OneDrive。**

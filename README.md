# Conjuga — 西班牙文動詞學習

行動優先的西班牙文動詞學習 PWA，核心功能是依據 SRS（間隔重複）演算法安排測驗。

---

## 功能特色

| 功能 | 說明 |
|---|---|
| 任意變化形查詢 | 輸入 *hablo*、*fueron*、*dijiste* 等，自動還原原形並顯示英文釋義 |
| 完整時態展示 | 22 個時態完整人稱變化，依語氣分組折疊；人稱合併顯示（*él / ella* 同形時合一行）|
| 單字庫 | 加入常用動詞；時態熟悉度以語氣色標圓點顯示，hover/點擊顯示時態全名 |
| SRS 測驗 | 可選時態、選單字；多選題（新詞）自動升為填空（熟悉後）；答題正確率決定熟悉度 |
| 帳戶管理 | Email 密碼 + Google OAuth；修改暱稱、改密碼 |
| PWA | 可加入主畫面，支援離線快取 |

---

## 技術棧

| 層級 | 選用 |
|---|---|
| 後端 | FastAPI · Python 3.11+ |
| 前端 | React 19 · Vite · Tailwind CSS v4 |
| 資料庫 | SQLite（raw sqlite3，無 ORM）|
| 動詞資料 | [verbecc](https://github.com/bretttolbert/verbecc)（9,732 個西班牙文動詞）|
| 反向查詢 | [simplemma](https://github.com/adbar/simplemma)（任意變化形 → 原形）|
| 字典 | [kaikki.org](https://kaikki.org) 英文釋義，per-word 按需擷取並快取 |
| 測驗排程 | 正確率閾值（≥ 80% × 5 次 = 已熟悉；< 40% = 需加強）|
| 認證 | python-jose (JWT) · bcrypt · Google OAuth 2.0 |
| PWA | vite-plugin-pwa |

---

## 快速啟動

### 前置需求

- Python 3.11 以上（建議 3.12）
- Node.js 18 以上

### 1. 後端

```bash
cd backend

# 建立虛擬環境並安裝套件
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 設定環境變數
cp ../.env.example .env
# 至少修改 SECRET_KEY（可用 python3 -c "import secrets; print(secrets.token_hex(32))" 產生）

# 啟動開發伺服器（port 8000）
./run.sh
# 或
.venv/bin/uvicorn app.main:app --reload
```

Swagger UI：http://localhost:8000/docs

### 2. 前端

```bash
cd frontend
npm install
npm run dev      # 開發伺服器，port 5173，自動 proxy /api → :8000
```

開啟 http://localhost:5173

---

## 環境變數

位於 `backend/.env`（從 `.env.example` 複製）：

| 變數 | 預設值 | 說明 |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production` | JWT 簽名金鑰，**生產環境必須替換** |
| `GOOGLE_CLIENT_ID` | （空） | Google OAuth Client ID，留空則停用 Google 登入 |
| `GOOGLE_CLIENT_SECRET` | （空） | Google OAuth Client Secret |
| `FRONTEND_URL` | `http://localhost:5173` | OAuth callback redirect 目標 |
| `BACKEND_URL` | `http://localhost:8000` | OAuth callback 接收端 |
| `DATABASE_URL` | `app.db` | SQLite 資料庫路徑（相對於 `backend/`）|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080`（7 天）| JWT 有效期 |

### 設定 Google OAuth（選用）

1. 前往 [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. 建立 OAuth 2.0 用戶端 ID（應用程式類型：網頁應用程式）
3. 授權重新導向 URI 加入：`http://localhost:8000/auth/google/callback`
4. 將 Client ID / Secret 填入 `backend/.env`

---

## 字典預建（選用）

App 預設在查詢時向 kaikki.org 逐字擷取英文釋義並快取。如需完全離線或一次性預建快取，可執行：

```bash
cd backend
python scripts/build_dictionary.py --db app.db
```

這會下載完整的 kaikki.org 西班牙文詞典（~900 MB，下載後置於 `scripts/` 目錄），解析所有動詞條目，並將釋義寫入 `app.db` 的 `dictionary_cache` 資料表。

```
選項：
  --db PATH           目標資料庫路徑（預設：app.db）
  --skip-download     跳過下載，直接從已有的 dump 檔處理
```

---

## 專案結構

```
espanol_learning_app/
├── .env.example                # 環境變數範本
│
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI 入口，CORS，掛載路由
│   │   ├── database.py         # SQLite 連線、schema 初始化
│   │   ├── config.py           # 環境變數載入
│   │   ├── auth/               # 認證：JWT、bcrypt、Google OAuth
│   │   ├── verbs/              # 動詞查詢：simplemma 反向查詢、verbecc 變化
│   │   ├── vocabulary/         # 單字庫 CRUD、SRS 卡片建立
│   │   └── srs/                # 測驗：卡片排程、正確率計算、答題處理
│   ├── scripts/
│   │   ├── build_dictionary.py # 預建英文字典快取（選用）
│   │   ├── verify_verbecc.py   # verbecc API 參考腳本
│   │   ├── verify_dict.py      # kaikki.org 按需擷取參考腳本
│   │   └── data/kaikki/        # 測試用範例 JSONL（hablar、ser 等）
│   ├── requirements.txt
│   └── run.sh                  # 啟動開發伺服器的捷徑腳本
│
└── frontend/
    ├── index.html
    ├── vite.config.js          # Vite + PWA + /api proxy
    ├── public/                 # PWA 圖示
    └── src/
        ├── App.jsx             # 路由、AuthContext
        ├── api/client.js       # fetch wrapper + JWT 注入
        ├── utils/
        │   ├── tenseLabels.js  # 中西文時態名稱對照（共用）
        │   └── recent.js       # 最近查詢 localStorage 工具
        ├── components/
        │   ├── NavBar.jsx      # 底部導覽列
        │   ├── MoodSection.jsx # 可折疊時態區塊（含人稱合併邏輯）
        │   └── ProfileModal.jsx# 帳號設定 modal
        └── pages/
            ├── AuthPage.jsx    # 登入 / 註冊
            ├── SearchPage.jsx  # 搜尋首頁
            ├── VerbPage.jsx    # 動詞詳細頁（完整變化表）
            ├── VocabPage.jsx   # 單字庫（熟悉度圓點）
            └── QuizPage.jsx    # SRS 測驗（時態選擇 → 單字選擇 → 答題）
```

---

## API 端點摘要

完整互動文件：`http://localhost:8000/docs`

```
POST /auth/register          建立帳號
POST /auth/login             登入，取得 JWT
GET  /auth/google            Google OAuth 入口
GET  /auth/google/callback   Google OAuth 回調
GET  /auth/me                取得目前使用者
PUT  /auth/me                更新暱稱 / 密碼
GET  /auth/config            回傳 { google_oauth_enabled }

GET  /verbs/lookup?q=        查詢任意變化形，回傳原形 + 釋義 + 完整變化表

GET  /vocab                  取得單字庫（含各時態熟悉度）
POST /vocab/{infinitive}     加入單字庫，自動建立 SRS 卡片
DELETE /vocab/{infinitive}   移除單字及對應卡片

GET  /quiz/due               取得待複習卡片（支援時態、動詞篩選）
POST /quiz/answer            提交答案，更新 SRS 排程
GET  /quiz/stats             取得統計（總卡片數、今日待複習、連續天數）
```

---

## 熟悉度演算法

每張卡片（一個動詞 × 一個時態 × 一個人稱）從 `quiz_log` 計算正確率：

| 狀態 | 判定條件 |
|---|---|
| 新學 | 從未作答 |
| 需加強 | 任一人稱正確率 < 40% |
| 練習中 | 有作答，尚未全部達到熟悉標準 |
| 已熟悉 | **所有人稱**正確率 ≥ 80%，且各人稱作答 ≥ 5 次 |

測驗出題順序：正確率最低的卡片優先（新學卡片排最前）。

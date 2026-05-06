# Conjuga — 西班牙文動詞學習

Conjuga 是一個專為解決「西班牙文動詞變化繁複」而設計的學習應用程式。

它採用了漸進式網頁應用程式 (PWA) 技術。PWA 讓這個網站可以像一般 App 一樣「加到手機主畫面」，不需要透過應用程式商店下載，也能擁有獨立的圖示、隱藏瀏覽器網址列，並且支援離線快取，提供接近原生 App 的流暢操作體驗。

本專案的核心特色在於結合了「間隔重複系統 (SRS)」，以科學化的方式為你安排測驗，幫助你將動詞變化穩固地轉化為長期記憶。

---

## 核心功能特色

- **智慧動詞反查**
  無論輸入什麼時態的變形（例如 *hablo*、*fueron*、*dijiste*），系統都能自動還原為動詞原形，並顯示詳細的英文釋義。

- **完整時態展示**
  提供 22 個時態的完整人稱變化表。介面會依據語氣自動分組與折疊，並智慧合併同形的人稱（例如 *él / ella*），讓畫面保持簡潔。

- **個人化單字庫與熟悉度追蹤**
  你可以將常用動詞加入專屬單字庫。系統會透過不同顏色的標示，視覺化呈現你對各個時態的熟悉程度。

- **科學化 SRS 測驗**
  可針對特定時態或單字進行測驗。演算法會自動調適難度：對於新學習的字彙會提供多選題，當你逐漸熟悉後，則會自動升級為填空題。

- **帳戶系統與跨平台支援**
  支援 Email 密碼與 Google OAuth 登入。修改暱稱與密碼功能完善。得益於 PWA 特性，可安裝至主畫面並支援離線使用。

---

## 技術棧

| 領域 | 使用技術 |
|---|---|
| **後端** | FastAPI · Python 3.11+ |
| **前端** | React 19 · Vite · Tailwind CSS v4 |
| **資料庫** | SQLite（無 ORM，使用 raw sqlite3）|
| **自然語言處理** | [verbecc](https://github.com/bretttolbert/verbecc)（變化產生）、[simplemma](https://github.com/adbar/simplemma)（反向查詢）|
| **字典來源** | [kaikki.org](https://kaikki.org)（按需擷取英文釋義並快取）|
| **測驗排程** | 自訂 SRS 演算法（依據正確率閾值判斷熟悉度） |
| **安全與認證** | python-jose (JWT) · bcrypt · Google OAuth 2.0 |
| **PWA 支援** | vite-plugin-pwa |

---

## 快速啟動指南

### 前置需求

- Python 3.11 或以上版本（建議使用 3.12）
- Node.js 18 或以上版本

### 1. 後端架設

```bash
cd backend

# 建立並啟動虛擬環境
python3 -m venv .venv
source .venv/bin/activate        # Windows 環境請使用: .venv\Scripts\activate

# 安裝相依套件
pip install -r requirements.txt

# 設定環境變數
cp ../.env.example .env
# 請務必修改 .env 檔案中的 SECRET_KEY 
# （可使用指令快速產生：python3 -c "import secrets; print(secrets.token_hex(32))"）

# 啟動開發伺服器 (Port: 8000)
./run.sh
# 或是手動執行: .venv/bin/uvicorn app.main:app --reload
```
API 文件 (Swagger UI) 測試網址：http://localhost:8000/docs

### 2. 前端架設

```bash
cd frontend
npm install --legacy-peer-deps

# 啟動開發伺服器 (Port: 5173，將自動把 /api 請求代理至後端 8000 port)
npm run dev
```
前端應用程式網址：http://localhost:5173

---

## 環境變數設定

後端所需環境變數位於 `backend/.env`（請從 `.env.example` 複製）：

| 變數名稱 | 預設值 | 說明 |
|---|---|---|
| `SECRET_KEY` | `change-me-in-production` | JWT 簽名金鑰，**生產環境請務必修改** |
| `GOOGLE_CLIENT_ID` | （空） | Google OAuth Client ID（留空代表停用 Google 登入） |
| `GOOGLE_CLIENT_SECRET` | （空） | Google OAuth Client Secret |
| `FRONTEND_URL` | `http://localhost:5173` | OAuth 登入成功後導向的前端網址 |
| `BACKEND_URL` | `http://localhost:8000` | 處理 OAuth 回調的後端網址 |
| `DATABASE_URL` | `app.db` | SQLite 資料庫檔案路徑（相對於 `backend/` 目錄）|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080`（7 天）| JWT 憑證有效時間 |

### 設定 Google OAuth（選用功能）

1. 前往 [Google Cloud Console](https://console.cloud.google.com) → API 和服務 → 憑證。
2. 建立「OAuth 2.0 用戶端 ID」（應用程式類型請選擇：網頁應用程式）。
3. 在「已授權的重新導向 URI」中加入：`http://localhost:8000/auth/google/callback`。
4. 將取得的 Client ID 與 Client Secret 填入 `backend/.env` 檔案中。

---

## 字典預建快取（進階選項）

系統預設會在使用者查詢單字時，才向 kaikki.org 擷取字彙並進行快取。如果您希望應用程式能完全離線運作，可以手動一次性預建字典：

```bash
cd backend
python scripts/build_dictionary.py --db app.db
```

此腳本會下載完整的 kaikki.org 西班牙文詞典（約 900 MB），解析所有動詞後寫入 `app.db` 的 `dictionary_cache` 資料表中。

**可用選項：**
- `--db PATH`：指定目標資料庫路徑（預設：app.db）
- `--skip-download`：略過下載，直接從本地已有的檔案處理

---

## 專案結構概覽

```text
espanol_learning_app/
├── .env.example                # 環境變數範本
│
├── backend/                    # FastAPI 後端
│   ├── app/
│   │   ├── main.py             # 程式進入點與路由掛載
│   │   ├── database.py         # SQLite 連線與資料表初始化
│   │   ├── config.py           # 環境變數載入處理
│   │   ├── auth/               # 認證邏輯 (JWT, Google OAuth)
│   │   ├── verbs/              # 動詞反向查詢與時態變化邏輯
│   │   ├── vocabulary/         # 使用者單字庫管理
│   │   └── srs/                # SRS 測驗演算法與排程
│   ├── scripts/                # 開發輔助工具與資料建置腳本
│   ├── requirements.txt
│   └── run.sh                  # 後端啟動捷徑
│
└── frontend/                   # React + Vite 前端
    ├── index.html
    ├── vite.config.js          # Vite 配置與 PWA 設定
    └── src/
        ├── App.jsx             # 路由配置與全域狀態 (AuthContext)
        ├── api/client.js       # 封裝的 API 請求與 JWT 攔截器
        ├── components/         # 共用 UI 元件 (如 NavBar, 帳戶 Modal)
        └── pages/              # 各功能主頁面 (搜尋、動詞詳細、單字庫、測驗)
```

---

## API 端點摘要

完整互動文件請見開發伺服器的 Swagger UI：`http://localhost:8000/docs`

```text
POST /auth/register          建立帳號
POST /auth/login             登入，取得 JWT
GET  /auth/google            Google OAuth 入口
GET  /auth/google/callback   Google OAuth 回調
GET  /auth/me                取得目前登入使用者資訊
PUT  /auth/me                更新暱稱或密碼
GET  /auth/config            回傳系統設定 { google_oauth_enabled }

GET  /verbs/lookup?q=        查詢任意動詞變形，回傳原形、釋義與完整變化表

GET  /vocab                  取得使用者單字庫（包含各時態熟悉度）
POST /vocab/{infinitive}     將單字加入單字庫，並自動建立 SRS 測驗卡片
DELETE /vocab/{infinitive}   移除單字及其對應的測驗卡片

GET  /quiz/due               取得目前待複習的卡片（支援指定時態或動詞篩選）
POST /quiz/answer            提交作答結果，更新 SRS 演算法排程
GET  /quiz/stats             取得測驗統計數據（總卡片數、今日待複習、連續學習天數）
```

---

## 熟悉度演算法說明

間隔重複系統 (SRS) 的運作核心在於精準紀錄使用者的作答狀況。
每張字卡（由「動詞 × 時態 × 人稱」組成）會依據在 `quiz_log` 中的答題正確率被分類：

| 學習狀態 | 判定條件 |
|---|---|
| **新學** | 從未作答過 |
| **需加強** | 該卡片任一人稱的歷史作答正確率 < 40% |
| **練習中** | 已有作答紀錄，但尚未達到完全熟悉的標準 |
| **已熟悉** | **所有人稱**正確率皆 ≥ 80%，且各人稱至少被作答過 5 次 |

**測驗出題邏輯：** 系統會優先挑選正確率最低（最不熟悉）的卡片進行測驗，其中「新學」的卡片會被排在最前面。


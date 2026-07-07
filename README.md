# Palabra Clara

西班牙文單字、動詞變位與間隔複習 app。

## 功能

- 西文單字查詢中文、英文詞義
- 前後端分離：`frontend/` 放 UI，`backend/` 放 API 與服務串接
- 使用 Postgres 儲存單字、例句、查詢紀錄、測驗紀錄與弱點進度
- `backend/data/words.json` 保留作為初始匯入種子資料
- 西班牙文單字發音播放，可接 Google Cloud Text-to-Speech，未設定金鑰時使用瀏覽器 Web Speech
- 可用 MyMemory 或 Google Cloud Translation 取得中英文翻譯
- 可用 FreeDictionaryAPI 補新單字詞性與 IPA 音標
- 可用 Groq 或 OpenAI-compatible API 產生例句與模糊判讀
- 選擇題與填空題測驗
- 填空題先用本地答案表判分，模糊答案可交給 AI 判讀
- 答錯單字自動加入弱點複習與加權出題
- React + Vite 前端，統一使用 Palabra Clara 設計系統
- 動詞原形反查與完整時態變位，由獨立 Python NLP 服務提供
- 查詢與收藏分離，使用者可明確將一般單字或動詞形式加入 PostgreSQL 單字庫
- 單字查詢為統一入口；查到動詞或動詞變形時，詞條會自動擴增完整變位內容
- 單字庫可切換全部、一般單字與動詞；同原形的動詞形式會分組顯示
- 一般單字測驗與動詞變位測驗分開，一般測驗可選擇是否包含已收藏的非原形動詞

## 整合後架構

```text
Browser
   |
   v
Frontend（Nginx + React）
   |
   v
Backend（Node.js API）
   |                 |
   v                 v
PostgreSQL       Spanish NLP
                 Python + FastAPI
```

- `frontend/`：React UI、Nginx 設定與前端 Dockerfile
- `backend/`：Node API、學習流程、翻譯、語音、PostgreSQL 與後端 Dockerfile
- `spanish-nlp/`：獨立的西班牙文詞形還原與動詞變位服務

## 使用方式

### 使用 Docker Compose（推薦）

無需本機安裝 PostgreSQL，一行指令啟動完整環境：

```bash
docker compose up --build
```

首次執行會：
- 分別構建前端、後端與 NLP 容器映像
- 啟動 PostgreSQL 數據庫
- 初始化數據庫結構與匯入種子單字
- 啟動完整服務

然後開啟瀏覽器訪問：

```text
http://localhost:4173
```

**停止服務：**
```bash
docker compose down
```

**查看日誌：**
```bash
docker compose logs -f frontend backend nlp
```

### 本地開發（需先安裝 PostgreSQL）

第一次安裝依賴：

```bash
npm --prefix backend install
npm --prefix frontend install
```

設定 `DATABASE_URL` 後初始化資料庫並匯入種子單字：

```bash
npm --prefix backend run db:init
npm --prefix backend run db:import
```

分別啟動後端與前端：

```bash
npm --prefix backend start
npm --prefix frontend run dev
```

然後開啟：

```text
http://localhost:5173
```

本地 Node API 使用 `http://localhost:3000`，Vite 會自動代理 `/api`。

## 專案結構

```text
espanol_palabra/
  frontend/
    Dockerfile
    nginx.conf
    index.html
    package.json
    src/
      App.jsx
      api.js
      main.jsx
      styles.css
      verbLabels.js
      quizUtils.js
      quizUtils.test.js
      components/
        NavIcon.jsx
        Onboarding.jsx
        Sidebar.jsx
        WordCard.jsx
        primitives.jsx
        verb/
          MoodSection.jsx
          VerbConjugations.jsx
          VerbFormsHover.jsx
      views/
        AccountView.jsx
        LibraryView.jsx
        LookupView.jsx
        QuizView.jsx
        ReviewView.jsx
      lib/
        entryAdapters.js
        learner.js
        speech.js
        wordUtils.js
  backend/
    Dockerfile
    package.json
    server.js
    routes.js
    config/
      env.js
    db/
      client.js
      schema.sql
      sqlFragments.js
    data/
      words.json
    scripts/
      init-db.js
      import-word-bank.js
    services/
      aiService.js
      exampleService.js
      exampleService.test.js
      judgeService.js
      judgeService.test.js
      judgeVectors.test-data.js
      learningService.js
      learningService.test.js
      lexicalService.js
      lookupService.js
      speechService.js
      translationService.js
      verbService.js
      vocabularyService.js
      vocabularyService.test.js
      wordBankService.js
    utils/
      http.js
      text.js
      text.test.js
      validation.js
  spanish-nlp/
    Dockerfile
    requirements.txt
    api.py
```

## 服務串接

目前後端提供這些 API：

- `GET /api/health`：健康檢查（Docker healthcheck 使用）
- `GET /api/verbs/lookup?q=fui`：反查原形並取得完整變位
- `GET /api/words`：讀取單字庫
- `GET /api/vocabulary?learnerId=...`：取得使用者明確收藏的單字
- `POST /api/vocabulary`：將查詢結果加入單字庫（`learnerId` 需為合法 UUID，且需附 `word` 或 `wordId`，否則回 400）
- `DELETE /api/vocabulary/:surfaceForm?learnerId=...`：從單字庫移除指定形式
- `POST /api/lookup`：查詢單字，先查 Postgres 字庫，查不到時可用 MyMemory/Google 翻譯和 AI 例句
- `POST /api/examples`：可用 AI 產生例句
- `POST /api/pronunciation`：可用 Google Cloud Text-to-Speech 產生發音，否則前端退回 Web Speech
- `POST /api/judge-answer`：填空題模糊答案 AI 判讀
- `POST /api/quiz-attempts`：記錄測驗作答，更新間隔複習進度
- `GET /api/progress?learnerId=...`：取得使用者的複習進度統計

需要合法 UUID 的端點（`learnerId` 格式不正確時一律回 400）：`GET/POST /api/vocabulary`、`DELETE /api/vocabulary/:surfaceForm`、`POST /api/lookup`、`POST /api/quiz-attempts`、`GET /api/progress`。

設定方式可參考根目錄 `.env.example`。本機啟動與 Docker Compose 都會讀取根目錄 `.env`；`.env` 是 `docker compose up` 的必要檔案（`env_file: .env`，見下方 Docker Compose 環境變數優先序說明），repo clone 後需先建立才能啟動。

## 免費服務設定

翻譯預設使用 MyMemory：

```env
TRANSLATION_PROVIDER=mymemory
MYMEMORY_EMAIL=
```

`MYMEMORY_EMAIL` 可不填；填 email 時 MyMemory 免費額度通常較高。若未來要改 Google：

```env
TRANSLATION_PROVIDER=google
GOOGLE_TRANSLATE_API_KEY=...
```

AI 預設使用 Groq 的 OpenAI-compatible API：

```env
AI_PROVIDER=groq
GROQ_API_KEY=...
AI_MODEL=llama-3.1-8b-instant
```

也可以直接用 generic OpenAI-compatible 設定：

```env
AI_API_KEY=...
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_MODEL=llama-3.1-8b-instant
```

沒有設定 Groq/API key 時，例句生成與模糊判讀會使用本地 fallback，不會中斷查詢流程；`AI_API_KEY` 找不到時，Groq provider 會退回 `GROQ_API_KEY`，其他 provider 會退回 `OPENAI_API_KEY`。

詞性與 IPA 音標會在查詢新單字時用 FreeDictionaryAPI 補齊；如果查不到，詞性會保留 `unknown`，音標會保留 `待補`。

發音使用 Google Cloud Text-to-Speech，讀取金鑰的 fallback 順序為 `GOOGLE_TTS_API_KEY` → `GOOGLE_CLOUD_API_KEY` → `GOOGLE_TRANSLATE_API_KEY`（三者皆缺才會使用瀏覽器 Web Speech）。

## Postgres

本專案執行時需要 Postgres。`backend/data/words.json` 只作為 seed 資料，不作為執行時資料庫。

### 推薦：使用 Docker Compose

最簡單的方式是用 Docker Compose（需先安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop)）：

```bash
docker compose up --build
```

Postgres 與後端服務會自動啟動與配置，無需手動設定 `DATABASE_URL`。

`docker-compose.yml` 的 `backend.env_file` 會載入根目錄 `.env`，但 `backend.environment` 中列出的變數（`DATABASE_URL`、`DATABASE_SSL`、`NLP_SERVICE_URL`、`PORT`、`TRANSLATION_PROVIDER`、`MYMEMORY_EMAIL`、`AI_PROVIDER`）會覆蓋 `.env` 中同名設定——這些是容器內連線用的固定值，`.env` 裡對應變數不會生效。`.env` 主要用來提供 API key（`GROQ_API_KEY`、`GOOGLE_TRANSLATE_API_KEY`、`GOOGLE_TTS_API_KEY` 等）；即使不需要覆寫任何變數，`.env` 檔本身仍是必要檔案（`env_file: .env`），沒有這個檔案 `docker compose up` 會直接失敗，建議先複製 `.env.example` 為 `.env`。

### 本機 Postgres

如果已安裝本機 Postgres，設定環境變數：

**PowerShell 範例：**

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/palabra_clara"
$env:DATABASE_SSL="false"
npm --prefix backend run db:init
npm --prefix backend run db:import
npm --prefix backend start
```

### Docker 單一容器

或者手動用 Docker 啟動 Postgres（不用 docker-compose）：

```bash
docker run --name palabra-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=palabra_clara -p 5432:5432 -d postgres:16
```

### 雲端部署

部署時可使用 Supabase 或 Neon 的免費 Postgres。將供應商提供的 connection string 設到 `DATABASE_URL`。多數雲端 Postgres 需要 SSL，保留 `DATABASE_SSL=true`。

預設情況下開啟 SSL 時不會驗證憑證（`rejectUnauthorized: false`），相容於使用自簽憑證的環境；若供應商憑證可信、想開啟嚴格驗證，設定 `DATABASE_SSL_REJECT_UNAUTHORIZED=true`（僅在 `DATABASE_SSL` 為真時生效，屬 opt-in，不影響預設行為）。

### 數據庫結構

目前資料庫會保存：

- `words`：單字主資料
- `examples`：例句
- `learners`：學習者 id，目前由瀏覽器產生匿名 id
- `lookup_history`：查詢紀錄
- `quiz_attempts`：測驗作答、分數與模糊判讀結果
- `word_reviews`：間隔複習排程（SM-2 演算法的 repetition、ease factor、到期時間）
- `learner_vocabulary`：使用者明確收藏的單字／動詞形式（與全域字庫 `words` 分離）

## 單字庫格式

`backend/data/words.json` 是匯入 Postgres 的種子資料。每筆單字包含：

- `word`：西班牙文單字
- `part`：詞性
- `zh` / `en`：中文、英文詞義
- `ipa`：IPA 音標
- `examples`：西文例句與中英翻譯
- `acceptedAnswers`：填空題可直接判對的答案
- `nearAnswers`：可接受但會提示目標字的同義或變化答案

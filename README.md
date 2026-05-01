# Verbo — 西班牙文動詞學習 APP

行動優先的西班牙文動詞變化學習應用，支援 SRS（間隔重複）測驗系統。

## 功能

- 查詢任意動詞變化形（如 *hablo*、*fueron*）→ 自動找到原形
- 顯示英文釋義與完整各時態人稱變化（折疊式）
- 帳戶管理（Email + Google OAuth）
- 單字庫：儲存查過的動詞
- SRS 測驗：選擇題 + 填空，SM-2 演算法排程

## 啟動

### 後端

```bash
cd backend
.venv/bin/pip install -r requirements.txt   # 首次安裝
./run.sh                                     # 啟動 FastAPI (port 8000)
```

**注意：** 首次啟動時會自動建立動詞索引（約 30-60 秒）。

### 前端

```bash
cd frontend
npm install          # 首次安裝
npm run dev          # 開發伺服器 (port 5173)
```

開啟 http://localhost:5173

### 環境設定

複製 `.env.example` 為 `backend/.env` 並填入設定值。

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | FastAPI + Python 3.14 |
| 前端 | React 18 + Vite + Tailwind CSS v4 |
| 資料庫 | SQLite |
| 動詞資料 | verbecc (9,732 個西班牙文動詞) |
| 字典 | kaikki.org (英文釋義) |
| PWA | vite-plugin-pwa |

# Verbo — 西班牙文動詞學習 APP

行動優先的西班牙文動詞變化學習應用，支援 SRS（間隔重複）測驗系統。

## 功能

- 查詢任意動詞變化形（如 *hablo*、*fueron*、*dijiste*）→ 自動找到原形
- 顯示英文釋義與完整各時態人稱變化（折疊式）
- 帳戶管理（Email + Google OAuth）
- 單字庫：儲存查過的動詞
- SRS 測驗：選擇題 + 填空，SM-2 演算法排程

## 快速啟動

### 後端

```bash
cd backend
cp ../.env.example .env   # 設定環境變數（至少改 SECRET_KEY）
./run.sh                  # 啟動 FastAPI，port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev               # 開發伺服器，port 5173
```

開啟 http://localhost:5173

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | FastAPI + Python 3.14 |
| 前端 | React 18 + Vite + Tailwind CSS v4 |
| 資料庫 | SQLite |
| 動詞資料 | verbecc（9,732 個西班牙文動詞） |
| 反向查詢 | simplemma（conjugated form → infinitive） |
| 字典 | kaikki.org（英文釋義，SQLite 快取） |
| 測驗 | SM-2 間隔重複演算法 |
| PWA | vite-plugin-pwa |

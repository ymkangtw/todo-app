# 待辦事項清單 (Todo List App)

使用 **Vue 3** + **Node.js (Express)** 建立的待辦事項管理應用程式。

## 功能特色

- ✅ 新增、編輯、刪除待辦事項
- 🎯 三種優先級別：🔴 高優先 / 🟡 中優先 / 🟢 低優先
- ☑️ 切換完成狀態
- 🔍 依狀態篩選（全部 / 待完成 / 已完成）
- 🏷️ 依優先級篩選
- 📊 依建立時間或優先級排序
- 📌 統計面板（全部 / 待完成 / 已完成 / 高優先）
- 🗑️ 一鍵清除所有已完成事項
- 💾 資料持久化（使用 SQLite 資料庫）

## 專案結構

```
todo-app/
├── server/           # Node.js Express 後端
│   ├── server.js     # API 伺服器
│   ├── todo.db       # SQLite 資料庫（自動產生）
│   └── package.json
└── client/           # Vue 3 前端
    ├── src/
    │   ├── App.vue               # 主元件
    │   ├── main.js
    │   ├── assets/main.css
    │   └── components/
    │       ├── TodoForm.vue      # 新增/編輯表單
    │       └── TodoItem.vue      # 單筆待辦事項
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 快速開始

### 1. 安裝後端依賴並啟動

```bash
cd server
npm install
npm run dev     # 開發模式（nodemon）
# 或
npm start       # 一般啟動
```

後端運行於 `http://localhost:3001`

### 2. 安裝前端依賴並啟動（另開終端機）

```bash
cd client
npm install
npm run dev
```

前端運行於 `http://localhost:3000`

### 3. 開啟瀏覽器

前往 `http://localhost:3000` 即可使用。

## API 端點

| 方法   | 路徑              | 說明         |
|--------|-------------------|--------------|
| GET    | /api/todos        | 取得所有事項 |
| POST   | /api/todos        | 新增事項     |
| PUT    | /api/todos/:id    | 更新事項     |
| DELETE | /api/todos/:id    | 刪除事項     |

### 待辦事項資料格式

```json
{
  "id": "1700000000000-abc123def",
  "title": "完成報告",
  "description": "需要在截止日前提交",
  "priority": "high",
  "completed": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

`priority` 可選值：`high` | `medium` | `low`

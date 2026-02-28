# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Server (backend)
```bash
cd server
npm install
npm run dev     # Development with nodemon (auto-restart)
npm start       # Production start
```
Server runs on http://localhost:3001

### Client (frontend)
```bash
cd client
npm install
npm run dev     # Vite dev server with HMR
npm run build   # Production build to client/dist/
npm run preview # Preview production build
```
Client runs on http://localhost:3000 (proxies `/api` and `/socket.io` to server)

## Architecture

This is a monorepo-style Todo app with separate `client/` and `server/` directories, each with their own `package.json`. No shared root package.json.

### Backend (`server/`)
- **Runtime**: Node.js with Express (CommonJS modules)
- **Database**: Supabase PostgreSQL via Sequelize ORM. Connection string in `server/.env` (`DATABASE_URL`). Uses Supavisor session mode (port 5432)
- **Real-time**: Socket.IO broadcasts changes to other clients. The originating client is excluded via `X-Socket-Id` header
- **Layer structure**:
  - `server.js` - HTTP/WebSocket server setup, dotenv config, static file serving, SPA fallback
  - `routes/todos.route.js` - Express router (async handlers), receives `io` instance for broadcasting
  - `ctrl/todos.ctrl.js` - Async business logic using Sequelize Model API with `withTransaction`
  - `models/db.js` - Sequelize instance, `Todo` model definition, async `withTransaction` helper

### Frontend (`client/`)
- **Framework**: Vue 3 with Composition API (`<script setup>`)
- **UI Library**: Element Plus (zh-TW locale), with `@element-plus/icons-vue` globally registered
- **Rich Text**: Vditor for Markdown editing (in TodoForm) and rendering (in TodoItem)
- **Drag & Drop**: `vuedraggable` for manual sort ordering
- **Build**: Vite
- **No router** - single page app with all state in `App.vue`

### Data Flow
- `App.vue` holds all todo state and API fetch logic (no Vuex/Pinia)
- Socket.IO events (`todo:created`, `todo:updated`, `todo:deleted`, `todo:reordered`) sync state across browser tabs/clients
- Todo IDs are generated server-side: `${Date.now()}-${random}`

### Color System
- Ant Design-based color palette defined as CSS custom properties in `client/src/assets/style.css` (e.g., `--red-5`, `--gray-10`)
- Also available as JS exports in `client/src/assets/colorcode.js` and utility classes (`.bg-red-1`, `.red-1`)

## API Endpoints

| Method | Path              | Description        |
|--------|-------------------|--------------------|
| GET    | /api/todos        | List all todos     |
| POST   | /api/todos        | Create todo        |
| PUT    | /api/todos/reorder| Batch reorder      |
| PUT    | /api/todos/:id    | Update todo        |
| DELETE | /api/todos/:id    | Delete todo        |

Todo fields: `id`, `title`, `description` (Markdown), `priority` (high|medium|low), `completed` (boolean), `createdAt` (ISO), `sortOrder` (integer)

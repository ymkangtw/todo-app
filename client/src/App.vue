<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { io } from 'socket.io-client';
import draggable from 'vuedraggable';
import TodoForm from './components/TodoForm.vue';
import TodoItem from './components/TodoItem.vue';

const todos = ref([]);
const loading = ref(false);
const error = ref('');

const filterStatus = ref('all');    // all | active | completed
const filterPriority = ref('all');  // all | high | medium | low
const sortBy = ref('createdAt');    // createdAt | priority | manual

const draggableList = ref([]);
const editingTodo = ref(null);
const editDialogVisible = ref(false);
const todoFormRef = ref(null);

const API = '/api/todos';
const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

const socket = io();
const socketHeaders = () => ({ 'X-Socket-Id': socket.id });

// ---- Computed ----

const filteredTodos = computed(() => {
  let result = todos.value;

  if (filterStatus.value === 'active') {
    result = result.filter((t) => !t.completed);
  } else if (filterStatus.value === 'completed') {
    result = result.filter((t) => t.completed);
  }

  if (filterPriority.value !== 'all') {
    result = result.filter((t) => t.priority === filterPriority.value);
  }

  if (sortBy.value === 'manual') {
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return [...result].sort((a, b) =>
    sortBy.value === 'priority'
      ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      : new Date(b.createdAt) - new Date(a.createdAt)
  );
});

const stats = computed(() => ({
  total: todos.value.length,
  active: todos.value.filter((t) => !t.completed).length,
  completed: todos.value.filter((t) => t.completed).length,
  high: todos.value.filter((t) => t.priority === 'high' && !t.completed).length,
}));

// ---- API Calls ----

const fetchTodos = async () => {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error('無法載入資料');
    todos.value = await res.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const addTodo = async (data) => {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...socketHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('新增失敗');
    const newTodo = await res.json();
    todos.value.push(newTodo);
    todoFormRef.value?.reset();
    ElMessage({ message: '待辦事項已新增', type: 'success' });
  } catch (e) {
    ElMessage({ message: e.message, type: 'error' });
  }
};

const updateTodo = async (id, updates) => {
  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...socketHeaders() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('更新失敗');
    const updated = await res.json();
    const index = todos.value.findIndex((t) => t.id === id);
    if (index !== -1) todos.value[index] = updated;
  } catch (e) {
    ElMessage({ message: e.message, type: 'error' });
  }
};

const deleteTodo = async (id) => {
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: socketHeaders() });
    if (!res.ok) throw new Error('刪除失敗');
    todos.value = todos.value.filter((t) => t.id !== id);
    ElMessage({ message: '已刪除', type: 'success' });
  } catch (e) {
    ElMessage({ message: e.message, type: 'error' });
  }
};

// ---- Event Handlers ----

const handleToggle = (todo) => {
  updateTodo(todo.id, { completed: !todo.completed });
};

const handleEdit = (todo) => {
  editingTodo.value = { ...todo };
  editDialogVisible.value = true;
};

const handleEditSubmit = async (data) => {
  await updateTodo(editingTodo.value.id, data);
  editDialogVisible.value = false;
  editingTodo.value = null;
  ElMessage({ message: '已儲存變更', type: 'success' });
};

const clearCompleted = async () => {
  try {
    await ElMessageBox.confirm(
      `確定要刪除全部 ${stats.value.completed} 筆已完成事項嗎？`,
      '清除已完成',
      {
        confirmButtonText: '清除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    );
  } catch {
    return;
  }
  const completed = todos.value.filter((t) => t.completed);
  for (const todo of completed) {
    await fetch(`${API}/${todo.id}`, { method: 'DELETE', headers: socketHeaders() });
  }
  todos.value = todos.value.filter((t) => !t.completed);
  ElMessage({ message: '已清除所有完成事項', type: 'success' });
};

// Sync draggableList when filteredTodos changes
watch(filteredTodos, (val) => {
  draggableList.value = [...val];
}, { immediate: true });

const onDragEnd = async () => {
  const items = draggableList.value.map((todo, index) => ({
    id: todo.id,
    sortOrder: index,
  }));
  // Update local state immediately
  draggableList.value.forEach((todo, index) => {
    todo.sortOrder = index;
    const orig = todos.value.find((t) => t.id === todo.id);
    if (orig) orig.sortOrder = index;
  });
  try {
    const res = await fetch(`${API}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...socketHeaders() },
      body: JSON.stringify(items),
    });
    if (!res.ok) throw new Error('排序更新失敗');
  } catch (e) {
    ElMessage({ message: e.message, type: 'error' });
  }
};

onMounted(() => {
  fetchTodos();

  socket.on('todo:created', (todo) => {
    todos.value.push(todo);
  });

  socket.on('todo:updated', (updated) => {
    const index = todos.value.findIndex((t) => t.id === updated.id);
    if (index !== -1) todos.value[index] = updated;
  });

  socket.on('todo:deleted', (id) => {
    todos.value = todos.value.filter((t) => t.id !== id);
  });

  socket.on('todo:reordered', (items) => {
    for (const { id, sortOrder } of items) {
      const todo = todos.value.find((t) => t.id === id);
      if (todo) todo.sortOrder = sortOrder;
    }
  });
});

onBeforeUnmount(() => {
  socket.disconnect();
});
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <h1 class="app-title">📝 待辦事項清單</h1>
      <p class="app-subtitle">保持專注，完成每一件重要的事</p>
    </header>

    <!-- Stats Cards -->
    <el-row :gutter="12" class="stats-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="全部" :value="stats.total" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="待完成" :value="stats.active">
            <template #number>
              <span class="stat-num stat-primary">{{ stats.active }}</span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="已完成" :value="stats.completed">
            <template #number>
              <span class="stat-num stat-success">{{ stats.completed }}</span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="高優先（待完成）" :value="stats.high">
            <template #number>
              <span class="stat-num stat-danger">{{ stats.high }}</span>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <!-- Error Alert -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      closable
      class="error-alert"
      @close="error = ''"
    />

    <!-- Add Todo Form -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header-title">
          <el-icon color="#409eff"><CirclePlus /></el-icon>
          新增待辦
        </div>
      </template>
      <TodoForm ref="todoFormRef" @submit="addTodo" />
    </el-card>

    <!-- Filter & Sort -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header-title">
          <el-icon color="#409eff"><Operation /></el-icon>
          篩選與排序
        </div>
      </template>
      <div class="controls">
        <div class="control-item">
          <span class="control-label">狀態</span>
          <el-radio-group v-model="filterStatus" size="small">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="active">待完成</el-radio-button>
            <el-radio-button value="completed">已完成</el-radio-button>
          </el-radio-group>
        </div>

        <div class="control-item">
          <span class="control-label">優先級</span>
          <el-select v-model="filterPriority" size="small" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="🔴 高優先" value="high" />
            <el-option label="🟡 中優先" value="medium" />
            <el-option label="🟢 低優先" value="low" />
          </el-select>
        </div>

        <div class="control-item">
          <span class="control-label">排序</span>
          <el-select v-model="sortBy" size="small" style="width: 115px">
            <el-option label="建立時間" value="createdAt" />
            <el-option label="優先級別" value="priority" />
            <el-option label="手動排序" value="manual" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      title="✏️ 編輯待辦事項"
      width="600px"
      align-center
      destroy-on-close
      @close="editingTodo = null"
    >
      <TodoForm
        :editing-todo="editingTodo"
        @submit="handleEditSubmit"
        @cancel="editDialogVisible = false"
      />
    </el-dialog>

    <!-- Todo List -->
    <el-card shadow="never">
      <template #header>
        <div class="list-header">
          <div class="card-header-title">
            <el-icon color="#409eff"><List /></el-icon>
            待辦清單
            <el-tag type="primary" size="small" round style="margin-left: 4px">
              {{ filteredTodos.length }}
            </el-tag>
          </div>
          <el-button
            v-if="stats.completed > 0"
            size="small"
            type="danger"
            plain
            @click="clearCompleted"
          >
            <el-icon><Delete /></el-icon>
            清除已完成
          </el-button>
        </div>
      </template>

      <div v-loading="loading" style="min-height: 80px">
        <el-empty
          v-if="!loading && filteredTodos.length === 0"
          :description="todos.length === 0 ? '尚無待辦事項，開始新增吧！' : '目前沒有符合條件的事項'"
          :image-size="80"
        />

        <draggable
          v-else
          v-model="draggableList"
          item-key="id"
          :disabled="sortBy !== 'manual'"
          :animation="200"
          class="todo-list"
          @end="onDragEnd"
        >
          <template #item="{ element }">
            <TodoItem
              :todo="element"
              :draggable="sortBy === 'manual'"
              @toggle="handleToggle"
              @edit="handleEdit"
              @delete="deleteTodo"
            />
          </template>
        </draggable>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 28px 16px 64px;
}

/* Header */
.app-header {
  text-align: center;
  margin-bottom: 24px;
}

.app-title {
  font-size: 30px;
  font-weight: 800;
  color: var(--gray-10);
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: 14px;
  color: var(--gray-7);
  margin-top: 6px;
}

/* Stats */
.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  margin-bottom: 0;
}

:deep(.stat-card .el-card__body) {
  padding: 16px 12px;
}

.stat-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
}

.stat-primary { color: var(--blue-6); }
.stat-success { color: var(--green-6); }
.stat-danger  { color: var(--red-5); }

/* Error */
.error-alert {
  margin-bottom: 16px;
}

/* Cards */
.section-card {
  margin-bottom: 16px;
}

.card-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-10);
}

/* Controls */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-8);
  white-space: nowrap;
}

/* List */
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.28s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.list-move {
  transition: transform 0.28s ease;
}

/* Responsive */
@media (max-width: 480px) {
  .controls {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

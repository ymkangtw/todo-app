<script setup>
const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
});

defineEmits(['toggle', 'edit', 'delete']);

const priorityLabel = { high: '高優先', medium: '中優先', low: '低優先' };
const priorityTagType = { high: 'danger', medium: 'warning', low: 'success' };
</script>

<template>
  <div
    class="todo-item"
    :class="[`priority-${todo.priority}`, { 'is-completed': todo.completed }]"
  >
    <el-checkbox
      :model-value="todo.completed"
      @change="$emit('toggle', todo)"
    />

    <div class="todo-content">
      <span class="todo-title" :class="{ 'title-done': todo.completed }">
        {{ todo.title }}
      </span>
      <p v-if="todo.description" class="todo-desc">{{ todo.description }}</p>
    </div>

    <div class="todo-meta">
      <el-tag :type="priorityTagType[todo.priority]" size="small" effect="light" round>
        {{ priorityLabel[todo.priority] }}
      </el-tag>
      <div class="todo-actions">
        <el-tooltip content="編輯" placement="top" :show-after="400">
          <el-button size="small" circle @click="$emit('edit', todo)">
            <el-icon><Edit /></el-icon>
          </el-button>
        </el-tooltip>

        <el-popconfirm
          title="確定要刪除這筆待辦事項嗎？"
          confirm-button-text="刪除"
          cancel-button-text="取消"
          confirm-button-type="danger"
          :width="210"
          @confirm="$emit('delete', todo.id)"
        >
          <template #reference>
            <el-button size="small" circle type="danger" plain>
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border-left: 4px solid transparent;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.15s, transform 0.15s;
}

.todo-item:hover {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.todo-item.priority-high  { border-left-color: #f56c6c; }
.todo-item.priority-medium { border-left-color: #e6a23c; }
.todo-item.priority-low   { border-left-color: #67c23a; }

.todo-item.is-completed { opacity: 0.55; }

.todo-content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.todo-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  word-break: break-word;
  display: block;
}

.todo-title.title-done {
  text-decoration: line-through;
  color: #909399;
}

.todo-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  word-break: break-word;
  line-height: 1.4;
}

.todo-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.todo-actions {
  display: flex;
  gap: 4px;
}
</style>

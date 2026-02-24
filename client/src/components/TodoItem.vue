<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
  draggable: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['toggle', 'edit', 'delete']);

const priorityLabel = { high: '高優先', medium: '中優先', low: '低優先' };
const priorityTagType = { high: 'danger', medium: 'warning', low: 'success' };
const priorityBg = {
  high: '#fef0f0',
  medium: '#fdf6ec',
  low: '#f0f9eb',
};

const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const descRef = ref(null);

const renderMarkdown = () => {
  if (descRef.value && props.todo.description) {
    Vditor.preview(descRef.value, props.todo.description, {
      mode: 'dark',
      hljs: { lineNumber: true },
    });
  }
};

onMounted(() => {
  nextTick(renderMarkdown);
});

watch(() => props.todo.description, () => {
  nextTick(renderMarkdown);
});
</script>

<template>
  <el-card
    shadow="hover"
    class="todo-card"
    :class="{ 'is-completed': todo.completed, 'is-draggable': draggable }"
    :body-style="{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '14px 16px',
      backgroundColor: priorityBg[todo.priority],
    }"
  >
    <el-checkbox
      :model-value="todo.completed"
      @change="$emit('toggle', todo)"
    />

    <div class="todo-content">
      <span class="todo-title" :class="{ 'title-done': todo.completed }">
        {{ todo.title }}
      </span>
      <div v-if="todo.description" ref="descRef" class="todo-desc vditor-reset"></div>
    </div>

    <div class="todo-meta">
      <div class="todo-meta-row">
        <el-tag :type="priorityTagType[todo.priority]" size="small" effect="light" round>
          {{ priorityLabel[todo.priority] }}
        </el-tag>
        <el-text type="primary" size="small" tag="span" class="todo-date">
          {{ formatDate(todo.createdAt) }}
        </el-text>
      </div>
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
  </el-card>
</template>

<style scoped>
.todo-card {
  transition: transform 0.15s;
}

.todo-card:hover {
  transform: translateY(-1px);
}

.todo-card.is-draggable {
  cursor: grab;
}

.todo-card.is-draggable:active {
  cursor: grabbing;
}

.todo-card.is-completed {
  opacity: 0.55;
}

:deep(.todo-card .el-card__body) {
  border-radius: inherit;
}

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
  color: #606266;
  margin-top: 6px;
  word-break: break-word;
  line-height: 1.5;
}

.todo-desc :deep(p) {
  margin: 0 0 4px;
}

.todo-desc :deep(p:last-child) {
  margin-bottom: 0;
}

.todo-desc :deep(img) {
  max-width: 100%;
}

.todo-desc :deep(pre) {
  font-size: 12px;
}

.todo-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.todo-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.todo-date {
  font-weight: bold;
  white-space: nowrap;
}

.todo-actions {
  display: flex;
  gap: 4px;
}

</style>

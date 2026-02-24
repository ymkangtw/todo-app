<script setup>
import { ref, reactive, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

const props = defineProps({
  editingTodo: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const formRef = ref(null);
const vditorRef = ref(null);
let vditorInstance = null;

const formData = reactive({
  title: '',
  priority: 'medium',
});

const rules = {
  title: [{ required: true, message: '請輸入待辦事項標題', trigger: 'blur' }],
};

const priorityOptions = [
  { label: '🔴 高優先', value: 'high' },
  { label: '🟡 中優先', value: 'medium' },
  { label: '🟢 低優先', value: 'low' },
];

const initVditor = () => {
  if (!vditorRef.value) return;
  vditorInstance = new Vditor(vditorRef.value, {
    height: 300,
    minHeight: 300,
    resize: { enable: true },
    lang: 'en_US',
    mode: 'wysiwyg',
    placeholder: '選填備註（支援 Markdown）...',
    toolbar: ['headings', 'bold', 'italic', 'strike', 'link', '|', 'list', 'ordered-list', 'check', 'outdent', 'indent', '|', 'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|', 'table', 'upload', 'emoji', '|', 'undo', 'redo', 'export'],
    toolbarConfig: { pin: true },
    cache: { enable: false },
    after: () => {
      if (props.editingTodo) {
        vditorInstance.setValue(props.editingTodo.description || '');
      }
    },
  });
};

watch(
  () => props.editingTodo,
  (todo) => {
    if (todo) {
      formData.title = todo.title;
      formData.priority = todo.priority;
      if (vditorInstance) {
        vditorInstance.setValue(todo.description || '');
      }
    }
  },
  { immediate: true }
);

const reset = () => {
  formData.title = '';
  formData.priority = 'medium';
  if (vditorInstance) {
    vditorInstance.setValue('');
  }
  nextTick(() => formRef.value?.clearValidate());
};

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  const description = vditorInstance ? vditorInstance.getValue().trim() : '';
  emit('submit', {
    title: formData.title.trim(),
    description,
    priority: formData.priority,
  });
};

onMounted(() => {
  initVditor();
});

onBeforeUnmount(() => {
  if (vditorInstance) {
    vditorInstance.destroy();
    vditorInstance = null;
  }
});

defineExpose({ reset, initVditor });
</script>

<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-position="top"
    @submit.prevent="handleSubmit"
  >
    <el-row :gutter="12">
      <el-col :sm="16" :xs="24">
        <el-form-item label="待辦標題" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="輸入待辦事項..."
            maxlength="100"
            show-word-limit
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
      </el-col>
      <el-col :sm="8" :xs="24">
        <el-form-item label="優先級別" prop="priority">
          <el-select v-model="formData.priority" style="width: 100%">
            <el-option
              v-for="opt in priorityOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item label="備註">
      <div ref="vditorRef" class="vditor-container"></div>
    </el-form-item>

    <el-form-item>
      <el-button type="primary" @click="handleSubmit">
        <el-icon v-if="!editingTodo"><Plus /></el-icon>
        <el-icon v-else><Check /></el-icon>
        {{ editingTodo ? '儲存變更' : '新增待辦' }}
      </el-button>
      <el-button v-if="editingTodo" @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.vditor-container {
  width: 100%;
}
</style>

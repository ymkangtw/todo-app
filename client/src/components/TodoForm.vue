<script setup>
import { ref, reactive, watch, nextTick } from 'vue';

const props = defineProps({
  editingTodo: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const formRef = ref(null);
const formData = reactive({
  title: '',
  description: '',
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

watch(
  () => props.editingTodo,
  (todo) => {
    if (todo) {
      formData.title = todo.title;
      formData.description = todo.description || '';
      formData.priority = todo.priority;
    }
  },
  { immediate: true }
);

const reset = () => {
  formData.title = '';
  formData.description = '';
  formData.priority = 'medium';
  nextTick(() => formRef.value?.clearValidate());
};

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    title: formData.title.trim(),
    description: formData.description.trim(),
    priority: formData.priority,
  });
};

defineExpose({ reset });
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

    <el-form-item label="備註" prop="description">
      <el-input
        v-model="formData.description"
        type="textarea"
        placeholder="選填備註..."
        :rows="2"
        maxlength="300"
        show-word-limit
        resize="vertical"
      />
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

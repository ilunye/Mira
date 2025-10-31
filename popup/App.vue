<template>
  <div>
    <WarningBanner v-if="warning && currentPage === 'summary'" :message="warning" />
    
    <SummaryDisplay 
      v-show="currentPage === 'summary'"
      :content="summary" 
      :loading="isLoading"
      :is-streaming-complete="isStreamingComplete"
      @open-settings="openSettings"
    />
    
    <SettingsPage 
      v-show="currentPage === 'settings'"
      @go-back="goBack"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import WarningBanner from './components/WarningBanner.vue';
import SummaryDisplay from './components/SummaryDisplay.vue';
import SettingsPage from './components/SettingsPage.vue';

// 页面状态
const currentPage = ref('summary'); // 'summary' 或 'settings'
const apiKey = ref('');

const openSettings = () => {
  currentPage.value = 'settings';
};

const goBack = () => {
  currentPage.value = 'summary';
};

// 摘要配置（从 storage 读取）
const summaryType = ref('key-points');
const summaryFormat = ref('markdown');
const summaryLength = ref('short');
const isStreamingComplete = ref(false);

// 加载用户设置
const loadSettings = async () => {
  const settings = await chrome.storage.local.get([
    'summaryType',
    'summaryFormat',
    'summaryLength',
    'apiKey'
  ]);
  
  if (settings.summaryType) {
    summaryType.value = settings.summaryType;
    console.log('[Mira] Loaded summary type:', settings.summaryType);
  }
  if (settings.summaryFormat) {
    summaryFormat.value = settings.summaryFormat;
    console.log('[Mira] Loaded summary format:', settings.summaryFormat);
  }
  if (settings.summaryLength) {
    summaryLength.value = settings.summaryLength;
    console.log('[Mira] Loaded summary length:', settings.summaryLength);
  }

  if (settings.apiKey) {
    apiKey.value = settings.apiKey;
    console.log('[Mira] Loaded API key.');
  } else {
    warning.value = 'API key is not set. Please set it in the settings.';
    console.log('[Mira] API key not found.');
  }
};

// 模型上下文限制
const MAX_MODEL_CHARS = 20000;

// 响应式状态
const summary = ref('');
const isLoading = ref(false);
const warning = ref('');
const pageContent = ref('');

async function generateSummary(newContent, forceRegenerate = false) {
  // 防止重复生成（除非是强制重新生成）
  if (!forceRegenerate && pageContent.value === newContent) {
    return;
  }

  pageContent.value = newContent;

  if (!newContent) {
    summary.value = "There's nothing to summarize";
    warning.value = '';
    isLoading.value = false;
    return;
  }

  // 检查内容长度
  if (newContent.length > MAX_MODEL_CHARS) {
    warning.value = `Text is too long for summarization with ${newContent.length} characters (maximum supported content length is ~${MAX_MODEL_CHARS} characters).`;
  } else {
    warning.value = '';
  }

  // 开始生成摘要
  isLoading.value = true;
  summary.value = 'Loading...';

  try {
    const options = {
      sharedContext: 'this is a website',
      type: summaryType.value,
      format: summaryFormat.value,
      length: summaryLength.value,
      outputLanguage: "en",
    };

    const availability = await Summarizer.availability();
    let summarizer;

    if (availability === 'unavailable') {
      summary.value = 'Summarizer API is not available';
      return;
    }

    if (availability === 'available') {
      // Summarizer API 可以立即使用
      summarizer = await Summarizer.create(options);
    } else {
      // 需要下载模型
      summarizer = await Summarizer.create(options);
      summarizer.addEventListener('downloadprogress', (e) => {
        console.log(`Downloaded ${e.loaded * 100}%`);
      });
      await summarizer.ready;
    }

    // Streamed summarization
    summary.value = '';
    isStreamingComplete.value = false;
    const stream = await summarizer.summarizeStreaming(newContent, {
      context: 'This article is intended for junior readers. The last paragraphs after "--- Images ---" are image descriptions, try your best to find image roles and how they are related to the main content.'
    });
    for await (const chunk of stream) {
      // Each chunk is appended to the live summary
      isLoading.value = false;
      summary.value += typeof chunk === 'string' ? chunk : String(chunk);
    }
    isStreamingComplete.value = true;
    summarizer.destroy();
  } catch (e) {
    console.log('Summary generation failed');
    console.error(e);
    summary.value = 'Error: ' + e.message;
  } finally {
    isLoading.value = false;
  }
}

// 初始化：读取当前页面内容
onMounted(async () => {
  // 先加载用户设置
  await loadSettings();
  
  chrome.storage.session.get('pageContent', ({ pageContent: content }) => {
    if (content) {
      generateSummary(content);
    }
  });

  // 监听 chrome.storage.session 变化（页面内容）
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.pageContent) {
      generateSummary(changes.pageContent.newValue);
    }
  });
  
  // 监听 chrome.storage.local 变化（用户设置）
  chrome.storage.local.onChanged.addListener((changes) => {
    let settingsChanged = false;
    
    if (changes.summaryType) {
      summaryType.value = changes.summaryType.newValue;
      console.log('[Mira] Summary type updated to:', changes.summaryType.newValue);
      settingsChanged = true;
    }
    if (changes.summaryFormat) {
      summaryFormat.value = changes.summaryFormat.newValue;
      console.log('[Mira] Summary format updated to:', changes.summaryFormat.newValue);
      settingsChanged = true;
    }
    if (changes.summaryLength) {
      summaryLength.value = changes.summaryLength.newValue;
      console.log('[Mira] Summary length updated to:', changes.summaryLength.newValue);
      settingsChanged = true;
    }
    
    // 如果摘要设置改变且有页面内容，重新生成摘要
    if (settingsChanged && pageContent.value) {
      console.log('[Mira] Settings changed, regenerating summary with new settings...');
      // 强制重新生成摘要
      generateSummary(pageContent.value, true);
    }
  });
});
</script>


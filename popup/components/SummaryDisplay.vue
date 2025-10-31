<template>
  <div class="card" id="summary" :class="{ loading: loading }">
    <div class="summary-header">
      <div class="logo-section">
        <img src="/images/mira_logo.png" alt="Mira" class="mira-icon" />
        <span class="mira-text">Mira</span>
      </div>
      <div class="header-buttons">
        <button 
          @click="handlePlayPause" 
          class="tts-button"
          :disabled="!content || loading"
          :title="playbackState === 'playing' ? 'Pause' : 'Play'"
        >
          <span v-if="playbackState === 'playing'">⏸️ Pause</span>
          <span v-else>▶️ Play</span>
        </button>
        <button 
          @click="handleStop"
          class="tts-button stop-button"
          :disabled="playbackState === 'stopped' || loading"
          title="Stop and reset"
        >
          ⏹️ Stop
        </button>
        <button 
          @click="openSettings" 
          class="settings-button"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
    <div v-if="!content && !loading" class="loading">Reading page...</div>
    <div v-if="loading" class="loading-banner">Generating summary...</div>
    <div v-html="sanitizedContent"></div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch, onMounted } from 'vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const props = defineProps({
  content: String,
  loading: Boolean,
  isStreamingComplete: Boolean
});

const emit = defineEmits(['open-settings']);

const playbackState = ref('stopped'); // 'stopped', 'playing', 'paused'
const autoReading = ref(true);
const currentSentenceIndex = ref(0);
const speechRate = ref(1.0); // 用于保存语速设置
const voiceName = ref('Aaron');
// ['Aaron', 'Eddy (English (United States))', 'Flo (English (United States))', 'Grandma (English (United States))', 'Grandpa (English (United States))', 'Nicky', 'Reed (English (United States))', 'Rocko (English (United States))', 'Samantha', 'Sandy (English (United States))', 'Shelley (English (United States))', 'Google US English']

// 朗读队列相关
const sentenceQueue = ref([]); // 待朗读的句子队列
const isConsumerRunning = ref(false); // 消费者是否正在运行

const sanitizedContent = computed(() => {
  if (!props.content) return '';
  return DOMPurify.sanitize(marked.parse(props.content));
});

// 获取纯文本内容（去除 markdown 格式）
const getPlainText = () => {
  if (!props.content) return '';
  // 移除 markdown 语法，只保留纯文本
  return props.content
    .replace(/[#*`_~\[\]()]/g, '') // 移除常见 markdown 符号
    .replace(/\n+/g, ' ') // 将换行替换为空格
    .trim();
};

// 分割文本为句子
const splitIntoSentences = (text) => {
  if (!text) return [];
  // 使用正则表达式分割句子：. ! ? 后跟空格或换行
  return text.split(/((?<=\D)[.!?]+[\s\n]*)/).filter(s => s.trim());
};

// 朗读句子
const speakSentence = (sentence) => {
  return new Promise((resolve) => {
    chrome.tts.speak(sentence, {
      lang: 'en-US',
      rate: speechRate.value,
      voiceName: voiceName.value,
      pitch: 1.0,
      volume: 1.0,
      onEvent: (event) => {
        if (event.type === 'end' || event.type === 'interrupted' || event.type === 'cancelled' || event.type === 'error') {
          resolve();
        }
      }
    });
  });
};

// 消费者：不断从队列中取出句子进行朗读
const consumeSentenceQueue = async () => {
  // 确保只有一个消费者在运行
  if (isConsumerRunning.value) return;
  
  isConsumerRunning.value = true;
  
  while (autoReading.value) {
    // 如果队列为空，则等待
    if (sentenceQueue.value.length === 0) {
      // 如果流式传输已完成且队列为空，则停止播放
      if (props.isStreamingComplete) {
        playbackState.value = 'stopped';
        break; // 退出循环
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }
    
    // 如果播放状态为“停止”，则更新为“播放”
    if (playbackState.value === 'stopped') {
      playbackState.value = 'playing';
    }
    
    // 从队列中取出第一个句子
    const sentence = sentenceQueue.value.shift();
    if (sentence && sentence.trim()) {
      await speakSentence(sentence);
    }
  }
  
  isConsumerRunning.value = false;
};

// 生产者：将新句子加入队列
const addNewSentencesToQueue = () => {
  if (!autoReading.value) return;
  
  const plainText = getPlainText();
  if (!plainText || plainText == 'Loading...') return;
  
  const sentences = splitIntoSentences(plainText);
  const newSentences = sentences.slice(currentSentenceIndex.value);
  
  // 将新句子加入队列
  if (newSentences.length > 1) {
    // 每次只添加一个新句子（每两个元素是一个完整句子，因为 split 包含了分隔符）
    const sentenceToAdd = newSentences[0];
    if (sentenceToAdd && sentenceToAdd.trim()) {
      sentenceQueue.value.push(sentenceToAdd);
      console.log("[Mira] Added to queue: " + sentenceToAdd);
    }
    currentSentenceIndex.value += 2;
  }
  
  // 如果消费者没在运行，启动它
  if (!isConsumerRunning.value) {
    consumeSentenceQueue();
  }
};

// 监听内容变化，自动朗读新句子
watch(() => props.content, (newContent, oldContent) => {
  if (autoReading.value && newContent && newContent !== oldContent) {
    addNewSentencesToQueue();
  }
}, { immediate: true });

const openSettings = () => {
  emit('open-settings');
};

const handlePlayPause = () => {
  if (playbackState.value === 'playing') {
    // Pause the speech
    chrome.tts.pause();
    playbackState.value = 'paused';
  } else if (playbackState.value === 'paused') {
    // Resume the speech
    chrome.tts.resume();
    playbackState.value = 'playing';
  } else {
    // 如果手动开始播放，则禁用自动阅读
    autoReading.value = false;
    sentenceQueue.value = []; // 清空队列

    // Start speaking from the beginning
    const text = getPlainText();
    if (!text) return;
    
    chrome.tts.speak(text, {
      lang: 'en-US',
      rate: speechRate.value,
      voiceName: voiceName.value,
      pitch: 1.0,
      volume: 1.0,
      onEvent: (event) => {
        if (event.type === 'end' || event.type === 'interrupted' || event.type === 'cancelled' || event.type === 'error') {
          playbackState.value = 'stopped';
        } else if (event.type === 'start') {
          playbackState.value = 'playing';
        }
      }
    });
  }
};

const handleStop = () => {
  chrome.tts.stop();
  playbackState.value = 'stopped';
  // 停止时也禁用自动阅读
  autoReading.value = false;
  sentenceQueue.value = [];
};

// 播放提示音
const speakCue = (text) => {
  // 停止当前任何语音
  chrome.tts.stop();
  // 播放提示
  chrome.tts.speak(text, {
    lang: 'en-US',
    rate: speechRate.value,
    voiceName: voiceName.value,
  });
};

watch(() => props.loading, (isLoading) => {
  if (isLoading) {
    speakCue('Generating summary...');
  }
});

onMounted(async () => {
  // 加载音频设置
  const settings = await chrome.storage.local.get(['speechRate', 'selectedVoice', 'autoplayEnabled']);
  if (settings.speechRate !== undefined) {
    speechRate.value = settings.speechRate;
  }
  if (settings.selectedVoice) {
    voiceName.value = settings.selectedVoice;
  }
  if (settings.autoplayEnabled !== undefined) {
    autoReading.value = settings.autoplayEnabled;
  }

  // 初始状态提示
  // if (!props.content && !props.loading) {
  //   speakCue('Reading page...');
  // }

  // 监听设置变化
  chrome.storage.local.onChanged.addListener((changes) => {
    if (changes.speechRate) {
      speechRate.value = changes.speechRate.newValue;
      console.log('[Mira] Speech rate updated to:', speechRate.value);
    }
    if (changes.selectedVoice) {
      voiceName.value = changes.selectedVoice.newValue;
      console.log('[Mira] Voice updated to:', voiceName.value);
    }
    if (changes.autoplayEnabled) {
      autoReading.value = changes.autoplayEnabled.newValue;
      console.log('[Mira] Autoplay setting updated to:', autoReading.value);
    }
  });
});

onUnmounted(() => {
  chrome.tts.stop();
  autoReading.value = false;
  sentenceQueue.value = []; // 清空队列
  isConsumerRunning.value = false; // 停止消费者
  playbackState.value = 'stopped'; // 重置播放状态
});
</script>

<style scoped>
.header-buttons {
  display: flex;
  gap: 8px;
}

.tts-button {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.tts-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.tts-button:active:not(:disabled) {
  transform: scale(0.95);
}

.tts-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-button {
  background-color: #ffebee;
}

.stop-button:hover:not(:disabled) {
  background-color: #ffcdd2;
}

.settings-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
}

.settings-button:hover {
  background: #e8e8e8;
  border-color: #667eea;
}
</style>


<template>
  <div class="settings-page">
    <div class="settings-header">
      <div class="logo-section">
        <img src="/images/mira_logo.png" alt="Mira" class="mira-icon" />
        <span class="settings-title">Mira Settings</span>
      </div>
      <button 
        @click="goBack" 
        class="back-button"
        title="Back"
      >
        ←
      </button>
    </div>

    <div class="settings-content">
      <!-- Audio Settings Section -->
      <section class="settings-section">
        <h3 class="section-title">Audio Settings</h3>
        
        <div class="setting-item toggle-item">
          <label for="autoplay-toggle">Autoplay</label>
          <label class="switch">
            <input type="checkbox" id="autoplay-toggle" v-model="autoplayEnabled">
            <span class="slider-switch round"></span>
          </label>
        </div>

        <div class="setting-item">
          <label for="speech-rate">Speech Rate</label>
          <div class="slider-container">
            <span class="slider-label">Slow</span>
            <input 
              type="range" 
              id="speech-rate" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              v-model.number="speechRate"
              class="slider"
            />
            <span class="slider-label">Fast</span>
          </div>
          <span class="current-value">{{ speechRate.toFixed(1) }}x</span>
        </div>

        <div class="setting-item">
          <label for="voice-select">Voice</label>
          <select id="voice-select" class="select-input" v-model="selectedVoice">
            <option v-for="voice in voices" :key="voice" :value="voice">{{ voice }}</option>
          </select>
        </div>
      </section>

      <!-- Summary Settings Section -->
      <section class="settings-section">
        <h3 class="section-title">Summary Settings</h3>
        
        <div class="three-column-picker">
          <div class="picker-column">
            <label for="summary-type">Type</label>
            <select id="summary-type" class="select-input" v-model="summaryType">
              <option value="key-points">Key Points</option>
            <option value="tldr">TL;DR</option>
            <option value="teaser">Teaser</option>
            <option value="headline">Headline</option>
            </select>
          </div>

          <div class="picker-column">
            <label for="summary-format">Format</label>
            <select id="summary-format" class="select-input" v-model="summaryFormat">
              <option value="markdown">Markdown</option>
              <option value="plain-text">Plain Text</option>
            </select>
          </div>

          <div class="picker-column">
            <label for="summary-length">Length</label>
            <select id="summary-length" class="select-input" v-model="summaryLength">
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>
      </section>

      <!-- API Settings Section -->
      <section class="settings-section">
        <h3 class="section-title">API Settings</h3>
        <div class="setting-item">
          <label for="api-key">Google AI Studio API Key</label>
          <input 
            type="password" 
            id="api-key" 
            v-model="apiKey" 
            class="text-input"
            placeholder="Enter your API key"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const emit = defineEmits(['go-back']);

// Audio settings
const autoplayEnabled = ref(true);
const speechRate = ref(1.0);
const selectedVoice = ref('Aaron');
const voices = ref([
  'Aaron', 
  'Eddy (English (United States))', 
  'Flo (English (United States))', 
  'Grandma (English (United States))', 
  'Grandpa (English (United States))', 
  'Nicky', 
  'Reed (English (United States))', 
  'Rocko (English (United States))', 
  'Samantha', 
  'Sandy (English (United States))', 
  'Shelley (English (United States))', 
  'Google US English'
]);

// Summary settings
const summaryType = ref('key-points');
const summaryFormat = ref('markdown');
const summaryLength = ref('short');

// API settings
const apiKey = ref('');

// 从 chrome.storage.local 加载设置
onMounted(async () => {
  const settings = await chrome.storage.local.get([
    'autoplayEnabled',
    'speechRate',
    'selectedVoice',
    'summaryType',
    'summaryFormat',
    'summaryLength',
    'apiKey'
  ]);
  
  if (settings.autoplayEnabled !== undefined) autoplayEnabled.value = settings.autoplayEnabled;
  if (settings.speechRate !== undefined) speechRate.value = settings.speechRate;
  if (settings.selectedVoice) selectedVoice.value = settings.selectedVoice;
  if (settings.summaryType) summaryType.value = settings.summaryType;
  if (settings.summaryFormat) summaryFormat.value = settings.summaryFormat;
  if (settings.summaryLength) summaryLength.value = settings.summaryLength;
  if (settings.apiKey) apiKey.value = settings.apiKey;
});

// 监听设置变化并保存到 chrome.storage.local
watch(autoplayEnabled, (newValue) => {
  console.log('[Mira Settings] Autoplay changed:', newValue);
  chrome.storage.local.set({ autoplayEnabled: newValue });
});

watch(speechRate, (newValue) => {
  console.log('[Mira Settings] Speech rate changed:', newValue, "before is", speechRate.value);
  chrome.storage.local.set({ speechRate: newValue });
});

watch(selectedVoice, (newValue) => {
  console.log('[Mira Settings] Voice changed:', newValue, "before is", selectedVoice.value);
  chrome.storage.local.set({ selectedVoice: newValue });
});

watch(summaryType, (newValue) => {
  console.log('[Mira Settings] Summary type changed:', newValue, "before is", summaryType.value);
  chrome.storage.local.set({ summaryType: newValue });
});

watch(summaryFormat, (newValue) => {
  console.log('[Mira Settings] Summary format changed:', newValue, "before is", summaryFormat.value);
  chrome.storage.local.set({ summaryFormat: newValue });
});

watch(summaryLength, (newValue) => {
  console.log('[Mira Settings] Summary length changed:', newValue, "before is", summaryLength.value);
  chrome.storage.local.set({ summaryLength: newValue });
});

watch(apiKey, (newValue) => {
  console.log('[Mira Settings] API Key changed.');
  chrome.storage.local.set({ apiKey: newValue });
});

const goBack = () => {
  emit('go-back');
};
</script>

<style scoped>
.settings-page {
  width: 100%;
  min-height: 400px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 2px solid #e0e0e0;
  border-radius: 0 0 12px 12px;
  background: white;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mira-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.settings-title {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.back-button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
}

.back-button:hover {
  background: #e8e8e8;
  border-color: #667eea;
  transform: translateX(-2px);
}

.back-button:active {
  transform: translateX(-2px) scale(0.95);
}

.settings-content {
  padding: 10px;
  background: #f5f5f5;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.setting-item {
  margin-bottom: 20px;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

/* Toggle Switch Styles */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider-switch {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider-switch:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider-switch {
  background-color: #667eea;
}

input:focus + .slider-switch {
  box-shadow: 0 0 1px #667eea;
}

input:checked + .slider-switch:before {
  -webkit-transform: translateX(22px);
  -ms-transform: translateX(22px);
  transform: translateX(22px);
}

.slider-switch.round {
  border-radius: 34px;
}

.slider-switch.round:before {
  border-radius: 50%;
}


.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.slider-label {
  font-size: 12px;
  color: #888;
  min-width: 40px;
}

.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #667eea, #764ba2);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 2px solid #667eea;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 2px solid #667eea;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.current-value {
  display: block;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
}

.select-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.select-input:hover {
  border-color: #667eea;
}

.select-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.three-column-picker {
  display: flex;
  gap: 12px;
}

.picker-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.picker-column label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #888;
  margin-bottom: 8px;
  text-align: center;
}

.picker-column .select-input {
  width: 100%;
  text-align: center;
  padding: 8px 4px;
  font-size: 13px;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: border-color 0.3s ease;
  box-sizing: border-box; 
}

.text-input:hover {
  border-color: #667eea;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
</style>


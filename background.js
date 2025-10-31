let curTabId = null;

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  chrome.storage.session.set({ pageContent: null });
  if (curTabId != null) {
    try {
      chrome.tabs.sendMessage(curTabId, {
        action: "stop"
      })
    } catch (e) {
      console.warn("[Mira] stop failed: " + e);
    }
  }
  curTabId = tabId;

  let response;
  if (changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    try {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      response = await chrome.tabs.sendMessage(tabId, {
        action: 'extractContent',
        apiKey: apiKey,
      });
    } catch (error) {
      console.log("Content script not ready, injecting...");
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['scripts/extract-content.js']
      });
  
      await new Promise(resolve => setTimeout(resolve, 500));
  
      const { apiKey } = await chrome.storage.local.get('apiKey');
      response = await chrome.tabs.sendMessage(tabId, {
        action: "extractContent",
        apiKey: apiKey,
      });
    }
    if (response && response.content) {
      chrome.storage.session.set({ pageContent: response.content });
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  chrome.storage.session.set({ pageContent: null });
  if (curTabId != null) {
    try {
      chrome.tabs.sendMessage(curTabId, {
        action: "stop"
      })
    } catch (e) {
      console.warn("[Mira] stop failed: " + e);
    }
  }
  curTabId = activeInfo.tabId;

  let response;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url?.startsWith('http')) {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      response = await chrome.tabs.sendMessage(activeInfo.tabId, { 
        action: 'extractContent',
        apiKey: apiKey,
      });
    }
  } catch (error) {
    console.log("Content script not ready, injecting...");
    await chrome.scripting.executeScript({
      target: { tabId: activeInfo.tabId },
      files: ['scripts/extract-content.js']
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const { apiKey } = await chrome.storage.local.get('apiKey');
    response = await chrome.tabs.sendMessage(activeInfo.tabId, {
      action: "extractContent",
      apiKey: apiKey,
    });
  }

  if (response && response.content) {
    chrome.storage.session.set({ pageContent: response.content });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('PrecioScout Service Worker Initialized');
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  console.log('Message received in background:', message);
  return true;
});

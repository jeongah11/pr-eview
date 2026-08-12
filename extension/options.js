const apiKeyInput = document.getElementById("apiKey");
const statusEl = document.getElementById("status");

// 저장돼 있던 키를 불러와 입력창에 채웁니다.
chrome.storage.local.get(["apiKey"]).then(({ apiKey }) => {
  if (apiKey) apiKeyInput.value = apiKey;
});

// 저장 버튼: 입력값을 브라우저 저장소에 넣습니다.
document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({ apiKey: apiKeyInput.value.trim() });
  statusEl.textContent = "저장됐습니다.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
});

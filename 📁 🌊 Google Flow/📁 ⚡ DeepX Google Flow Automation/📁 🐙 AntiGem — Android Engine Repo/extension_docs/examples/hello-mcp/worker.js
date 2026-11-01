chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'mcp_tool_call') return;
  (async () => {
    if (message.tool !== 'hello') throw new Error('Unknown tool');
    if (typeof message.args?.name !== 'string') throw new Error('name is required');
    const {count = 0} = await chrome.storage.local.get('count');
    await chrome.storage.local.set({count: count + 1});
    return {greeting: `Hello ${message.args.name}`, count: count + 1};
  })().then(sendResponse, error => sendResponse({isError: true, content: [{type: 'text', text: error.message}]}));
  return true;
});

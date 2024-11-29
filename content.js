console.log('Content script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Reuqst.Action:', request.action);
  if (request.action === 'extractText') {
    console.log('Received summarise action in content.js.');

    // Extract visible text from the webpage
    const visibleText = document.body.innerText || '';
    console.log('Extracted text:', visibleText.substring(0, 1000)); // Log a snippet of the text

    // Send the extracted text back to background.js
    chrome.runtime.sendMessage({
      action: 'summarise',
      text: visibleText.trim()
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded.');

  // Send message to start summarizing the page
  chrome.runtime.sendMessage({
    action: 'summarisePage',
  });

  const summaryDiv = document.getElementById('summary');
  const copyButton = document.getElementById('copyButton');

  // Initially disable the copy button
  copyButton.disabled = true;

  // Add click event listener for the "Copy to Clipboard" button
  copyButton.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryDiv.textContent);
        // Show notification
        const notification = document.getElementById('notification');
        notification.style.display = 'block';
        setTimeout(() => {
          notification.style.display = 'none';
        }, 2000); // Hide after 2 seconds
      } else {
        throw new Error('Clipboard API not supported');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy text. Please try again.');
    }
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateSummary') {
      console.log('Partial summary received:', request.partialSummary);
      summaryDiv.innerHTML = marked.parse(request.partialSummary || "");
    } else if (request.action === 'displaySummary') {
      console.log('Final summary received:', request.summary);
      summaryDiv.innerHTML = marked.parse(request.summary || "");
      // Enable the copy button after the final summary is ready
      copyButton.disabled = false;
    } else if (request.action === 'summaryError') {
      console.error('Error during summarization:', request.error);
      summaryDiv.innerHTML = `<p style="color: red;">Error: ${request.error}</p>`;
      copyButton.disabled = true; // Keep button disabled if there's an error
    }
  });
});
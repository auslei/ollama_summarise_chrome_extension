chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background.js:', request);
  if (request.action === 'summarisePage') {
    console.log('Received summarisePage request.');

    // Get the active tab and inject content.js
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        console.log('Active tab found:', tabs[0]);

        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ['content.js']
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error('Error injecting content.js:', chrome.runtime.lastError.message);
              sendResponse({ error: 'Failed to inject content.js' });
            } else {
              console.log('content.js successfully injected.');
              // Send a message to content.js to start text extraction
              chrome.tabs.sendMessage(tabs[0].id, { action: 'extractText' });
            }
          }
        );
      } else {
        console.error('No active tab found.');
        sendResponse({ error: 'No active tab found.' });
      }
    });

    return true; // Keep the channel open for asynchronous response
  } else if (request.action === 'summarise') {
    console.log('Received text to summarise:', request.text.substring(0, 100)); // Log a snippet of the text

    // Use Ollama REST API for streaming
    fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*', // Accept any type of response
        'Origin': 'http://localhost:11434', // Match the server's expected Origin
      },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: `summarise the following text into bullet points in markdown format, just provide summary do not add any irrelevant comments or explanations:\n\n${request.text}`,
        stream: true
      })
    })
      .then(async (response) => {
        console.log(response.status);
        console.log(response.text);
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        let done = false;
        let partialSummary = '';

        // Read the stream in a loop
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          console.log('Received chunk:', value);

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const parts = chunk.split('\n').filter(Boolean); // Split into JSON objects

            parts.forEach((part) => {
              try {
                const json = JSON.parse(part);
                if (json.response) {
                  partialSummary += json.response; // Append the response text
                  console.log('Partial summary update:', partialSummary);

                  // Send an update to the popup
                  chrome.runtime.sendMessage({
                    action: 'updateSummary',
                    partialSummary: partialSummary.trim()
                  });
                }
              } catch (err) {
                console.error('Error parsing chunk:', err);
              }
            });
          }
        }

        console.log('Streaming completed.');
        chrome.runtime.sendMessage({
          action: 'displaySummary',
          summary: partialSummary.trim()
        });
      })
      .catch((error) => {
        console.error('Error during summarisation:', error);
        chrome.runtime.sendMessage({
          action: 'displaySummary',
          summary: 'Error: Unable to summarise the page.'
        });
      });
  }
});
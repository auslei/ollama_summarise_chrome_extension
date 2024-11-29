document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded.');

  const summaryDiv = document.getElementById('summary');
  const copyButton = document.getElementById('copyButton');
  const configureButton = document.getElementById('configureButton');
  const configModal = document.getElementById('configModal');
  const modelSelector = document.getElementById('modelSelector');
  const saveConfigButton = document.getElementById('saveConfigButton');

  // Check if a model is already configured
  chrome.storage.sync.get('ollamaModel', (data) => {
    if (!data.ollamaModel) {
      // No model configured, show the configuration modal
      showConfigModal();
    } else {
      // Proceed with summarization using the configured model
      initializeSummarization(data.ollamaModel);
    }
  });

  // Show configuration modal when the button is clicked
  configureButton.addEventListener('click', () => {
    showConfigModal();
  });

  // Fetch models from Ollama's /api/tags endpoint
  function fetchModelsFromOllama() {
    return fetch('http://localhost:11434/api/tags')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Check if models exist in the response
        if (data.models && Array.isArray(data.models)) {
          modelSelector.innerHTML = ''; // Clear existing options
          data.models.forEach((model) => {
            const option = document.createElement('option');
            option.value = model.name; // Use the model name as the value
            option.textContent = model.name; // Display the model name in the dropdown
            modelSelector.appendChild(option);
          });
        } else {
          throw new Error('No models found in the response.');
        }
      })
      .catch((error) => {
        console.error('Error fetching models from Ollama:', error);
        alert('Failed to fetch models. Make sure Ollama is running and accessible.');
      });
  }

  // Show the configuration modal
  function showConfigModal() {
    fetchModelsFromOllama()
      .then(() => {
        configModal.style.display = 'block';
        summaryDiv.style.display = 'none';
        configureButton.style.display = 'none';
      });
  }

  // Save the selected model
  saveConfigButton.addEventListener('click', () => {
    const selectedModel = modelSelector.value;
    chrome.storage.sync.set({ ollamaModel: selectedModel }, () => {
      alert(`Model "${selectedModel}" saved successfully!`);
      configModal.style.display = 'none';
      summaryDiv.style.display = 'block';
      configureButton.style.display = 'block';
      initializeSummarization(selectedModel);
    });
  });

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

  // Initialize summarization
  function initializeSummarization(model) {
    summaryDiv.innerHTML = `<p style="text-align: center;">Loading summary...</p>`;
    chrome.runtime.sendMessage({ action: 'summarisePage', model: model });
  }

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
let VALID_OBJECTS = [];
let NULL_OBJECTS = [];
let objectsData = [];

document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  loadConfig();
  loadData();
  loadParams();
  setupEventListeners();
});

function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      if (targetTab === 'view') {
        loadData();
      } else if (targetTab === 'extract') {
        loadParams();
      }
    });
  });
}

async function loadConfig() {
  try {
    const response = await sendNativeMessage({ action: 'get_config' });
    
    if (response.status === 'success') {
      VALID_OBJECTS = response.valid_objects || [];
      NULL_OBJECTS = response.null_objects || [];
      populateObjectTypeDropdown();
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

function populateObjectTypeDropdown() {
  const dropdown = document.getElementById('object-type');
  
  VALID_OBJECTS.forEach(objType => {
    const option = document.createElement('option');
    option.value = objType;
    option.textContent = objType;
    dropdown.appendChild(option);
  });
}

function setupEventListeners() {
  document.getElementById('add-btn').addEventListener('click', addObject);
  document.getElementById('delete-btn').addEventListener('click', deleteObject);
  document.getElementById('refresh-btn').addEventListener('click', loadData);
  document.getElementById('export-btn').addEventListener('click', exportToFile);
  document.getElementById('clear-all-btn').addEventListener('click', clearAllObjects);
  document.getElementById('search-input').addEventListener('input', filterObjects);
  document.getElementById('save-params-btn').addEventListener('click', saveParams);
  document.getElementById('extract-btn').addEventListener('click', runExtract);
}

function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    console.log("Popup: Sending message to background", message);
    
    chrome.runtime.sendMessage(message, (response) => {
      console.log("Popup: Received response", response);
      console.log("Popup: Last error", chrome.runtime.lastError);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('No response from Python'));
        return;
      }
      if (response.status === 'error') {
        reject(new Error(response.message));
        return;
      }
      resolve(response);
    });
  });
}

async function loadData() {
  const listContainer = document.getElementById('objects-list');
  listContainer.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
  
  try {
    console.log("Starting loadData...");
    const response = await Promise.race([
      sendNativeMessage({ action: 'get_all' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout after 5 seconds')), 5000))
    ]);
    
    console.log("Got response:", response);
    
    if (response.status === 'success') {
      objectsData = response.data || [];
      console.log("Loaded objects:", objectsData);
      renderObjectsList();
    } else {
      objectsData = [];
      listContainer.innerHTML = `<div class="empty-state"><p style="color: #d13438;">Error: ${response.message || 'Failed to load data'}</p></div>`;
    }
  } catch (error) {
    console.error('Load data error:', error);
    objectsData = [];
    listContainer.innerHTML = `<div class="empty-state"><p style="color: #d13438;">Failed to connect to Python host<br><small>${error.message}</small><br><br>Check browser console (F12) for details</p></div>`;
  }
}

async function addObject() {
  const objType = document.getElementById('object-type').value;
  const objName = document.getElementById('object-name').value.trim();
  const messageDiv = document.getElementById('add-message');
  
  messageDiv.className = 'message';
  messageDiv.style.display = 'none';
  
  if (!objType) {
    showMessage(messageDiv, 'Please select an object type', 'error');
    return;
  }
  
  if (!objName) {
    showMessage(messageDiv, 'Please enter an object name', 'error');
    return;
  }
  
  try {
    const response = await sendNativeMessage({
      action: 'add',
      object_type: objType,
      object_name: objName
    });
    
    if (response.status === 'success') {
      document.getElementById('object-type').value = '';
      document.getElementById('object-name').value = '';
      showMessage(messageDiv, response.message, 'success');
      loadData();
      
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 3000);
    } else {
      showMessage(messageDiv, response.message, 'error');
    }
  } catch (error) {
    showMessage(messageDiv, 'Failed to add object: ' + error.message, 'error');
  }
}

async function deleteObject() {
  const objName = document.getElementById('delete-name').value.trim();
  const messageDiv = document.getElementById('delete-message');
  
  messageDiv.className = 'message';
  messageDiv.style.display = 'none';
  
  if (!objName) {
    showMessage(messageDiv, 'Please enter an object name', 'error');
    return;
  }
  
  try {
    const response = await sendNativeMessage({
      action: 'delete',
      object_name: objName
    });
    
    if (response.status === 'success') {
      document.getElementById('delete-name').value = '';
      showMessage(messageDiv, response.message, 'success');
      loadData();
      
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 3000);
    } else {
      showMessage(messageDiv, response.message, 'error');
    }
  } catch (error) {
    showMessage(messageDiv, 'Failed to delete object: ' + error.message, 'error');
  }
}

async function deleteObjectFromList(objName) {
  if (confirm(`Delete object "${objName}"?`)) {
    try {
      const response = await sendNativeMessage({
        action: 'delete',
        object_name: objName
      });
      
      if (response.status === 'success') {
        loadData();
      } else {
        alert('Failed to delete: ' + response.message);
      }
    } catch (error) {
      alert('Failed to delete object: ' + error.message);
    }
  }
}

async function clearAllObjects() {
  if (confirm('Are you sure you want to delete all objects? This action cannot be undone.')) {
    try {
      const response = await sendNativeMessage({ action: 'clear_all' });
      
      if (response.status === 'success') {
        loadData();
      } else {
        alert('Failed to clear objects: ' + response.message);
      }
    } catch (error) {
      alert('Failed to clear objects: ' + error.message);
    }
  }
}

function renderObjectsList(filteredData = null) {
  const listContainer = document.getElementById('objects-list');
  const dataToRender = filteredData !== null ? filteredData : objectsData;
  
  document.getElementById('total-count').textContent = objectsData.length;
  
  if (dataToRender.length === 0) {
    listContainer.innerHTML = `<div class="empty-state"><p>${filteredData !== null ? 'No matching objects found' : 'No objects yet. Add some objects to get started!'}</p></div>`;
    return;
  }
  
  listContainer.innerHTML = dataToRender.map(obj => `
    <div class="object-item">
      <div class="object-info">
        <div class="object-type">${obj.object_name}</div>
        <div class="object-name">
          ${obj.object}
          ${obj.delimiter !== 'None' ? `<span style="color: #999; font-size: 12px;"> (${obj.delimiter})</span>` : ''}
        </div>
      </div>
      <span class="delete-icon" data-name="${obj.object}" title="Delete">✕</span>
    </div>
  `).join('');
  
  document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      const objName = e.target.dataset.name;
      deleteObjectFromList(objName);
    });
  });
}

function filterObjects() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  
  if (!searchTerm) {
    renderObjectsList();
    return;
  }
  
  const filtered = objectsData.filter(obj => 
    obj.object_name.toLowerCase().includes(searchTerm) ||
    obj.object.toLowerCase().includes(searchTerm)
  );
  
  renderObjectsList(filtered);
}

function exportToFile() {
  if (objectsData.length === 0) {
    alert('No data to export');
    return;
  }
  
  const content = objectsData.map(obj => {
    const parts = [obj.object_name, obj.object];
    if (NULL_OBJECTS.includes(obj.object_name)) {
      parts.push('Null');
    }
    return parts.join('~');
  }).join('\n');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Modified_object_list.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
}

function showGlobalError(message) {
  const messageDiv = document.getElementById('add-message');
  showMessage(messageDiv, message, 'error');
}

async function loadParams() {
  try {
    const response = await sendNativeMessage({ action: 'get_params' });
    if (response.status === 'success') {
      const params = response.params || {};
      document.getElementById('customer').value = params.Customer || '';
      document.getElementById('module-name').value = params.MODULE_NAME || '';
      document.getElementById('object-list').value = params.OBJECT_LIST || '';
      document.getElementById('workspace-path').value = params.WORKSPACE_PATH || '';
      document.getElementById('instance-name').value = params.INSTANCE_NAME || '';
      document.getElementById('pull-dependent').value = params.PULL_DEPENDENT_OBJECT || 'true';
    }
  } catch (error) {
    console.error('Failed to load params:', error);
  }
}

async function saveParams() {
  const messageDiv = document.getElementById('extract-message');
  const params = {
    Customer: document.getElementById('customer').value,
    MODULE_NAME: document.getElementById('module-name').value,
    OBJECT_LIST: document.getElementById('object-list').value,
    WORKSPACE_PATH: document.getElementById('workspace-path').value,
    INSTANCE_NAME: document.getElementById('instance-name').value,
    PULL_DEPENDENT_OBJECT: document.getElementById('pull-dependent').value
  };
  try {
    const response = await sendNativeMessage({ action: 'save_params', params });
    if (response.status === 'success') {
      showMessage(messageDiv, 'Parameters saved', 'success');
      setTimeout(() => messageDiv.style.display = 'none', 3000);
    } else {
      showMessage(messageDiv, response.message, 'error');
    }
  } catch (error) {
    showMessage(messageDiv, 'Failed to save: ' + error.message, 'error');
  }
}

async function runExtract() {
  const messageDiv = document.getElementById('extract-message');
  try {
    const response = await sendNativeMessage({ action: 'run_extract' });
    if (response.status === 'success') {
      showMessage(messageDiv, 'Extract started', 'success');
    } else {
      showMessage(messageDiv, response.message, 'error');
    }
  } catch (error) {
    showMessage(messageDiv, 'Failed to run extract: ' + error.message, 'error');
  }
}

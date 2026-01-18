# Object Manager - Browser Extension with Native Messaging

Microsoft Edge extension that manages objects and communicates with Python via Native Messaging.

---

## Extension Structure

```
Extract_Objects/
├── manifest.json                      # Extension configuration
├── background.js                      # Service worker (handles native messaging)
├── popup.html                         # Extension UI
├── popup.js                           # UI logic
├── python_files/
│   ├── com.objectmanager.host.json    # Native messaging host manifest
│   ├── object_manager_host.bat        # Batch file to launch Python
│   └── object_manager_host.py         # Python script
├── Modified_object_list.txt           # Data file
└── README.md                          # This file
```

---

## Setup Instructions

### Step 1: Register Native Messaging Host

Open PowerShell as Administrator and run:

```powershell
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.objectmanager.host" /ve /t REG_SZ /d "C:\Users\mohan.ganesh\OneDrive - MetricStream, Inc\Mohan-git\Browser-Extentions\Extract_Objects\python_files\com.objectmanager.host.json" /f
```

### Step 2: Load Extension in Edge

1. Open Microsoft Edge
2. Navigate to `edge://extensions/`
3. Enable **Developer mode** (toggle in bottom-left)
4. Click **Load unpacked**
5. Select the `Extract_Objects` folder
6. Note the **Extension ID** (e.g., `abcdefghijklmnopqrstuvwxyzabcdef`)

### Step 3: Update Extension ID in Host Manifest

1. Open `python_files/com.objectmanager.host.json`
2. Replace `EXTENSION_ID_PLACEHOLDER` with your actual Extension ID
3. Save the file

Example:
```json
"allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef/"
]
```

### Step 4: Reload Extension

1. Go back to `edge://extensions/`
2. Click the **Reload** button on the Object Manager extension

---

## Features

- **Add Objects**: Add new objects with type and name validation
- **Delete Objects**: Remove objects by name
- **View All**: Browse all stored objects with search functionality
- **Export**: Download objects as text file
- **Native Messaging**: Updates `Modified_object_list.txt` directly via Python

## Supported Object Types

- Infocenter
- Databrowserobject
- Infolet
- Report
- ListOfValues
- DataTable
- TABLE
- PACKAGE
- Form
- DataObject
- BusinessRules
- BAPI_REGISTRATION
- OtherFiles
- FormImportExportProfile

---

## Troubleshooting

**Extension not connecting to Python:**
- Verify registry entry is correct
- Check that Python is in your PATH
- Ensure Extension ID matches in `com.objectmanager.host.json`
- Check browser console for errors (F12)

**Registry entry not working:**
- Make sure you ran PowerShell as Administrator
- Verify the full path to `com.objectmanager.host.json` is correct
- Restart Edge after adding registry entry

**Python script errors:**
- Install pandas: `pip install pandas`
- Check `Modified_object_list.txt` file permissions
- View Python errors in Edge DevTools Console

---

## How It Works

1. User interacts with extension popup
2. `popup.js` sends message to `background.js`
3. `background.js` connects to native host via `com.objectmanager.host`
4. Windows launches `object_manager_host.bat`
5. Batch file runs `object_manager_host.py`
6. Python script processes request and updates `Modified_object_list.txt`
7. Response sent back through the chain to popup

---

## Requirements

- Microsoft Edge (or Chrome)
- Python 3.x
- pandas library (`pip install pandas`)
- Windows OS (for registry and .bat file)

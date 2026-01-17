# Browser Extension with Native Messaging (Python)

Complete guide for building a Microsoft Edge extension that communicates with Python scripts via Native Messaging.

---

## Table of Contents

1. [Extension Structure](#extension-structure)
2. [Building the Extension](#building-the-extension)
3. [PowerShell Commands](#powershell-commands)
4. [Registry Editor Setup](#registry-editor-setup)
5. [Rules and Requirements](#rules-and-requirements)
6. [Troubleshooting](#troubleshooting)

---

## Extension Structure

Your extension needs these core files:

```
Instance_Details_extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (handles native messaging)
├── popup.html                 # Extension UI
├── popup.js                   # UI logic
├── python_files/
│   ├── my_python_host.json    # Native messaging host manifest
│   ├── my_python_host.bat     # Batch file to launch Python
│   └── my_python_script.py    # Your Python script
└── README.md                  # This file
```

---

## Building the Extension

### Step 1: Create Extension Files

#### `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Current Instance Details",
  "version": "1.0",
  "description": "Reads current URL and sends to Python",
  "permissions": ["tabs", "nativeMessaging"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

**Key Requirements:**

- `"nativeMessaging"` permission is **mandatory**
- `manifest_version: 3` for modern Edge/Chrome

#### `background.js`

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let port = chrome.runtime.connectNative("com.my_python.host");
    port.postMessage({ url: request.url });

    port.onMessage.addListener((response) => {
        sendResponse(response);
    });

    port.onDisconnect.addListener(() => {
        console.log("Disconnected from Python", chrome.runtime.lastError);
    });

    return true; // Keep message channel open for async response
});
```

**Key Requirements:**

- Host name `"com.my_python.host"` must match the JSON manifest `name` field
- `return true` keeps the message channel open for async responses

---

### Step 2: Create Native Messaging Host Files

#### `python_files/my_python_host.json`

```json
{
    "name": "com.my_python.host",
    "description": "Edge extension to run Python",
    "path": "C:\\Users\\mohan.ganesh\\OneDrive - MetricStream, Inc\\Desktop\\Browers_Extentions\\Instance_Details_extension\\python_files\\my_python_host.bat",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://YOUR_EXTENSION_ID_HERE/"
    ]
}
```

**Critical Rules:**

1. **`name`**: Must match the string in `chrome.runtime.connectNative()`
2. **`path`**: Must be **absolute path** to the `.bat` file (use double backslashes `\\`)
3. **`type`**: Must be `"stdio"` for standard input/output communication
4. **`allowed_origins`**: Must include your extension ID with trailing slash `/`

#### `python_files/my_python_host.bat`

```batch
@echo off
python "%~dp0my_python_script.py"
```

**Rules:**

- `%~dp0` expands to the directory containing the batch file
- Ensures Python script runs from the correct directory

#### `python_files/my_python_script.py`

```python
import sys
import json
import struct

def send_message(message):
    """Send message to extension via stdout"""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def read_message():
    """Read message from extension via stdin"""
    text_length_bytes = sys.stdin.buffer.read(4)
    if len(text_length_bytes) == 0:
        sys.exit(0)
    text_length = struct.unpack('I', text_length_bytes)[0]
    text = sys.stdin.buffer.read(text_length).decode('utf-8')
    return json.loads(text)

# Main loop
while True:
    message = read_message()
    # Process message and send response
    response = {"status": "success", "data": "Processed"}
    send_message(response)
```

**Critical Rules:**

1. Messages must use **native messaging protocol**: 4-byte length prefix + JSON payload
2. Use `sys.stdout.buffer` and `sys.stdin.buffer` for binary I/O
3. Always flush output after writing

---

## PowerShell Commands

### 1. Get Extension ID

Load your unpacked extension in Edge first, then:

```powershell
# Navigate to edge://extensions
# Enable "Developer mode"
# Note the Extension ID (e.g., chpkgghcnloceignaliblhopmnbapaem)
```

### 2. Register Native Messaging Host

**Create Registry Key and Set Default Value:**

```powershell
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host" /ve /d "C:\Users\mohan.ganesh\OneDrive - MetricStream, Inc\Desktop\Browers_Extentions\Instance_Details_extension\python_files\my_python_host.json" /f
```

**Verify Registration:**

```powershell
reg query "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host"
```

**Expected Output:**

```
HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host
    (Default)    REG_SZ    C:\Users\mohan.ganesh\OneDrive - MetricStream, Inc\Desktop\Browers_Extentions\Instance_Details_extension\python_files\my_python_host.json
```

### 3. Unregister Host (if needed)

```powershell
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host" /f
```

---

## Registry Editor Setup

### Manual Registration via Registry Editor

1. **Open Registry Editor:**

   - Press `Win + R`
   - Type `regedit` and press Enter
2. **Navigate to:**

   ```
   HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts
   ```
3. **Create New Key:**

   - Right-click `NativeMessagingHosts` → New → Key
   - Name it: `com.my_python.host`
4. **Set Default Value:**

   - Select the `com.my_python.host` key
   - Double-click `(Default)` in the right pane
   - Set Value data to: `C:\Users\mohan.ganesh\OneDrive - MetricStream, Inc\Desktop\Browers_Extentions\Instance_Details_extension\python_files\my_python_host.json`
   - Click OK
5. **Verify:**

   - The `(Default)` entry should show type `REG_SZ` and your JSON path

---

## Rules and Requirements

### Extension ID Rules

1. **Get the ID FIRST** before creating `my_python_host.json`

   - Load unpacked extension in Edge
   - Copy the Extension ID from edge://extensions
   - Paste into `allowed_origins` with format: `chrome-extension://ID/`
2. **ID Changes:**

   - Unpacked extensions get a **new ID** each time you reload from a different folder
   - If ID changes, update `my_python_host.json` and re-register the host

### File Path Rules

1. **Use Absolute Paths:**

   - `my_python_host.json` → `path` field must be absolute (e.g., `C:\\Users\\...`)
   - Registry default value must be absolute path to JSON
2. **Escape Backslashes:**

   - In JSON: use double backslashes `\\` (e.g., `C:\\Users\\...`)
   - In PowerShell: use single backslashes `\` or escape with backtick `` `\``
3. **No Relative Paths:**

   - ❌ `"path": "python_files\\my_python_host.bat"`
   - ✅ `"path": "C:\\Users\\mohan.ganesh\\...\\python_files\\my_python_host.bat"`

### Native Messaging Protocol Rules

1. **Message Format:**

   - 4-byte unsigned integer (little-endian) = message length
   - Followed by UTF-8 encoded JSON string
2. **Python I/O:**

   - Use `sys.stdin.buffer` and `sys.stdout.buffer` (binary mode)
   - Always `flush()` after writing
3. **Extension I/O:**

   - Use `chrome.runtime.connectNative()` to establish connection
   - Use `port.postMessage()` to send JSON objects
   - Listen to `port.onMessage` for responses

### Registry Rules

1. **Key Path Must Match Host Name:**

   - Host name: `com.my_python.host`
   - Registry key: `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host`
2. **Default Value Must Point to JSON:**

   - ❌ Points to `.bat` or `.py` file
   - ✅ Points to `my_python_host.json`
3. **Scope:**

   - `HKCU` (Current User) - works for current user only
   - `HKLM` (Local Machine) - works for all users (requires admin)

---

## Troubleshooting

### Error: "Specified native messaging host not found"

**Cause 1: Registry not set or incorrect**

```powershell
# Check registry
reg query "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host"

# If empty or wrong path, fix it:
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.my_python.host" /ve /d "FULL_PATH_TO_JSON" /f
```

**Cause 2: Extension ID mismatch**

- Check extension ID in edge://extensions
- Update `allowed_origins` in `my_python_host.json`
- Reload extension

**Cause 3: JSON file doesn't exist or has wrong path**

- Verify JSON exists at the path specified in registry
- Verify `path` field in JSON points to `.bat` file

### Error: "Native host has exited"

**Cause 1: Python script crashed**

- Check Python syntax errors
- Add error logging to your script

**Cause 2: Batch file can't find Python**

```batch
@echo off
"C:\Python39\python.exe" "%~dp0my_python_script.py"
```

**Cause 3: Message protocol error**

- Ensure you're using `struct.pack('I', ...)` for length prefix
- Ensure you're using binary I/O (`sys.stdout.buffer`)

### Extension doesn't receive response

**Cause: Async response handling**

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // ... native messaging code ...
    return true; // REQUIRED for async sendResponse
});
```

---

## Quick Start Checklist

- [ ] Create all extension files (`manifest.json`, `background.js`, `popup.html`, `popup.js`)
- [ ] Create `python_files/my_python_host.bat` and `my_python_script.py`
- [ ] Load unpacked extension in Edge (edge://extensions → Developer mode → Load unpacked)
- [ ] Copy Extension ID from edge://extensions
- [ ] Create `python_files/my_python_host.json` with correct Extension ID in `allowed_origins`
- [ ] Register host via PowerShell: `reg add "HKCU\...\com.my_python.host" /ve /d "PATH_TO_JSON" /f`
- [ ] Verify registry: `reg query "HKCU\...\com.my_python.host"`
- [ ] Restart Edge browser
- [ ] Reload extension
- [ ] Test extension and check service worker console for errors

---

## Additional Resources

- [Chrome Native Messaging Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Edge Extensions Documentation](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)
- [Native Messaging Protocol Specification](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-protocol)

---

## Notes

- This extension uses **Manifest V3** (latest standard)
- Native messaging works identically in Chrome and Edge
- For production, consider packaging the extension and using a proper installer for registry setup
- Always test in a development environment before deploying

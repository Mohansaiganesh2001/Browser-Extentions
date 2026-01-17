const runBtn = document.getElementById("runBtn");
const currentUrlEl = document.getElementById("currentUrl");
const statusText = document.getElementById("statusText");
const dbInfoEl = document.getElementById("dbInfo");
const sshInfoEl = document.getElementById("sshInfo");
const responseRawEl = document.getElementById("responseRaw");
const copyBtn = document.getElementById("copyBtn");

function updateStatus(text) {
    statusText.textContent = `Status: ${text}`;
}

function updateResponse(instanceName, details, rawPayload) {
    const db = Array.isArray(details?.db) ? details.db.join(":") : "—";
    const ssh = Array.isArray(details?.ssh) ? details.ssh.join(":") : "—";

    dbInfoEl.textContent = `DB (${instanceName}): ${db}`;
    sshInfoEl.textContent = `SSH (${instanceName}): ${ssh}`;
    responseRawEl.textContent = JSON.stringify(rawPayload);
}

function showError(message, extra = {}) {
    dbInfoEl.textContent = "DB: —";
    sshInfoEl.textContent = "SSH: —";
    responseRawEl.textContent = `${message}\n${JSON.stringify(extra, null, 2)}`;
}

function getActiveTabUrl(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs?.[0]?.url || "";
        currentUrlEl.textContent = `Current URL: ${url || "Unavailable"}`;
        callback(url);
    });
}

runBtn.addEventListener("click", () => {
    updateStatus("Sending");
    runBtn.disabled = true;

    getActiveTabUrl((url) => {
        if (!url) {
            updateStatus("Idle");
            showError("No active tab URL available");
            runBtn.disabled = false;
            return;
        }

        chrome.runtime.sendMessage({ url }, (response) => {
            runBtn.disabled = false;

            if (chrome.runtime.lastError) {
                updateStatus("Error");
                showError("Extension runtime error", { error: chrome.runtime.lastError.message });
                return;
            }

            if (!response) {
                updateStatus("Error");
                showError("No response from Python");
                return;
            }

            if (response.error) {
                updateStatus("Error");
                showError(response.error, response);
                return;
            }

            const instanceData = response.instance || {};
            const [instanceKey, instanceDetails] = Object.entries(instanceData)[0] || ["Unknown", null];
            updateResponse(instanceKey, instanceDetails, response.payload);
            updateStatus("Done");
        });
    });
});

getActiveTabUrl(() => {});
updateStatus("Idle");

copyBtn.addEventListener("click", async () => {
    const text = responseRawEl.textContent?.trim();
    if (!text) {
        return;
    }

    const originalLabel = copyBtn.textContent;
    copyBtn.disabled = true;
    copyBtn.textContent = "Copying...";

    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
    } catch (error) {
        copyBtn.textContent = "Failed";
        console.error("Clipboard copy failed", error);
    } finally {
        setTimeout(() => {
            copyBtn.textContent = originalLabel;
            copyBtn.disabled = false;
        }, 1000);
    }
});

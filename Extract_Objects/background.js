chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background: Received request", request);
    
    try {
        let port = chrome.runtime.connectNative("com.objectmanager.host");
        
        port.onMessage.addListener((response) => {
            console.log("Background: Received response from Python", response);
            sendResponse(response);
        });

        port.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError;
            console.error("Background: Disconnected from Python", error);
            if (error) {
                sendResponse({
                    status: "error",
                    message: error.message || "Failed to connect to native host"
                });
            }
        });

        console.log("Background: Sending message to Python", request);
        port.postMessage(request);
    } catch (error) {
        console.error("Background: Error connecting to native host", error);
        sendResponse({
            status: "error",
            message: error.message || "Failed to connect to native host"
        });
    }

    return true;
});

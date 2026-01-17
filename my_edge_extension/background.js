chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    let port = chrome.runtime.connectNative("com.my_python.host");
    port.postMessage({ url: request.url });

    port.onMessage.addListener((response) => {
        sendResponse(response);
    });

    port.onDisconnect.addListener(() => {
        console.log("Disconnected from Python", chrome.runtime.lastError);
    });

    return true;
});

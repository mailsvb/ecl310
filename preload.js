const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        const validChannels = ["action", "settings"];
        validChannels.includes(channel) && ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        const validChannels = ["data", "settings"];
        validChannels.includes(channel) && ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
})

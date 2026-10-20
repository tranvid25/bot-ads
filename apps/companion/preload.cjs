const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("botads", {
  command: (command, payload) =>
    ipcRenderer.invoke("command", command, payload),
  onState: (callback) => {
    ipcRenderer.on("state", (_event, state) => callback(state));
  },
});

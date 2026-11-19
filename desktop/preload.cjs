// 화면(Next.js)에 데스크톱 기능만 좁게 열어 준다
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mci", {
  getStatus: () => ipcRenderer.invoke("mci:getStatus"),
  setSettings: (s) => ipcRenderer.invoke("mci:setSettings", s),
  updateNow: () => ipcRenderer.invoke("mci:updateNow"),
  onStatus: (cb) => {
    const h = (_e, s) => cb(s);
    ipcRenderer.on("mci:status", h);
    return () => ipcRenderer.removeListener("mci:status", h);
  },
});

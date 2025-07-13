const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

const res = {
  f: {
    w: 808,
    h: 460
  },
  s: {
    w: 1280,
    h: 720
  }
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: res.s.w,
    height: res.s.h,
    webPreferences: {
    nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('./root/index.html')
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
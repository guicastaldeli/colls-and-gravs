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

let currentResoltion = 'f';
let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: res[currentResoltion].w,
    height: res[currentResoltion].h,
    webPreferences: {
    nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('./root/index.html')
  win.setMenuBarVisibility(false);

  win.webContents.on('before-input-event', (event, input) => {
    if(input.key === 'f' && input.type === 'keyDown') {
      toggleResolution();
    }
  });
}

function toggleResolution() {
  currentResoltion = currentResoltion === 's' ? 'f' : 's';
  win.setSize(res[currentResoltion].w, res[currentResoltion].h);
  win.center();
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
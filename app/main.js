const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let splashWindow;
let llamaProcess = null;
const LLAMA_PORT = 8080;

// Función para encontrar el modelo GGUF
function findModelPath() {
  const modelsDir = path.join(__dirname, '..', 'models');
  
  if (!fs.existsSync(modelsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(modelsDir);
  const ggufFile = files.find(f => f.endsWith('.gguf'));
  
  return ggufFile ? path.join(modelsDir, ggufFile) : null;
}

// Función para encontrar llama-server ejecutable
function findLlamaServer() {
  const engineDir = path.join(__dirname, '..', 'engine');
  const serverPath = path.join(engineDir, 'llama-server.exe');
  
  return fs.existsSync(serverPath) ? serverPath : null;
}

// Verificar si el servidor está listo
function checkServerReady(callback, attempts = 0) {
  const maxAttempts = 30;
  
  if (attempts >= maxAttempts) {
    callback(false);
    return;
  }
  
  const req = http.get(`http://127.0.0.1:${LLAMA_PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      setTimeout(() => checkServerReady(callback, attempts + 1), 1000);
    }
  });
  
  req.on('error', () => {
    setTimeout(() => checkServerReady(callback, attempts + 1), 1000);
  });
  
  req.end();
}

// Iniciar llama.cpp server
function startLlamaServer() {
  const modelPath = findModelPath();
  const serverPath = findLlamaServer();
  
  if (!modelPath) {
    return { success: false, error: 'No se encontró ningún modelo .gguf en la carpeta models/' };
  }
  
  if (!serverPath) {
    return { success: false, error: 'No se encontró llama-server.exe en la carpeta engine/' };
  }
  
  try {
    llamaProcess = spawn(serverPath, [
      '-m', modelPath,
      '--port', LLAMA_PORT.toString(),
      '--ctx-size', '2048',
      '--n-gpu-layers', '0',
      '--threads', '4'
    ]);
    
    llamaProcess.stdout.on('data', (data) => {
      console.log(`[LlamaServer]: ${data}`);
    });
    
    llamaProcess.stderr.on('data', (data) => {
      console.error(`[LlamaServer Error]: ${data}`);
    });
    
    llamaProcess.on('close', (code) => {
      console.log(`[LlamaServer]: Proceso terminado con código ${code}`);
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Crear ventana de splash
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, './assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));
}

// Crear ventana principal
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, './assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      mainWindow.show();
    }, 2000);
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicialización de la app
app.whenReady().then(() => {
  createSplashWindow();
  
  // Iniciar servidor llama.cpp
  const result = startLlamaServer();
  
  if (!result.success) {
    console.error('Error al iniciar servidor:', result.error);
  } else {
    console.log('Servidor llama.cpp iniciando...');
    
    // Esperar a que el servidor esté listo
    checkServerReady((isReady) => {
      if (isReady) {
        console.log('Servidor llama.cpp listo!');
      } else {
        console.log('Servidor tardó demasiado en iniciar');
      }
      createMainWindow();
    });
  }
  
  // Si no hay ventanas, crear una (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Cerrar la app cuando todas las ventanas se cierran (excepto macOS)
app.on('window-all-closed', () => {
  if (llamaProcess) {
    llamaProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Limpiar al cerrar
app.on('before-quit', () => {
  if (llamaProcess) {
    llamaProcess.kill();
  }
});

// IPC Handlers
ipcMain.handle('check-server-status', async () => {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${LLAMA_PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
});
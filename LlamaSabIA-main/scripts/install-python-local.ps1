# Instalar Python 3.9 localmente en la carpeta runtime/python39 del proyecto
# Este script descarga el instalador público de Python para Windows (x64), lo ejecuta en modo silencioso
# y luego instala jupyter/notebook dentro de esa instalación. Diseñado para uso offline/local.

param(
    [string]$PythonVersion = '3.9.13'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path (Join-Path $root '..')
$targetDir = Join-Path $projectRoot 'runtime\python39'

Write-Host "Proyecto: $projectRoot"
Write-Host "Instalando Python portable en: $targetDir"

# Función para descargar y mostrar progreso
function Download-File {
    param (
        [string]$Url,
        [string]$OutFile
    )
    
    $client = New-Object System.Net.WebClient
    $client.DownloadFile($Url, $OutFile)
}

if (Test-Path $targetDir) {
    Write-Host "La carpeta $targetDir ya existe. Si quieres reinstalar, elimina la carpeta primero." -ForegroundColor Yellow
    exit 1
}

# Descargar Python embebible
$embeddableUrl = "https://www.python.org/ftp/python/3.9.13/python-3.9.13-embed-amd64.zip"
$zipPath = Join-Path $env:TEMP "python-embedded.zip"

Write-Host "Descargando Python embebible desde: $embeddableUrl"
try {
    Download-File -Url $embeddableUrl -OutFile $zipPath
} catch {
    Write-Error "Error descargando Python embebible: $_"
    exit 1
}

# Crear directorio y extraer Python
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Write-Host "Extrayendo Python en: $targetDir"
Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force

# Descargar get-pip.py
$getPipUrl = "https://bootstrap.pypa.io/get-pip.py"
$getPipPath = Join-Path $targetDir "get-pip.py"

Write-Host "Descargando get-pip.py..."
try {
    Download-File -Url $getPipUrl -OutFile $getPipPath
} catch {
    Write-Error "Error descargando get-pip.py: $_"
    exit 1
}

# Habilitar pip modificando python39._pth
$pthFile = Get-ChildItem -Path $targetDir -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    $content = Get-Content $pthFile.FullName
    $content = $content -replace '#import site', 'import site'
    Set-Content -Path $pthFile.FullName -Value $content
}

# Instalar pip
$pythonExe = Join-Path $targetDir 'python.exe'
Write-Host "Instalando pip..."
& $pythonExe $getPipPath

# Limpiar archivos temporales
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item $getPipPath -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $pythonExe)) {
    Write-Error "No se encontró python.exe en $targetDir. La extracción falló."
    exit 1
}

Write-Host "Python portable instalado. Instalando notebook y dependencias..."

# Asegurar pip e instalar notebook/jupyterlab
& $pythonExe -m ensurepip --upgrade
& $pythonExe -m pip install --upgrade pip
Write-Host "Instalando librerías científicas y de IA..."
& $pythonExe -m pip install notebook jupyterlab numpy random matplotlib scikit-learn tensorflow


# Registrar kernel embebido en Jupyter
Write-Host "Registrando kernel embebido en Jupyter..."
& $pythonExe -m pip install --upgrade pip wheel ipykernel jupyter_client

# Intentar registrar el kernel de varias formas para asegurar que funcione
Write-Host "Registrando kernel de forma global..."
Start-Process -FilePath $pythonExe -ArgumentList "-m","ipykernel","install","--name","python39-local","--display-name","Python 3.9 (local)" -Wait -NoNewWindow

# También registrar en la carpeta del proyecto
$projectKernelDir = Join-Path $projectRoot "runtime\jupyter\kernels\python39-local"
Write-Host "Registrando kernel en el proyecto: $projectKernelDir"

# Crear directorio para el kernel
New-Item -ItemType Directory -Force -Path $projectKernelDir | Out-Null

# Crear kernel.json con la ruta absoluta al python embebido
$kernelJson = @{
    argv = @(
        $pythonExe,
        "-m",
        "ipykernel_launcher",
        "-f",
        "{connection_file}"
    )
    display_name = "Python 3.9 (local)"
    language = "python"
    interrupt_mode = "signal"
    metadata = @{
        debugger = $true
    }
} | ConvertTo-Json

Set-Content -Path (Join-Path $projectKernelDir "kernel.json") -Value $kernelJson -Encoding UTF8

# Crear variable de entorno JUPYTER_PATH que apunte a nuestra carpeta de kernels
$env:JUPYTER_PATH = Join-Path $projectRoot "runtime\jupyter"
[System.Environment]::SetEnvironmentVariable("JUPYTER_PATH", $env:JUPYTER_PATH, [System.EnvironmentVariableTarget]::User)

Write-Host "Kernel registrado en: $projectKernelDir" -ForegroundColor Green
Write-Host "Variable JUPYTER_PATH establecida a: $env:JUPYTER_PATH" -ForegroundColor Green

Write-Host "Instalación completada. Para usar este Python embebido con la app, puedes ejecutar:" -ForegroundColor Green
Write-Host "  $env:PYTHON = '$($pythonExe)' ; npm start"
Write-Host "O simplemente establecer la variable de entorno PYTHON antes de iniciar la app."

Write-Host "Al abrir Jupyter Notebook, selecciona el kernel 'Python 3.9 (local)' para usar las librerías offline." -ForegroundColor Green

Write-Host "Nota: el instalador oficial puede cambiar opciones. Si falla la instalación silenciosa, descarga manualmente el instalador desde https://www.python.org/ y ejecuta con la opción TargetDir para instalar localmente." -ForegroundColor Yellow

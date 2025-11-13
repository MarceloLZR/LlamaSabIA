# Inicio rápido

Pasos para preparar y ejecutar LlamaSabIA en Windows (incluye opción para instalar Python localmente):

1. Instalar dependencias Node:

```powershell
cd 'C:\Users\Juana\Downloads\LlamaSabIA-main'
npm install
```

2. (Opcional) Si quieres que la app pueda ejecutar Jupyter Notebooks localmente y no tienes Python instalado,
   puedes ejecutar el script que incluye este proyecto para instalar una copia local de Python 3.9 en
   `runtime\python39` y añadir Jupyter Notebook/ JupyterLab en esa instalación:

```powershell
# Ejecutar desde la carpeta raíz del proyecto
powershell -ExecutionPolicy Bypass -File .\scripts\install-python-local.ps1
```

3. Descargar un modelo .gguf (si quieres usar la IA local):

```powershell
npm run download:model phi3-mini
```

4. Ejecutar la app:

```powershell
npm start
```

Notas:
- La app busca automáticamente una instalación embebida de Python en `runtime\python39\python.exe`.
  Si existe, la usará para arrancar Jupyter Notebook y seleccionará el kernel "python39-local" por defecto.
- El script de instalación (`scripts/install-python-local.ps1`) instala todas las librerías necesarias (numpy, matplotlib, scikit-learn, tensorflow, keras, ipykernel) y registra el kernel local.
- Si ves errores de importación en los notebooks, verifica que el kernel seleccionado sea "Python 3.9 (local)". Si no aparece, ejecuta nuevamente el script de instalación y reinicia la app.
- Si prefieres no instalar Python, puedes usar JupyterLite (build estático) y copiar la distribución a
  `app/renderer/assets/jupyterlite/mi_notebook/` para poder ejecutar notebooks en el navegador/Electron sin Python.

Solución de problemas:
- Si Jupyter Notebook no muestra el kernel "Python 3.9 (local)", asegúrate de haber ejecutado el script de instalación y que la carpeta `runtime\python39` existe.
- Si alguna librería falta, ejecuta nuevamente el script de instalación.
- Si el notebook sigue mostrando errores de importación, selecciona manualmente el kernel "Python 3.9 (local)" desde el menú de Jupyter Notebook.

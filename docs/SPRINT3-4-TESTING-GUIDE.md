# SloerSpace — Sprint 3 & 4 Testing Guide
> Guía de pruebas detallada con pasos exactos

---

## Cómo abrir SloerSpace para pruebas

Una vez instalado el `.exe`:
```
src-tauri/target/release/bundle/nsis/SloerSpace Dev_1.0.0_x64-setup.exe
```
Instala y abre la app. Verás la pantalla Home con todos los feature cards.

Para desarrollo rápido (sin compilar Rust):
```bash
npm run tauri:dev
```

---

## SPRINT 3 — SSH Manager & Notebooks

---

### 1. SSH Manager — Agregar y gestionar conexiones

**Cómo llegar:**
- Atajo: `Ctrl+Shift+S`
- O: clic en el ícono de hamburguesa (navegación) → **SSH Manager**
- O: `Ctrl+K` → escribe "ssh" → **Open SSH Manager**
- O: desde la pantalla Home → card **SSH Remote**

**Pasos de prueba:**

```
1. Abre SSH Manager (Ctrl+Shift+S)
2. Verifica que aparece el panel "Open SSH session in"
   → El dropdown debe mostrar "✦ New Terminal Tab"
   → Si tienes terminales abiertas, aparecen listadas aquí

3. Clic en "Add Connection"
   → Rellena:
      Name:     Mi Servidor
      Host:     192.168.1.100   (o cualquier IP tuya)
      Port:     22
      Username: root
      Auth:     Key (por defecto)
   → Clic "Save Connection"

4. La conexión aparece en la lista con:
   → Ícono de Server azul
   → username@host:port debajo del nombre

5. Prueba el botón "Test" (🛡 escudo):
   → Si el host es alcanzable: aparece ✓ verde
   → Si no: aparece ⚠ naranja (normal en dev sin servidor real)

6. Prueba "Connect" (▶ play):
   → Con "✦ New Terminal Tab" seleccionado:
      - SloerSpace crea un nuevo workspace Terminal
      - El terminal se abre y ejecuta el comando ssh automáticamente
   → Con un terminal existente seleccionado:
      - Navega a ese terminal y ejecuta el comando ssh

7. Reconecta: el panel "Recent" aparece encima con:
   → Nombre del servidor, user@host, y tiempo relativo ("just now")
   → Al reconectar después de unos minutos: "3m ago", etc.

8. Para eliminar: hover sobre la conexión → ícono 🗑 trash → elimina
```

---

### 2. Notebook — Crear y ejecutar celdas

**Cómo llegar:**
- Atajo: `Ctrl+Shift+N`
- O: navegación → **Notebook**
- O: `Ctrl+K` → escribe "notebook"
- O: desde Home → card **Notebook**

**Pasos de prueba:**

```
1. Abre Notebook (Ctrl+Shift+N)
   → Verás 2 celdas por defecto:
      - Celda Markdown: "# My Notebook"
      - Celda Shell: echo "Hello from SloerSpace Notebook"

2. Prueba ejecutar celda Shell:
   → Hover sobre la celda Shell → aparecen botones en la esquina superior derecha
   → Clic ▶ (play) OR presiona Ctrl+Enter dentro de la celda
   → Debajo de la celda aparece el output: Hello from SloerSpace Notebook
   → Badge "exit 0" en verde

3. Agrega una celda Shell nueva:
   → Clic "+ Code Cell" al fondo
   → Escribe: ls -la    (o dir en Windows)
   → Ejecuta con Ctrl+Enter
   → Verás el listado de archivos

4. Agrega una celda Markdown:
   → Clic "+ Markdown Cell"
   → Escribe: ## Mi sección\n\nEsta es una **nota** importante.
   → La celda muestra el texto con formato de borde azul

5. Reordena celdas:
   → Hover sobre cualquier celda → botones ↑ ↓
   → Arrastra el orden con los botones

6. Guarda a disco:
   → Clic ícono 💾 (Save) en el header
   → Aparece el path-bar: "Save to"
   → Escribe la ruta: C:\Users\TU_USUARIO\Desktop\mi-notebook.md
   → Clic "Save"
   → El ícono cambia a ✓ verde por 2 segundos
   → El status bar abajo muestra la ruta del archivo

7. Abre desde disco:
   → Clic ícono 📂 (FolderOpen) en el header
   → Aparece path-bar: "Open file"
   → Escribe la ruta del archivo guardado antes
   → Clic "Open"
   → Las celdas se cargan desde el archivo

8. Indicador de cambios sin guardar:
   → Edita cualquier celda
   → El título muestra "● " (punto negro) indicando cambios sin guardar
   → El status bar muestra "● unsaved"
   → Guarda → el punto desaparece

9. Exportar como Markdown:
   → Clic ícono ⬇ (Download)
   → Descarga un archivo .md con todo el contenido y outputs

10. "Run All":
    → Clic "Run All" en el header
    → Todas las celdas Shell se ejecutan en secuencia
    → Verás los badges "exit 0" o "exit 1" en cada una
```

---

## SPRINT 4 — Env Var Manager, Preview Panel, Session Sharing

---

### 3. Env Var Manager — Variables de entorno

**Cómo llegar:**
- Atajo: `Ctrl+Shift+E`
- O: navegación → **Env Vars**
- O: `Ctrl+K` → escribe "env"

**Pasos de prueba:**

```
1. Abre Env Var Manager (Ctrl+Shift+E)
   → Header muestra "0 vars" inicialmente

2. Agrega una variable normal:
   → Clic "+ Add Var"
   → KEY:     DATABASE_URL
   → VALUE:   postgresql://localhost:5432/mydb
   → Comment: Base de datos principal
   → Secret:  NO (desmarcado)
   → Clic "Add"
   → Aparece en la lista con ícono azul

3. Agrega una variable secreta:
   → Clic "+ Add Var"
   → KEY:     OPENAI_API_KEY
   → VALUE:   sk-proj-abc123xyz...
   → Comment: OpenAI API key
   → Secret:  ✓ MARCADO
   → Clic "Add"
   → Aparece con ícono rosa/rojo
   → El valor se muestra como password (•••••••)

4. Revela el secreto:
   → Hover sobre la var secreta
   → Aparece ícono 👁 (Eye) → clic para revelar el valor
   → Clic 👁‍🗨 (EyeOff) para volver a ocultar

5. Copia el valor:
   → Hover → ícono 📋 (Copy)
   → El ícono cambia a ✓ por 1.5 segundos
   → El valor está en el portapapeles

6. Edita un valor inline:
   → Clic sobre el valor de DATABASE_URL
   → Aparece borde azul de edición
   → Cambia el valor directamente
   → Clic fuera para confirmar

7. Filtra por workspace (si tienes terminales):
   → Aparece barra "Scope" con "Global" + nombre de cada terminal
   → Clic en un terminal: solo muestra las vars de ese workspace
   → Clic "Global": muestra todas

8. Importa desde archivo .env:
   → Crea un archivo .env en el escritorio con:
      # Configuración del servidor
      PORT=8080
      NODE_ENV=development
      SECRET_TOKEN=mi-token-super-secreto
   → Clic 📂 (FolderOpen) en el header
   → Escribe la ruta: C:\Users\TU_USUARIO\Desktop\.env
   → Clic "Import"
   → Las variables aparecen en la lista (SECRET_TOKEN detectado como secret automáticamente)

9. Exporta a archivo .env:
   → Clic 💾 (Save) en el header
   → Escribe ruta: C:\Users\TU_USUARIO\Desktop\output.env
   → Clic "Export"
   → Abre el archivo: verás KEY=VALUE con comentarios preservados

10. Elimina una variable:
    → Hover → ícono 🗑 → elimina inmediatamente
```

---

### 4. Preview Panel — Live localhost preview

**Cómo llegar:**
- Atajo: `Ctrl+Shift+P`
- O: navegación → **Preview**
- O: `Ctrl+K` → escribe "preview"

**Pasos de prueba:**

```
1. Primero, levanta un servidor de prueba en una Terminal:
   → Ctrl+T → abre terminal
   → Ejecuta: npx serve . -p 3000
   → O si tienes un proyecto: npm run dev

2. Abre Preview Panel (Ctrl+Shift+P)
   → Verás la toolbar con selector de puerto y barra de dirección
   → El iframe carga http://localhost:3000 automáticamente

3. Cambia el puerto desde el selector:
   → Dropdown de puertos: :3000, :3001, :4000, :5000, :5173, :8000, :8080...
   → Selecciona el puerto donde corre tu servidor
   → El preview recarga automáticamente

4. Puerto personalizado:
   → En el campo pequeño de la derecha del dropdown
   → Escribe: 9000 (o cualquier puerto)
   → Presiona Enter → navega a http://localhost:9000

5. Barra de direcciones:
   → Clic en el campo de URL
   → Cambia a: http://localhost:3000/mi-ruta
   → Presiona Enter → el iframe navega a esa URL

6. Refresh:
   → Clic ícono 🔄 (RefreshCw)
   → El preview recarga la página actual

7. Abrir en browser externo:
   → Clic ícono 🔗 (ExternalLink)
   → Se abre tu browser del sistema con la misma URL

8. Fullscreen:
   → Clic ícono ⤢ (Maximize2)
   → El panel ocupa toda la pantalla de SloerSpace
   → Clic ⤡ (Minimize2) para volver al tamaño normal

9. Estado de error (servidor caído):
   → Si el servidor no está corriendo, verás:
      - Ícono de alerta
      - "Cannot connect to http://localhost:3000"
      - Sugerencia: npm run dev o npx serve .
      - Botón "Retry" para reintentar

10. Indicador de estado (status bar):
    → Punto verde: preview cargado OK
    → Punto rojo: error de conexión
    → URL actual del iframe
```

---

### 5. Session Sharing — Exportar e importar workspaces

**Cómo llegar:**
- Atajo: `Ctrl+Shift+X`
- O: navegación → **Sessions**
- O: `Ctrl+K` → escribe "session"

**Pasos de prueba:**

```
PREPARACIÓN: Abre 2-3 terminales primero (Ctrl+T × 3)

1. Abre Session Sharing (Ctrl+Shift+X)
   → Header muestra cuántos workspaces hay abiertos

--- TAB: EXPORT ---

2. Verifica la lista de workspaces en "Included in export":
   → Cada workspace muestra:
      - Color + ícono (Terminal/Canvas)
      - Nombre del workspace
      - Número de panes
      - Directorio de trabajo
      - Últimos comandos ejecutados (hasta 20)

3. Descarga el JSON:
   → Clic "Download JSON"
   → Se descarga: sloerspace-session-2026-03-28.json
   → Ábrelo con cualquier editor de texto y verás:
      {
        "version": 1,
        "exportedAt": "2026-03-28T22:00:00.000Z",
        "appVersion": "1.0.0",
        "workspaces": [...]
      }

4. Copia al portapapeles:
   → Clic "Copy JSON"
   → El botón cambia a "✓ Copied!" por 1.8 segundos
   → Pega en cualquier editor para ver el JSON completo

5. Vista previa del JSON:
   → Sección "JSON Preview" muestra los primeros 1200 chars
   → Con timestamp de la exportación

--- TAB: IMPORT ---

6. Cambia al tab "import" (botón arriba a la derecha)

7. Importa desde un JSON exportado:
   → En el textarea, pega el JSON que copiaste antes
   → (O pega desde el archivo descargado)
   → Clic "Restore Workspaces"
   → Cada workspace del JSON se crea como nuevo tab de terminal
   → Aparece "✓ Workspaces restored successfully!"

8. Importa JSON inválido (prueba de error):
   → Escribe: {"version": 2, "workspaces": "wrong"}
   → Clic "Restore Workspaces"
   → Aparece: "Unrecognised format. Make sure this is a SloerSpace session export."

9. Limpia el textarea:
   → Clic "Clear"
   → El textarea se vacía y el error desaparece
```

---

## Atajos globales — Resumen completo

| Atajo           | Función                        |
|-----------------|-------------------------------|
| `Ctrl+K`        | Command Palette               |
| `Ctrl+J`        | AI Chat Panel                 |
| `Ctrl+E`        | Code Editor                   |
| `Ctrl+Shift+N`  | Notebook                      |
| `Ctrl+Shift+S`  | SSH Manager                   |
| `Ctrl+Shift+E`  | Env Var Manager               |
| `Ctrl+Shift+P`  | Preview Panel                 |
| `Ctrl+Shift+X`  | Session Sharing               |
| `Ctrl+T`        | Nueva terminal (workspace)    |
| `Ctrl+N`        | Nuevo pane en terminal activa |

---

## Verificación rápida — Checklist

```
[ ] SSH Manager abre con Ctrl+Shift+S
[ ] Puedo agregar y guardar una conexión SSH
[ ] El dropdown de workspace selector funciona
[ ] El panel "Recent" aparece después de conectar
[ ] Notebook abre con Ctrl+Shift+N
[ ] Puedo ejecutar una celda shell (Ctrl+Enter)
[ ] El output aparece debajo de la celda con exit code
[ ] Puedo guardar el notebook a disco y reabrirlo
[ ] El indicador ● desaparece al guardar
[ ] Env Var Manager abre con Ctrl+Shift+E
[ ] Puedo agregar una var secreta y el valor se enmascara
[ ] El botón reveal funciona (👁)
[ ] Puedo importar un .env y las vars aparecen
[ ] Puedo exportar a un .env y el archivo contiene el formato correcto
[ ] Preview Panel abre con Ctrl+Shift+P
[ ] El iframe carga localhost correctamente
[ ] El selector de puerto cambia la URL
[ ] El fullscreen funciona
[ ] Session Sharing abre con Ctrl+Shift+X
[ ] Export descarga un archivo JSON válido
[ ] Import con JSON válido crea los workspaces
[ ] Import con JSON inválido muestra error claro
[ ] Todos aparecen en Command Palette (Ctrl+K)
[ ] Todos aparecen en NavigationMenu
```

# Comparador de Precios: Falabella & MercadoLibre

> Extensión de Chrome profesional para el rastreo y comparación automática de precios en tiempo real entre Falabella y MercadoLibre Peru. Optimizada para la mejor experiencia de ahorro del usuario.

![Extensión](https://img.shields.io/badge/Chrome-Extension-blue?style=flat-square&logo=google-chrome)
![Bun](https://img.shields.io/badge/Bun-Compatible-black?style=flat-square&logo=bun)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## ¿Qué es esto?

Este proyecto es una herramienta avanzada de comparación que permite a los usuarios ahorrar tiempo y dinero mediante:

- **Scraping Multi-sitio** – Extracción simultánea de datos en Falabella y MercadoLibre sin bloqueos.
- **Agrupamiento Inteligente** – Motor `ProductMatcher` que identifica productos idénticos mediante tokens.
- **Top 3 de Ofertas** – Acceso directo a los precios más bajos encontrados en toda la búsqueda.
- **Interfaz de Usuario Premium** – Diseño moderno, responsivo y visualmente atractivo.
- **Modos de Búsqueda** – Flexibilidad total con modos Rápido, Normal y Completo.

---

## Instalación y Configuración

Este proyecto utiliza [Bun](https://bun.sh/) para una máxima velocidad de desarrollo y construcción.

### 1. Clonar y Preparar

```bash
# Clonar el proyecto
git clone https://github.com/IvyedSG/reto-uno
cd reto-uno

# Instalar dependencias
bun install
```

### 2. Construcción de la Extensión

Ejecuta el comando de build para generar la carpeta `dist/` lista para ser cargada en Chrome:

```bash
bun run build
```

### 3. Cargar en Chrome

1. Abre tu navegador y ve a `chrome://extensions/`.
2. Activa el **Modo de desarrollador** (esquina superior derecha).
3. Haz clic en **Cargar extensión sin empaquetar**.
4. Selecciona la carpeta `dist` en la raíz de este proyecto.

---

## Criterio de Similitud

La extensión utiliza un motor de coincidencia inteligente (`ProductMatcher`) para agrupar productos similares. El criterio se basa en:

1. **Normalización de Texto**: Eliminamos acentos, caracteres especiales y convertimos todo a minúsculas.
2. **Tokenización Inteligente**: Comparamos las palabras clave significativas de los títulos.
3. **Puntaje de Similitud**:
   - Se ignoran palabras comunes (conectores, artículos).
   - Se requiere un umbral mínimo de coincidencia de tokens entre dos productos para considerarlos "Similares".
   - El algoritmo prioriza coincidencias de **Marca** y **Modelo** detectadas orgánicamente en el título.
4. **Agrupamiento**: Los productos que superan el umbral se consolidan en grupos, permitiendo calcular el ahorro directo por el "mismo objeto".

## Star History

Si encuentras este repositorio útil, ¡dale una estrella! ⭐

---

## Licencia

MIT - Consulta el archivo [LICENSE](LICENSE) para más detalles.

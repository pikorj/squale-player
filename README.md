# SQUALE · Retro Analog Vinyl Hi-Fi Player

SQUALE es un reproductor de música web y PWA con estética retro Hi-Fi analógica inspirado en hardware físico y tocadiscos de vinilo clásicos.

![SQUALE Preview](public/icons/icon-512.png)

## Características

- 🎵 **Tocadiscos analógico interactivo**: Brazo fonocaptor dinámico con seguimiento de surco, plato giratorio a 33⅓ y 45 RPM, picture discs con carátula del álbum, y caída física 3D.
- 📱 **PWA Completa & Modo Offline**: Instalable en escritorio, Android e iOS con Service Worker, caché inteligente y soporte de reproducción sin conexión.
- 📂 **Importación de archivos locales**: Soporte para archivos `.mp3`, `.wav`, `.ogg`, `.flac` con extracción automática de metadatos ID3 y carátulas integradas.
- 💽 **Biblioteca dinámica de álbumes**: Detección y agrupación automática de álbumes basados en las canciones de la colección.
- 🎚️ **Ecualizador y visualizadores rítmicos**: Barras procedurales de ecualizador en vivo, notas musicales flotantes y controles táctiles con micro-rebotes analógicos.
- 🔍 **Búsqueda & Filtrado por etiquetas**: Búsqueda instantánea en tiempo real y categorización rápida de pistas.
- 🎨 **Estética Hi-Fi Monocromática**: Diseño industrial retro, tipografía Silkscreen & IBM Plex Mono, y panel de control táctil.

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build
npm run preview
```

## Despliegue en Vercel

Este proyecto está preconfigurado para desplegarse directamente en [Vercel](https://vercel.com):

1. Conecta tu repositorio de GitHub a Vercel.
2. Vercel detectará la configuración automáticamente (`vercel.json`):
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. ¡Listo! Tu reproductor SQUALE estará en línea con HTTPS y CDN global.

---

Desarrollado con React 19, TypeScript y Tailwind CSS v4.

# Web Esencial — Sistema de Plantillas y Editor Visual

Plataforma modular y reutilizable para crear, previsualizar y desplegar sitios web estáticos de alta conversión para pequeños negocios, consultorías y artistas musicales en Perú y el mundo.

Desarrollado con **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **Zod** y **Vitest**.

---

## 1. Arquitectura y Aislamiento de Seguridad

El sistema mantiene una separación física total entre la web pública y el generador local:

```text
├── clients/                  # Fuente de verdad: configuraciones JSON de cada cliente
│   ├── demo-artist.json        # Cantautor / Pianista / Show en vivo (Variante artist)
│   ├── demo-professional.json  # Estudio contable / Servicios profesionales
│   ├── demo-commerce.json      # Ferretería / Venta rápida por WhatsApp
│   ├── demo-beauty.json        # Spa / Belleza y reserva de citas
│   └── consultoria-proyectos.json # Consultora de tecnología y desarrollo
├── tools/
│   └── generator/            # Herramienta local aislada (localhost:3001)
│       ├── index.html        # Formulario interactivo completo con tabs, ordenamiento y preview
│       └── server.mjs        # Servidor Node con validación Zod y bloqueo de sobreescritura
├── src/
│   ├── app/                  # ÚNICAMENTE la landing page pública del cliente (Next.js)
│   │   ├── layout.tsx        # Inyección de variables CSS y metadatos SEO
│   │   └── page.tsx          # Renderizador de la variante según CLIENT_ID
│   ├── components/
│   │   ├── shared/           # Navbar, Footer, WhatsAppButton, ContactSection
│   │   └── variants/         # Diseños diferenciados: Artist, Professional, Commerce, Beauty
│   ├── config/
│   │   └── client-loader.ts  # Carga estática y validación estricta en build time
│   ├── schemas/
│   │   └── client.schema.ts  # Contrato tipado con Zod
│   └── utils/
│       ├── whatsapp.ts       # Generador de enlaces https://wa.me/ con mensajes personalizados
│       └── media.ts          # Normalizador seguro de URLs de YouTube y Vimeo para iframes
└── tests/                    # 13 pruebas unitarias y de seguridad (Vitest)
```

---

## 2. Variantes Visuales Incluidas

Las 4 variantes cuentan con composiciones, jerarquías y experiencias de usuario radicalmente distintas:

| Variante | Rubros objetivo | Composición y enfoque |
| :--- | :--- | :--- |
| **`artist`** *(Nueva)* | Cantantes, pianistas, cantautores, bandas, solistas | Atmósfera escénica inmersiva (`zinc-950` y acento ámbar/dorado), portada con foto de concierto, reproductores responsivos de video (YouTube/Vimeo) y enlaces a Spotify, calendario de presentaciones en vivo, paquetes de contratación para bodas/eventos y contacto de management. |
| **`professional`** | Consultorías, estudios contables, bufetes, clínicas | Layout corporativo asimétrico, panel dinámico con pilares del cliente o imagen de portada, catálogo de servicios estructurados y diferenciales de confianza. |
| **`commerce`** | Tiendas locales, ferreterías, talleres, repuestos | Layout centrado de alto impacto comercial, vitrina de productos con botón directo "Pedir por WhatsApp", facilidades de pago y barra fija de conversión en móviles. |
| **`beauty`** | Spas, salones de belleza, estética, cuidado facial | Atmósfera editorial y sensorial, carta de tratamientos estilo menú con tiempos de duración y precios, y botones de reserva de citas. |

---

## 3. Editor Visual Totalmente Editable (Fase 2 y 7)

A diferencia de versiones preliminares, **no existen textos fijos obligatorios** en los componentes:
- **Horarios de atención:** Ahora son 100% editables en el editor (agregar, editar el texto, reordenar con ▲/▼, eliminar o dejar vacíos para ocultar la sección).
- **Pilares y logros (`highlights`):** Ahora se administran dinámicamente desde el editor sin inyectar textos de contadores ni de otros rubros.
- **Títulos y subtítulos de sección:** Personalizables para servicios, ventajas, contacto, videos y eventos.
- **Control de visibilidad:** Interruptores para activar o apagar secciones completas (Sobre Nosotros, Servicios, Paquetes, Videos, Galería, Eventos, Horarios, Ventajas).
- **Reordenamiento:** Cada lista (servicios, paquetes, fotos, videos, eventos, ventajas, horarios) cuenta con controles para subir (▲) o bajar (▼) elementos.

---

## 4. Instalación y Comandos

### Requisitos previos
- Node.js `v20.x` o superior (probado en `v22.12.0`).
- npm `10.x` o superior.

### Comandos disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm run generate` | Inicia el editor visual local en `http://localhost:3001`. |
| `npm run dev` | Inicia el servidor de desarrollo de la web pública en `http://localhost:3000`. |
| `npm run build` | Compila la exportación estática del cliente activo en la carpeta `out/`. |
| `npm test` | Ejecuta las 13 pruebas unitarias en Vitest. |
| `npm run type-check` | Valida todos los tipos TypeScript del proyecto (`tsc --noEmit`). |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

---

## 5. Cómo Crear una Página para un Artista Musical

1. Ejecuta el generador local:
   ```bash
   npm run generate
   ```
2. Abre `http://localhost:3001` en tu navegador.
3. Haz clic en **"+ Nuevo"** o selecciona **`demo-artist`** en el selector superior para partir de un ejemplo de cantautor/pianista.
4. En **1. Identidad & Rubro**, selecciona la variante **`artist`** y define el ID (ej: `marco-antonio-musica`).
5. En **2. Portada & Hero**, añade la foto de portada escénica y los botones de contratación.
6. En **3. Biografía**, redacta la historia artística e ingresa los hitos o reconocimientos.
7. En **4. Servicios / Paquetes**, configura los paquetes de contratación (ej: "Show Acústico Piano & Voz", "Banda Completa para Bodas").
8. En **5. Fotos & Videos**, añade URLs de videos de YouTube/Vimeo y fotografías en vivo.
9. En **6. Presentaciones**, añade las fechas de conciertos programados.
10. En **8. Contacto**, configura WhatsApp, Spotify, YouTube e Instagram.
11. En **10. Guardar**, revisa el resumen visual y guarda el archivo en `clients/marco-antonio-musica.json`.

---

## 6. Despliegue Independiente en Vercel por Cliente

Cada cliente se despliega como un **proyecto independiente en Vercel** conectado al mismo repositorio:

1. Crea un nuevo proyecto en Vercel importando este repositorio.
2. En **Environment Variables**, define:
   - **Key:** `CLIENT_ID`
   - **Value:** El identificador del cliente (ej: `demo-artist`, `demo-professional`, etc.).
3. Vercel ejecutará `npm run build`, generará la exportación estática en `out/` y desplegará un sitio estático ultrarrápido y seguro.

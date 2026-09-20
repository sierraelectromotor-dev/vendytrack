# VendyTrack - PWA Móvil para Vending Institucional de Café

Progressive Web App (PWA) móvil diseñada para operadores de ruta en campo de máquinas de café vending institucionales. Diseñada bajo la arquitectura nativa del ecosistema de **Vercel** con **Next.js 14+ (App Router)**, **PostgreSQL (Vercel Postgres / Supabase)**, **Vercel Blob** y **Prisma ORM**.

---

## 🚀 Stack Técnico Nativo para Vercel

- **Framework:** Next.js 14+ con App Router, Server Components y Server Actions.
- **Base de Datos:** PostgreSQL gestionado compatible con pooling (`@prisma/adapter-pg` y `pg.Pool` para entornos serverless sin agotar conexiones).
- **ORM:** Prisma v5 con relaciones completas e índices optimizados (`clienteId`, `maquinaId`, `fecha`, `consecutivo`).
- **Almacenamiento de Archivos (Fotos de contadores y PDFs generados):** Vercel Blob (`@vercel/blob`).
- **Control de Acceso (RBAC):** Middleware de Next.js compatible con Edge Runtime (`ADMIN`, `OPERADOR_RUTA`, `CLIENTE`).
- **Firma Táctil:** Canvas HTML5 de alta resolución (Retina / HiDPI) con soporte para stylus y dedos, exportación PNG Base64 y función de borrado/deshacer.
- **Generación de Recibos PDF:** `@react-pdf/renderer` para renderizado en servidor/Route Handler y guardado automático en Vercel Blob.
- **Disparo a WhatsApp:** Deep link con mensaje preformateado (`https://api.whatsapp.com/send?phone=...&text=...`).
- **Kárdex Serverless:** Descuento automático del inventario de insumos (café soluble, leche en polvo, cocoa, vasos y mezcladores) según la receta de cada taza neta despachada.

---

## 📁 Estructura del Proyecto

```
VendyTrack/
├── prisma/
│   ├── schema.prisma              # Modelo de datos con índices y relaciones completas
│   └── seed.ts                    # Datos de prueba (insumos, recetas, máquinas, tarifas)
├── src/
│   ├── actions/
│   │   └── liquidacion.ts         # Server Actions: consulta y registro transaccional
│   ├── app/
│   │   ├── api/liquidaciones/[id]/pdf/
│   │   │   └── route.ts           # Route Handler para visualización y streaming de PDF
│   │   ├── globals.css            # Estilos globales y paleta temática café
│   │   ├── layout.tsx             # RootLayout con viewport PWA táctil y metadatos
│   │   ├── page.tsx               # Dashboard principal móvil
│   │   └── middleware.ts          # Control de acceso RBAC
│   ├── components/
│   │   ├── liquidacion/
│   │   │   └── MobileLiquidacionForm.tsx  # Formulario móvil reactivo en campo
│   │   ├── pdf/
│   │   │   └── LiquidacionReceiptPdf.tsx  # Plantilla oficial de recibo en PDF
│   │   └── ui/
│   │       └── SignaturePad.tsx   # Componente táctil de firma en pantalla
│   ├── lib/
│   │   ├── blob.ts                # Subida de fotos, firmas y PDFs a Vercel Blob
│   │   ├── prisma.ts              # Cliente Prisma singleton con adapter serverless
│   │   ├── utils.ts               # Formateo de moneda ($ COP) y fechas de Colombia
│   │   └── whatsapp.ts            # Generador de enlace directo a WhatsApp
│   └── types/
│       └── liquidacion.ts         # Esquemas Zod y tipos TypeScript
├── public/
│   └── manifest.json              # Manifest PWA para instalación en Android / iOS
├── tailwind.config.ts             # Paleta de colores coffee y sombras móviles
└── next.config.mjs                # Configuración de Server Actions y dominios Blob
```

---

## ⚙️ Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```bash
# Conexión a Base de Datos (Vercel Postgres / Supabase con pooling)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vendytrack?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/vendytrack"

# Vercel Blob Storage Token
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_token_..."

# NextAuth / Auth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super_secret_jwt_key_..."
```

---

## 📦 Puesta en Marcha Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Generar el cliente de Prisma:**
   ```bash
   npx prisma generate
   ```

3. **Aplicar esquema a la base de datos (opcional si hay base de datos conectada):**
   ```bash
   npx prisma db push
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador:**
   - [http://localhost:3000](http://localhost:3000) (Simular vista de dispositivo móvil en Chrome DevTools: iPhone o Galaxy).

---

## 📲 Flujo Operativo en Celular

1. **Selección automática o manual de cliente y máquina:** El formulario recupera el último **Contador Anterior (C.F)** registrado en la base de datos para las 7 bebidas del catálogo.
2. **Entrada de Contador Actual (C.A) y Bebidas Dañadas (B.D):** El operador ingresa los valores desde el teclado numérico de su celular.
3. **Cálculo Reactivo Instantáneo:**
   - $\text{Subtotal} = \text{C.A} - \text{C.F}$
   - $\text{Total Tazas Netas} = \text{Subtotal} - \text{B.D}$
   - $\text{Valor Línea} = \text{Total Tazas Netas} \times \text{Precio Unitario}$
   - $\text{Total Facturado} = \sum \text{Valor Línea}$
   - $\text{Comisión Operador (20\%)} = \text{Total Facturado} \times 0.20$
   - $\text{Saldo Empresa (80\%)} = \text{Total Facturado} \times 0.80$
4. **Captura de Foto del Contador:** Se abre la cámara del celular y se sube automáticamente a **Vercel Blob**.
5. **Firma Táctil:** El encargado del local firma con su dedo sobre la pantalla en el canvas táctil.
6. **Selección de Método de Pago:** `EFECTIVO` o `TRANSFERENCIA`.
7. **Generación y Notificación:**
   - Se crea el registro transaccional en PostgreSQL.
   - Se descuentan automáticamente del inventario (Kárdex) los gramos de insumos según las recetas de las tazas netas servidas.
   - Se genera el PDF oficial con el desglose y la firma incrustada y se sube a Vercel Blob.
   - Se abre WhatsApp con el comprobante y el enlace público al PDF para envío inmediato al cliente.

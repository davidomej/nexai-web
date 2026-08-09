# Nexa AI Landing Page

Landing page y backend para **Nexa AI**, una solución SaaS de gestión de citas y reservas para negocios. El proyecto incluye una página de presentación con formulario de contacto, integración con WhatsApp, y un sistema de envío de emails.

## Características

- 📄 **Landing page responsive** con presentación de producto
- 📧 **Formulario de contacto** con validación y rate limiting
- 💬 **Botón flotante de WhatsApp** con generador de códigos QR
- 🔒 **Seguridad reforzada** con headers de seguridad y validación de entrada
- 📱 **Móvil-first** optimizado para todos los dispositivos
- ⚡ **Lightweight** con mínimas dependencias

## Tecnologías

### Backend
- **Node.js** — entorno de ejecución JavaScript
- **Express** — framework web minimalista
- **Helmet** — protección de headers HTTP
- **express-rate-limit** — limitación de velocidad para prevenir abuso
- **Validator** — validación y sanitización de datos
- **QRCode** — generación de códigos QR dinámicos
- **Dotenv** — gestión de variables de entorno

### Frontend
- **HTML5** — estructura semántica
- **CSS3** — estilos responsive
- **Vanilla JavaScript** — sin dependencias de frontend

### Servicios externos
- **Resend** — API para envío de emails (HTTPS)

## Requisitos previos

- **Node.js** ≥ 16.x
- **npm** o **yarn**
- Cuenta en [Resend](https://resend.com) para envío de emails (gratuita)
- Número de WhatsApp (opcional, para botón flotante)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/nexa-ai-web.git
cd nexa-ai-web
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

**Variables obligatorias:**

```env
# Puerto (default: 3000)
PORT=3000

# Email donde recibirás las solicitudes del formulario
CONTACT_EMAIL=tu@email.com

# API key de Resend (obtén en https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx

# Remitente (usa onboarding@resend.dev para testing)
EMAIL_FROM=Nexa AI <onboarding@resend.dev>

# Número de WhatsApp en formato internacional (ej: 34600000000) — opcional
WHATSAPP_NUMBER=34600000000
```

**Notas:**
- Resend ofrece 100 emails/día gratuitos
- Durante testing, los emails se entregan solo a la dirección registrada en Resend
- Para producción, verifica tu dominio en Resend para usar un email personalizado

## Desarrollo

### Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000` y se reiniciará automáticamente al editar archivos.

### Ejecutar en producción

```bash
npm start
```

## Estructura del proyecto

```
nexa-ai-web/
├── public/                  # Archivos servidos públicamente
│   ├── index.html          # Landing page principal
│   ├── thanks.html         # Página de agradecimiento
│   ├── css/                # Estilos
│   └── js/                 # Scripts de cliente
│       ├── main.js         # Lógica principal
│       ├── chat-demo.js    # Demo de chat
│       └── whatsapp-float.js # Botón flotante de WhatsApp
├── server.js               # Backend Express
├── package.json            # Dependencias y scripts
├── .env.example            # Template de variables de entorno
├── .gitignore              # Archivos ignorados en Git
└── README.md               # Este archivo
```

## API Endpoints

### POST `/api/contact`

Recibe datos del formulario de contacto.

**Request:**
```json
{
  "name": "Juan García",
  "business": "Mi Barbería",
  "phone": "+34 600 123 456",
  "email": "juan@ejemplo.com"
}
```

**Response (exitoso):**
```json
{ "ok": true }
```

**Response (error):**
```json
{
  "ok": false,
  "error": "Descripción del error"
}
```

**Límites:**
- 5 solicitudes máximo por IP cada 15 minutos
- Validación de campos: nombre ≤100 caracteres, negocio ≤150, teléfono ≤30, email válido

---

### GET `/api/whatsapp-link`

Retorna el enlace wa.me codificado para el botón flotante.

**Response:**
```json
{
  "ok": true,
  "link": "https://wa.me/34600000000?text=...",
  "number": "34600000000"
}
```

---

### GET `/api/whatsapp-qr.svg`

Genera un código QR SVG del enlace de WhatsApp (con cache de 1 hora).

---

### GET `/thanks`

Sirve la página de agradecimiento (usada como conversion goal de Google Ads).

## Despliegue

### Opción 1: Coolify (recomendado)

Esta aplicación está optimizada para [Coolify](https://coolify.io):

1. Crea un nuevo proyecto en Coolify
2. Conecta tu repositorio GitHub
3. Configura las variables de entorno en Coolify
4. Coolify despliega automáticamente en cada push

**Notas:**
- Coolify maneja HTTPS automáticamente
- El servidor confía en headers `X-Forwarded-For` del proxy
- El puerto se asigna automáticamente

### Opción 2: Otros VPS (DigitalOcean, AWS, etc.)

```bash
# Conectar al servidor
ssh user@tu-vps.com

# Clonar el repositorio
git clone https://github.com/tu-usuario/nexa-ai-web.git
cd nexa-ai-web

# Instalar dependencias
npm install

# Configurar variables de entorno
nano .env

# Instalar PM2 para mantener el proceso vivo
npm install -g pm2

# Iniciar con PM2
pm2 start server.js --name "nexa-ai"
pm2 save
pm2 startup
```

### Opción 3: Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Construir e ejecutar:
```bash
docker build -t nexa-ai .
docker run -p 3000:3000 --env-file .env nexa-ai
```

## Seguridad

El proyecto implementa múltiples capas de protección:

- ✅ **Headers HTTP** (Helmet): CSP, HSTS, X-Frame-Options, etc.
- ✅ **Validación de entrada**: Sanitización de datos del formulario
- ✅ **Rate limiting**: Máximo 5 solicitudes/15 minutos por IP
- ✅ **Límite de payload**: 16KB máximo para prevenir ataques DoS
- ✅ **Escape HTML**: Prevención de XSS en emails
- ✅ **HTTPS recomendado**: Configurado para dominios HTTPS

## Troubleshooting

### El formulario no envía emails

1. Verifica que `RESEND_API_KEY` es válida
2. Comprueba que `CONTACT_EMAIL` es la dirección registrada en Resend (en testing)
3. Revisa los logs del servidor: `console.error`
4. Verifica la conectividad HTTPS (Resend requiere puerto 443)

### El botón de WhatsApp no aparece

1. Asegúrate de que `WHATSAPP_NUMBER` está configurado
2. Elimina caracteres especiales (solo dígitos + código de país)
3. Revisa la consola del navegador por errores JavaScript

### Errores de CORS o seguridad

El servidor solo sirve archivos de `public/`. Los endpoints de API están protegidos por CSP y rate limiting. Si necesitas cambiar políticas, edita las opciones de `helmet()` en `server.js`.

## Variables de entorno disponibles

| Variable | Tipo | Default | Descripción |
|----------|------|---------|-------------|
| `PORT` | number | `3000` | Puerto del servidor |
| `CONTACT_EMAIL` | string | (requerido) | Email donde llegan las solicitudes |
| `RESEND_API_KEY` | string | (requerido) | API key de Resend para emails |
| `EMAIL_FROM` | string | `Nexa AI <onboarding@resend.dev>` | Dirección remitente |
| `WHATSAPP_NUMBER` | string | (opcional) | Número WhatsApp sin símbolos |

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/mi-feature`)
3. Commit tus cambios (`git commit -am 'Añade mi feature'`)
4. Push a la rama (`git push origin feature/mi-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo licencia [MIT](LICENSE).

## Soporte

Para reportar bugs o sugerencias, abre un issue en GitHub.

---

**Hecho con ❤️ para Nexa AI**

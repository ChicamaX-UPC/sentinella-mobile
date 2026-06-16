# Sentinella Mobile (React Native + Expo)

App nativa para **operarios de campo** (`FIELD_OPERATOR`): login JWT, KPIs, alertas con ACK+GPS, rondas con checklist, sensores simulados, fotos/GPS y cola offline.

**Expo SDK 54** — compatible con **Expo Go de la App Store** (iOS/Android).

Cubre **US13** (alertas en foreground), **US14** (rondas de inspección) y la navegación del **Cap. VI** del informe académico ChicamaX.

**IoT físico no está incluido**: la telemetría y las alertas provienen del **seed demo** del backend Docker (`MonitoringDemoDataSeeder`, etc.). La app consume la misma API que la PWA `/mobile/*` en `sentinella-frontend`.

## Requisitos

- Node.js 20+
- [Expo Go](https://expo.dev/go) en el teléfono **o** emulador Android
- Backend Sentinella en marcha (`docker compose up` en `sentinella-backend`)

## Instalación

```powershell
cd sentinella-mobile
npm install
```

Copia `.env.example` a `.env` y ajusta la IP de tu PC:

```powershell
copy .env.example .env
```

## Ejecutar

```powershell
npm start
```

Escanea el QR con **Expo Go** (iOS/Android). Tras cambiar de SDK, reinicia con caché limpia:

```powershell
npx expo start -c
```

| Entorno | `EXPO_PUBLIC_API_BASE_URL` |
|---------|----------------------------|
| Expo Go en teléfono (misma WiFi) | `http://TU_IP_LAN:8080` |
| Emulador Android | `http://10.0.2.2:8080` |
| Simulador iOS / Web | `http://localhost:8080` |
| Túnel Cloudflare (backend) | `https://TU-TUNEL.trycloudflare.com` |

Tras cambios en Java del backend:

```powershell
cd sentinella-backend
docker compose up --build -d
```

## Login demo

- **Usuario:** `campo@sentinella.demo`
- **Contraseña:** `Sentinella2024!`
- **Tranque demo:** Chicama Norte (`a1e8c0de-4b2a-4c1f-9f3d-8c7b6a5d4e3f`)

## Navegación (Cap. VI)

| Tab | Función |
|-----|---------|
| **Inicio** | KPIs: alertas activas, sensores fuera de rango, rondas en curso, sync pendiente, última incidencia |
| **Sensores** | Nodos del tranque (`GET /nodes`) — datos simulados |
| **Alertas** | Lista + badge + vibración doble en alertas nuevas (US13) |
| **Registros** | Historial de rondas + iniciar inspección |
| **Perfil** | Usuario, tranques con nombre legible, cola offline, cerrar sesión |

## Pantallas adicionales

| Pantalla | Función |
|----------|---------|
| **Detalle alerta** | ACK con GPS opcional, auditoría |
| **Ronda activa** | Progreso checklist, validación antes de sync (US14) |
| **Ítem checklist** | Observaciones, foto local, GPS, anomalía |
| **Hallazgo** | Registro de hallazgo en ronda |

## API

Base: `{API}/api/v1` con header `Authorization: Bearer {token}`

- `POST /auth/login`, `/auth/refresh`
- `GET /dashboard/field` — KPIs ampliados para operario
- `GET|PATCH /alerts`, `/alerts/{id}`, `/alerts/{id}/audit` — ACK acepta `latitude`/`longitude`
- `GET|POST /rounds`, `GET /rounds/{id}`, `PATCH /rounds/{id}/items/{itemId}`, `POST /rounds/{id}/items/{itemId}/photo`, `POST /rounds/{id}/sync`
- `GET /nodes`, `GET /relaves`
- `GET /users/assignable` (managers)

## Offline

- Cola de mutaciones en AsyncStorage (POST/PATCH)
- Caché de alertas y snapshots de ronda
- Fotos en borrador (`expo-file-system`)
- Auto-flush al recuperar conexión (`NetInfo`)
- Indicador **Sync:** en cabecera + panel en Perfil

## Fuera de alcance (por ahora)

- **IoT real** (MQTT, sensores físicos, edge)
- Build APK producción / HTTPS estricto
- Hyperledger Fabric real (US17 usa stub + ledger Postgres; ver abajo)

## Push en background (US13)

Tras login la app registra un **Expo Push Token** en `POST /api/v1/users/me/device-tokens`. Cuando el backend crea una alerta con canal `APP`, `alerts-service` envía push vía **Expo Push API** a operarios del tranque afectado.

Requisitos:
- Dispositivo físico (no emulador sin Google Play)
- Permiso de notificaciones aceptado
- Backend con `ALERTS_NOTIFICATIONS_ENABLED=true` y `ALERTS_PUSH_ENABLED=true` (ya en Docker Compose)
- `projectId` en `app.json` → `extra.eas.projectId` (para builds EAS; Expo Go también lo usa)

## Blockchain US17

Eventos críticos publican hash SHA-256 a la cola `blockchain.register`:

| Evento | entityType |
|--------|------------|
| Alerta creada | `ALERT` |
| Alerta reconocida (ACK) | `ALERT_ACK` |
| Alerta cerrada | `ALERT_CLOSED` |
| Ronda sincronizada | `ROUND_SYNC` |

Consulta auditoría: `GET /api/v1/blockchain/ledger?entityId={uuid}`

Fabric real pendiente; hoy `fabricTxId` es stub (`stub-xxxxxxxx`).

## Estructura

```
app/              # Rutas Expo Router
src/
  api/            # Cliente HTTP
  auth/           # Sesión JWT
  offline/        # Outbox, fotos, caché, lastSync
  components/     # Shell, botones, KPIs, SyncPanel
  hooks/          # Online, etiquetas nodo/tranque
  labels/         # Textos ES + mapa demo tranques
  lib/            # Feedback alertas (haptics US13)
  theme/          # Colores Sentinella (#ff8c42)
```

## Verificación

```powershell
npm run typecheck
```

## Notas

- Fotos de checklist: subida a **MinIO/S3** (`POST .../photo`) y clave en `photoS3Key`; offline sube la foto al sincronizar la cola
- Android permite HTTP claro (`usesCleartextTraffic`) para desarrollo local.

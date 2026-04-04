# Socket.io events (Insight Guardian backend)

Clients must connect with JWT access token in the handshake:

```ts
import { io } from 'socket.io-client';

const socket = io(API_ORIGIN, {
  withCredentials: true,
  auth: { token: accessToken },
});
```

Unauthorized handshakes are rejected; the server does not accept anonymous socket connections.

All payloads below are JSON-serializable. Enum fields use the same string values as the Prisma schema (e.g. `MonitoredUserStatus`, `RiskTrend`, `AlertStatus`).

---

## Server → client (broadcast)

These events are emitted to **all** connected clients (`io.emit`). There is no per-user room routing yet.

| Event | Payload shape | Emitted by |
|-------|----------------|------------|
| `user:riskUpdated` | `{ id: string; name: string; riskScore: number; riskTrend: RiskTrend; status: MonitoredUserStatus }` | `eventService.simulateAccessEvent` |
| `user:restricted` | `{ id: string; name: string; status: MonitoredUserStatus }` | `userService.restrictUser` |
| `user:restored` | `{ id: string; name: string; status: MonitoredUserStatus }` | `userService.restoreUser` |
| `event:new` | Full `AccessEvent` model (see Prisma) | `eventService.simulateAccessEvent` |
| `alert:new` | Full `Alert` model (see Prisma) | `eventService.simulateAccessEvent` (when an alert is created) |
| `alert:updated` | `{ id: string; status: AlertStatus }` | `alertService.updateAlertStatus` |
| `decoy:deployed` | Full `DecoyAsset` model (see Prisma) | `decoyService.createDecoy` |
| `decoy:hit` | `{ decoyId: string; decoyName: string; userId: string; userName: string; riskDelta: number }` | `eventService.simulateAccessEvent` (when the simulated access matched an active decoy) |

### Prisma model references (payload fields)

- **AccessEvent**: `id`, `userId`, `employeeName`, `resource`, `timestamp`, `accessType`, `riskFlag`, `actionType`, `ip`, `triggeredBy`
- **Alert**: `id`, `timestamp`, `userId`, `userName`, `severity`, `riskScore`, `title`, `description`, `reasons` (JSON), `status`
- **DecoyAsset**: `id`, `name`, `type`, `format`, `sensitivityTag`, `createdAt`, `accessCount`, `lastAccessed`, `beacon`, `status`

---

## Client → server

No custom client events are required for this contract. Optional pings/presence can be added later.

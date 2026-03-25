# Asteroid Game Frontend (React + WebSocket)

Simple, erweiterbare Frontend-Basis fuer ein Asteroid-Game mit:

- Spielbereich mit Raumschiff
- Steuerung ueber `A` (links) und `D` (rechts)
- Startposition des Schiffs unten in der Mitte
- vorbereiteter WebSocket-Anbindung

## Start

```bash
npm install
npm run dev
```

App-URL: `http://localhost:5173`

## WebSocket konfigurieren

Standard-URL im Frontend:

`ws://localhost:8080/ws/game`

Optional per Vite-Env ueberschreiben:

`VITE_GAME_WS_URL=ws://localhost:8080/ws/game`

## Wichtige Dateien

- `src/App.tsx`: Route `/` zeigt das Spiel
- `src/game/components/AsteroidGame.tsx`: Rendering, Input-Handling, lokales Movement
- `src/game/services/wsClient.ts`: schlanker WebSocket-Client (`connect`, `send`, `onMessage`)
- `src/game/types.ts`: zentrale Typen fuer Client-/Server-Events und Game-State

## Event-Protokoll (JSON)

- Client -> Server:
  - `player_input` mit `{ left: boolean, right: boolean }`
- Server -> Client:
  - `state` mit partiellen Updates fuer den Game-State (z. B. Player/Asteroids)

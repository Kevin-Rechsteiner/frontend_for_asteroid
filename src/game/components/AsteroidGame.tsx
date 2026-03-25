import { useEffect, useMemo, useState } from 'react';
import { WsClient } from '../services/wsClient';
import type { ClientEvent, GameState, ServerEvent } from '../types';

const FALLBACK_WIDTH = 720;
const FALLBACK_HEIGHT = 520;
const FALLBACK_PLAYER_WIDTH = 52;
const FALLBACK_PLAYER_HEIGHT = 90;
const FALLBACK_BOTTOM_OFFSET = 20;

const createInitialState = (): GameState => ({
  width: FALLBACK_WIDTH,
  height: FALLBACK_HEIGHT,
  player: {
    x: FALLBACK_WIDTH / 2 - FALLBACK_PLAYER_WIDTH / 2,
    y: FALLBACK_HEIGHT - FALLBACK_PLAYER_HEIGHT - FALLBACK_BOTTOM_OFFSET,
    width: FALLBACK_PLAYER_WIDTH,
    height: FALLBACK_PLAYER_HEIGHT,
    speed: 320,
  },
  asteroids: [],
});

const AsteroidGame = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');

  const wsClient = useMemo(() => new WsClient(), []);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_GAME_WS_URL ?? 'ws://localhost:8080/ws/game';

    wsClient.connect(wsUrl);

    wsClient.onMessage((event: ServerEvent) => {
      if (event.type === 'state') {
        setGameState((previous) => ({
          ...previous,
          ...event.payload,
          player: {
            ...previous.player,
            ...(event.payload.player ?? {}),
          },
          asteroids: event.payload.asteroids ?? previous.asteroids,
        }));
      }
    });

    const intervalId = window.setInterval(() => {
      const state = wsClient.readyState;
      if (state === WebSocket.OPEN) {
        setWsStatus('connected');
      } else if (state === WebSocket.CONNECTING) {
        setWsStatus('connecting');
      } else {
        setWsStatus('disconnected');
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
      wsClient.disconnect();
    };
  }, [wsClient]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (event.code === 'KeyA') {
        setLeftPressed(true);
      }
      if (event.code === 'KeyD') {
        setRightPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyA') {
        setLeftPressed(false);
      }
      if (event.code === 'KeyD') {
        setRightPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const eventPayload: ClientEvent = {
      type: 'player_input',
      payload: {
        left: leftPressed,
        right: rightPressed,
      },
    };

    wsClient.send(eventPayload);
  }, [leftPressed, rightPressed, wsClient]);

  return (
      <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '24px',
            background: '#0b1020',
            color: '#f6f7fb',
          }}
      >
        <h1 style={{ margin: 0 }}>Asteroid Prototype</h1>
        <p style={{ margin: 0 }}>Steuerung: Taste A = links, Taste D = rechts</p>
        <p style={{ margin: 0, opacity: 0.8 }}>WebSocket: {wsStatus}</p>

        <section
            style={{
              position: 'relative',
              width: `${gameState.width}px`,
              height: `${gameState.height}px`,
              border: '2px solid #3a4566',
              background: 'white',
              overflow: 'hidden',
              borderRadius: '12px',
            }}
        >
          {gameState.asteroids.map((asteroid) => (
              <div
                  key={asteroid.id}
                  style={{
                    position: 'absolute',
                    left: `${asteroid.x}px`,
                    top: `${asteroid.y}px`,
                    width: `${asteroid.size}px`,
                    height: `${asteroid.size}px`,
                    borderRadius: '50%',
                    background: '#8a8f9f',
                  }}
              />
          ))}

          <div
              style={{
                position: 'absolute',
                left: `${gameState.player.x}px`,
                top: `${gameState.player.y}px`,
                width: `${gameState.player.width}px`,
                height: `${gameState.player.height}px`,
                background: 'blue',
                borderRadius: '4px',
              }}
          />
        </section>
      </main>
  );
};
export default AsteroidGame;
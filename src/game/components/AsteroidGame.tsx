import { useEffect, useMemo, useState } from 'react';
import { WsClient } from '../services/wsClient';
import type { ClientEvent, GameState, ServerEvent } from '../types';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 520;
const PLAYER_WIDTH = 52;
const PLAYER_HEIGHT = 30;
const BOTTOM_OFFSET = 20;
const PLAYER_SPEED = 400;

const createInitialState = (): GameState => ({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    player: {
        x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: GAME_HEIGHT - PLAYER_HEIGHT - BOTTOM_OFFSET,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
    },
    asteroids: [],
    bullets: [],
    score: 0,
    lives: 3,
    paused: false,
    gameOver: false,
});

const AsteroidGame = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialState);
    const [leftPressed, setLeftPressed] = useState(false);
    const [rightPressed, setRightPressed] = useState(false);
    const [shootPressed, setShootPressed] = useState(false);
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
                    bullets: event.payload.bullets ?? previous.bullets,
                    score: event.payload.score ?? previous.score,
                    lives: event.payload.lives ?? previous.lives,
                    paused: event.payload.paused ?? previous.paused,
                    gameOver: event.payload.gameOver ?? previous.gameOver,
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
            if (event.repeat) return;
            if (event.code === 'KeyA') setLeftPressed(true);
            if (event.code === 'KeyD') setRightPressed(true);
            if (event.code === 'Space') {
                event.preventDefault();
                setShootPressed(true);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'KeyA') setLeftPressed(false);
            if (event.code === 'KeyD') setRightPressed(false);
            if (event.code === 'Space') setShootPressed(false);
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
                shoot: shootPressed,
            },
        };

        wsClient.send(eventPayload);
    }, [leftPressed, rightPressed, shootPressed, wsClient]);

    const togglePause = () => {
        wsClient.send({
            type: 'game_control',
            payload: {toggle_pause: true},
        } as ClientEvent);
    };

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
            <p style={{ margin: 0 }}>Steuerung: Taste A = links, Taste D = rechts, Space = schießen</p>
            <p style={{ margin: 0, opacity: 0.8 }}>WebSocket: {wsStatus}</p>

            <div
                style={{
                    display: 'flex',
                    gap: '24px',
                    marginTop: '12px',
                    alignItems: 'center',
                }}
            >
                <p style={{ margin: 0 }}>
                    Score: <strong>{gameState.score}</strong>
                </p>
                <p style={{ margin: 0 }}>
                    Lives: <strong>{gameState.lives}</strong>
                </p>
                <button
                    onClick={togglePause}
                    style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        background: gameState.paused ? '#4CAF50' : '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                    }}
                >
                    {gameState.paused ? '▶ Weiter' : '⏸ Pause'}
                </button>
            </div>

            {gameState.gameOver && (
                <div
                    style={{
                        marginTop: '12px',
                        padding: '16px 32px',
                        background: '#f44336',
                        borderRadius: '4px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                    }}
                >
                    🎮 Game Over! Endstand: {gameState.score}
                </div>
            )}

            <section
                style={{
                    position: 'relative',
                    width: `${gameState.width}px`,
                    height: `${gameState.height}px`,
                    border: '2px solid #3a4566',
                    background: 'white',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    marginTop: '12px',
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

                {gameState.bullets?.map((bullet) => (
                    <div
                        key={bullet.id}
                        style={{
                            position: 'absolute',
                            left: `${bullet.x}px`,
                            top: `${bullet.y}px`,
                            width: `${bullet.size}px`,
                            height: `${bullet.size}px`,
                            borderRadius: '50%',
                            background: '#ffd54a',
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

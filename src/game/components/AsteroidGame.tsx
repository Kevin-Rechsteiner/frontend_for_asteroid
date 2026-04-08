import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { WsClient } from '../services/wsClient';
import type { ClientEvent, GameState, ServerEvent } from '../types';

const GAME_WIDTH = 720;
const GAME_HEIGHT = 520;
const PLAYER_WIDTH = 52;
const PLAYER_HEIGHT = 30;
const BOTTOM_OFFSET = 20;
const PLAYER_SPEED = 400;

const NEON = {
    bgTop: '#050816',
    bgBottom: '#03040b',
    panel: 'rgba(10, 14, 30, 0.72)',
    border: 'rgba(34, 211, 238, 0.45)',
    cyan: '#22d3ee',
    cyanSoft: 'rgba(34, 211, 238, 0.25)',
    text: '#d9f8ff',
};

const getAsteroidColorsByHp = (hp: number) => {
    if (hp >= 3) {
        return {
            base: 'radial-gradient(circle at 28% 28%, #1b5e38 0%, #0d3d24 55%, #072315 100%)',
            rim: 'rgba(74, 222, 128, 0.6)',
            glow: 'rgba(74, 222, 128, 0.28)',
        };
    }

    if (hp === 2) {
        return {
            base: 'radial-gradient(circle at 28% 28%, #7c3f10 0%, #5a2e0a 55%, #2f1705 100%)',
            rim: 'rgba(251, 146, 60, 0.65)',
            glow: 'rgba(251, 146, 60, 0.28)',
        };
    }

    return {
        base: 'radial-gradient(circle at 28% 28%, #7f1d1d 0%, #581313 55%, #2d0909 100%)',
        rim: 'rgba(248, 113, 113, 0.7)',
        glow: 'rgba(248, 113, 113, 0.3)',
    };
};

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
    personalBest: 0,
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
    const [damageFlashActive, setDamageFlashActive] = useState(false);
    const [loggedInAs] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser) as { email?: string };
                if (parsed.email) {
                    return parsed.email;
                }
            }
        } catch {
            // ignore broken local storage payload
        }

        return localStorage.getItem('authEmail') ?? 'unbekannt';
    });
    const previousLivesRef = useRef(3);
    const damageFlashTimeoutRef = useRef<number | null>(null);

    const wsClient = useMemo(() => new WsClient(), []);

    useEffect(() => {
        const wsUrl = import.meta.env.VITE_GAME_WS_URL ?? 'ws://localhost:8080/ws/game';

        wsClient.connect(wsUrl);

        wsClient.onMessage((event: ServerEvent) => {
            if (event.type === 'state') {
                const payloadWithOptionalHighScore = event.payload as Partial<GameState> & { highScore?: number };

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
                    personalBest:
                        event.payload.personalBest ?? payloadWithOptionalHighScore.highScore ?? previous.personalBest,
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
        const resetInputs = () => {
            setLeftPressed(false);
            setRightPressed(false);
            setShootPressed(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) return;
            if (event.code === 'KeyA' || event.code === 'ArrowLeft') setLeftPressed(true);
            if (event.code === 'KeyD' || event.code === 'ArrowRight') setRightPressed(true);
            if (event.code === 'Space') {
                event.preventDefault();
                setShootPressed(true);
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'KeyA' || event.code === 'ArrowLeft') setLeftPressed(false);
            if (event.code === 'KeyD' || event.code === 'ArrowRight') setRightPressed(false);
            if (event.code === 'Space') setShootPressed(false);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                resetInputs();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', resetInputs);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', resetInputs);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const sendInput = () => {
            const eventPayload: ClientEvent = {
                type: 'player_input',
                payload: {
                    left: leftPressed,
                    right: rightPressed,
                    shoot: shootPressed,
                },
            };

            wsClient.send(eventPayload);
        };

        // Einmal sofort senden und dann kontinuierlich, damit der Server immer frische Inputs bekommt.
        sendInput();
        const intervalId = window.setInterval(sendInput, 80);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [leftPressed, rightPressed, shootPressed, wsClient]);

    useEffect(() => {
        if (gameState.lives < previousLivesRef.current) {
            setDamageFlashActive(true);
            if (damageFlashTimeoutRef.current !== null) {
                window.clearTimeout(damageFlashTimeoutRef.current);
            }

            damageFlashTimeoutRef.current = window.setTimeout(() => {
                setDamageFlashActive(false);
            }, 180);
        }

        previousLivesRef.current = gameState.lives;
    }, [gameState.lives]);

    useEffect(() => {
        return () => {
            if (damageFlashTimeoutRef.current !== null) {
                window.clearTimeout(damageFlashTimeoutRef.current);
            }
        };
    }, []);

    const togglePause = () => {
        if (wsStatus !== 'connected' || gameState.gameOver) {
            return;
        }

        wsClient.send({
            type: 'game_control',
            payload: {toggle_pause: true},
        } as ClientEvent);
    };

    const restartGame = () => {
        if (wsStatus !== 'connected' || !gameState.gameOver) {
            return;
        }

        wsClient.send({
            type: 'game_control',
            payload: { restart: true, reset: true },
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
                background: `linear-gradient(180deg, ${NEON.bgTop} 0%, ${NEON.bgBottom} 100%)`,
                color: NEON.text,
            }}
        >
            <h1 style={{ margin: 0, letterSpacing: '0.06em', textShadow: `0 0 14px ${NEON.cyanSoft}` }}>Asteroid Prototype</h1>
            <p style={{ margin: 0 }}>Steuerung: A/Links = links, D/Rechts = rechts, Space halten = schießen</p>
            <p
                style={{
                    margin: 0,
                    opacity: 0.9,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    border: `1px solid ${NEON.border}`,
                    background: NEON.panel,
                }}
            >
                WebSocket: {wsStatus}
            </p>

            <div
                style={{
                    display: 'flex',
                    gap: '24px',
                    marginTop: '12px',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${NEON.border}`,
                    background: NEON.panel,
                    boxShadow: `0 0 18px ${NEON.cyanSoft}`,
                }}
            >
                <p style={{ margin: 0 }}>
                    Score: <strong>{gameState.score}</strong>
                </p>
                <p style={{ margin: 0 }}>
                    Lives: <strong>{gameState.lives}</strong>
                </p>
                <p style={{ margin: 0 }}>
                    Highscore: <strong>{gameState.personalBest}</strong>
                </p>
                <p style={{ margin: 0 }}>
                    Eingeloggt als: <strong>{loggedInAs}</strong>
                </p>
                <button
                    onClick={togglePause}
                    disabled={wsStatus !== 'connected' || gameState.gameOver}
                    style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: wsStatus === 'connected' && !gameState.gameOver ? 'pointer' : 'not-allowed',
                        background: gameState.paused ? 'rgba(16, 185, 129, 0.18)' : 'rgba(34, 211, 238, 0.18)',
                        color: NEON.text,
                        border: `1px solid ${gameState.paused ? 'rgba(16, 185, 129, 0.65)' : NEON.border}`,
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        opacity: wsStatus === 'connected' && !gameState.gameOver ? 1 : 0.7,
                        boxShadow: gameState.paused ? '0 0 10px rgba(16, 185, 129, 0.25)' : `0 0 12px ${NEON.cyanSoft}`,
                    }}
                >
                    {gameState.paused ? '▶ Weiter' : '⏸ Pause'}
                </button>
                <Link
                    to="/login"
                    style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: `1px solid ${NEON.border}`,
                        color: NEON.text,
                        textDecoration: 'none',
                        background: 'rgba(239, 68, 68, 0.12)',
                        fontSize: '14px',
                    }}
                >
                    Game abbrechen
                </Link>
            </div>

            {gameState.gameOver && (
                <div
                    style={{
                        marginTop: '12px',
                        padding: '16px 32px',
                        background: 'rgba(190, 24, 93, 0.2)',
                        border: '1px solid rgba(244, 114, 182, 0.6)',
                        borderRadius: '4px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        boxShadow: '0 0 16px rgba(244, 114, 182, 0.35)',
                        display: 'grid',
                        gap: '10px',
                    }}
                >
                    <div>🎮 Game Over! Endstand: {gameState.score}</div>
                    <div style={{ fontSize: '14px' }}>
                        Dein Highscore: <strong>{gameState.personalBest}</strong>
                    </div>
                    <button
                        onClick={restartGame}
                        disabled={wsStatus !== 'connected'}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            cursor: wsStatus === 'connected' ? 'pointer' : 'not-allowed',
                            background: 'rgba(236, 72, 153, 0.16)',
                            color: NEON.text,
                            border: '1px solid rgba(244, 114, 182, 0.65)',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            opacity: wsStatus === 'connected' ? 1 : 0.7,
                            width: 'fit-content',
                        }}
                    >
                        Neustart
                    </button>
                </div>
            )}

            <section
                style={{
                    position: 'relative',
                    width: `${gameState.width}px`,
                    height: `${gameState.height}px`,
                    border: `2px solid ${NEON.border}`,
                    background:
                        'radial-gradient(circle at 18% 24%, rgba(56, 189, 248, 0.24) 0 2px, transparent 3px), radial-gradient(circle at 74% 32%, rgba(125, 211, 252, 0.2) 0 1px, transparent 2px), radial-gradient(circle at 48% 74%, rgba(217, 249, 255, 0.22) 0 1px, transparent 2px), radial-gradient(circle at 50% 8%, rgba(34, 211, 238, 0.16), transparent 44%), linear-gradient(180deg, #090f26 0%, #060a1b 65%, #04060f 100%)',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    marginTop: '12px',
                    boxShadow: '0 0 34px rgba(34, 211, 238, 0.16) inset, 0 0 18px rgba(3, 6, 16, 0.8)',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: damageFlashActive ? 'rgba(248, 113, 113, 0.18)' : 'transparent',
                        transition: 'background 130ms ease-out',
                        zIndex: 3,
                    }}
                />
                {gameState.asteroids.map((asteroid) => {
                    const asteroidColors = getAsteroidColorsByHp(asteroid.hp);

                    return (
                        <div
                            key={asteroid.id}
                            title={`HP: ${asteroid.hp}`}
                            style={{
                                position: 'absolute',
                                left: `${asteroid.x}px`,
                                top: `${asteroid.y}px`,
                                width: `${asteroid.size}px`,
                                height: `${asteroid.size}px`,
                                borderRadius: '50%',
                                background: asteroidColors.base,
                                boxShadow: `inset -4px -6px 8px rgba(0, 0, 0, 0.55), 0 0 10px ${asteroidColors.glow}`,
                                border: `1px solid ${asteroidColors.rim}`,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    width: `${Math.max(3, asteroid.size * 0.2)}px`,
                                    height: `${Math.max(3, asteroid.size * 0.2)}px`,
                                    left: `${asteroid.size * 0.2}px`,
                                    top: `${asteroid.size * 0.28}px`,
                                    borderRadius: '50%',
                                    background: 'rgba(6, 11, 20, 0.5)',
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    width: `${Math.max(2, asteroid.size * 0.14)}px`,
                                    height: `${Math.max(2, asteroid.size * 0.14)}px`,
                                    left: `${asteroid.size * 0.58}px`,
                                    top: `${asteroid.size * 0.5}px`,
                                    borderRadius: '50%',
                                    background: 'rgba(4, 10, 18, 0.5)',
                                }}
                            />
                        </div>
                    );
                })}

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
                            background: 'radial-gradient(circle, #e0fafe 0%, #67e8f9 55%, #0891b2 100%)',
                            boxShadow: '0 0 10px rgba(103, 232, 249, 0.95)',
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
                        filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.55))',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, #b6f4ff 0%, #22d3ee 52%, #0e7490 100%)',
                            clipPath: 'polygon(50% 0%, 100% 72%, 82% 100%, 18% 100%, 0% 72%)',
                            border: `1px solid ${NEON.border}`,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            width: `${gameState.player.width * 0.28}px`,
                            height: `${gameState.player.height * 0.3}px`,
                            left: `${gameState.player.width * 0.36}px`,
                            top: `${gameState.player.height * 0.24}px`,
                            borderRadius: '40% 40% 50% 50%',
                            background: 'linear-gradient(180deg, #ecfeff 0%, #67e8f9 100%)',
                            border: '1px solid rgba(236, 254, 255, 0.8)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            width: `${gameState.player.width * 0.16}px`,
                            height: `${gameState.player.height * 0.2}px`,
                            left: `${gameState.player.width * 0.12}px`,
                            top: `${gameState.player.height * 0.74}px`,
                            borderRadius: '0 0 8px 8px',
                            background: 'linear-gradient(180deg, rgba(34, 211, 238, 0.95) 0%, rgba(14, 116, 144, 0.55) 100%)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            width: `${gameState.player.width * 0.16}px`,
                            height: `${gameState.player.height * 0.2}px`,
                            left: `${gameState.player.width * 0.72}px`,
                            top: `${gameState.player.height * 0.74}px`,
                            borderRadius: '0 0 8px 8px',
                            background: 'linear-gradient(180deg, rgba(34, 211, 238, 0.95) 0%, rgba(14, 116, 144, 0.55) 100%)',
                        }}
                    />
                </div>
            </section>
        </main>
    );
};

export default AsteroidGame;

export interface PlayerState {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
}

export interface AsteroidState {
    id: string;
    x: number;
    y: number;
    size: number;
}

export interface BulletState {
    id: string;
    x: number;
    y: number;
    size: number;
}

export interface GameState {
    width: number;
    height: number;
    player: PlayerState;
    asteroids: AsteroidState[];
    bullets: BulletState[];
    score: number;
    lives: number;
    paused: boolean;
    gameOver: boolean;
}

export type ClientEvent =
    | {
    type: 'player_input';
    payload: {
        left: boolean;
        right: boolean;
        shoot: boolean;
    };
}
    | {
    type: 'game_control';
    payload: {
        paused?: boolean;
        toggle_pause?: boolean;
    };
}
    | {
    type: 'ping';
    payload: {
        at: number;
    };
};

export type ServerEvent =
    | {
    type: 'state';
    payload: Partial<GameState>;
}
    | {
    type: 'pong';
    payload: {
        at: number;
    };
};

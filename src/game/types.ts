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

export interface GameState {
  width: number;
  height: number;
  player: PlayerState;
  asteroids: AsteroidState[];
}

export type ClientEvent =
  | {
      type: 'player_input';
      payload: {
        left: boolean;
        right: boolean;
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


export interface Block {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  colorDark: string;
  colorLight: string;
}

export interface FallingBlock extends Block {
  velocityY: number;
  velocityX: number;
  velocityZ: number;
  rotation: number;
  rotationSpeed: number;
}

export interface GameState {
  status: 'menu' | 'playing' | 'gameover';
  score: number;
  highScore: number;
  combo: number;
  showPerfect: boolean;
  blocks: Block[];
  fallingBlocks: FallingBlock[];
  movingBlock: Block | null;
  direction: 'x' | 'z';
  speed: number;
  position: number;
  cameraY: number;
}

export interface GameColors {
  hue: number;
  saturation: number;
  lightness: number;
}

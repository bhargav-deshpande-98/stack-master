import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, Block, FallingBlock } from './types';

const BLOCK_HEIGHT = 20;
const INITIAL_SIZE = 100;
const MOVE_RANGE = 150;
const BASE_SPEED = 2.5;
const SPEED_INCREMENT = 0.08;
const MAX_SPEED = 7;
const PERFECT_THRESHOLD = 5;

const getBlockColors = (hue: number): { main: string; dark: string; light: string } => {
  return {
    main: `hsl(${hue}, 65%, 55%)`,
    dark: `hsl(${hue}, 65%, 40%)`,
    light: `hsl(${hue}, 65%, 70%)`,
  };
};

const createInitialBlock = (): Block => {
  const colors = getBlockColors(160);
  return {
    x: 0,
    y: 0,
    z: 0,
    width: INITIAL_SIZE,
    depth: INITIAL_SIZE,
    height: BLOCK_HEIGHT,
    color: colors.main,
    colorDark: colors.dark,
    colorLight: colors.light,
  };
};

const createMovingBlock = (
  prevBlock: Block,
  direction: 'x' | 'z',
  hue: number
): Block => {
  const colors = getBlockColors(hue);
  return {
    x: direction === 'x' ? -MOVE_RANGE : prevBlock.x,
    y: prevBlock.y + BLOCK_HEIGHT,
    z: direction === 'z' ? -MOVE_RANGE : prevBlock.z,
    width: prevBlock.width,
    depth: prevBlock.depth,
    height: BLOCK_HEIGHT,
    color: colors.main,
    colorDark: colors.dark,
    colorLight: colors.light,
  };
};

// Audio context for sound effects
let audioContext: AudioContext | null = null;

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Audio not supported
  }
};

const playPlaceSound = (score: number, isPerfect: boolean) => {
  const baseFreq = 220 + (score * 10);
  if (isPerfect) {
    playSound(baseFreq, 0.1, 'sine');
    setTimeout(() => playSound(baseFreq * 1.25, 0.1, 'sine'), 50);
    setTimeout(() => playSound(baseFreq * 1.5, 0.15, 'sine'), 100);
  } else {
    playSound(baseFreq, 0.1, 'triangle');
  }
};

const playGameOverSound = () => {
  playSound(220, 0.15, 'sawtooth');
  setTimeout(() => playSound(165, 0.15, 'sawtooth'), 100);
  setTimeout(() => playSound(110, 0.3, 'sawtooth'), 200);
};

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    highScore: parseInt(localStorage.getItem('stackHighScore') || '0'),
    combo: 0,
    showPerfect: false,
    blocks: [createInitialBlock()],
    fallingBlocks: [],
    movingBlock: null,
    direction: 'x',
    speed: BASE_SPEED,
    position: -MOVE_RANGE,
    cameraY: 0,
  });

  const animationRef = useRef<number>();
  const colorHueRef = useRef<number>(160);
  const directionRef = useRef<1 | -1>(1);

  const startGame = useCallback(() => {
    colorHueRef.current = 160;
    const initialBlock = createInitialBlock();
    const movingBlock = createMovingBlock(initialBlock, 'x', colorHueRef.current + 25);
    
    setGameState({
      status: 'playing',
      score: 0,
      highScore: parseInt(localStorage.getItem('stackHighScore') || '0'),
      combo: 0,
      showPerfect: false,
      blocks: [initialBlock],
      fallingBlocks: [],
      movingBlock,
      direction: 'x',
      speed: BASE_SPEED,
      position: -MOVE_RANGE,
      cameraY: 0,
    });
    directionRef.current = 1;
  }, []);

  const placeBlock = useCallback(() => {
    setGameState((prev) => {
      if (prev.status !== 'playing' || !prev.movingBlock) return prev;

      const currentBlock = prev.movingBlock;
      const lastBlock = prev.blocks[prev.blocks.length - 1];
      const direction = prev.direction;

      let newX = currentBlock.x;
      let newZ = currentBlock.z;
      let newWidth = currentBlock.width;
      let newDepth = currentBlock.depth;

      // Calculate overlap
      let delta: number;
      let lastSize: number;
      let currentSize: number;

      if (direction === 'x') {
        delta = currentBlock.x - lastBlock.x;
        lastSize = lastBlock.width;
        currentSize = currentBlock.width;
      } else {
        delta = currentBlock.z - lastBlock.z;
        lastSize = lastBlock.depth;
        currentSize = currentBlock.depth;
      }

      const overlap = currentSize - Math.abs(delta);

      // Check for game over (no overlap)
      if (overlap <= 0) {
        const newHighScore = Math.max(prev.score, prev.highScore);
        localStorage.setItem('stackHighScore', newHighScore.toString());
        playGameOverSound();
        
        // Add the missed block as falling
        const missedBlock: FallingBlock = {
          ...currentBlock,
          velocityY: 0,
          velocityX: direction === 'x' ? directionRef.current * 3 : 0,
          velocityZ: direction === 'z' ? directionRef.current * 3 : 0,
          rotation: 0,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        };

        return {
          ...prev,
          status: 'gameover',
          highScore: newHighScore,
          movingBlock: null,
          fallingBlocks: [...prev.fallingBlocks, missedBlock],
        };
      }

      // Check for perfect placement
      const isPerfect = Math.abs(delta) < PERFECT_THRESHOLD;
      
      let placedBlock: Block;
      const newFallingBlocks: FallingBlock[] = [...prev.fallingBlocks];

      if (isPerfect) {
        // Perfect! Keep same size as last block
        placedBlock = {
          ...currentBlock,
          x: lastBlock.x,
          z: lastBlock.z,
          width: lastBlock.width,
          depth: lastBlock.depth,
        };
      } else {
        // Not perfect - slice the block
        if (direction === 'x') {
          newWidth = overlap;
          if (delta > 0) {
            // Block is to the right of the base
            newX = lastBlock.x + delta;
            // Create falling piece on the right
            const chopWidth = Math.abs(delta);
            newFallingBlocks.push({
              x: newX + overlap,
              y: currentBlock.y,
              z: currentBlock.z,
              width: chopWidth,
              depth: currentBlock.depth,
              height: BLOCK_HEIGHT,
              color: currentBlock.color,
              colorDark: currentBlock.colorDark,
              colorLight: currentBlock.colorLight,
              velocityY: 0,
              velocityX: 3,
              velocityZ: 0,
              rotation: 0,
              rotationSpeed: 0.15,
            });
          } else {
            // Block is to the left of the base
            newX = lastBlock.x + lastBlock.width - overlap - currentBlock.width + Math.abs(delta);
            newX = lastBlock.x - Math.abs(delta) + Math.abs(delta);
            newX = currentBlock.x + Math.abs(delta);
            // Create falling piece on the left
            const chopWidth = Math.abs(delta);
            newFallingBlocks.push({
              x: currentBlock.x,
              y: currentBlock.y,
              z: currentBlock.z,
              width: chopWidth,
              depth: currentBlock.depth,
              height: BLOCK_HEIGHT,
              color: currentBlock.color,
              colorDark: currentBlock.colorDark,
              colorLight: currentBlock.colorLight,
              velocityY: 0,
              velocityX: -3,
              velocityZ: 0,
              rotation: 0,
              rotationSpeed: -0.15,
            });
          }
        } else {
          newDepth = overlap;
          if (delta > 0) {
            // Block is in front
            newZ = lastBlock.z + delta;
            const chopDepth = Math.abs(delta);
            newFallingBlocks.push({
              x: currentBlock.x,
              y: currentBlock.y,
              z: newZ + overlap,
              width: currentBlock.width,
              depth: chopDepth,
              height: BLOCK_HEIGHT,
              color: currentBlock.color,
              colorDark: currentBlock.colorDark,
              colorLight: currentBlock.colorLight,
              velocityY: 0,
              velocityX: 0,
              velocityZ: 3,
              rotation: 0,
              rotationSpeed: 0.15,
            });
          } else {
            // Block is behind
            newZ = currentBlock.z + Math.abs(delta);
            const chopDepth = Math.abs(delta);
            newFallingBlocks.push({
              x: currentBlock.x,
              y: currentBlock.y,
              z: currentBlock.z,
              width: currentBlock.width,
              depth: chopDepth,
              height: BLOCK_HEIGHT,
              color: currentBlock.color,
              colorDark: currentBlock.colorDark,
              colorLight: currentBlock.colorLight,
              velocityY: 0,
              velocityX: 0,
              velocityZ: -3,
              rotation: 0,
              rotationSpeed: -0.15,
            });
          }
        }

        placedBlock = {
          ...currentBlock,
          x: direction === 'x' ? (delta > 0 ? lastBlock.x + delta : currentBlock.x + Math.abs(delta)) : lastBlock.x,
          z: direction === 'z' ? (delta > 0 ? lastBlock.z + delta : currentBlock.z + Math.abs(delta)) : lastBlock.z,
          width: direction === 'x' ? newWidth : currentBlock.width,
          depth: direction === 'z' ? newDepth : currentBlock.depth,
        };
      }

      const newBlocks = [...prev.blocks, placedBlock];
      const newScore = prev.score + 1;
      const newCombo = isPerfect ? prev.combo + 1 : 0;
      const newDirection = direction === 'x' ? 'z' : 'x';
      const newSpeed = Math.min(prev.speed + SPEED_INCREMENT, MAX_SPEED);

      colorHueRef.current = (colorHueRef.current + 20) % 360;
      const nextMovingBlock = createMovingBlock(placedBlock, newDirection, colorHueRef.current);

      playPlaceSound(newScore, isPerfect);

      return {
        ...prev,
        score: newScore,
        combo: newCombo,
        showPerfect: isPerfect,
        blocks: newBlocks,
        fallingBlocks: newFallingBlocks,
        movingBlock: nextMovingBlock,
        direction: newDirection,
        speed: newSpeed,
        position: -MOVE_RANGE,
        cameraY: placedBlock.y,
      };
    });

    // Hide perfect indicator after delay
    setTimeout(() => {
      setGameState((prev) => ({ ...prev, showPerfect: false }));
    }, 600);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState.status !== 'playing' && gameState.fallingBlocks.length === 0) return;

    const gameLoop = () => {
      setGameState((prev) => {
        let newPosition = prev.position;
        let updatedMovingBlock = prev.movingBlock;

        if (prev.status === 'playing' && prev.movingBlock) {
          newPosition = prev.position + prev.speed * directionRef.current;

          // Bounce at edges
          if (newPosition >= MOVE_RANGE) {
            newPosition = MOVE_RANGE;
            directionRef.current = -1;
          } else if (newPosition <= -MOVE_RANGE) {
            newPosition = -MOVE_RANGE;
            directionRef.current = 1;
          }

          // Update moving block position
          updatedMovingBlock = {
            ...prev.movingBlock,
            [prev.direction]: newPosition,
          };
        }

        // Update falling blocks
        const updatedFallingBlocks = prev.fallingBlocks
          .map((block) => ({
            ...block,
            y: block.y + block.velocityY,
            x: block.x + block.velocityX,
            z: block.z + block.velocityZ,
            velocityY: block.velocityY - 0.6,
            rotation: block.rotation + block.rotationSpeed,
          }))
          .filter((block) => block.y > -400);

        return {
          ...prev,
          position: newPosition,
          movingBlock: updatedMovingBlock,
          fallingBlocks: updatedFallingBlocks,
        };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.status, gameState.fallingBlocks.length > 0]);

  const handleInteraction = useCallback(() => {
    if (gameState.status === 'menu') {
      startGame();
    } else if (gameState.status === 'playing') {
      placeBlock();
    } else if (gameState.status === 'gameover') {
      startGame();
    }
  }, [gameState.status, startGame, placeBlock]);

  return {
    gameState,
    handleInteraction,
    startGame,
  };
};

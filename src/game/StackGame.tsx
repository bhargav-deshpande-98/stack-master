import React, { useEffect } from 'react';
import { useGameEngine } from './useGameEngine';
import { GameRenderer } from './GameRenderer';
import { GameUI } from './GameUI';

export const StackGame: React.FC = () => {
  const { gameState, handleInteraction, startGame } = useGameEngine();

  // Handle keyboard and touch events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteraction]);

  return (
    <div 
      className="game-container"
      onClick={handleInteraction}
      onTouchStart={(e) => {
        e.preventDefault();
        handleInteraction();
      }}
    >
      <GameRenderer
        blocks={gameState.blocks}
        fallingBlocks={gameState.fallingBlocks}
        movingBlock={gameState.movingBlock}
        cameraY={gameState.cameraY}
      />
      <GameUI gameState={gameState} onStart={startGame} />
    </div>
  );
};

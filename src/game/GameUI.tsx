import React from 'react';
import { GameState } from './types';

interface GameUIProps {
  gameState: GameState;
  onStart: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ gameState, onStart }) => {
  const { status, score, highScore, showPerfect, combo } = gameState;

  return (
    <>
      {/* Score Display */}
      {status === 'playing' && (
        <div className="score-display">{score}</div>
      )}

      {/* Tap instruction */}
      {status === 'playing' && score === 0 && (
        <div className="game-instruction">Tap to place block</div>
      )}

      {/* Perfect indicator */}
      {showPerfect && (
        <>
          <div className="perfect-indicator">PERFECT!</div>
          {combo > 1 && (
            <div className="combo-indicator">x{combo} Combo</div>
          )}
        </>
      )}

      {/* Menu overlay */}
      {status === 'menu' && (
        <div className="game-overlay">
          <h1 className="game-title">STACK</h1>
          <button className="game-button" onClick={onStart}>
            Start Game
          </button>
          {highScore > 0 && (
            <p className="mt-6 text-xl text-white/70">
              High Score: {highScore}
            </p>
          )}
        </div>
      )}

      {/* Game over overlay */}
      {status === 'gameover' && (
        <div className="game-overlay">
          <h2 className="text-3xl md:text-4xl font-bold text-white/80 mb-2">
            Game Over
          </h2>
          <p className="text-6xl md:text-8xl font-extrabold text-white mb-4">
            {score}
          </p>
          {score >= highScore && score > 0 && (
            <p className="text-xl text-yellow-300 mb-4 animate-pulse">
              🎉 New High Score!
            </p>
          )}
          <button className="game-button" onClick={onStart}>
            Play Again
          </button>
          <p className="mt-6 text-lg text-white/60">
            Best: {highScore}
          </p>
        </div>
      )}
    </>
  );
};

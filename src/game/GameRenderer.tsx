import React, { useRef, useEffect } from 'react';
import { Block, FallingBlock } from './types';

interface GameRendererProps {
  blocks: Block[];
  fallingBlocks: FallingBlock[];
  movingBlock: Block | null;
  cameraY: number;
}

const CANVAS_SCALE = 2; // For retina displays

export const GameRenderer: React.FC<GameRendererProps> = ({
  blocks,
  fallingBlocks,
  movingBlock,
  cameraY,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * CANVAS_SCALE;
      canvas.height = window.innerHeight * CANVAS_SCALE;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
    };

    resize();
    window.addEventListener('resize', resize);

    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw gradient background
    const bgHue = 145 + (cameraY / 20) % 60;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `hsl(${bgHue}, 50%, 85%)`);
    gradient.addColorStop(1, `hsl(${bgHue + 40}, 50%, 75%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Isometric projection settings
    const centerX = width / 2;
    const baseY = height * 0.75;
    const scale = Math.min(width, height) / 400;

    // Smooth camera follow
    const targetCameraY = cameraY * 0.8;

    // Convert 3D to 2D isometric
    const toIso = (x: number, y: number, z: number) => {
      const isoX = (x - z) * Math.cos(Math.PI / 6) * scale;
      const isoY = (x + z) * Math.sin(Math.PI / 6) * scale - y * scale + targetCameraY * scale;
      return {
        x: centerX + isoX,
        y: baseY + isoY,
      };
    };

    // Draw a block
    const drawBlock = (block: Block, opacity: number = 1) => {
      const { x, y, z, width: w, depth: d, height: h, color, colorDark, colorLight } = block;

      // Get corners
      const topFrontLeft = toIso(x, y + h, z + d);
      const topFrontRight = toIso(x + w, y + h, z + d);
      const topBackLeft = toIso(x, y + h, z);
      const topBackRight = toIso(x + w, y + h, z);
      const bottomFrontLeft = toIso(x, y, z + d);
      const bottomFrontRight = toIso(x + w, y, z + d);
      const bottomBackRight = toIso(x + w, y, z);

      ctx.globalAlpha = opacity;

      // Top face
      ctx.beginPath();
      ctx.moveTo(topFrontLeft.x, topFrontLeft.y);
      ctx.lineTo(topBackLeft.x, topBackLeft.y);
      ctx.lineTo(topBackRight.x, topBackRight.y);
      ctx.lineTo(topFrontRight.x, topFrontRight.y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Right face
      ctx.beginPath();
      ctx.moveTo(topFrontRight.x, topFrontRight.y);
      ctx.lineTo(topBackRight.x, topBackRight.y);
      ctx.lineTo(bottomBackRight.x, bottomBackRight.y);
      ctx.lineTo(bottomFrontRight.x, bottomFrontRight.y);
      ctx.closePath();
      ctx.fillStyle = colorDark;
      ctx.fill();

      // Front face
      ctx.beginPath();
      ctx.moveTo(topFrontLeft.x, topFrontLeft.y);
      ctx.lineTo(topFrontRight.x, topFrontRight.y);
      ctx.lineTo(bottomFrontRight.x, bottomFrontRight.y);
      ctx.lineTo(bottomFrontLeft.x, bottomFrontLeft.y);
      ctx.closePath();
      ctx.fillStyle = colorLight;
      ctx.fill();

      ctx.globalAlpha = 1;
    };

    // Draw all static blocks
    blocks.forEach((block) => {
      drawBlock(block);
    });

    // Draw moving block
    if (movingBlock) {
      drawBlock(movingBlock);
    }

    // Draw falling blocks
    fallingBlocks.forEach((block) => {
      const opacity = Math.max(0, 1 + block.y / 200);
      ctx.save();
      drawBlock(block, opacity);
      ctx.restore();
    });
  }, [blocks, fallingBlocks, movingBlock, cameraY]);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
    />
  );
};

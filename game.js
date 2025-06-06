
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play, Pause } from 'lucide-react';

interface Rock {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  mass: number;
  type: 'granite' | 'marble' | 'obsidian' | 'sandstone';
}

const ROCK_TYPES = {
  granite: { color: '#8B7355', density: 1.2, bounce: 0.6 },
  marble: { color: '#F5F5DC', density: 1.0, bounce: 0.7 },
  obsidian: { color: '#36454F', density: 1.5, bounce: 0.5 },
  sandstone: { color: '#FAD5A5', density: 0.8, bounce: 0.8 }
};

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rocksRef = useRef<Rock[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, startX: 0, startY: 0 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [rockCount, setRockCount] = useState(0);

  const createRock = useCallback((x: number, y: number, vx = 0, vy = 0) => {
    const types = Object.keys(ROCK_TYPES) as Array<keyof typeof ROCK_TYPES>;
    const type = types[Math.floor(Math.random() * types.length)];
    const radius = 15 + Math.random() * 25;
    
    const rock: Rock = {
      id: Date.now() + Math.random(),
      x,
      y,
      vx,
      vy,
      radius,
      color: ROCK_TYPES[type].color,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      mass: radius * ROCK_TYPES[type].density,
      type
    };
    
    rocksRef.current.push(rock);
    setRockCount(rocksRef.current.length);
  }, []);

  const updatePhysics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gravity = 0.5;
    const friction = 0.98;
    const airResistance = 0.999;

    rocksRef.current.forEach((rock, index) => {
      // Apply gravity
      rock.vy += gravity;
      
      // Apply air resistance
      rock.vx *= airResistance;
      rock.vy *= airResistance;
      
      // Update position
      rock.x += rock.vx;
      rock.y += rock.vy;
      
      // Update rotation
      rock.rotation += rock.rotationSpeed;
      
      // Bounce off walls
      if (rock.x - rock.radius < 0) {
        rock.x = rock.radius;
        rock.vx = -rock.vx * ROCK_TYPES[rock.type].bounce;
        rock.rotationSpeed *= -0.5;
      }
      if (rock.x + rock.radius > canvas.width) {
        rock.x = canvas.width - rock.radius;
        rock.vx = -rock.vx * ROCK_TYPES[rock.type].bounce;
        rock.rotationSpeed *= -0.5;
      }
      
      // Bounce off floor and ceiling
      if (rock.y - rock.radius < 0) {
        rock.y = rock.radius;
        rock.vy = -rock.vy * ROCK_TYPES[rock.type].bounce;
      }
      if (rock.y + rock.radius > canvas.height) {
        rock.y = canvas.height - rock.radius;
        rock.vy = -rock.vy * ROCK_TYPES[rock.type].bounce;
        rock.vx *= friction;
        rock.rotationSpeed *= 0.9;
      }
      
      // Rock-to-rock collision
      for (let j = index + 1; j < rocksRef.current.length; j++) {
        const other = rocksRef.current[j];
        const dx = other.x - rock.x;
        const dy = other.y - rock.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = rock.radius + other.radius;
        
        if (distance < minDistance) {
          // Separate rocks
          const angle = Math.atan2(dy, dx);
          const overlap = minDistance - distance;
          const separationX = Math.cos(angle) * overlap * 0.5;
          const separationY = Math.sin(angle) * overlap * 0.5;
          
          rock.x -= separationX;
          rock.y -= separationY;
          other.x += separationX;
          other.y += separationY;
          
          // Exchange velocities based on mass
          const totalMass = rock.mass + other.mass;
          const rockNewVx = (rock.vx * (rock.mass - other.mass) + 2 * other.mass * other.vx) / totalMass;
          const rockNewVy = (rock.vy * (rock.mass - other.mass) + 2 * other.mass * other.vy) / totalMass;
          const otherNewVx = (other.vx * (other.mass - rock.mass) + 2 * rock.mass * rock.vx) / totalMass;
          const otherNewVy = (other.vy * (other.mass - rock.mass) + 2 * rock.mass * rock.vy) / totalMass;
          
          rock.vx = rockNewVx * 0.8;
          rock.vy = rockNewVy * 0.8;
          other.vx = otherNewVx * 0.8;
          other.vy = otherNewVy * 0.8;
        }
      }
    });
  }, []);

  const drawRock = useCallback((ctx: CanvasRenderingContext2D, rock: Rock) => {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rotation);
    
    // Create rock gradient
    const gradient = ctx.createRadialGradient(-rock.radius * 0.3, -rock.radius * 0.3, 0, 0, 0, rock.radius);
    gradient.addColorStop(0, rock.color);
    gradient.addColorStop(0.7, rock.color);
    gradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    // Draw irregular rock shape
    const points = 8;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation = rock.radius * (0.8 + Math.sin(i * 2.5 + rock.id) * 0.2);
      const x = Math.cos(angle) * radiusVariation;
      const y = Math.sin(angle) * radiusVariation;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add rock texture
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#4F46E5');
    gradient.addColorStop(0.5, '#7C3AED');
    gradient.addColorStop(1, '#EC4899');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (isPlaying) {
      updatePhysics();
    }
    
    // Draw all rocks
    rocksRef.current.forEach(rock => drawRock(ctx, rock));
    
    // Draw trajectory line when dragging
    if (mouseRef.current.isDown) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(mouseRef.current.startX, mouseRef.current.startY);
      ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, updatePhysics, drawRock]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    mouseRef.current = { x, y, isDown: true, startX: x, startY: y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!mouseRef.current.isDown) return;
    
    const dx = mouseRef.current.x - mouseRef.current.startX;
    const dy = mouseRef.current.y - mouseRef.current.startY;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.2, 20);
    
    createRock(
      mouseRef.current.startX,
      mouseRef.current.startY,
      dx * 0.1,
      dy * 0.1
    );
    
    mouseRef.current.isDown = false;
  }, [createRock]);

  const clearRocks = useCallback(() => {
    rocksRef.current = [];
    setRockCount(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const spawnRandomRock = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    createRock(
      Math.random() * canvas.width,
      -50,
      (Math.random() - 0.5) * 10,
      Math.random() * 5
    );
  }, [createRock]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start animation
    animate();
    
    // Add some initial rocks
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnRandomRock(), i * 500);
      }
    }, 1000);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, spawnRandomRock]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* UI Controls */}
      <div className="absolute top-6 left-6 z-10 space-y-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white">
          <h1 className="text-2xl font-bold mb-2">Rock Physics Sim</h1>
          <p className="text-sm opacity-90">Drag to throw rocks • {rockCount} rocks</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={togglePlayPause}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-white"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={spawnRandomRock}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-white"
          >
            Drop Rock
          </Button>
          
          <Button
            onClick={clearRocks}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white max-w-xs">
          <h3 className="font-semibold mb-2">How to play:</h3>
          <ul className="text-sm space-y-1 opacity-90">
            <li>• Drag and release to throw rocks</li>
            <li>• Watch realistic physics in action</li>
            <li>• Rocks collide and bounce naturally</li>
            <li>• Use controls to pause or add more rocks</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Index;

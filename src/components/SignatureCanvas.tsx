/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (base64Image: string) => void;
  onClear: () => void;
}

export default function SignatureCanvas({ onSave, onClear }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High definition scale setup
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Initial brush properties
    ctx.strokeStyle = '#1e3a8a'; // Corporate Blue Stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: MouseEvent | TouchEvent | globalThis.MouseEvent | globalThis.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling on touch devices
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);

    // Trigger save callback with base64 content
    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative border border-slate-200 bg-white rounded-lg overflow-hidden h-40 shadow-inner flex flex-col justify-center items-center">
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-slate-400 text-sm gap-1">
            <span className="flex items-center gap-1.5 font-medium"><PenTool className="w-4 h-4" /> Assine aqui</span>
            <span className="text-xs text-slate-300">Desenhe utilizando o mouse ou seu dedo</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none select-none z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Dash signing line indicator */}
        <div className="absolute bottom-8 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none z-0" />
      </div>

      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
        <span>Assinatura digital auditada</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center gap-1 text-red-500 hover:text-red-700 font-medium active:scale-95 transition"
        >
          <Eraser className="w-3.5 h-3.5" /> Limpar assinatura
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { createRenderer } from './renderer';

export function Example() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer({ canvas });
    let announced = false;
    void renderer.ready.then(() => {
      const controller = renderer.getWebMcpController();
      if (!controller) return;
      announced = true;
      window.dispatchEvent(new CustomEvent('vgpu-webmcp-controller', {
        detail: { slug: 'anti-aliasing', controller },
      }));
    });
    return () => {
      if (announced) {
        window.dispatchEvent(new CustomEvent('vgpu-webmcp-controller', {
          detail: { slug: 'anti-aliasing' },
        }));
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

export default Example;

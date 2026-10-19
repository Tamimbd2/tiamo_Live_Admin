import { useEffect, useRef } from "react";
import { Parser, Player } from "svga.lite";

export const SVGAPreview = ({ url }: { url: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let player: Player | null = null;
    let isMounted = true;

    const loadSVGA = async () => {
      if (!canvasRef.current) return;
      try {
        const parser = new Parser();
        player = new Player(canvasRef.current);
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const videoItem = await parser.do(buffer);
        
        if (isMounted && player) {
          await player.mount(videoItem);
          player.start();
        }
      } catch (e) {
        console.error("SVGA Load Error:", e);
      }
    };

    loadSVGA();

    return () => {
      isMounted = false;
      if (player) {
        player.destroy();
      }
    };
  }, [url]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
};

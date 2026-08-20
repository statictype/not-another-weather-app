import { useEffect, useRef } from "react";
import type { SkyDriver } from "./sky/driver";
import { type Framing, SkyView, type ViewOptions } from "./sky/sky-view";

/**
 * Binds a canvas to a `SkyView` registered with `driver`. The view is created
 * once; framing changes are pushed without rebuilding the WebGL context.
 */
export function useSkyView(
  driver: SkyDriver | null,
  options: ViewOptions,
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<SkyView | null>(null);
  // Captured at first render: the view is built once, then updated through
  // `setFraming` / `setQuality` rather than being rebuilt.
  const optionsRef = useRef(options);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !driver) return;

    const view = new SkyView(canvas, optionsRef.current);
    viewRef.current = view;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      view.resize(rect.width, rect.height, window.devicePixelRatio);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    driver.add(view);

    return () => {
      observer.disconnect();
      driver.remove(view);
      view.dispose();
      viewRef.current = null;
    };
  }, [driver]);

  const { fov, pitch, yaw } = options.framing;
  useEffect(() => {
    viewRef.current?.setFraming({ fov, pitch, yaw } satisfies Framing);
  }, [fov, pitch, yaw]);

  const { steps, cloudScale } = options;
  useEffect(() => {
    if (steps === undefined || cloudScale === undefined) return;
    viewRef.current?.setQuality(steps, cloudScale);
  }, [steps, cloudScale]);

  return canvasRef;
}

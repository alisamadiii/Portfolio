"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Figma-style pan/zoom camera. The live camera lives in a ref and is written
 * to the world container's `transform` inside a rAF — panning never touches
 * React state. The camera is committed to state once per ~120ms of gesture
 * idle; that single commit drives culling.
 */

export type Camera = { x: number; y: number; scale: number };

const SCALE_MIN = 0.02;
const SCALE_MAX = 1.5;
const COMMIT_DEBOUNCE_MS = 120;
const DRAG_THRESHOLD_PX = 4;

const clampScale = (scale: number) =>
  Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale));

export function useCanvasCamera(initial: Camera = { x: 0, y: 0, scale: 0.15 }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>(initial);
  const [committed, setCommitted] = useState<Camera>(initial);
  const rafRef = useRef<number | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureActiveRef = useRef(false);

  const apply = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { x, y, scale } = cameraRef.current;
      const world = worldRef.current;
      if (world) {
        world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      }
    });
  }, []);

  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      setGestureActive(false);
      setCommitted({ ...cameraRef.current });
    }, COMMIT_DEBOUNCE_MS);
  }, []);

  // Iframes swallow pointer/wheel events — disable their hit-testing during
  // gestures via a data attribute + CSS (single class toggle, no re-render).
  const setGestureActive = (active: boolean) => {
    if (gestureActiveRef.current === active) return;
    gestureActiveRef.current = active;
    worldRef.current?.toggleAttribute("data-panning", active);
  };

  /** Programmatic camera move (fit-all, zoom buttons) — commits immediately. */
  const setCamera = useCallback(
    (next: Camera) => {
      cameraRef.current = { ...next, scale: clampScale(next.scale) };
      apply();
      setCommitted({ ...cameraRef.current });
    },
    [apply]
  );

  // Animated camera move (engage zoom, fit-all). Plain cubic ease-in-out —
  // no spring/overshoot. Interrupted by any user gesture.
  const animRef = useRef<number | null>(null);

  const cancelAnimation = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
      setGestureActive(false);
    }
  }, []);

  const animateTo = useCallback(
    (target: Camera, duration = 450) => {
      cancelAnimation();
      const from = { ...cameraRef.current };
      const to = { ...target, scale: clampScale(target.scale) };
      const start = performance.now();
      const ease = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setGestureActive(true);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = ease(t);
        cameraRef.current = {
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e,
          scale: from.scale + (to.scale - from.scale) * e,
        };
        const world = worldRef.current;
        if (world) {
          const { x, y, scale } = cameraRef.current;
          world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        }
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
          setGestureActive(false);
          setCommitted({ ...cameraRef.current });
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [cancelAnimation]
  );

  const zoomAtPoint = useCallback(
    (nextScale: number, clientX: number, clientY: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      const { x, y, scale } = cameraRef.current;
      const clamped = clampScale(nextScale);
      const ratio = clamped / scale;
      cameraRef.current = {
        x: cx - (cx - x) * ratio,
        y: cy - (cy - y) * ratio,
        scale: clamped,
      };
      apply();
      scheduleCommit();
    },
    [apply, scheduleCommit]
  );

  // Wheel: pinch/ctrl = zoom-to-cursor, plain wheel = pan. Non-passive so we
  // can stop the browser's page zoom/scroll.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimation();
      setGestureActive(true);
      if (event.ctrlKey || event.metaKey) {
        const next =
          cameraRef.current.scale * Math.exp(-event.deltaY * 0.0015);
        zoomAtPoint(next, event.clientX, event.clientY);
      } else {
        cameraRef.current = {
          ...cameraRef.current,
          x: cameraRef.current.x - event.deltaX,
          y: cameraRef.current.y - event.deltaY,
        };
        apply();
        scheduleCommit();
      }
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [apply, scheduleCommit, zoomAtPoint, cancelAnimation]);

  // Drag-to-pan. Attached at the viewport; anything inside
  // `[data-canvas-no-pan]` (toolbar, engaged frame) opts out. A press that
  // never crosses the threshold stays a click (select/engage on the frame).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let panning = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-canvas-no-pan]")
      )
        return;
      panning = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      // Don't capture yet — pointer capture retargets the subsequent
      // click/dblclick to the viewport, which would swallow frame
      // select/engage clicks. Capture starts on the first real drag move.
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!panning) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      if (!moved) viewport.setPointerCapture(event.pointerId);
      cancelAnimation();
      moved = true;
      setGestureActive(true);
      lastX = event.clientX;
      lastY = event.clientY;
      cameraRef.current = {
        ...cameraRef.current,
        x: cameraRef.current.x + dx,
        y: cameraRef.current.y + dy,
      };
      apply();
    };

    const endPan = (event: PointerEvent) => {
      if (!panning) return;
      panning = false;
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      if (moved) {
        // Suppress the trailing click after a real drag.
        const swallowClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        viewport.addEventListener("click", swallowClick, {
          capture: true,
          once: true,
        });
        scheduleCommit();
      }
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endPan);
    viewport.addEventListener("pointercancel", endPan);
    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endPan);
      viewport.removeEventListener("pointercancel", endPan);
    };
  }, [apply, scheduleCommit, cancelAnimation]);

  // Re-apply the current camera whenever the hook (re)mounts: the world div
  // renders without a `transform`, and a pending apply/animate rAF canceled by
  // a previous unmount (StrictMode double-mount, fast route changes) would
  // otherwise leave it at scale 1 while the committed state — and the zoom
  // percentage — still hold the real camera.
  useEffect(() => {
    const { x, y, scale } = cameraRef.current;
    const world = worldRef.current;
    if (world) {
      world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        // Reset, or `apply()` after a remount sees the stale id and no-ops
        // forever — camera state keeps moving but the transform never updates.
        rafRef.current = null;
      }
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    },
    []
  );

  /** Fit a world-space bounding box into the viewport (90% padding). */
  const fitBounds = useCallback(
    (
      bounds: { x: number; y: number; width: number; height: number },
      options?: { animate?: boolean; padding?: number; maxScale?: number }
    ) => {
      const viewport = viewportRef.current;
      if (!viewport || bounds.width <= 0 || bounds.height <= 0) return;
      const rect = viewport.getBoundingClientRect();
      const padding = options?.padding ?? 0.9;
      let scale = clampScale(
        Math.min(rect.width / bounds.width, rect.height / bounds.height) *
          padding
      );
      if (options?.maxScale) scale = Math.min(scale, options.maxScale);
      const target = {
        x: (rect.width - bounds.width * scale) / 2 - bounds.x * scale,
        y: (rect.height - bounds.height * scale) / 2 - bounds.y * scale,
        scale,
      };
      if (options?.animate) animateTo(target);
      else setCamera(target);
    },
    [setCamera, animateTo]
  );

  return {
    viewportRef,
    worldRef,
    cameraRef,
    committed,
    setCamera,
    animateTo,
    zoomAtPoint,
    fitBounds,
  };
}

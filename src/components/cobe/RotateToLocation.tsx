import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import { useCobeStore } from "@/context/Cobe";

export function RotateToLocationCobe() {
  const { markers } = useCobeStore();

  const canvasRef: any = useRef();
  const locationToAngles = (lat: number, long: number) => {
    return [
      Math.PI - ((long * Math.PI) / 180 - Math.PI / 2),
      (lat * Math.PI) / 180,
    ];
  };
  const focusRef = useRef([0, 0]);
  useEffect(() => {
    let width = 0;
    let currentPhi = 0;
    let currentTheta = 0;
    const doublePi = Math.PI * 2;
    const onResize = () =>
      canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener("resize", onResize);
    onResize();
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: 16000,
      mapBrightness: 1.2,
      baseColor: [1, 1, 1],
      markerColor: [251 / 255, 200 / 255, 21 / 255],
      glowColor: [1.2, 1.2, 1.2],
      markers,
      onRender: (state) => {
        state.phi = currentPhi;
        state.theta = currentTheta;
        const [focusPhi, focusTheta] = focusRef.current;
        const distPositive = (focusPhi - currentPhi + doublePi) % doublePi;
        const distNegative = (currentPhi - focusPhi + doublePi) % doublePi;
        // Control the speed
        if (distPositive < distNegative) {
          currentPhi += distPositive * 0.08;
        } else {
          currentPhi -= distNegative * 0.08;
        }
        currentTheta = currentTheta * 0.92 + focusTheta * 0.08;
        state.width = width * 2;
        state.height = width * 2;
      },
    });
    setTimeout(() => (canvasRef.current.style.opacity = "1"));
    return () => globe.destroy();
  }, [markers]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        margin: "auto",
        position: "relative",
      }}
    >
      <motion.canvas
        initial={{ opacity: 0, scale: 0.8, rotate: 30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotate: 30 }}
        transition={{ type: "spring" }}
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          contain: "layout paint size",
          aspectRatio: 1,
          opacity: 0,
          transition: "opacity 1s ease",
        }}
      />
      <div
        className="flex flex-col items-center justify-center md:flex-row"
        style={{ gap: ".5rem" }}
      >
        <Button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          size={"sm"}
          onClick={() => {
            focusRef.current = locationToAngles(36.286209, 59.5998);
          }}
        >
          Mashhad
        </Button>
        <Button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          size={"sm"}
          onClick={() => {
            focusRef.current = locationToAngles(-5.147665, 119.432732);
          }}
        >
          Makassar
        </Button>
        <Button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          size={"sm"}
          onClick={() => {
            focusRef.current = locationToAngles(34.555347, 69.207489);
          }}
        >
          Kabul
        </Button>
      </div>
    </div>
  );
}

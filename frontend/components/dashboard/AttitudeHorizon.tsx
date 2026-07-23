"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Elemento de firma (ver docs/DESIGN_NOTES.md): un horizonte artificial de
 * cabina que entra inclinado y se nivela al montar, como un instrumento
 * estabilizándose tras el encendido. Puramente decorativo/ambiental —
 * pointer-events-none, no interactivo.
 */
export function AttitudeHorizon() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <motion.div
        initial={reduceMotion ? { rotate: 0, y: 0 } : { rotate: -8, y: 24 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="h-1/2 w-full bg-gradient-to-b from-aero-500/40 via-aero-500/15 to-transparent" />
        <div className="h-1/2 w-full bg-gradient-to-b from-ground/35 via-ground/10 to-transparent" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-mist/30" />
      </motion.div>
    </div>
  );
}

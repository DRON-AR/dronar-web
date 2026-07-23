"use client";

import { motion } from "framer-motion";
import { AttitudeHorizon } from "./AttitudeHorizon";

export function HeroWelcome({ fullName, roleLabel }: { fullName: string; roleLabel: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-aero-700/40 bg-aero-900/50 px-8 py-12 backdrop-blur-xl sm:px-12">
      <AttitudeHorizon />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative"
      >
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-signal">
          Camper Aeronautical
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-mist sm:text-5xl">
          Bienvenido, {fullName}
        </h1>
        <p className="mt-2 text-mist/70">{roleLabel}</p>
      </motion.div>
    </div>
  );
}

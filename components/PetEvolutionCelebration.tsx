"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PetAvatar from "@/components/PetAvatar";
import { STAGE_LABEL } from "@/lib/pets";
import type { PetStage } from "@/lib/types";
import type { PetSpecies, PetVariant, PetAccessory } from "@/lib/pets";

const CONFETTI_COLORS = ["#FFD25E", "#FF6A1A", "#FF3D93", "#7A21F0", "#1673E0", "#5FBF8F", "#FFFFFF"];

/**
 * Overlay ăn mừng khi pet TIẾN HÓA lên 1 giai đoạn mới — confetti bắn tung tóe
 * bằng Framer Motion + pet phóng to nhún nhảy + tên giai đoạn mới.
 * Được kích hoạt bởi ChatHeader khi phát hiện `pet.stage` đổi sang mức cao hơn.
 */
export default function PetEvolutionCelebration({
  petName,
  species,
  stage,
  variant,
  accessory,
  onDone,
}: {
  petName: string;
  species: PetSpecies;
  stage: PetStage;
  variant: PetVariant;
  accessory: PetAccessory;
  onDone: () => void;
}) {
  const [particles] = useState(() =>
    Array.from({ length: 26 }).map((_, i) => {
      const angle = (i / 26) * 360 + Math.random() * 12;
      return {
        id: i,
        angle,
        dist: 90 + Math.random() * 150,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 7,
        delay: Math.random() * 0.18,
        spin: Math.random() > 0.5 ? 180 : -180,
      };
    })
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDone}
      >
        <motion.div
          className="relative flex flex-col items-center px-6"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute rounded-full"
                style={{ width: p.size, height: p.size, background: p.color }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: Math.cos((p.angle * Math.PI) / 180) * p.dist,
                  y: Math.sin((p.angle * Math.PI) / 180) * p.dist,
                  opacity: 0,
                  rotate: p.spin,
                }}
                transition={{ duration: 1.15, delay: p.delay, ease: "easeOut" }}
              />
            ))}
          </div>

          <motion.div
            animate={{ y: [0, -16, 0], rotate: [0, -4, 4, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            <PetAvatar
              species={species}
              stage={stage}
              mood="happy"
              variant={variant}
              accessory={accessory}
              size={168}
              interactive={false}
              excited
            />
          </motion.div>

          <motion.p
            className="mt-3 text-center text-lg font-bold text-white drop-shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            🎉 {petName} đã tiến hóa thành {STAGE_LABEL[stage]}!
          </motion.p>
          <motion.p
            className="mt-1 text-center text-xs text-white/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Cả hai đã cùng nhau giữ chuỗi thật tốt 💛
          </motion.p>

          <motion.button
            type="button"
            onClick={onDone}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 rounded-full bg-white px-6 py-2 text-sm font-semibold text-[var(--foreground)] shadow-md active:scale-95"
          >
            Tuyệt vời!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

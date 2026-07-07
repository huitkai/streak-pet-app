"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PetMood, PetStage } from "@/lib/types";
import type { PetSpecies, PetVariant, PetAccessory } from "@/lib/pets";
import PetAvatar from "@/components/PetAvatar";

/**
 * Pet "sống" trong khung chat: tự đi lang thang trong vùng nhìn thấy được,
 * giống thú cưng ảo kiểu TikTok LIVE. Mood càng vui thì đi càng nhanh & hay
 * nhảy nhót; mood buồn/ốm thì đứng yên một góc.
 * Người dùng có thể CẦM VÀ KÉO pet đi bất kỳ đâu trong khung chat — pet sẽ
 * đứng yên tại chỗ được thả một lúc rồi mới tự đi lang thang trở lại.
 * bumpKey: đổi giá trị này (vd theo số lượng tin nhắn) để pet "giật mình vui vẻ"
 * mỗi khi có tin nhắn mới.
 */
export default function FloatingPet({
  species,
  stage,
  mood,
  variant = "radiant",
  accessory = "none",
  bumpKey,
  hidden = false,
}: {
  species: PetSpecies;
  stage: PetStage;
  mood: PetMood;
  variant?: PetVariant;
  accessory?: PetAccessory;
  bumpKey?: number;
  hidden?: boolean;
}) {
  const [pos, setPos] = useState({ x: 72, y: 60 }); // % trong container
  const [flip, setFlip] = useState(false);
  const [bump, setBump] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastBump = useRef(bumpKey);
  const dragInfo = useRef<{ pointerId: number; moved: boolean } | null>(null);
  const resumeRoamAt = useRef(0);

  const isLively = mood === "happy" || mood === "neutral";
  const canRoam = stage !== "egg" && mood !== "sick";

  useEffect(() => {
    if (!canRoam) return;
    const interval = window.setInterval(
      () => {
        if (dragging || Date.now() < resumeRoamAt.current) return;
        setPos((prev) => {
          const nx = Math.max(8, Math.min(88, prev.x + (Math.random() * 50 - 25)));
          const ny = Math.max(10, Math.min(78, prev.y + (Math.random() * 40 - 20)));
          setFlip(nx < prev.x);
          return { x: nx, y: ny };
        });
      },
      isLively ? 3200 : 5200
    );
    return () => window.clearInterval(interval);
  }, [canRoam, isLively, dragging]);

  useEffect(() => {
    if (bumpKey === undefined || bumpKey === lastBump.current) return;
    lastBump.current = bumpKey;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 650);
    return () => window.clearTimeout(t);
  }, [bumpKey]);

  function posFromPointer(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.max(6, Math.min(94, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = { pointerId: e.pointerId, moved: false };
    setDragging(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current || dragInfo.current.pointerId !== e.pointerId) return;
    const next = posFromPointer(e.clientX, e.clientY);
    if (!next) return;
    dragInfo.current.moved = true;
    setPos((prev) => {
      setFlip(next.x < prev.x);
      return next;
    });
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragInfo.current?.pointerId === e.pointerId) {
      dragInfo.current = null;
    }
    setDragging(false);
    // Đứng yên tại chỗ vừa thả trong ~4s trước khi lại tự lang thang,
    // để người dùng cảm nhận được là mình vừa "đặt" pet vào đúng vị trí đó.
    resumeRoamAt.current = Date.now() + 4000;
  }

  if (hidden) return null;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden={false}>
      <div
        className={`pointer-events-auto absolute touch-none select-none p-2 ${
          dragging ? "" : "transition-[left,top] duration-[2800ms] ease-in-out"
        }`}
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: `translate(-50%, -50%) scaleX(${flip ? -1 : 1}) scale(${dragging ? 1.12 : 1})`,
          cursor: dragging ? "grabbing" : "grab",
          filter: dragging ? "drop-shadow(0 10px 14px rgba(0,0,0,0.25))" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className={dragging ? "" : bump ? "animate-shake" : "animate-float-slow"}>
          <PetAvatar species={species} stage={stage} mood={mood} variant={variant} accessory={accessory} size={64} interactive />
        </div>
      </div>
    </div>
  );
}

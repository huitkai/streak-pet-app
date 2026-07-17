import PetAvatar from "@/components/PetAvatar";
import { SparkleIcon } from "@/components/icons";
import { SPECIES_LABEL, SPECIES_DESC, STAGE_LABEL, variantForCouple, type PetSpecies } from "@/lib/pets";
import type { PetAccessoryValue } from "@/lib/types";

/**
 * Card giới thiệu thú cưng chung của cặp đôi — dựng theo bố cục "session
 * card" trong mẫu tham khảo: pill nhãn góc trên, ảnh/nhân vật ở giữa, một
 * dòng "coach" (ai đang nuôi cùng), rồi các dòng thông tin có gạch chân ngăn
 * cách (giống Cost / Session Time trong mẫu) thay vì khối text đơn giản.
 *
 * Toàn bộ card giờ là MỘT mặt kính (translucent + backdrop-blur) thay vì nền
 * trắng đặc như trước, cùng ngôn ngữ hiệu ứng glass với phần hero — vì vậy
 * cần đặt trong <AmbientGlow> (xem page.tsx) để phía sau có màu cho lớp
 * kính "mượn" mà tạo độ sâu, tránh kính trong suốt trên nền trắng trơn.
 */
export default function PetShowcaseCard({
  coupleId,
  petName,
  species,
  stage,
  accessory,
  activeDays,
  isSelf,
}: {
  coupleId: string;
  petName: string;
  species: PetSpecies;
  stage: "egg" | "baby" | "teen" | "adult" | "legendary";
  accessory: PetAccessoryValue;
  activeDays: number;
  isSelf: boolean;
}) {
  return (
    <div className="relative z-10 mx-4 mb-6 mt-2 overflow-hidden rounded-[28px] border border-white/60 bg-white/45 shadow-[0_10px_36px_-14px_rgba(44,34,48,0.28)] backdrop-blur-2xl">
      <div className="relative flex flex-col items-center px-5 pb-5 pt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(120%_100%_at_50%_0%,var(--brand-light),transparent_72%)] opacity-80"
        />

        <span className="relative inline-flex items-center gap-1 self-start rounded-full border border-white/70 bg-white/55 px-3 py-1 text-[11px] font-semibold text-[var(--brand-dark)] backdrop-blur-md">
          🐾 Thú cưng chung
        </span>

        <div className="relative mt-1">
          <PetAvatar
            species={species}
            stage={stage}
            mood="happy"
            variant={variantForCouple(coupleId, species)}
            accessory={accessory}
            size={92}
            interactive={false}
          />
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/70 text-[var(--brand)] shadow-sm backdrop-blur-md">
            <SparkleIcon className="h-4 w-4" />
          </span>
        </div>

        <p className="relative mt-3 text-lg font-bold text-[var(--foreground)]">{petName}</p>
        <p className="relative text-xs text-[var(--muted)]">{SPECIES_DESC[species]}</p>
      </div>

      <div className="px-5 py-1">
        <div className="flex items-center gap-2.5 border-b border-white/50 py-3.5">
          <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]" />
          <p className="text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">Được nuôi bởi</span>{" "}
            <span className="font-semibold">{isSelf ? "cả hai bạn" : "bạn và đối phương"}</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-b border-white/50 py-3.5 text-sm">
          <span className="text-[var(--muted)]">Loài</span>
          <span className="font-semibold text-[var(--foreground)]">{SPECIES_LABEL[species]}</span>
        </div>

        <div className="flex items-center justify-between border-b border-white/50 py-3.5 text-sm">
          <span className="text-[var(--muted)]">Giai đoạn</span>
          <span className="font-semibold text-[var(--foreground)]">{STAGE_LABEL[stage]}</span>
        </div>

        <div className="flex items-center justify-between py-3.5 text-sm">
          <span className="text-[var(--muted)]">Ngày cùng nuôi</span>
          <span className="font-semibold text-[var(--foreground)]">{activeDays.toLocaleString("vi-VN")} ngày</span>
        </div>
      </div>
    </div>
  );
}

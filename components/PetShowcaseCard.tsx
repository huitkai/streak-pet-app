import PetAvatar from "@/components/PetAvatar";
import { SparkleIcon } from "@/components/icons";
import { SPECIES_LABEL, SPECIES_DESC, STAGE_LABEL, variantForCouple, type PetSpecies } from "@/lib/pets";
import type { PetAccessoryValue } from "@/lib/types";

/**
 * Card giới thiệu thú cưng chung của cặp đôi — dựng theo bố cục "session
 * card" trong mẫu tham khảo: pill nhãn góc trên, ảnh/nhân vật ở giữa, một
 * dòng "coach" (ai đang nuôi cùng), rồi các dòng thông tin có gạch chân ngăn
 * cách (giống Cost / Session Time trong mẫu) thay vì khối text đơn giản.
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
    <div className="mx-4 mb-6 mt-2 overflow-hidden rounded-[28px] bg-[var(--surface)] shadow-[0_10px_36px_-14px_rgba(44,34,48,0.28)]">
      <div className="relative flex flex-col items-center bg-gradient-to-b from-[var(--brand-light)] to-[var(--surface)] px-5 pb-5 pt-6">
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[var(--brand-dark)] backdrop-blur">
          🐾 Thú cưng chung
        </span>

        <div className="relative">
          <PetAvatar
            species={species}
            stage={stage}
            mood="happy"
            variant={variantForCouple(coupleId, species)}
            accessory={accessory}
            size={92}
            interactive={false}
          />
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--brand)] shadow-sm">
            <SparkleIcon className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-3 text-lg font-bold text-[var(--foreground)]">{petName}</p>
        <p className="text-xs text-[var(--muted)]">{SPECIES_DESC[species]}</p>
      </div>

      <div className="px-5 py-1">
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] py-3.5">
          <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)]" />
          <p className="text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">Được nuôi bởi</span>{" "}
            <span className="font-semibold">{isSelf ? "cả hai bạn" : "bạn và đối phương"}</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border)] py-3.5 text-sm">
          <span className="text-[var(--muted)]">Loài</span>
          <span className="font-semibold text-[var(--foreground)]">{SPECIES_LABEL[species]}</span>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border)] py-3.5 text-sm">
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

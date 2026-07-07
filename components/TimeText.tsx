"use client";

import { useEffect, useState } from "react";
import { formatMessageTime } from "@/lib/message-format";

/**
 * `formatMessageTime` phụ thuộc vào `new Date()` (giờ "hiện tại") và
 * timezone của máy chạy code. Server Next.js thường chạy ở UTC, còn trình
 * duyệt của người dùng chạy theo giờ địa phương (vi-VN, UTC+7) — nên HTML
 * server render ra và HTML client hydrate có thể khác nhau (khác giờ, khác
 * "Hôm qua"/"Hôm nay", thậm chí khác thứ). React phát hiện text mismatch
 * này và ném lỗi #418, làm sập cả trang khi vào 1 đoạn chat trên PC.
 *
 * Fix: không tính giờ khi render trên server — chỉ tính sau khi đã mount ở
 * client, y hệt cách các app chat lớn né lỗi hydration cho nội dung phụ
 * thuộc thời gian/thiết bị.
 */
export default function TimeText({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(formatMessageTime(iso));
  }, [iso]);

  // Giữ chỗ rỗng (không render text) ở lần render đầu tiên trên client để
  // khớp với HTML server — tránh nội dung "nhấp nháy" gây lệch layout.
  return <span className={className} suppressHydrationWarning>{text ?? "\u00A0"}</span>;
}

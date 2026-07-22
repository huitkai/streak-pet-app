"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { themeCssVars, DEFAULT_THEME_COLOR } from "@/lib/theme";
import type { Couple, PetAccessoryValue } from "@/lib/types";

interface ChatThemeContextValue {
  themeColor: string;
  /** Cập nhật optimistic ngay khi sheet lưu thành công/đang lưu — KHÔNG tự
   * gọi server action, chỉ đổi state hiển thị (server action gọi riêng ở
   * ChatSettingsSheet). */
  setThemeColor: (hex: string) => void;
  /** phụ kiện thú cưng hiện tại của couple — gộp chung vào đây vì trước đó
   * ChatHeader tự mở 1 channel `header-couple-${coupleId}` riêng chỉ để lấy
   * đúng field này, trong khi Provider này đã mở sẵn 1 channel khác lắng
   * nghe CÙNG bảng `couples` (chỉ để lấy theme_color) — gộp làm 1 channel
   * duy nhất phát ra cả 2 loại thay đổi, giảm 1 WebSocket subscription. */
  accessory: PetAccessoryValue;
  setAccessory: (a: PetAccessoryValue) => void;
}

const ChatThemeContext = createContext<ChatThemeContextValue | null>(null);

/** Dùng trong ChatHeader (mở sheet tuỳ chỉnh) để đọc/ghi màu chủ đề hiện tại
 * mà không cần tự mở thêm 1 subscription couples riêng. */
export function useChatTheme(): ChatThemeContextValue {
  const ctx = useContext(ChatThemeContext);
  if (!ctx) {
    // Fallback an toàn nếu lỡ dùng ngoài Provider (không nên xảy ra) — tránh crash.
    return {
      themeColor: DEFAULT_THEME_COLOR,
      setThemeColor: () => {},
      accessory: "none",
      setAccessory: () => {},
    };
  }
  return ctx;
}

/**
 * Bọc quanh cả ChatHeader + ChatBox (xem app/chat/page.tsx) để 2 component
 * anh em này cùng nhìn thấy 1 giá trị theme_color và cùng áp --brand/
 * --brand-dark/--brand-light lên toàn bộ khung chat bên trong (bong bóng
 * tin nhắn, header, FlameBadge...) mà không cần sửa lại từng chỗ đang dùng
 * var(--brand) có sẵn.
 */
export function ChatThemeProvider({
  coupleId,
  initialThemeColor,
  initialAccessory,
  className,
  style,
  children,
}: {
  coupleId: string;
  initialThemeColor: string;
  initialAccessory?: PetAccessoryValue;
  className?: string;
  /** Style bổ sung từ nơi gọi (vd nền ảnh cover riêng của phòng chat) — được
   * gộp CÙNG với biến --brand/--brand-dark suy ra từ themeColor, không ghi
   * đè lên nhau. */
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const [themeColor, setThemeColor] = useState(initialThemeColor || DEFAULT_THEME_COLOR);
  const [accessory, setAccessory] = useState<PetAccessoryValue>(initialAccessory ?? "none");

  useEffect(() => {
    const supabase = createClient();
    // 1 channel duy nhất cho mọi thay đổi trên bảng `couples` của coupleId
    // này (thay vì `theme-${coupleId}` + `header-couple-${coupleId}` riêng).
    const channel = supabase
      .channel(`couple-sync-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couples", filter: `id=eq.${coupleId}` },
        (payload) => {
          const c = payload.new as Couple;
          if (c.theme_color) setThemeColor(c.theme_color);
          if (c.pet_accessory) setAccessory(c.pet_accessory);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return (
    <div className={className} style={{ ...style, ...themeCssVars(themeColor) }}>
      <ChatThemeContext.Provider value={{ themeColor, setThemeColor, accessory, setAccessory }}>
        {children}
      </ChatThemeContext.Provider>
    </div>
  );
}

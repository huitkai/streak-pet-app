import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { checkStreakBreak } from "@/lib/actions";
import ChatHeader from "@/components/ChatHeader";
import ChatBox from "@/components/ChatBox";
import AppShell from "@/components/AppShell";
import { ChatThemeProvider } from "@/lib/chat-theme-context";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import { nicknameForPartner, myNicknameForPartner } from "@/lib/nickname";
import type { PetSpecies } from "@/lib/pets";
import type { PetAccessoryValue } from "@/lib/types";

export default async function ChatPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: couple } = await supabase
    .from("couples")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();

  if (!couple) redirect("/couple");
  if (!couple.user2_id) redirect("/");

  // Chạy nền, KHÔNG await: trước đây chờ xong mới đọc streak/pet/messages,
  // cộng thêm 1 vòng round-trip DB vào mọi lần mở trang chat -> cảm giác
  // chậm. Việc "reset streak nếu đứt" không cần chặn hiển thị; nếu có reset,
  // realtime subscription trên bảng streaks (ChatHeader) sẽ tự cập nhật số.
  checkStreakBreak(couple.id).catch((e) => console.error("checkStreakBreak failed", e));

  const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;

  // QUAN TRỌNG VỀ TỐC ĐỘ VÀO LẠI KHUNG CHAT:
  // Trước đây trang này (Server Component) tải LUÔN cả tin nhắn +
  // reads/deliveries/pins/reactions/hidden mỗi lần điều hướng vào /chat —
  // nghĩa là mỗi lần thoát ra danh sách rồi bấm vào lại, người dùng phải
  // chờ đủ 1 vòng round-trip server (browser -> Next server -> Supabase ->
  // Next server -> browser) cho TẤT CẢ dữ liệu đó trước khi thấy được gì,
  // dù trình duyệt đã từng tải xong y hệt dữ liệu này chỉ vài giây trước.
  //
  // Giờ trang chỉ còn tải phần THIẾT YẾU + nhẹ (couple/streak/pet/profiles)
  // để hiện Header ngay. Phần tin nhắn (nặng, phình theo lịch sử chat) được
  // <ChatBox> tự tải bằng client Supabase (ít hơn 1 chặng round-trip) và
  // cache lại (xem lib/chat-cache.ts) — nhờ vậy lần vào lại kế tiếp trong
  // cùng phiên sẽ HIỆN NGAY dữ liệu cũ trong lúc âm thầm đồng bộ bản mới
  // nhất phía sau, thay vì phải "tải lại từ đầu" mỗi lần.
  const [{ data: streak }, { data: pet }, { data: profiles }] = await Promise.all([
    supabase.from("streaks").select("*").eq("couple_id", couple.id).single(),
    supabase.from("pets").select("*").eq("couple_id", couple.id).single(),
    supabase.from("profiles").select("*").in("id", [user.id, partnerId].filter(Boolean) as string[]),
  ]);

  if (!streak || !pet) redirect("/couple");

  const species = (couple.pet_species ?? "cat") as PetSpecies;
  const accessory = (couple.pet_accessory ?? "none") as PetAccessoryValue;
  const myProfile = profiles?.find((p) => p.id === user.id) ?? null;
  const partnerProfile = profiles?.find((p) => p.id === partnerId) ?? null;
  const nickname = nicknameForPartner(couple, user.id, partnerProfile);
  const myNicknameRaw = myNicknameForPartner(couple, user.id);

  return (
    <AppShell mode="chat" myUserId={user.id} myAvatarUrl={myProfile?.avatar_url} myDisplayName={myProfile?.display_name}>
      <ChatThemeProvider
        coupleId={couple.id}
        initialThemeColor={couple.theme_color ?? DEFAULT_THEME_COLOR}
        initialAccessory={accessory}
        className="flex flex-1 flex-col overflow-hidden bg-[var(--background)]"
      >
        <ChatHeader
          coupleId={couple.id}
          userId={user.id}
          partnerId={partnerId}
          petName={couple.pet_name}
          species={species}
          initialPet={pet}
          initialStreak={streak}
          initialNickname={nickname}
          initialNicknameRaw={myNicknameRaw}
          myProfile={myProfile}
          partnerProfile={partnerProfile}
        />
        <ChatBox
          coupleId={couple.id}
          userId={user.id}
          partnerId={partnerId}
          species={species}
          accessory={accessory}
          initialPet={pet}
          myProfile={myProfile}
          partnerProfile={partnerProfile}
        />
      </ChatThemeProvider>
    </AppShell>
  );
}

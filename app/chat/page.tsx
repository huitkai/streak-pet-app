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
  const PAGE_SIZE = 60;

  const [
    { data: streak },
    { data: pet },
    { data: latestMessagesDesc },
    { data: profiles },
    { data: reads },
    { data: deliveries },
    { data: reactions },
    { data: pins },
    { data: hidden },
  ] = await Promise.all([
    supabase.from("streaks").select("*").eq("couple_id", couple.id).single(),
    supabase.from("pets").select("*").eq("couple_id", couple.id).single(),
    supabase
      .from("messages")
      .select("*")
      .eq("couple_id", couple.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.from("profiles").select("*").in("id", [user.id, partnerId].filter(Boolean) as string[]),
    supabase.from("message_reads").select("*").eq("couple_id", couple.id),
    supabase.from("message_deliveries").select("*").eq("couple_id", couple.id),
    supabase.from("message_reactions").select("*").eq("couple_id", couple.id),
    supabase.from("pinned_messages").select("*").eq("couple_id", couple.id),
    supabase.from("message_hidden").select("message_id").eq("user_id", user.id),
  ]);

  if (!streak || !pet) redirect("/couple");

  const messages = [...(latestMessagesDesc ?? [])].reverse();
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
          initialMessages={messages}
          species={species}
          accessory={accessory}
          initialPet={pet}
          myProfile={myProfile}
          partnerProfile={partnerProfile}
          initialReads={reads ?? []}
          initialDeliveries={deliveries ?? []}
          initialReactions={reactions ?? []}
          initialPins={pins ?? []}
          initialHiddenIds={(hidden ?? []).map((h) => h.message_id)}
        />
      </ChatThemeProvider>
    </AppShell>
  );
}

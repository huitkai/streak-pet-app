import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { previewLabel } from "@/lib/message-format";
import { nicknameForPartner } from "@/lib/nickname";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import SignOutButton from "@/components/SignOutButton";
import ConversationListClient from "@/components/ConversationListClient";
import { CheckIcon } from "@/components/icons";
import type { ConversationSummary } from "@/lib/types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { confirmed } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: couple } = await supabase
    .from("couples")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();

  if (!couple) redirect("/couple");

  const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;

  const [{ data: myProfile }, { data: partnerProfile }, { data: streak }, { data: lastMsg }, { data: myRead }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      partnerId
        ? supabase.from("profiles").select("*").eq("id", partnerId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("streaks").select("current_streak").eq("couple_id", couple.id).maybeSingle(),
      supabase
        .from("messages")
        .select("content, sender_id, created_at")
        .eq("couple_id", couple.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("message_reads")
        .select("last_read_at")
        .eq("couple_id", couple.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  // Cấu trúc dữ liệu tổng quát hoá sẵn (xem ConversationSummary trong
  // lib/types.ts) — hiện chỉ có đúng 1 phần tử vì mỗi user mới thuộc 1
  // couple, nhưng UI (ConversationListClient/ConversationRow) đã sẵn sàng
  // nhận nhiều phần tử khi mở rộng bạn bè/người thân.
  let conversations: ConversationSummary[] = [];
  if (couple.user2_id) {
    const preview = lastMsg
      ? (lastMsg.sender_id === user.id ? "Bạn: " : "") + previewLabel(lastMsg.content)
      : "Chưa có tin nhắn nào — bắt đầu trò chuyện nhé";

    const { count: unreadCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", couple.id)
      .neq("sender_id", user.id)
      .gt("created_at", myRead?.last_read_at ?? "1970-01-01T00:00:00Z");

    conversations = [
      {
        id: couple.id,
        type: "couple",
        partnerId,
        partnerProfile: partnerProfile ?? null,
        nickname: nicknameForPartner(couple, user.id, partnerProfile),
        petName: couple.pet_name,
        currentStreak: streak?.current_streak ?? 0,
        previewText: preview,
        lastMessageAt: lastMsg?.created_at ?? null,
        unreadCount: unreadCount ?? 0,
        themeColor: couple.theme_color ?? DEFAULT_THEME_COLOR,
        isPinned: (couple.user1_id === user.id ? couple.pinned_by_user1 : couple.pinned_by_user2) ?? false,
        isMuted: (couple.user1_id === user.id ? couple.muted_by_user1 : couple.muted_by_user2) ?? false,
      },
    ];
  }

  return (
    <div className="safe-top safe-bottom flex flex-1 flex-col bg-[var(--background)]">
      {confirmed === "1" && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span>Xác nhận email thành công! Chào mừng bạn đến với Streak & Pet.</span>
        </div>
      )}

      <ConversationListClient
        conversations={conversations}
        myUserId={user.id}
        myProfile={myProfile}
        waitingInviteCode={couple.user2_id ? null : couple.invite_code}
      />

      <div className="border-t border-[var(--border)] px-4 py-2 text-center">
        <SignOutButton />
      </div>
    </div>
  );
}

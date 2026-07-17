import { NextResponse } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { previewLabel } from "@/lib/message-format";
import { nicknameForPartner } from "@/lib/nickname";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import type { ConversationSummary } from "@/lib/types";

/**
 * GET /api/conversations
 *
 * Trả về đúng dữ liệu mà `app/page.tsx` tính toán để render
 * `ConversationListClient`, nhưng ở dạng JSON. Lý do cần route này: layout
 * 2 cột trên desktop (`AppShell`) cần hiển thị sidebar danh sách hội thoại
 * NGAY CẢ khi người dùng đang ở trang `/chat` (route riêng, không có sẵn dữ
 * liệu này). Thay vì lồng ghép lại logic fetch vào `chat/page.tsx` (server
 * component, sẽ làm tăng round-trip DB cho mọi lần mở chat kể cả mobile),
 * ta để `AppShell` (client, chỉ chạy trên desktop) tự gọi route này.
 */
export async function GET() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: couple } = await supabase
    .from("couples")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();

  if (!couple) return NextResponse.json({ conversations: [], myProfile: null, waitingInviteCode: null });

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

  return NextResponse.json({
    conversations,
    myProfile: myProfile ?? null,
    myUserId: user.id,
    waitingInviteCode: couple.user2_id ? null : couple.invite_code,
  });
}

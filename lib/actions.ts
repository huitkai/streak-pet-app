"use server";

import { createClient } from "@/lib/supabase/server";
import { stageForStreak } from "@/lib/pet-logic";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { StickerId } from "@/components/Stickers";
import { encodeSticker, encodeImage, encodeStampPhoto, encodeVoice, encodeGif } from "@/lib/message-format";
import type { PetSpeciesValue, PetAccessoryValue } from "@/lib/types";
import { isAccessoryUnlocked } from "@/lib/pets";
import { isValidHex } from "@/lib/theme";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (new Date(b + "T00:00:00Z").getTime() -
      new Date(a + "T00:00:00Z").getTime()) /
      msPerDay
  );
}

// ---------------- AUTH ----------------

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://streak-pet-app.onrender.com").replace(/\/$/, "");

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Link trong email xác nhận sẽ trỏ về domain thật (Render), không phải
      // localhost, rồi route /auth/callback sẽ đổi code lấy session.
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // Nếu dự án Supabase đang TẮT "Confirm email" thì signUp trả về session
  // ngay lập tức -> vào thẳng app. Ngược lại, phải chờ người dùng bấm link
  // xác nhận trong email nên chỉ báo thành công, không redirect.
  if (data.session) {
    redirect("/");
  }

  // ⚠️ Hành vi mặc định của Supabase: nếu email NÀY ĐÃ TỒN TẠI (kể cả chưa
  // xác nhận), signUp() vẫn trả về "thành công" y hệt như tạo mới, nhưng
  // ÂM THẦM KHÔNG gửi lại email — để tránh lộ thông tin email đã đăng ký
  // hay chưa. Dấu hiệu nhận biết: user.identities là mảng rỗng (đăng ký
  // mới thật sự sẽ có 1 phần tử). Gặp trường hợp này, ta chủ động gọi
  // resend() để thực sự gửi lại email xác nhận cho tài khoản cũ.
  const emailAlreadyUsed = data.user && (data.user.identities?.length ?? 0) === 0;

  if (emailAlreadyUsed) {
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    });

    if (resendError) {
      const m = resendError.message.toLowerCase();
      if (m.includes("already confirmed") || m.includes("already registered")) {
        return { error: "Email này đã được xác nhận từ trước. Vui lòng đăng nhập." };
      }
      return { error: friendlyAuthError(resendError.message) };
    }
  }

  return { success: true, email };
}

export async function resendConfirmation(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already confirmed")) {
      return { error: "Email này đã được xác nhận. Bạn có thể đăng nhập ngay." };
    }
    return { error: friendlyAuthError(error.message) };
  }
  return { success: true };
}

/**
 * Xác nhận đăng ký bằng mã OTP 6 số thay vì bấm link trong email.
 * Mail xác nhận của Supabase luôn kèm theo mã này (biến {{ .Token }} trong
 * template) — chỉ cần nhập đúng mã MỚI NHẤT nhận được là xác nhận thành
 * công ngay, kể cả khi hộp thư còn nhiều mail cũ khác.
 */
export async function verifySignupOtp(email: string, token: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error) return { error: friendlyAuthError(error.message) };

  redirect("/");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: friendlyAuthError(error.message) };

  redirect("/");
}

/** Dịch các thông báo lỗi phổ biến của Supabase Auth sang tiếng Việt dễ hiểu. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.";
  if (m.includes("user already registered")) return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
  if (m.includes("password should be at least")) return "Mật khẩu cần tối thiểu 6 ký tự.";
  if (m.includes("rate limit") || m.includes("too many")) return "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Email không hợp lệ.";
  if (m.includes("token has expired") || m.includes("otp_expired")) return "Mã xác nhận đã hết hạn. Hãy bấm \"Gửi lại mã\" để nhận mã mới.";
  if (m.includes("invalid token") || m.includes("token is invalid") || (m.includes("token") && m.includes("expired or is invalid"))) {
    return "Mã xác nhận không đúng. Vui lòng kiểm tra lại mã mới nhất trong email.";
  }
  return message;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------- COUPLE ----------------

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createCouple(formData?: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const species = String(formData?.get("pet_species") ?? "cat") as PetSpeciesValue;

  const { error } = await supabase.from("couples").insert({
    user1_id: user!.id,
    invite_code: randomInviteCode(),
    pet_species: species,
  });

  if (error) return { error: error.message };
  redirect("/");
}

/** Đổi loài pet — chỉ cho phép khi pet còn ở giai đoạn "egg" để giữ ý nghĩa lựa chọn ban đầu. */
export async function setPetSpecies(coupleId: string, species: PetSpeciesValue) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pet } = await supabase
    .from("pets")
    .select("stage")
    .eq("couple_id", coupleId)
    .single();
  if (!pet || pet.stage !== "egg") return { error: "Chỉ đổi được loài khi pet còn là trứng." };

  const { error } = await supabase
    .from("couples")
    .update({ pet_species: species })
    .eq("id", coupleId);
  if (error) return { error: error.message };

  revalidatePath("/chat");
}

/** Đổi phụ kiện pet đang đeo — cho phép ở mọi giai đoạn, nhưng server tự kiểm tra
 * lại điều kiện mở khóa (streak / theo mùa) thay vì tin tưởng client. */
export async function setPetAccessory(coupleId: string, accessory: PetAccessoryValue) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (accessory !== "none") {
    const { data: streak } = await supabase
      .from("streaks")
      .select("current_streak")
      .eq("couple_id", coupleId)
      .single();
    if (!streak || !isAccessoryUnlocked(accessory, streak.current_streak)) {
      return { error: "Phụ kiện này chưa được mở khóa." };
    }
  }

  const { error } = await supabase
    .from("couples")
    .update({ pet_accessory: accessory })
    .eq("id", coupleId);
  if (error) return { error: error.message };

  revalidatePath("/chat");
}

// ---------------- TUỲ CHỈNH ĐOẠN CHAT (theme + biệt danh) ----------------
// Xem migration-v9-chat-customization.sql — 2 cột mở rộng thẳng trên `couples`.

/** Đổi màu chủ đề (theme_color) cho khung chat — chỉ cho phép user tự đặt
 * cho couple mà họ là thành viên (RLS trên `couples` đã giới hạn theo
 * user1_id/user2_id, nhưng vẫn kiểm tra lại ở đây cho rõ ràng + thông báo
 * lỗi thân thiện thay vì lỗi RLS chung chung). */
export async function updateCoupleTheme(coupleId: string, hex: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = hex.trim().toLowerCase();
  if (!isValidHex(trimmed)) return { error: "Mã màu không hợp lệ (cần dạng #rrggbb)." };

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", coupleId)
    .maybeSingle();
  if (!couple || (couple.user1_id !== user!.id && couple.user2_id !== user!.id)) {
    return { error: "Bạn không thuộc cuộc trò chuyện này." };
  }

  const { error } = await supabase.from("couples").update({ theme_color: trimmed }).eq("id", coupleId);
  if (error) return { error: error.message };

  revalidatePath("/chat");
  revalidatePath("/");
  return { ok: true };
}

/** Ghim/tắt thông báo hội thoại (vuốt trên `ConversationRow` — mục 7 kế
 * hoạch nâng cấp). Là sở thích CÁ NHÂN, tự suy ra cột user1/user2 đúng như
 * `updateNickname` ở dưới, không tin client gửi tên cột. */
export async function setConversationFlag(
  coupleId: string,
  flag: "pinned" | "muted",
  value: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", coupleId)
    .maybeSingle();
  if (!couple || (couple.user1_id !== user.id && couple.user2_id !== user.id)) {
    return { error: "Bạn không thuộc cuộc trò chuyện này." };
  }

  const column = `${flag}_by_${user.id === couple.user1_id ? "user1" : "user2"}` as
    | "pinned_by_user1"
    | "pinned_by_user2"
    | "muted_by_user1"
    | "muted_by_user2";

  const { error } = await supabase.from("couples").update({ [column]: value }).eq("id", coupleId);
  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

/** Đặt/xoá biệt danh mà NGƯỜI GỌI đặt cho đối phương — tự suy ra nên ghi vào
 * nickname_for_user1 hay nickname_for_user2 dựa theo vai trò của người gọi
 * trong couple (không tin client gửi lên tên cột). `nickname = null/""` để xoá
 * (fallback về display_name gốc). */
export async function updateNickname(coupleId: string, nickname: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = nickname?.trim() || null;
  if (trimmed && trimmed.length > 40) return { error: "Biệt danh tối đa 40 ký tự." };

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", coupleId)
    .maybeSingle();
  if (!couple) return { error: "Không tìm thấy cuộc trò chuyện." };

  const column = user!.id === couple.user1_id ? "nickname_for_user1" : "nickname_for_user2";
  if (user!.id !== couple.user1_id && user!.id !== couple.user2_id) {
    return { error: "Bạn không thuộc cuộc trò chuyện này." };
  }

  const { error } = await supabase
    .from("couples")
    .update({ [column]: trimmed })
    .eq("id", coupleId);
  if (error) return { error: error.message };

  revalidatePath("/chat");
  revalidatePath("/");
  return { ok: true };
}

export async function joinCouple(formData: FormData) {
  const code = String(formData.get("invite_code") ?? "")
    .trim()
    .toUpperCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: couple, error: findError } = await supabase
    .from("couples")
    .select("id, user1_id, user2_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (findError || !couple) return { error: "Không tìm thấy mã mời này." };
  if (couple.user1_id === user!.id)
    return { error: "Đây là mã mời của chính bạn." };
  if (couple.user2_id && couple.user2_id !== user!.id)
    return { error: "Cặp đôi này đã có đủ 2 người." };

  const { error } = await supabase
    .from("couples")
    .update({ user2_id: user!.id })
    .eq("id", couple.id)
    .is("user2_id", null);

  if (error) return { error: error.message };
  redirect("/");
}

// ---------------- PROFILE / AVATAR ----------------

export async function updateProfile(fields: { display_name?: string; avatar_url?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };

  revalidatePath("/chat");
  return { ok: true };
}

/**
 * Gửi 1 tin nhắn thoại đã upload lên Storage (bucket "chat-voice").
 */
export async function sendVoice(coupleId: string, url: string, durationSec: number, replyToId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user!.id,
      content: encodeVoice(url, durationSec),
      reply_to_id: replyToId ?? null,
    })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  registerActivity(coupleId, user!.id).catch((e) => console.error("registerActivity failed", e));
  return { message: inserted };
}

/**
 * Sửa nội dung 1 tin nhắn TEXT đã gửi — chỉ chủ tin nhắn mới sửa được (RLS
 * chặn ở DB), và không cho sửa tin đã bị thu hồi.
 */
export async function editMessage(messageId: string, newContent: string) {
  const content = newContent.trim();
  if (!content) return { error: "empty" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: updated, error } = await supabase
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user!.id)
    .is("deleted_at", null)
    .select()
    .single();
  if (error) return { error: error.message };
  return { message: updated };
}

/**
 * "Thu hồi" — gỡ tin nhắn với CẢ HAI người. Không xoá bản ghi (để reply/pin
 * trỏ tới nó không bị vỡ), chỉ đánh dấu deleted_at; UI hiện tombstone thay
 * cho nội dung thật.
 */
export async function recallMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: updated, error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", user!.id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { message: updated };
}

/** "Xoá" — chỉ ẩn tin nhắn ở phía người xoá, đối phương vẫn thấy bình thường. */
export async function hideMessageForMe(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("message_hidden")
    .upsert({ message_id: messageId, user_id: user!.id });
  if (error) return { error: error.message };
  return { ok: true };
}

// ---------------- GHIM TIN NHẮN ----------------

export async function pinMessage(coupleId: string, messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("pinned_messages")
    .upsert({ couple_id: coupleId, message_id: messageId, pinned_by: user!.id });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function unpinMessage(coupleId: string, messageId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pinned_messages")
    .delete()
    .eq("couple_id", coupleId)
    .eq("message_id", messageId);
  if (error) return { error: error.message };
  return { ok: true };
}

// ---------------- FORWARD ----------------

/** Danh sách "cuộc trò chuyện" (couple) mà user hiện là thành viên — hiện tại
 * mỗi user chỉ thuộc 1 couple, nhưng viết theo dạng mảng để sẵn sàng mở rộng
 * khi thêm loại quan hệ khác (bạn bè, anh chị em...) trong tương lai. */
export async function listMyConversations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("couples")
    .select("id, pet_name, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
  return data ?? [];
}

/** Chuyển tiếp 1 tin nhắn sang couple khác — kiểm tra user là thành viên của
 * CẢ HAI couple (nguồn để đọc, đích để ghi) trước khi cho phép. */
export async function forwardMessage(targetCoupleId: string, messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: original, error: findError } = await supabase
    .from("messages")
    .select("content, couple_id")
    .eq("id", messageId)
    .single();
  if (findError || !original) return { error: "Không tìm thấy tin nhắn gốc." };

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      couple_id: targetCoupleId,
      sender_id: user!.id,
      content: original.content,
      forwarded_from_id: messageId,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  registerActivity(targetCoupleId, user!.id).catch((e) => console.error("registerActivity failed", e));
  return { message: inserted };
}

// ---------------- TÌM KIẾM + PHÂN TRANG ----------------

/** Tìm kiếm tin nhắn TEXT trong lịch sử chat (không tìm trong sticker/ảnh/voice). */
export async function searchMessages(coupleId: string, query: string) {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("couple_id", coupleId)
    .is("deleted_at", null)
    .ilike("content", `%${q}%`)
    .not("content", "like", "::sticker::%")
    .not("content", "like", "::image::%")
    .not("content", "like", "::gif::%")
    .not("content", "like", "::voice::%")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return data;
}

/** Tải thêm tin nhắn CŨ HƠN mốc `beforeIso` — dùng cho infinite scroll lên trên.
 * Kèm theo reactions + trạng thái ẩn CỦA ĐÚNG LÔ tin nhắn này (không phải toàn
 * bộ lịch sử) — vì trang chat giờ chỉ tải reactions/hidden cho các tin đang
 * hiển thị (xem ghi chú trong app/chat/page.tsx), nên mỗi lần kéo thêm tin cũ
 * cũng phải tự mang theo phần dữ liệu tương ứng của riêng lô đó. */
export async function fetchOlderMessages(coupleId: string, userId: string, beforeIso: string, limit = 40) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("couple_id", coupleId)
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { messages: [], reactions: [], hiddenIds: [] as string[] };

  const messages = (data ?? []).reverse();
  const messageIds = messages.map((m) => m.id);
  if (messageIds.length === 0) return { messages, reactions: [], hiddenIds: [] as string[] };

  const [{ data: reactions }, { data: hidden }] = await Promise.all([
    supabase.from("message_reactions").select("*").in("message_id", messageIds),
    supabase.from("message_hidden").select("message_id").eq("user_id", userId).in("message_id", messageIds),
  ]);

  return {
    messages,
    reactions: reactions ?? [],
    hiddenIds: (hidden ?? []).map((h) => h.message_id) as string[],
  };
}


/** Tải 1 khoảng tin nhắn XUNG QUANH 1 mốc thời gian — dùng khi bấm vào kết
 * quả tìm kiếm để "nhảy" tới đúng tin đó kèm ngữ cảnh xung quanh. */
export async function fetchMessagesAround(coupleId: string, aroundIso: string, span = 25) {
  const supabase = await createClient();
  const [{ data: before }, { data: after }] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("couple_id", coupleId)
      .lte("created_at", aroundIso)
      .order("created_at", { ascending: false })
      .limit(span),
    supabase
      .from("messages")
      .select("*")
      .eq("couple_id", coupleId)
      .gt("created_at", aroundIso)
      .order("created_at", { ascending: true })
      .limit(span),
  ]);
  return [...(before ?? []).reverse(), ...(after ?? [])];
}

// ---------------- CHAT + STREAK + PET ----------------

/**
 * QUAN TRỌNG VỀ TỐC ĐỘ GỬI TIN:
 * Trước đây hàm này `await registerActivity(...)` (cập nhật streak + pet,
 * tốn 3-4 round-trip DB) rồi mới trả kết quả về client -> người gửi phải
 * chờ hết chuỗi đó thì input mới "nhả" ra, cảm giác rất chậm.
 * Giờ: insert tin nhắn xong là trả kết quả về NGAY (client tự thêm optimistic
 * message), còn việc cập nhật streak/pet chạy nền phía sau (không await),
 * không chặn UI. ChatHeader đã tự subscribe realtime tới bảng streaks/pets
 * nên vẫn cập nhật đúng khi công việc nền hoàn tất.
 */
export async function sendMessage(coupleId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "empty" };
  const replyToId = (formData.get("reply_to_id") as string | null) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({ couple_id: coupleId, sender_id: user!.id, content, reply_to_id: replyToId })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  // Chạy nền — không await để không làm chậm phản hồi tới người dùng.
  registerActivity(coupleId, user!.id).catch((e) =>
    console.error("registerActivity failed", e)
  );

  return { message: inserted };
}

export async function sendSticker(coupleId: string, stickerId: StickerId, replyToId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user!.id,
      content: encodeSticker(stickerId),
      reply_to_id: replyToId ?? null,
    })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  registerActivity(coupleId, user!.id).catch((e) =>
    console.error("registerActivity failed", e)
  );

  return { message: inserted };
}

/**
 * Gửi 1 ảnh đã được client upload thẳng lên Supabase Storage (bucket
 * "chat-images", GIỮ NGUYÊN file gốc — không nén/resize) — hàm này chỉ ghi
 * lại đường dẫn ảnh vào bảng messages, giống cách sendSticker ghi id sticker.
 */
export async function sendImage(
  coupleId: string,
  url: string,
  width?: number,
  height?: number,
  replyToId?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user!.id,
      content: encodeImage(url, width, height),
      reply_to_id: replyToId ?? null,
    })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  registerActivity(coupleId, user!.id).catch((e) =>
    console.error("registerActivity failed", e)
  );

  return { message: inserted };
}

/**
 * Gửi 1 ảnh "Chụp nhanh" kiểu Locket — PNG đã đục sẵn răng cưa thật (xem
 * lib/stamp-frame.ts và components/InstantCapture.tsx). Dùng chung bucket
 * Storage "chat-images" như sendImage(), chỉ khác cách encode nội dung để
 * client biết hiển thị không viền/không bo góc (giữ nguyên hình dạng PNG).
 */
export async function sendStampPhoto(
  coupleId: string,
  url: string,
  width?: number,
  height?: number,
  replyToId?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user!.id,
      content: encodeStampPhoto(url, width, height),
      reply_to_id: replyToId ?? null,
    })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  registerActivity(coupleId, user!.id).catch((e) =>
    console.error("registerActivity failed", e)
  );

  return { message: inserted };
}

/**
 * Gửi 1 GIF chọn từ tab "GIF" trong StickerPicker (nguồn Tenor, xem
 * app/api/gif/route.ts) — CHỈ lưu lại URL trỏ ra CDN của Tenor, không tải
 * file về Storage của mình (khác `sendImage`), vì GIF vốn đã có CDN riêng
 * tối ưu cho việc này.
 */
export async function sendGif(
  coupleId: string,
  url: string,
  width?: number,
  height?: number,
  replyToId?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error: msgError } = await supabase
    .from("messages")
    .insert({
      couple_id: coupleId,
      sender_id: user!.id,
      content: encodeGif(url, width, height),
      reply_to_id: replyToId ?? null,
    })
    .select()
    .single();
  if (msgError) return { error: msgError.message };

  registerActivity(coupleId, user!.id).catch((e) =>
    console.error("registerActivity failed", e)
  );

  return { message: inserted };
}

/**
 * Ghi lại "mình đã đọc tin nhắn tới thời điểm này" — dùng để suy ra tin nào
 * đối phương ĐÃ XEM (so created_at của tin với last_read_at của họ).
 * Gọi khi: mở màn hình chat, tin mới về lúc tab đang focus, tab active lại.
 * Rẻ (1 upsert), an toàn để gọi nhiều lần liên tục.
 */
export async function markMessagesRead(coupleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase
    .from("message_reads")
    .upsert(
      { couple_id: coupleId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "couple_id,user_id" }
    );
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Đánh dấu "đã NHẬN" (delivered) — khác markMessagesRead ở chỗ hàm này được
 * gọi ngay khi client nhận tin qua Realtime hoặc khi vừa mở lại trang chat,
 * KHÔNG cần biết tab có đang hiển thị hay không (xem lib/types.ts:
 * MessageDeliveryRow và migration-v10-delivered-status.sql). Cùng 1 cơ chế
 * "mốc thời gian cắt lát" như message_reads, chỉ khác bảng đích.
 */
export async function markMessagesDelivered(coupleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { error } = await supabase
    .from("message_deliveries")
    .upsert(
      { couple_id: coupleId, user_id: user.id, last_delivered_at: new Date().toISOString() },
      { onConflict: "couple_id,user_id" }
    );
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Thả/đổi/bỏ cảm xúc cho 1 tin nhắn — mỗi người chỉ có 1 cảm xúc / tin nhắn
 * (unique message_id+user_id ở DB): thả lại CÙNG emoji đang có -> bỏ thả,
 * thả emoji KHÁC -> thay thế, giống hành vi long-press react của Messenger.
 */
export async function toggleReaction(coupleId: string, messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id, emoji")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && existing.emoji === emoji) {
    const { error } = await supabase.from("message_reactions").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    return { ok: true, removed: true };
  }

  const { data: saved, error } = await supabase
    .from("message_reactions")
    .upsert(
      { message_id: messageId, couple_id: coupleId, user_id: user.id, emoji },
      { onConflict: "message_id,user_id" }
    )
    .select()
    .single();
  if (error) return { error: error.message };
  return { ok: true, reaction: saved };
}

/**
 * Chỉ kiểm tra xem streak có bị "đứt" vì bỏ lỡ một ngày trọn vẹn không.
 * KHÔNG đánh dấu ai đã gửi tin — an toàn để gọi mỗi khi mở app/trang chat,
 * vì chỉ mở app không được tính là giữ streak.
 */
export async function checkStreakBreak(coupleId: string) {
  const supabase = await createClient();
  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, last_active_date")
    .eq("couple_id", coupleId)
    .single();
  if (!streak || !streak.last_active_date) return;

  const today = todayUTC();
  const gap = daysBetween(streak.last_active_date, today);
  if (gap > 1 && streak.current_streak > 0) {
    await supabase
      .from("streaks")
      .update({ current_streak: 0, updated_at: new Date().toISOString() })
      .eq("couple_id", coupleId);
    await supabase
      .from("pets")
      .update({
        stage: stageForStreak(0),
        mood: "sad",
        updated_at: new Date().toISOString(),
      })
      .eq("couple_id", coupleId);
  }
}

/**
 * Ghi nhận việc một người dùng vừa THỰC SỰ gửi tin nhắn hôm nay.
 * Chỉ được gọi từ sendMessage — không gọi khi chỉ mở app.
 */
export async function registerActivity(coupleId: string, userId: string) {
  const supabase = await createClient();

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", coupleId)
    .single();
  if (!couple) return;

  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("couple_id", coupleId)
    .single();
  if (!streak) return;

  const today = todayUTC();
  let {
    current_streak,
    longest_streak,
    last_active_date,
    progress_date,
    user1_sent_today,
    user2_sent_today,
  } = streak;

  // Nếu progress_date không phải hôm nay -> reset cờ điểm danh cho ngày mới
  if (progress_date !== today) {
    // Kiểm tra xem ngày hôm qua có bị bỏ lỡ không (đứt chuỗi)
    if (last_active_date) {
      const gap = daysBetween(last_active_date, today);
      if (gap > 1) {
        current_streak = 0; // bỏ lỡ >= 1 ngày trọn vẹn -> mất chuỗi
      }
    }
    progress_date = today;
    user1_sent_today = false;
    user2_sent_today = false;
  }

  if (userId === couple.user1_id) user1_sent_today = true;
  if (userId === couple.user2_id) user2_sent_today = true;

  let justCompletedToday = false;
  if (user1_sent_today && user2_sent_today && last_active_date !== today) {
    current_streak += 1;
    longest_streak = Math.max(longest_streak, current_streak);
    last_active_date = today;
    justCompletedToday = true;
  }

  await supabase
    .from("streaks")
    .update({
      current_streak,
      longest_streak,
      last_active_date,
      progress_date,
      user1_sent_today,
      user2_sent_today,
      updated_at: new Date().toISOString(),
    })
    .eq("couple_id", coupleId);

  // Cập nhật pet: mood + stage
  let mood: "happy" | "neutral" | "sad" | "sick" = "neutral";
  if (justCompletedToday) mood = "happy";
  else if (user1_sent_today || user2_sent_today) mood = "neutral";
  if (current_streak === 0 && (last_active_date ?? "") < today) mood = "sad";

  await supabase
    .from("pets")
    .update({
      stage: stageForStreak(current_streak),
      mood,
      updated_at: new Date().toISOString(),
    })
    .eq("couple_id", coupleId);

  revalidatePath("/chat");
}

"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessageRow, PetRow, ProfileRow, MessageReadRow, MessageDeliveryRow, ReactionRow, PinnedMessageRow, PetAccessoryValue } from "@/lib/types";
import { variantForCouple, type PetSpecies } from "@/lib/pets";
import {
  sendMessage,
  sendSticker,
  sendImage,
  sendStampPhoto,
  sendGif,
  sendVoice,
  editMessage,
  recallMessage,
  hideMessageForMe,
  pinMessage,
  unpinMessage,
  markMessagesRead,
  markMessagesDelivered,
  toggleReaction,
  fetchOlderMessages,
  fetchMessagesAround,
} from "@/lib/actions";
import { decodeMessage, encodeImage, encodeStampPhoto, shouldShowTimeDivider } from "@/lib/message-format";
import { getCachedChat, patchCachedChat } from "@/lib/chat-cache";
import { fetchLatestChatData } from "@/lib/chat-client-data";
import { getOrCacheImage, getMemoCachedImageUrl } from "@/lib/message-image-cache";
import TimeText from "@/components/TimeText";
import { StickerArt, type StickerId } from "@/components/Stickers";
import StickerPicker from "@/components/StickerPicker";
import ReactionPicker from "@/components/ReactionPicker";
import EmojiFullPicker from "@/components/EmojiFullPicker";
import MessageActionDock from "@/components/MessageActionDock";
import { ReplyQuoteInline, ReplyComposerBar } from "@/components/ReplyQuote";
import PinnedBar from "@/components/PinnedBar";
import SearchOverlay from "@/components/SearchOverlay";
import VoiceRecorder from "@/components/VoiceRecorder";
import InstantCapture from "@/components/InstantCapture";
import VoiceMessageBubble from "@/components/VoiceMessageBubble";
import ForwardSheet from "@/components/ForwardSheet";
import {
  SendIcon,
  SmileStickerIcon,
  ImageIcon,
  CameraIcon,
  XIcon,
  PlusIcon,
  SearchIcon,
  MicIcon,
  EditIcon,
  UndoIcon,
  CheckSingleIcon,
  CheckDoubleIcon,
  ReplyIcon,
} from "@/components/icons";
import Avatar from "@/components/Avatar";
import FloatingPet from "@/components/FloatingPet";
import { usePresenceHeartbeat, useTypingIndicator } from "@/lib/presence";

const MAX_IMAGE_MB = 15;
/** Long-press bao lâu (ms) thì mở thanh chọn cảm xúc nhanh — đủ để không kích
 * hoạt nhầm khi người dùng chỉ đang cuộn hoặc bấm nhanh. Đây CHỈ mở
 * ReactionPicker; dock hành động đầy đủ được mở riêng (xem DOCK_HOLD_EXTRA_MS
 * và nút "..." trong ReactionPicker) để 2 lớp overlay không tranh chấp sự
 * kiện chạm với nhau (xem thêm ghi chú tại startLongPress). */
const LONG_PRESS_MS = 300;
/** Giữ tiếp tục thêm bằng này (ms) sau khi ReactionPicker đã hiện thì tự động
 * mở luôn MessageActionDock — mô phỏng đúng cảm giác long-press của
 * Messenger/Telegram: giữ ngắn = react nhanh, giữ lâu hơn = menu đầy đủ. */
const DOCK_HOLD_EXTRA_MS = 350;
const PAGE_SIZE = 60;
/** Kéo ngang bao nhiêu px thì coi là "đã vượt ngưỡng" -> nhả tay sẽ kích hoạt
 * trả lời (Messenger/WhatsApp dùng chung 1 ngưỡng cho mọi bong bóng, không
 * phân biệt tin của mình hay của đối phương). */
const SWIPE_REPLY_THRESHOLD = 56;
/** Giới hạn kéo tối đa — kéo quá xa vẫn dừng ở đây, không trôi tự do. */
const SWIPE_MAX_DRAG = 76;
/** Kéo dưới ngưỡng này theo bất kỳ trục nào thì chưa xác định là vuốt ngang
 * hay đang cuộn dọc — tránh nhận nhầm 1 cú chạm rung tay thành vuốt. */
const SWIPE_AXIS_LOCK_PX = 8;

function tempId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** reactions[message_id][user_id] = emoji — tối đa 2 người/couple nên gọn nhẹ. */
type ReactionMap = Record<string, Record<string, string>>;

function reactionsFromRows(rows: ReactionRow[]): ReactionMap {
  const map: ReactionMap = {};
  for (const r of rows) {
    map[r.message_id] = { ...(map[r.message_id] ?? {}), [r.user_id]: r.emoji };
  }
  return map;
}

/**
 * Bọc quanh 1 <img> tin nhắn (ảnh thường / chụp nhanh / GIF): trong lúc ảnh
 * còn đang tải từ mạng, hiện 1 khung skeleton shimmer thay vì để trình duyệt
 * tự vẽ ảnh dần từng dải pixel (progressive render trông giật/xấu, đặc biệt
 * rõ với ảnh nét cao trên mạng chậm). Khi ảnh tải xong (onLoad) mới fade-in
 * mượt — cảm giác "khung đã sẵn sàng, ảnh trượt vào" thay vì "ảnh hiện ra từ
 * từ". Ảnh đã có sẵn trong cache trình duyệt (vd ảnh cục bộ vừa chụp) thì
 * onLoad bắn gần như ngay lập tức nên skeleton chỉ thoáng qua, không gây khó chịu.
 */
function MessageImage({
  src,
  alt,
  aspectRatio,
  className = "",
  imgClassName = "",
  onSettled,
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  imgClassName?: string;
  /** Gọi khi ảnh đã hiện xong (dù từ cache hay tải mới) — ChatBox dùng để
   * cuộn lại xuống cuối nếu vẫn đang ở chế độ tự cuộn, phòng trường hợp ảnh
   * tải/đổi kích thước SAU khi lần cuộn ban đầu đã chạy (xem prop này được
   * truyền từ nơi gọi). */
  onSettled?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  // ---- Cache ảnh cục bộ (IndexedDB, xem lib/message-image-cache.ts): ảnh
  // đã từng xem sẽ hiện lại TỨC THÌ từ đĩa cục bộ ở mọi lần vào lại khung
  // chat sau này, không phụ thuộc HTTP cache của trình duyệt/webview (vốn có
  // thể bị hệ điều hành dọn bất cứ lúc nào).
  //
  // QUAN TRỌNG — tránh lặp lại lỗi "ảnh đang hiện bình thường tự nhiên đổi
  // src giữa chừng" (từng gây giật layout khiến cuộn xuống tin mới nhất bị
  // dừng lại giữa chừng): nếu bộ nhớ đệm ĐỒNG BỘ (getMemoCachedImageUrl) đã
  // biết ảnh này từ trước trong phiên hiện tại, dùng luôn ngay từ lần render
  // đầu tiên — KHÔNG có bước đổi src nào cả. Chỉ khi ảnh này hoàn toàn chưa
  // từng được cache (lần đầu xem trong phiên) mới hiện thẳng `src` gốc rồi
  // âm thầm tải+lưu cache ở NỀN cho lần sau — không đụng vào src đang hiển
  // thị của lần xem hiện tại nữa.
  const [resolvedSrc] = useState(() => getMemoCachedImageUrl(src) ?? src);

  useEffect(() => {
    if (getMemoCachedImageUrl(src)) return; // đã có sẵn từ state init, không cần làm gì thêm
    let cancelled = false;
    getOrCacheImage(src).then(() => {
      // Chỉ ghi vào cache cho LẦN SAU — cố tình KHÔNG setState đổi src ở đây
      // để không làm gián đoạn/giật ảnh đang hiển thị của lần xem hiện tại.
      void cancelled;
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={aspectRatio ? { aspectRatio } : undefined}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-black/10 via-black/5 to-black/10" />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => {
          setLoaded(true);
          onSettled?.();
        }}
        style={aspectRatio ? { aspectRatio } : undefined}
        className={`${imgClassName} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export default function ChatBox({
  coupleId,
  userId,
  partnerId,
  species,
  accessory = "none",
  initialPet,
  myProfile,
  partnerProfile,
}: {
  coupleId: string;
  userId: string;
  partnerId: string | null;
  species: PetSpecies;
  accessory?: PetAccessoryValue;
  initialPet: PetRow;
  myProfile: ProfileRow | null;
  partnerProfile: ProfileRow | null;
}) {
  // ---- Cache-first: nếu couple này đã từng mở khung chat trong phiên hiện
  // tại (kể cả sau khi thoát ra danh sách rồi vào lại), lib/chat-cache.ts đã
  // giữ sẵn bản tin nhắn/reads/reactions/pins/hidden gần nhất — dùng NGAY
  // làm state khởi tạo (lazy initializer chỉ chạy 1 lần) để màn hình hiện
  // đầy đủ tức thì, không phải chờ round-trip mạng nào cả. Nếu chưa có cache
  // (lần đầu mở app) thì state bắt đầu rỗng và sẽ được `useEffect` tải nền
  // bên dưới lấp đầy — xem đoạn "Tải/đồng bộ dữ liệu chat" phía dưới. ----
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần đọc cache
  // đúng 1 lần lúc mount để seed state khởi tạo, không cần đọc lại khi
  // coupleId đổi (ChatBox được mount lại theo route mỗi lần đổi couple).
  const cached = useMemo(() => getCachedChat(coupleId), []);

  const [messages, setMessages] = useState<MessageRow[]>(cached?.messages ?? []);
  const [pet, setPet] = useState(cached?.pet ?? initialPet);
  const variant = useMemo(() => variantForCouple(coupleId, species), [coupleId, species]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  usePresenceHeartbeat(userId);
  const [partnerTyping, notifyTyping] = useTypingIndicator(coupleId, userId);
  const [attachOpen, setAttachOpen] = useState(false);
  const [instantCaptureOpen, setInstantCaptureOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionMap>(() => reactionsFromRows(cached?.reactions ?? []));
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [dockFor, setDockFor] = useState<string | null>(null);
  // Mục 6: EmojiFullPicker mở riêng cho 1 tin (khi bấm nút "+" trong
  // ReactionPicker) — độc lập với reactionPickerFor/dockFor để không đụng
  // vào cơ chế "tách tầng, không mở đồng thời" đã sửa ở bug #1.
  const [fullEmojiFor, setFullEmojiFor] = useState<string | null>(null);
  const [revealedTimeId, setRevealedTimeId] = useState<string | null>(null);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(
    (cached?.reads ?? []).find((r) => r.user_id === partnerId)?.last_read_at ?? null
  );
  /** Mốc "đối phương đã NHẬN tới đâu" — độc lập với partnerLastReadAt, xem
   * migration-v10-delivered-status.sql. Dùng để hiện tick đúp XÁM (đã nhận,
   * chưa xem) khác với tick đúp màu brand (đã xem). */
  const [partnerLastDeliveredAt, setPartnerLastDeliveredAt] = useState<string | null>(
    (cached?.deliveries ?? []).find((d) => d.user_id === partnerId)?.last_delivered_at ?? null
  );
  /** Trạng thái vuốt-để-trả-lời đang hoạt động trên bong bóng nào, kéo được
   * bao nhiêu px — chỉ 1 bong bóng vuốt tại 1 thời điểm nên gộp chung 1 state
   * thay vì 1 state riêng cho từng tin nhắn (tránh re-render toàn danh sách). */
  const [swipeState, setSwipeState] = useState<{ id: string; dx: number } | null>(null);
  const [pins, setPins] = useState<PinnedMessageRow[]>(cached?.pins ?? []);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set(cached?.hiddenIds ?? []));
  // Mục 7: tin đang trong lúc chạy animate-bubble-out (đã bấm "Xoá ở phía
  // tôi" nhưng chưa tới lúc lọc hẳn khỏi `visibleMessages`) — tách riêng
  // khỏi `hiddenIds` vì hiddenIds lọc NGAY LẬP TỨC, không kịp chạy animation.
  const [fadingIds, setFadingIds] = useState<Set<string>>(() => new Set());
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState((cached?.messages.length ?? 0) >= PAGE_SIZE);
  // Chỉ hiện skeleton tải ban đầu khi KHÔNG có cache nào cả (lần đầu mở app
  // trong phiên này) — có cache thì luôn hiện ngay dữ liệu cũ, không skeleton.
  const [initialLoading, setInitialLoading] = useState(!cached);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<number | undefined>(undefined);
  const dockHoldTimer = useRef<number | undefined>(undefined);
  const longPressFiredRef = useRef(false);
  const pointerHeldRef = useRef(false);
  const shouldAutoScroll = useRef(true);
  /** Ảnh trong khung chat (đặc biệt ảnh chụp nhanh/stamp) có thể tải/đổi
   * kích thước SAU KHI lần cuộn-xuống-cuối ban đầu đã chạy xong — nếu không
   * bù lại, vị trí cuộn coi như "bị bỏ lại giữa chừng" dù thực ra tin mới
   * nhất vẫn đã có trong danh sách, chỉ là ảnh của nó chưa kịp hiện. Mỗi khi
   * 1 ảnh "settle" xong (dù từ cache hay tải mới) mà vẫn đang ở chế độ tự
   * cuộn thì cuộn lại 1 lần nữa (tức thì, không animate để khỏi giật thêm). */
  function handleImageSettled() {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }
  const swipeStartRef = useRef<{ x: number; y: number; id: string; pointerId: number } | null>(null);
  const swipeAxisRef = useRef<"none" | "horizontal" | "vertical">("none");

  const messageMap = useMemo(() => {
    const map = new Map<string, MessageRow>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const visibleMessages = useMemo(() => messages.filter((m) => !hiddenIds.has(m.id)), [messages, hiddenIds]);

  // ---- Tải/đồng bộ dữ liệu chat: LUÔN chạy 1 lần khi vào khung chat để lấy
  // bản mới nhất từ Supabase (trực tiếp từ trình duyệt — xem lib/chat-client-
  // data.ts, nhanh hơn đi vòng qua Next server), nhưng KHÔNG chặn màn hình
  // nếu đã có cache: dữ liệu cache hiện ra ngay (xem lazy state init phía
  // trên), còn effect này chỉ âm thầm vá lại (merge) khi có gì mới hơn. Nếu
  // chưa có cache (lần đầu mở app) thì đây chính là lượt tải đầu tiên, có
  // hiện skeleton chờ (initialLoading) trong lúc chờ. ----
  useEffect(() => {
    let cancelled = false;
    fetchLatestChatData(coupleId, userId)
      .then((fresh) => {
        if (cancelled || !fresh) return;
        setMessages((prev) => {
          // Giữ lại các tin optimistic đang "pending" (vừa gửi, server chưa
          // kịp trả về qua realtime) và các tin cũ hơn đã tải bằng phân
          // trang (fetchOlderMessages) mà đợt tải mới nhất (chỉ PAGE_SIZE
          // tin gần nhất) không có — tránh mất tin đã cuộn lên xem.
          const pendingOnes = prev.filter((m) => m.pending);
          const oldestFreshAt = fresh.messages[0]?.created_at ?? "";
          const olderLoaded = prev.filter((m) => !m.pending && m.created_at < oldestFreshAt);
          return [...olderLoaded, ...fresh.messages, ...pendingOnes.filter((p) => !fresh.messages.some((f) => f.sender_id === p.sender_id && f.content === p.content))];
        });
        setReactions(reactionsFromRows(fresh.reactions));
        setPins(fresh.pins);
        setHiddenIds(new Set(fresh.hiddenIds));
        setPartnerLastReadAt(fresh.reads.find((r) => r.user_id === partnerId)?.last_read_at ?? null);
        setPartnerLastDeliveredAt(fresh.deliveries.find((d) => d.user_id === partnerId)?.last_delivered_at ?? null);
        if (fresh.pet) setPet(fresh.pet);
        setHasMoreOlder(fresh.messages.length >= PAGE_SIZE);
        patchCachedChat(coupleId, fresh);
      })
      .catch((e) => console.error("fetchLatestChatData failed", e))
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, userId, partnerId]);

  // ---- Đánh dấu "đã đọc": lúc mở màn hình + mỗi khi tin mới về và tab đang
  // hiện (không tính là đã đọc nếu app đang ở nền / màn hình khoá). ----
  useEffect(() => {
    function markReadIfVisible() {
      if (document.visibilityState === "visible") {
        markMessagesRead(coupleId).catch((e) => console.error("markMessagesRead failed", e));
      }
    }
    markReadIfVisible();
    document.addEventListener("visibilitychange", markReadIfVisible);
    window.addEventListener("focus", markReadIfVisible);
    return () => {
      document.removeEventListener("visibilitychange", markReadIfVisible);
      window.removeEventListener("focus", markReadIfVisible);
    };
  }, [coupleId, messages.length]);

  // ---- Đánh dấu "đã NHẬN": ngay khi component này mount (nghĩa là client đã
  // tải được toàn bộ tin nhắn hiện có), KHÔNG cần chờ tab hiển thị — khác hẳn
  // "đã đọc" ở trên. Việc nhận tin MỚI qua Realtime được đánh dấu delivered
  // riêng ngay trong handler INSERT của kênh `messages-${coupleId}` bên dưới,
  // vì đó là thời điểm chính xác tin "tới máy" đối phương. ----
  useEffect(() => {
    markMessagesDelivered(coupleId).catch((e) => console.error("markMessagesDelivered failed", e));
  }, [coupleId]);

  // ---- Realtime: tin nhắn mới/sửa/thu hồi + pet + reactions + reads + pins ----
  useEffect(() => {
    const supabase = createClient();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    const channel = supabase
      .channel(`messages-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const msg = payload.new as MessageRow;
          setMessages((prev) => {
            const pendingIdx = prev.findIndex(
              (m) => m.pending && m.sender_id === msg.sender_id && m.content === msg.content
            );
            if (pendingIdx !== -1) {
              const next = [...prev];
              next[pendingIdx] = msg;
              return next;
            }
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Tin của đối phương vừa "tới máy" mình qua Realtime -> đánh dấu
          // delivered ngay, không chờ mình mở tab lên xem (đó là việc của
          // markMessagesRead, tách riêng ở effect phía trên).
          if (msg.sender_id !== userId) {
            markMessagesDelivered(coupleId).catch((e) => console.error("markMessagesDelivered failed", e));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const msg = payload.new as MessageRow;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
        }
      )
      .subscribe();

    const petChannel = supabase
      .channel(`chatbox-pet-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pets", filter: `couple_id=eq.${coupleId}` },
        (payload) => setPet(payload.new as PetRow)
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`reactions-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { message_id: string; user_id: string };
            setReactions((prev) => {
              const forMsg = { ...(prev[old.message_id] ?? {}) };
              delete forMsg[old.user_id];
              return { ...prev, [old.message_id]: forMsg };
            });
          } else {
            const row = payload.new as ReactionRow;
            setReactions((prev) => ({
              ...prev,
              [row.message_id]: { ...(prev[row.message_id] ?? {}), [row.user_id]: row.emoji },
            }));
          }
        }
      )
      .subscribe();

    // Gộp "reads" + "deliveries" vào 1 channel duy nhất (thay vì 2 WebSocket
    // subscription riêng) — cả 2 bảng cùng scope 1 coupleId và chỉ khác nhau
    // ở tên bảng lắng nghe, nên đăng ký 2 `.on(...)` trên cùng 1 `.channel()`
    // là đủ, Supabase Realtime vẫn phát đúng payload cho từng bảng riêng.
    const readDeliveryChannel = supabase
      .channel(`read-status-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reads", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as MessageReadRow | undefined;
          if (row && row.user_id === partnerId) setPartnerLastReadAt(row.last_read_at);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_deliveries", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const row = payload.new as MessageDeliveryRow | undefined;
          if (row && row.user_id === partnerId) setPartnerLastDeliveredAt(row.last_delivered_at);
        }
      )
      .subscribe();

    const pinChannel = supabase
      .channel(`pins-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pinned_messages", filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { message_id: string };
            setPins((prev) => prev.filter((p) => p.message_id !== old.message_id));
          } else {
            const row = payload.new as PinnedMessageRow;
            setPins((prev) => (prev.some((p) => p.message_id === row.message_id) ? prev : [...prev, row]));
          }
        }
      )
      .subscribe();

    // ---- Áp dữ liệu tin nhắn mới nhất vào state, nhưng CHỈ khi thực sự có
    // gì thay đổi (khác id, khác nội dung/sửa/thu hồi...) — trước đây mỗi
    // lần poll (hoặc mỗi lần resync khi quay lại từ nền) đều tạo MẢNG MỚI dù
    // dữ liệu y hệt, khiến toàn bộ danh sách tin nhắn re-render + effect ghi
    // cache (bên dưới) chạy lại không cần thiết — đây chính là nguyên nhân
    // gây "đơ/giật" mỗi khi quay lại app: hàng loạt timer bị trình duyệt dồn
    // lại lúc tab ẩn bắn dồn dập cùng lúc khi hiện lại, cộng dồn với việc
    // re-render toàn danh sách dù không có gì mới.
    function applyFreshMessages(fresh: MessageRow[]) {
      setMessages((prev) => {
        const pendingOnes = prev.filter((m) => m.pending);
        const merged = [
          ...fresh,
          ...pendingOnes.filter((p) => !fresh.some((d) => d.sender_id === p.sender_id && d.content === p.content)),
        ];
        const oldOnes = prev.filter(
          (m) => !m.pending && !fresh.some((f) => f.id === m.id) && m.created_at < (fresh[0]?.created_at ?? "")
        );
        const next = [...oldOnes, ...merged];

        // So sánh nhanh với `prev` (bỏ qua các tin pending vì chúng luôn đổi
        // tempId) — cùng độ dài + cùng id theo đúng thứ tự + cùng edited_at/
        // deleted_at thì coi là không đổi, giữ nguyên `prev` để React khỏi
        // re-render danh sách.
        if (next.length === prev.length) {
          const unchanged = next.every((m, i) => {
            const p = prev[i];
            return (
              p &&
              p.id === m.id &&
              p.edited_at === m.edited_at &&
              p.deleted_at === m.deleted_at &&
              p.content === m.content
            );
          });
          if (unchanged) return prev;
        }
        return next;
      });
    }

    // Poll dự phòng: nếu vì lý do gì đó realtime rớt hoàn toàn, vẫn đảm bảo
    // tin nhắn xuất hiện trong vòng vài giây thay vì phải tự bấm reload.
    // CHỈ chạy khi tab đang hiện — bỏ qua hoàn toàn lúc app ở nền, tránh dồn
    // request/cập nhật state khi quay lại (xem ghi chú applyFreshMessages).
    const poll = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (data) applyFreshMessages([...data].reverse());
    }, 8000);

    // ---- Quay lại từ nền: WebSocket realtime của trình duyệt/webview
    // thường bị hệ điều hành ngắt sau 1 lúc app chạy nền — supabase-js tự
    // reconnect nhưng đôi khi "kẹt" (đặc biệt trên webview di động/PWA khi
    // out app không đóng hẳn). Thay vì chờ, chủ động ép reconnect + đồng bộ
    // lại 1 lần sạch ngay khi tab hiện trở lại (chỉ 1 lần, không lặp lại
    // liên tục), để chắc chắn không bị "treo" hiển thị dữ liệu cũ. ----
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      // Chỉ coi là "vừa quay lại từ nền" nếu đã ẩn đủ lâu (>3s) — tránh việc
      // chuyển tab/app qua lại nhanh (vd mở bàn phím, mở picker ảnh) cũng
      // kích hoạt reconnect không cần thiết.
      const wasHiddenLongEnough = hiddenAt !== null && Date.now() - hiddenAt > 3000;
      hiddenAt = null;
      if (!wasHiddenLongEnough) return;

      try {
        const isConnected = supabase.realtime.isConnected?.();
        if (isConnected === false) {
          supabase.realtime.connect();
        }
      } catch {
        // Không chặn luồng chính nếu bản supabase-js hiện tại không có API
        // này — resync bằng fetch bên dưới vẫn đảm bảo dữ liệu đúng.
      }

      supabase
        .from("messages")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE)
        .then(({ data }) => {
          if (data) applyFreshMessages([...data].reverse());
        });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
      supabase.removeChannel(petChannel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(readDeliveryChannel);
      supabase.removeChannel(pinChannel);
      authListener.subscription.unsubscribe();
      window.clearInterval(poll);
    };
    // userId thêm vào deps vì handler INSERT ở trên giờ có so sánh
    // msg.sender_id !== userId để quyết định gọi markMessagesDelivered.
  }, [coupleId, partnerId, userId]);

  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    const jump = messages.length - prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (shouldAutoScroll.current) {
      // Nhảy nhiều hơn 1 tin cùng lúc (vd vừa resync lại toàn bộ sau khi
      // quay lại app từ nền) thì cuộn tức thì thay vì "smooth" — animate
      // cuộn 1 khoảng dài ngay lúc trình duyệt còn đang bận dựng lại cả
      // danh sách là nguyên nhân chính gây cảm giác giật/đơ lúc đó.
      bottomRef.current?.scrollIntoView({ behavior: jump > 1 ? "auto" : "smooth" });
    }
  }, [messages.length, partnerTyping]);

  // ---- Ghi cache mỗi khi dữ liệu chat thay đổi (tin mới, reaction, ghim,
  // ẩn tin, đổi mood pet...) — đảm bảo lần SAU vào lại khung chat này (dù
  // trong cùng phiên) luôn thấy đúng trạng thái mới nhất ngay lập tức, không
  // cần chờ effect đồng bộ nền chạy xong. Debounce 400ms để không
  // JSON.stringify + ghi sessionStorage liên tục khi nhiều state đổi dồn dập
  // cùng lúc (vd nhận nhiều tin liền, hoặc lúc resync sau khi quay lại từ
  // nền) — đây từng là 1 phần nguyên nhân gây giật khi quay lại app. ----
  const cacheWriteTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(cacheWriteTimer.current);
    cacheWriteTimer.current = window.setTimeout(() => {
      patchCachedChat(coupleId, {
        messages,
        reactions: Object.entries(reactions).flatMap(([messageId, byUser]) =>
          Object.entries(byUser).map(([user_id, emoji]) => ({
            id: `${messageId}:${user_id}`,
            message_id: messageId,
            couple_id: coupleId,
            user_id,
            emoji,
            created_at: new Date().toISOString(),
          }))
        ),
        pins,
        hiddenIds: Array.from(hiddenIds),
        pet,
      });
    }, 400);
    return () => window.clearTimeout(cacheWriteTimer.current);
  }, [coupleId, messages, reactions, pins, hiddenIds, pet]);

  // ---- Phân trang: tải thêm tin cũ hơn khi cuộn gần lên đầu danh sách ----
  async function handleScroll() {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMoreOlder) return;
    if (el.scrollTop > 60) return;

    const oldest = messages[0];
    if (!oldest) return;

    setLoadingOlder(true);
    shouldAutoScroll.current = false;
    const prevScrollHeight = el.scrollHeight;

    const { messages: older, reactions: olderReactions, hiddenIds: olderHiddenIds } = await fetchOlderMessages(
      coupleId,
      userId,
      oldest.created_at,
      PAGE_SIZE
    );
    if (older.length < PAGE_SIZE) setHasMoreOlder(false);
    if (older.length > 0) {
      setMessages((prev) => [...(older as MessageRow[]), ...prev]);
      if (olderReactions.length > 0) {
        setReactions((prev) => ({ ...prev, ...reactionsFromRows(olderReactions as ReactionRow[]) }));
      }
      if (olderHiddenIds.length > 0) {
        setHiddenIds((prev) => new Set([...prev, ...olderHiddenIds]));
      }
      // giữ nguyên vị trí nhìn thấy được sau khi chèn tin cũ vào đầu danh sách
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
    setLoadingOlder(false);
  }

  function handleTextChange(value: string) {
    setText(value);
    notifyTyping(value.trim().length > 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    // ---- Chế độ sửa tin nhắn ----
    if (editingId) {
      setText("");
      const editing = editingId;
      const previous = messages.find((m) => m.id === editing);
      setEditingId(null);
      setMessages((prev) => prev.map((m) => (m.id === editing ? { ...m, content, edited_at: new Date().toISOString() } : m)));
      const res = await editMessage(editing, content);
      if (res?.error) {
        console.error("editMessage failed", res.error);
        // Rollback: trả lại nội dung cũ nếu server từ chối (vd tin đã bị thu
        // hồi/xoá ở nơi khác trước khi mình bấm lưu sửa) — tránh UI hiển thị
        // nội dung "đã sửa" nhưng thực tế DB không hề đổi.
        if (previous) setMessages((prev) => prev.map((m) => (m.id === editing ? previous : m)));
      }
      return;
    }

    setText("");
    setSending(true);
    notifyTyping(false);
    shouldAutoScroll.current = true;

    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);

    const optimistic: MessageRow = {
      id: tempId(),
      couple_id: coupleId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(false);

    const formData = new FormData();
    formData.set("content", content);
    if (replyToId) formData.set("reply_to_id", replyToId);
    const res = await sendMessage(coupleId, formData);

    setMessages((prev) => {
      if (res?.message) {
        return prev.map((m) => (m.id === optimistic.id ? { ...res.message, pending: false } : m));
      }
      return prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m));
    });
  }

  async function handlePickSticker(id: StickerId) {
    setPickerOpen(false);
    shouldAutoScroll.current = true;
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const optimistic: MessageRow = {
      id: tempId(),
      couple_id: coupleId,
      sender_id: userId,
      content: `::sticker::${id}`,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await sendSticker(coupleId, id, replyToId);
    setMessages((prev) => {
      if (res?.message) {
        return prev.map((m) => (m.id === optimistic.id ? { ...res.message, pending: false } : m));
      }
      return prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m));
    });
  }

  /** Gửi 1 GIF chọn từ tab "GIF" — cùng pattern optimistic với sticker, chỉ
   * khác nội dung mã hoá (xem encodeGif trong lib/message-format.ts). */
  async function handlePickGif(url: string, width?: number, height?: number) {
    setPickerOpen(false);
    shouldAutoScroll.current = true;
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const dims = width && height ? `::${width}x${height}` : "";
    const optimistic: MessageRow = {
      id: tempId(),
      couple_id: coupleId,
      sender_id: userId,
      content: `::gif::${url}${dims}`,
      created_at: new Date().toISOString(),
      reply_to_id: replyToId,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await sendGif(coupleId, url, width, height, replyToId);
    setMessages((prev) => {
      if (res?.message) {
        return prev.map((m) => (m.id === optimistic.id ? { ...res.message, pending: false } : m));
      }
      return prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m));
    });
  }

  /** Chèn 1 emoji từ tab "Emoji" của StickerPicker vào ngay vị trí đang gõ
   * trong ô nhập text — KHÔNG gửi luôn (khác sticker/GIF), vì emoji ở đây
   * dùng để LÀM GIÀU nội dung tin nhắn text, không phải 1 loại tin riêng. */
  function handlePickComposerEmoji(emoji: string) {
    setText((prev) => prev + emoji);
  }

  function friendlyImageUploadError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    // Supabase Storage trả nguyên văn tiếng Anh này khi file vượt
    // file_size_limit của bucket (xem migration-v12-increase-image-limit.sql)
    // -> dịch lại cho người dùng hiểu thay vì hiện câu tiếng Anh khó hiểu.
    if (/exceeded the maximum allowed size/i.test(raw)) {
      return "Ảnh quá nặng để gửi. Vui lòng thử chụp lại (ánh sáng đủ sẽ giúp ảnh nhẹ hơn) hoặc gửi ảnh khác.";
    }
    return raw || "Gửi ảnh thất bại.";
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Vui lòng chọn một file ảnh.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setUploadError(`Ảnh tối đa ${MAX_IMAGE_MB}MB nhé.`);
      return;
    }

    setUploadError(null);
    shouldAutoScroll.current = true;
    const localUrl = URL.createObjectURL(file);
    setUploadPreview(localUrl);
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);

    try {
      const { width, height } = await readImageDims(file);
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${coupleId}/${userId}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { upsert: false, cacheControl: "31536000", contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
      const finalUrl = pub.publicUrl;

      const optimistic: MessageRow = {
        id: tempId(),
        couple_id: coupleId,
        sender_id: userId,
        content: encodeImage(finalUrl, width, height),
        reply_to_id: replyToId,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setUploadPreview(null);
      URL.revokeObjectURL(localUrl);

      const res = await sendImage(coupleId, finalUrl, width, height, replyToId);
      setMessages((prev) => {
        if (res?.message) {
          return prev.map((m) => (m.id === optimistic.id ? { ...res.message, pending: false } : m));
        }
        return prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m));
      });
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setUploadPreview(null);
      setUploadError(friendlyImageUploadError(err));
    }
  }

  /**
   * Nhận PNG lossless đã có sẵn răng cưa từ <InstantCapture> (xem
   * components/InstantCapture.tsx + lib/stamp-frame.ts) -> upload lên cùng
   * bucket "chat-images" -> gửi bằng sendStampPhoto (khác sendImage ở cách
   * mã hoá nội dung để client render không viền/không bo góc).
   *
   * QUAN TRỌNG: không hạ chất lượng/độ phân giải ảnh để đổi lấy tốc độ. Thay
   * vào đó, tin nhắn được hiện ra NGAY LẬP TỨC bằng blob URL cục bộ (ảnh vừa
   * chụp, hiển thị tức thì không cần chờ mạng) trong khi việc upload file PNG
   * gốc (giữ nguyên chất lượng) chạy NGẦM phía sau — người dùng thấy ảnh ngay
   * dù mạng chậm, chỉ có tick "đang gửi" (pending) chuyển thành "đã gửi" trễ
   * hơn 1 chút khi upload xong.
   */
  async function handleStampCapture(blob: Blob, width: number, height: number) {
    setInstantCaptureOpen(false);
    shouldAutoScroll.current = true;
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);

    const localUrl = URL.createObjectURL(blob);
    const optimisticId = tempId();
    const optimistic: MessageRow = {
      id: optimisticId,
      couple_id: coupleId,
      sender_id: userId,
      content: encodeStampPhoto(localUrl, width, height),
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
      pending: true,
    };
    // Hiện ngay bằng ảnh cục bộ — không chờ upload xong mới thấy gì.
    setMessages((prev) => [...prev, optimistic]);

    try {
      const supabase = createClient();
      const path = `${coupleId}/${userId}-${Date.now()}.png`;

      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, blob, { upsert: false, cacheControl: "31536000", contentType: "image/png" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("chat-images").getPublicUrl(path);
      const finalUrl = pub.publicUrl;

      const res = await sendStampPhoto(coupleId, finalUrl, width, height, replyToId);
      setMessages((prev) => {
        if (res?.message) {
          return prev.map((m) => (m.id === optimisticId ? { ...res.message, pending: false } : m));
        }
        return prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m));
      });
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      // Giữ nguyên bubble với ảnh cục bộ, chỉ đánh dấu gửi thất bại — không
      // revoke localUrl ở đây vì bubble vẫn đang hiển thị ảnh đó cho tới khi
      // người dùng thử gửi lại hoặc xoá tin.
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m)));
      setUploadError(friendlyImageUploadError(err));
    }
  }

  /** Ghi âm xong -> upload lên bucket chat-voice -> gửi tin nhắn thoại. */
  async function handleVoiceSend(blob: Blob, durationSec: number) {
    setRecording(false);
    shouldAutoScroll.current = true;
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const localUrl = URL.createObjectURL(blob);

    const optimistic: MessageRow = {
      id: tempId(),
      couple_id: coupleId,
      sender_id: userId,
      content: `::voice::${localUrl}::${durationSec}`,
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const supabase = createClient();
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${coupleId}/${userId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-voice")
        .upload(path, blob, { upsert: false, contentType: blob.type || "audio/webm" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("chat-voice").getPublicUrl(path);

      const res = await sendVoice(coupleId, pub.publicUrl, durationSec, replyToId);
      setMessages((prev) => {
        if (res?.message) {
          return prev.map((m) => (m.id === optimistic.id ? { ...res.message, pending: false } : m));
        }
        return prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m));
      });
    } catch (err) {
      console.error("gửi voice thất bại", err);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false, failed: true } : m)));
    }
  }

  // ---- Thả cảm xúc: optimistic update trước, server + realtime sẽ chốt lại. ----
  async function handleReact(messageId: string, emoji: string) {
    setReactionPickerFor(null);
    const mine = reactions[messageId]?.[userId];
    setReactions((prev) => {
      const forMsg = { ...(prev[messageId] ?? {}) };
      if (mine === emoji) delete forMsg[userId];
      else forMsg[userId] = emoji;
      return { ...prev, [messageId]: forMsg };
    });
    const res = await toggleReaction(coupleId, messageId, emoji);
    if (res?.error) {
      setReactions((prev) => {
        const forMsg = { ...(prev[messageId] ?? {}) };
        if (mine) forMsg[userId] = mine;
        else delete forMsg[userId];
        return { ...prev, [messageId]: forMsg };
      });
    }
  }

  /**
   * Long-press theo 2 tầng, tách rõ khỏi nhau để không bao giờ mở đồng thời
   * (nguyên nhân bug cũ: cả ReactionPicker lẫn MessageActionDock cùng bật một
   * lúc, và lớp nền mờ "fixed inset-0" của Dock (z-30, vẽ sau trong DOM) đè
   * lên và nuốt mất sự kiện chạm của ReactionPicker):
   *  1) Giữ ngắn (LONG_PRESS_MS) -> CHỈ hiện ReactionPicker nổi trên bong bóng.
   *  2) Nếu vẫn giữ tiếp thêm DOCK_HOLD_EXTRA_MS -> tự mở thêm MessageActionDock
   *     (giống Messenger/Telegram: giữ lâu hơn = menu đầy đủ).
   * Ngoài ra, khi ReactionPicker đang mở, người dùng có thể bấm nút "..." trên
   * chính picker để mở dock ngay — đây là cách chắc chắn nhất để "mở dock khi
   * picker đang hiện" vì backdrop fixed phía dưới picker che mất bong bóng nên
   * tap thẳng vào bong bóng lúc đó không đáng tin cậy trên mọi engine.
   */
  function startLongPress(messageId: string) {
    longPressFiredRef.current = false;
    pointerHeldRef.current = true;
    window.clearTimeout(longPressTimer.current);
    window.clearTimeout(dockHoldTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setReactionPickerFor(messageId);
      dockHoldTimer.current = window.setTimeout(() => {
        if (pointerHeldRef.current) setDockFor(messageId);
      }, DOCK_HOLD_EXTRA_MS);
    }, LONG_PRESS_MS);
  }
  function cancelLongPress() {
    pointerHeldRef.current = false;
    window.clearTimeout(longPressTimer.current);
    window.clearTimeout(dockHoldTimer.current);
  }

  /**
   * Vuốt SANG PHẢI trên 1 bong bóng bất kỳ (của mình hay đối phương) để trả
   * lời — thay cho hạng mục "vuốt trên danh sách hội thoại để ghim/xoá" đã
   * dời khỏi kế hoạch mục 5 (xem KE-HOACH-NANG-CAP.md): với đúng 1 hội thoại
   * hiện tại, vuốt-để-trả-lời trên TIN NHẮN mang lại giá trị UX thật ngay bây
   * giờ hơn nhiều so với vuốt trên 1 dòng hội thoại duy nhất.
   *
   * Bắt sự kiện ở cấp HÀNG (row) bao quanh avatar+bong bóng, không phải trên
   * chính bong bóng — vì bong bóng đã dùng onPointerDown riêng cho long-press
   * (mở ReactionPicker/Dock). 2 cơ chế không tranh chấp nhau nhờ "khoá trục":
   * chỉ khi di chuyển ngang > SWIPE_AXIS_LOCK_PX mới coi là đang vuốt và HUỶ
   * long-press timer đang chờ (cancelLongPress) — di chuyển dọc (cuộn danh
   * sách) thì bỏ qua hoàn toàn, không can thiệp gì.
   */
  function handleRowPointerDown(e: React.PointerEvent, messageId: string) {
    if (reactionPickerFor || dockFor || fullEmojiFor || editingId) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY, id: messageId, pointerId: e.pointerId };
    swipeAxisRef.current = "none";
  }

  function handleRowPointerMove(e: React.PointerEvent, messageId: string) {
    const start = swipeStartRef.current;
    if (!start || start.id !== messageId || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (swipeAxisRef.current === "none") {
      if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX && Math.abs(dy) < SWIPE_AXIS_LOCK_PX) return;
      swipeAxisRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (swipeAxisRef.current === "horizontal") cancelLongPress();
    }
    if (swipeAxisRef.current !== "horizontal") return;

    // Chỉ cho vuốt sang PHẢI (dx dương) để trả lời; vuốt trái bỏ qua, kẹp
    // ở 0 để bong bóng không lệch ngược chiều.
    const clamped = Math.max(0, Math.min(dx, SWIPE_MAX_DRAG));
    setSwipeState({ id: messageId, dx: clamped });
  }

  function handleRowPointerUp(messageId: string) {
    const wasHorizontal = swipeAxisRef.current === "horizontal";
    swipeStartRef.current = null;
    swipeAxisRef.current = "none";
    setSwipeState((prev) => {
      if (prev && prev.id === messageId && wasHorizontal && prev.dx >= SWIPE_REPLY_THRESHOLD) {
        const target = messageMap.get(messageId);
        if (target && !target.deleted_at) {
          setReplyingTo(target);
          navigator.vibrate?.(8); // rung nhẹ xác nhận, im lặng bỏ qua nếu thiết bị không hỗ trợ
        }
      }
      return null;
    });
  }

  function resetSwipe() {
    swipeStartRef.current = null;
    swipeAxisRef.current = "none";
    setSwipeState(null);
  }
  function handleBubbleClick(messageId: string) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    setRevealedTimeId((prev) => (prev === messageId ? null : messageId));
  }

  function closeMenu() {
    pointerHeldRef.current = false;
    window.clearTimeout(longPressTimer.current);
    window.clearTimeout(dockHoldTimer.current);
    setReactionPickerFor(null);
    setDockFor(null);
    setFullEmojiFor(null);
  }

  async function handleTogglePin(messageId: string) {
    const isPinned = pins.some((p) => p.message_id === messageId);
    if (isPinned) {
      setPins((prev) => prev.filter((p) => p.message_id !== messageId));
      await unpinMessage(coupleId, messageId);
    } else {
      setPins((prev) => [...prev, { couple_id: coupleId, message_id: messageId, pinned_by: userId, pinned_at: new Date().toISOString() }]);
      await pinMessage(coupleId, messageId);
    }
  }

  async function handleRecall(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m)));
    const res = await recallMessage(messageId);
    // Rollback nếu server từ chối (vd không còn là chủ tin nhắn nữa) — không
    // để UI hiển thị "tin đã thu hồi" trong khi DB vẫn còn nguyên tin gốc.
    if (res?.error) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, deleted_at: undefined } : m)));
      console.error("recallMessage failed", res.error);
    }
  }

  async function handleHide(messageId: string) {
    // Chạy animate-bubble-out trước (xem class trên bong bóng ở JSX bên
    // dưới), rồi mới lọc hẳn khỏi visibleMessages sau khi animation xong —
    // tránh tin biến mất đột ngột như trước.
    setFadingIds((prev) => new Set(prev).add(messageId));
    window.setTimeout(() => {
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      setHiddenIds((prev) => new Set(prev).add(messageId));
    }, 180);

    const res = await hideMessageForMe(messageId);
    if (res?.error) {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      console.error("hideMessageForMe failed", res.error);
    }
  }

  function handleCopy(content: string) {
    const decoded = decodeMessage(content);
    if (decoded.type === "text") navigator.clipboard?.writeText(decoded.text).catch(() => {});
  }

  /** Nhảy tới 1 tin nhắn cụ thể — nếu đã có trong danh sách hiện tại thì
   * cuộn ngay, nếu chưa (do đã bị phân trang bỏ lại phía sau) thì tải 1
   * khoảng tin xung quanh mốc thời gian đó rồi thay thế danh sách hiển thị. */
  async function jumpToMessage(target: MessageRow | { id: string; created_at: string }) {
    shouldAutoScroll.current = false;
    if (messageMap.has(target.id)) {
      scrollToMessageEl(target.id);
      return;
    }
    const around = await fetchMessagesAround(coupleId, target.created_at, 30);
    if (around.length > 0) {
      setMessages(around as MessageRow[]);
      setHasMoreOlder(true);
      requestAnimationFrame(() => scrollToMessageEl(target.id));
    }
  }

  function scrollToMessageEl(id: string) {
    const el = document.getElementById(`msg-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((prev) => (prev === id ? null : prev)), 1600);
  }

  const dockMessage = dockFor ? messageMap.get(dockFor) : undefined;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <PinnedBar
        pins={pins}
        messageMap={messageMap}
        onJump={(id) => {
          const m = messageMap.get(id);
          if (m) jumpToMessage(m);
        }}
        onUnpin={(id) => handleTogglePin(id)}
      />

      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} onScroll={handleScroll} className="thin-scroll absolute inset-0 overflow-y-auto px-3 py-4">
          <div className="space-y-2">
            {loadingOlder && (
              <div className="flex flex-col gap-2 pb-2">
                <div className="h-9 w-2/5 animate-shimmer rounded-2xl rounded-bl-md" />
                <div className="ml-auto h-9 w-1/3 animate-shimmer rounded-2xl rounded-br-md" />
              </div>
            )}
            {visibleMessages.length === 0 && initialLoading && (
              // Chỉ hiện khi thật sự chưa có cache nào (lần đầu mở app trong
              // phiên này) — những lần vào lại sau, cache đã lấp đầy messages
              // ngay từ đầu nên sẽ không bao giờ rơi vào nhánh này.
              <div className="flex flex-col gap-2 pt-2">
                <div className="h-9 w-2/5 animate-shimmer rounded-2xl rounded-bl-md" />
                <div className="ml-auto h-9 w-1/3 animate-shimmer rounded-2xl rounded-br-md" />
                <div className="h-9 w-1/2 animate-shimmer rounded-2xl rounded-bl-md" />
              </div>
            )}
            {visibleMessages.length === 0 && !initialLoading && (
              <p className="mt-6 text-center text-xs text-[var(--muted)]">
                Chưa có tin nhắn nào — nói gì đó với người ấy để bắt đầu giữ chuỗi nhé.
              </p>
            )}
            {visibleMessages.map((m, i) => {
              const decoded = decodeMessage(m.content);
              const mine = m.sender_id === userId;
              const profile = mine ? myProfile : partnerProfile;
              const prevMsg = visibleMessages[i - 1];
              const next = visibleMessages[i + 1];
              const isLastOfGroup = !next || next.sender_id !== m.sender_id;
              const msgReactions = reactions[m.id] ?? {};
              const reactionEntries = Object.entries(msgReactions);
              const myReaction = msgReactions[userId];
              const pickerOpenHere = reactionPickerFor === m.id;
              const timeRevealed = revealedTimeId === m.id;
              const isPinned = pins.some((p) => p.message_id === m.id);
              const isDeleted = Boolean(m.deleted_at);
              const replyTarget = m.reply_to_id ? messageMap.get(m.reply_to_id) : undefined;
              const highlighted = highlightId === m.id;

              return (
                <div key={m.id} id={`msg-${m.id}`} className={fadingIds.has(m.id) ? "animate-bubble-out overflow-hidden" : undefined}>
                  {shouldShowTimeDivider(m, prevMsg) && (
                    <p className="my-2.5 text-center text-[10px] font-medium tracking-wide text-[var(--muted)]">
                      <TimeText iso={m.created_at} />
                    </p>
                  )}
                  <div
                    className={`relative flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"} ${
                      isLastOfGroup ? "" : "pb-0.5"
                    } ${reactionEntries.length > 0 ? "mb-2.5" : ""}`}
                    onPointerDown={(e) => handleRowPointerDown(e, m.id)}
                    onPointerMove={(e) => handleRowPointerMove(e, m.id)}
                    onPointerUp={() => handleRowPointerUp(m.id)}
                    onPointerCancel={resetSwipe}
                    onPointerLeave={resetSwipe}
                    style={{ touchAction: "pan-y" }}
                  >
                    <div
                      className="relative flex min-w-0 max-w-[78%] items-end gap-1.5"
                      style={{
                        transform: swipeState?.id === m.id ? `translateX(${swipeState.dx}px)` : undefined,
                        transition: swipeState?.id === m.id ? "none" : "transform 150ms ease-out",
                      }}
                    >
                      {/* Icon trả lời — gắn NGAY BÊN TRÁI khối avatar+bong bóng
                          (không phải bên trái toàn hàng) nên trôi theo cùng
                          lúc kéo, như đang "kéo lộ ra" 1 icon giấu phía sau
                          bong bóng — độ đậm tỉ lệ % đã kéo so với ngưỡng
                          kích hoạt (SWIPE_REPLY_THRESHOLD), giống
                          Telegram/Messenger. Nếu để cố định bên trái CẢ
                          HÀNG (vốn rộng full-width do justify-end/-start)
                          thì với tin nhắn "của mình" (canh phải), icon sẽ
                          hiện ra ở tít lề trái màn hình, cách xa hẳn bong
                          bóng đang trôi bên phải — nên phải đặt icon làm
                          con của chính khối đang trôi, absolute lệch trái. */}
                      {swipeState?.id === m.id && swipeState.dx > 4 && !isDeleted && (
                        <span
                          className="absolute -left-9 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]"
                          style={{ opacity: Math.min(swipeState.dx / SWIPE_REPLY_THRESHOLD, 1) }}
                        >
                          <ReplyIcon className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {!mine && (
                        <div className="w-6 shrink-0">
                          {isLastOfGroup && <Avatar url={profile?.avatar_url} name={profile?.display_name} size={24} />}
                        </div>
                      )}

                      <div className={`relative max-w-full rounded-2xl transition-shadow ${highlighted ? "ring-2 ring-[var(--brand)]" : ""}`}>
                      {pickerOpenHere && (
                        <>
                          {/* Khi dock đã mở, dock tự có lớp nền riêng để đóng cả hai —
                              không render thêm 1 backdrop nữa ở đây để tránh 2 lớp
                              nền mờ chồng lên nhau (chính là nguyên nhân bug cũ). */}
                          {dockFor !== m.id && (
                            <button type="button" aria-label="Đóng" onClick={closeMenu} className="fixed inset-0 z-20 cursor-default" />
                          )}
                          <ReactionPicker
                            align={mine ? "right" : "left"}
                            activeEmoji={myReaction}
                            onSelect={(emoji) => handleReact(m.id, emoji)}
                            onMore={() => setDockFor(m.id)}
                            onOpenFullEmoji={() => {
                              setReactionPickerFor(null);
                              setFullEmojiFor(m.id);
                            }}
                          />
                        </>
                      )}

                      {fullEmojiFor === m.id && (
                        <>
                          <button
                            type="button"
                            aria-label="Đóng"
                            onClick={() => setFullEmojiFor(null)}
                            className="fixed inset-0 z-40 cursor-default"
                          />
                          <div
                            className={`animate-pop-in absolute bottom-full z-50 mb-1.5 w-72 max-w-[85vw] glass-surface rounded-2xl p-2 shadow-lg ${
                              mine ? "right-0" : "left-0"
                            }`}
                            style={{ transformOrigin: mine ? "bottom right" : "bottom left" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EmojiFullPicker
                              title="Tìm emoji"
                              onSelect={(emoji) => {
                                handleReact(m.id, emoji);
                                setFullEmojiFor(null);
                              }}
                              onClose={() => setFullEmojiFor(null)}
                            />
                          </div>
                        </>
                      )}

                      {isDeleted ? (
                        <div
                          onClick={() => handleBubbleClick(m.id)}
                          className={`select-none rounded-2xl px-3.5 py-2 text-sm italic text-[var(--muted)] ${
                            mine ? "rounded-br-md bg-black/5" : "rounded-bl-md bg-black/5"
                          }`}
                        >
                          <UndoIcon className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                          Tin nhắn đã được thu hồi
                        </div>
                      ) : decoded.type === "sticker" ? (
                        <div
                          onPointerDown={() => startLongPress(m.id)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onClick={() => handleBubbleClick(m.id)}
                          className="animate-bubble-in pointer-events-auto select-none rounded-2xl bg-transparent p-1"
                        >
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          <StickerArt id={decoded.id} className="h-20 w-20" />
                        </div>
                      ) : decoded.type === "image" ? (
                        <div>
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          <button
                            type="button"
                            onPointerDown={() => startLongPress(m.id)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onClick={() => {
                              if (longPressFiredRef.current) {
                                longPressFiredRef.current = false;
                                return;
                              }
                              setLightbox(decoded.url);
                            }}
                            className={`animate-bubble-in group pointer-events-auto relative w-full max-w-[62vw] overflow-hidden rounded-2xl shadow-sm active:scale-[0.98] ${
                              mine ? "rounded-br-md" : "rounded-bl-md"
                            } ${m.pending ? "opacity-70" : ""} ${m.failed ? "ring-2 ring-red-400" : ""}`}
                          >
                            <MessageImage
                              src={decoded.url}
                              alt="Ảnh đã gửi"
                              aspectRatio={decoded.width && decoded.height ? `${decoded.width} / ${decoded.height}` : undefined}
                              className="max-h-72 w-full bg-black/5"
                              imgClassName="max-h-72 w-full object-cover"
                              onSettled={handleImageSettled}
                            />
                            {m.pending && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                              </span>
                            )}
                          </button>
                        </div>
                      ) : decoded.type === "stamp_photo" ? (
                        <div>
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          <button
                            type="button"
                            onPointerDown={() => startLongPress(m.id)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onClick={() => {
                              if (longPressFiredRef.current) {
                                longPressFiredRef.current = false;
                                return;
                              }
                              setLightbox(decoded.url);
                            }}
                            className={`animate-bubble-in pointer-events-auto relative block w-48 active:scale-[0.97] ${
                              m.pending ? "opacity-70" : ""
                            } ${m.failed ? "ring-2 ring-red-400" : ""}`}
                          >
                            {/* Trước đây dùng CSS filter:drop-shadow trực tiếp trên ảnh —
                               drop-shadow tính bóng theo TỪNG pixel alpha, mà ảnh tem có
                               hàng chục lỗ khoét nhỏ quanh viền (vùng trong suốt) nên MỖI
                               lỗ bị đổ 1 bóng riêng, cộng dồn lại thành viền đen loang lổ
                               xấu xí quanh ảnh — đúng lỗi người dùng báo. Thay bằng 1 lớp
                               nền mờ hình chữ nhật bo góc đặt phía sau (bg-black/20 blur-xl),
                               chỉ đổ đúng 1 bóng mềm duy nhất giống cảm giác tấm ảnh polaroid
                               nổi nhẹ trên nền, không bám theo từng lỗ khoét. */}
                            <div aria-hidden className="absolute inset-[7%] rounded-[26px] bg-black/20 blur-xl" />
                            {/* Không rounded/overflow-hidden/nền: hình dạng răng cưa đã
                               nằm sẵn trong file PNG (vùng trong suốt tại các lỗ khoét),
                               bọc thêm khung ở đây sẽ đè mất viền tem đã bake. Vì vậy
                               skeleton loading dùng nền trong suốt, không phải khối đặc. */}
                            <MessageImage
                              src={decoded.url}
                              alt="Chụp nhanh"
                              aspectRatio={decoded.width && decoded.height ? `${decoded.width} / ${decoded.height}` : "4 / 5"}
                              className="relative w-full"
                              imgClassName="w-full object-contain"
                              onSettled={handleImageSettled}
                            />
                            {m.pending && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                              </span>
                            )}
                          </button>
                        </div>
                      ) : decoded.type === "gif" ? (
                        <div>
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          <button
                            type="button"
                            onPointerDown={() => startLongPress(m.id)}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onClick={() => {
                              if (longPressFiredRef.current) {
                                longPressFiredRef.current = false;
                                return;
                              }
                              setLightbox(decoded.url);
                            }}
                            className={`animate-bubble-in group pointer-events-auto relative w-full max-w-[62vw] overflow-hidden rounded-2xl shadow-sm active:scale-[0.98] ${
                              mine ? "rounded-br-md" : "rounded-bl-md"
                            } ${m.pending ? "opacity-70" : ""} ${m.failed ? "ring-2 ring-red-400" : ""}`}
                          >
                            <MessageImage
                              src={decoded.url}
                              alt="GIF đã gửi"
                              aspectRatio={decoded.width && decoded.height ? `${decoded.width} / ${decoded.height}` : undefined}
                              className="max-h-72 w-full bg-black/5"
                              imgClassName="max-h-72 w-full object-cover"
                              onSettled={handleImageSettled}
                            />
                            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
                              GIF
                            </span>
                            {m.pending && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                              </span>
                            )}
                          </button>
                        </div>
                      ) : decoded.type === "voice" ? (
                        <div
                          onPointerDown={() => startLongPress(m.id)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                        >
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          <VoiceMessageBubble url={decoded.url} duration={decoded.duration} mine={mine} />
                        </div>
                      ) : (
                        <div
                          onPointerDown={() => startLongPress(m.id)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onClick={() => handleBubbleClick(m.id)}
                          className={`animate-bubble-in pointer-events-auto select-none rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                            mine ? "rounded-br-md bg-[var(--brand)] text-white" : "glass-surface rounded-bl-md text-[var(--foreground)]"
                          } ${m.pending ? "opacity-60" : ""} ${m.failed ? "ring-2 ring-red-400" : ""}`}
                        >
                          {replyTarget && <ReplyQuoteInline message={replyTarget} mine={mine} onJump={() => jumpToMessage(replyTarget)} />}
                          {decoded.text}
                          {m.edited_at && (
                            <span className={`ml-1.5 text-[10px] ${mine ? "text-white/70" : "text-[var(--muted)]"}`}>(đã sửa)</span>
                          )}
                        </div>
                      )}

                      {isPinned && !isDeleted && (
                        <span className={`absolute -top-1.5 ${mine ? "-left-1.5" : "-right-1.5"} text-[10px]`}>📌</span>
                      )}

                      {reactionEntries.length > 0 && (
                        <div
                          className={`absolute -bottom-2.5 flex items-center glass-surface rounded-full px-1 py-0.5 text-[11px] shadow ${
                            mine ? "right-1" : "left-1"
                          }`}
                        >
                          {reactionEntries.map(([uid, emoji]) => (
                            <span key={uid} className="px-0.5">
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                      {mine && (
                        <div className="w-6 shrink-0">
                          {isLastOfGroup && <Avatar url={myProfile?.avatar_url} name={myProfile?.display_name} size={24} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {timeRevealed && (
                    <p className={`mb-1 text-[10px] text-[var(--muted)] ${mine ? "text-right pr-7" : "text-left pl-7"}`}>
                      <TimeText iso={m.created_at} />
                    </p>
                  )}

                  {/*
                    Trạng thái gửi/nhận/xem: CHỈ gắn vào tin nhắn đang là điểm
                    cuối thật sự của TOÀN BỘ cuộc trò chuyện (i === cuối danh
                    sách), không phải "tin cuối của riêng mình". Nhờ vậy, ngay
                    khi đối phương gửi tin mới, tin đó trở thành điểm cuối mới
                    và dòng trạng thái bên dưới tin cũ của mình tự động biến
                    mất — không còn bị đứng "lơ lửng" dưới 1 tin không còn là
                    tin cuối nữa.
                    3 nấc, tách theo 2 mốc thời gian ĐỘC LẬP nhau (xem
                    migration-v10-delivered-status.sql):
                      - partnerLastDeliveredAt: tin đã TỚI máy đối phương
                        (client họ nhận qua Realtime), có thể xảy ra dù họ
                        chưa mở app lên xem.
                      - partnerLastReadAt: họ đã thực sự MỞ RA XEM.
                    "Đã xem" luôn ưu tiên trước vì đọc thì chắc chắn cũng đã
                    nhận; chỉ khi có delivered nhưng chưa có read mới hiện
                    "Đã nhận" (tick đúp XÁM, phân biệt màu với tick đúp
                    --brand của "Đã xem").
                  */}
                  {mine && i === visibleMessages.length - 1 && (
                    <p className="mb-0.5 mr-7 flex items-center justify-end gap-1 text-[10px] text-[var(--muted)]">
                      {m.pending ? (
                        "Đang gửi..."
                      ) : m.failed ? (
                        <span className="text-red-500">Gửi thất bại</span>
                      ) : partnerLastReadAt && m.created_at <= partnerLastReadAt ? (
                        <>
                          Đã xem
                          <CheckDoubleIcon className="h-3 w-4 text-[var(--brand)]" />
                        </>
                      ) : partnerLastDeliveredAt && m.created_at <= partnerLastDeliveredAt ? (
                        <>
                          Đã nhận
                          <CheckDoubleIcon className="h-3 w-4 text-[var(--muted)]" />
                        </>
                      ) : (
                        <>
                          Đã gửi
                          <CheckSingleIcon className="h-3 w-3 text-[var(--muted)]" />
                        </>
                      )}
                    </p>
                  )}
                </div>
              );
            })}

            {uploadPreview && (
              <div className="flex items-end justify-end gap-1.5">
                <div className="relative max-w-[62%] overflow-hidden rounded-2xl rounded-br-md pointer-events-auto opacity-80 shadow-sm">
                  <img src={uploadPreview} alt="Đang tải ảnh" className="max-h-72 w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  </span>
                </div>
                <div className="w-6 shrink-0" />
              </div>
            )}

            {partnerTyping && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 shrink-0">
                  <Avatar url={partnerProfile?.avatar_url} name={partnerProfile?.display_name} size={24} />
                </div>
                <div className="animate-bubble-in glass-surface flex items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Nút tìm kiếm nổi — mở lớp phủ tìm trong toàn bộ lịch sử chat. */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Tìm kiếm trong đoạn chat"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)]/90 text-[var(--foreground)] shadow-md backdrop-blur active:scale-95"
        >
          <SearchIcon className="h-4.5 w-4.5" />
        </button>

        <FloatingPet species={species} stage={pet.stage} mood={pet.mood} variant={variant} accessory={accessory} bumpKey={messages.length} />
      </div>

      {lightbox && (
        <div className="animate-pop-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+12px)] flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <img src={lightbox} alt="Ảnh phóng to" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      {dockFor && dockMessage && (
        <MessageActionDock
          isText={decodeMessage(dockMessage.content).type === "text"}
          isPinned={pins.some((p) => p.message_id === dockFor)}
          canEdit={dockMessage.sender_id === userId && !dockMessage.deleted_at && decodeMessage(dockMessage.content).type === "text"}
          canRecall={dockMessage.sender_id === userId && !dockMessage.deleted_at}
          onReply={() => setReplyingTo(dockMessage)}
          onForward={() => setForwardMessageId(dockFor)}
          onCopy={() => handleCopy(dockMessage.content)}
          onTogglePin={() => handleTogglePin(dockFor)}
          onEdit={() => {
            setEditingId(dockFor);
            setText(decodeMessage(dockMessage.content).type === "text" ? (decodeMessage(dockMessage.content) as { text: string }).text : "");
          }}
          onRecall={() => handleRecall(dockFor)}
          onHide={() => handleHide(dockFor)}
          onClose={closeMenu}
        />
      )}

      {forwardMessageId && (
        <ForwardSheet messageId={forwardMessageId} currentCoupleId={coupleId} onClose={() => setForwardMessageId(null)} />
      )}

      {searchOpen && (
        <SearchOverlay
          coupleId={coupleId}
          onClose={() => setSearchOpen(false)}
          onJump={(m) => {
            setSearchOpen(false);
            jumpToMessage(m);
          }}
        />
      )}

      {instantCaptureOpen && (
        <InstantCapture onCapture={handleStampCapture} onClose={() => setInstantCaptureOpen(false)} />
      )}

      <div className="safe-bottom glass-surface relative z-10 border-x-0 border-b-0 px-2.5 py-2">
        {pickerOpen && (
          <StickerPicker
            onSelectSticker={handlePickSticker}
            onSelectEmoji={handlePickComposerEmoji}
            onSelectGif={handlePickGif}
            onClose={() => setPickerOpen(false)}
          />
        )}
        {uploadError && <p className="mb-1.5 text-center text-xs text-red-500">{uploadError}</p>}

        {editingId && (
          <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-[var(--brand-light)] px-3 py-1.5">
            <EditIcon className="h-4 w-4 shrink-0 text-[var(--brand-dark)]" />
            <p className="flex-1 text-[12px] font-medium text-[var(--brand-dark)]">Đang sửa tin nhắn</p>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setText("");
              }}
              aria-label="Huỷ sửa"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--muted)]"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {replyingTo && !editingId && <ReplyComposerBar message={replyingTo} onCancel={() => setReplyingTo(null)} />}

        <div className="relative">
          {attachOpen && (
            <>
              <button type="button" aria-label="Đóng" onClick={() => setAttachOpen(false)} className="fixed inset-0 z-0 cursor-default" />
              <div
                className="animate-pop-in glass-surface absolute bottom-full left-0 z-10 mb-2 flex gap-2 rounded-2xl p-2 shadow-lg"
                style={{ transformOrigin: "bottom left" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAttachOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-[var(--foreground)] active:bg-white/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  Ảnh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachOpen(false);
                    setInstantCaptureOpen(true);
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-[var(--foreground)] active:bg-white/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]">
                    <CameraIcon className="h-5 w-5" />
                  </span>
                  Chụp nhanh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachOpen(false);
                    setPickerOpen((v) => !v);
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-[var(--foreground)] active:bg-white/5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)]">
                    <SmileStickerIcon className="h-5 w-5" />
                  </span>
                  Nhãn dán
                </button>
              </div>
            </>
          )}

          {recording ? (
            <VoiceRecorder onSend={handleVoiceSend} onCancel={() => setRecording(false)} />
          ) : (
            <form onSubmit={handleSubmit} className="flex min-w-0 items-center gap-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setAttachOpen((v) => !v);
                }}
                aria-label="Đính kèm"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                  attachOpen ? "rotate-45 bg-[var(--brand)] text-white" : "bg-[var(--brand-light)] text-[var(--brand-dark)]"
                }`}
              >
                <PlusIcon className="h-5 w-5" />
              </button>
              <input
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onFocus={() => setAttachOpen(false)}
                placeholder={editingId ? "Sửa tin nhắn..." : "Nhắn gì đó..."}
                className="glass-pill min-w-0 flex-1 rounded-full px-3.5 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
              {text.trim() ? (
                <button
                  type="submit"
                  aria-label="Gửi"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white transition active:scale-95"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  aria-label="Ghi âm tin nhắn thoại"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-[var(--brand-dark)] transition active:scale-95"
                >
                  <MicIcon className="h-4.5 w-4.5" />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

# Kế hoạch nâng cấp giao diện app chat cặp đôi (Streak & Pet)

Tài liệu này ghi lại: (1) những gì **đã sửa xong** trong lượt này, (2) phân tích
nguyên nhân gốc của từng vấn đề, và (3) kế hoạch chi tiết cho các phần còn lại,
theo đúng thứ tự ưu tiên đã đề ra.

---

## ✅ Đã sửa trong lượt này

### 1. Bug: long-press bị `MessageActionDock` che mất `ReactionPicker`

**Nguyên nhân gốc (đã xác nhận đọc code):** `startLongPress` cũ set cả
`reactionPickerFor` **và** `dockFor` trong cùng 1 `setTimeout` (420ms) — nghĩa
là 2 overlay luôn bật đồng thời. `MessageActionDock` tự render 1 lớp nền
`fixed inset-0 z-30` (để bắt tap-outside-to-close) và **được render sau trong
DOM** (sau vòng lặp tin nhắn), nên lớp nền này vẽ **đè lên trên**
`ReactionPicker` (vốn cũng z-30) dù đứng trong 1 bong bóng khác — kết quả là
tap vào emoji thực chất trúng lớp nền mờ của dock và đóng luôn cả 2 overlay.

**Đã sửa (`components/ChatBox.tsx`, `components/ReactionPicker.tsx`,
`components/icons.tsx`):**
- Tách `startLongPress` thành 2 tầng, không bao giờ mở đồng thời ngay từ đầu:
  - Giữ ngắn (`LONG_PRESS_MS = 300ms`) → chỉ mở `ReactionPicker`.
  - Giữ tiếp thêm (`DOCK_HOLD_EXTRA_MS = 350ms`, tổng ~650ms) → tự mở thêm
    `MessageActionDock`, đúng cảm giác Messenger/Telegram.
- Khi cả hai cùng mở (do giữ đủ lâu), không render 2 lớp nền `fixed inset-0`
  chồng nhau nữa — chỉ dock giữ lớp nền để đóng cả hai; `ReactionPicker` được
  nâng lên `z-50` (trên `z-40` của dock) nên luôn hiển thị & bấm được.
- Thêm nút "..." (`MoreIcon`) ngay trong `ReactionPicker` để mở
  `MessageActionDock` một cách **tường minh** thay vì dựa vào việc "tap lại
  vào bong bóng" — vì bong bóng bị lớp nền `fixed` của chính `ReactionPicker`
  che hoàn toàn trong lúc picker đang mở, nên một cú tap thứ hai vào đúng vị
  trí bong bóng **không đáng tin cậy** giữa iOS Safari và Android Chrome (khác
  nhau về thứ tự `pointerup`/`click` khi có lớp phủ `fixed`). Nút "..." tường
  minh, dễ thấy, và hoạt động nhất quán trên mọi engine.
- Đã test logic qua rà soát code (không có môi trường build để chạy trực
  tiếp trong sandbox này) — khuyến nghị QA thủ công trên iOS Safari + Android
  Chrome thật trước khi release, đúng như yêu cầu ban đầu.

### 2. Bug: "Đã xem" bị "lơ lửng" dưới tin cũ sau khi đối phương nhắn tin mới

**Nguyên nhân gốc:** điều kiện hiển thị cũ là
`mine && lastMineMessage?.id === m.id` — tức chỉ cần đây là **tin nhắn cuối
cùng của riêng mình**, bất kể đối phương đã gửi thêm bao nhiêu tin mới sau đó.
Nên sau khi đối phương nhắn tin mới, tin cũ của mình vẫn giữ nguyên là
"tin cuối của mình" → dòng "Đã xem" không bao giờ tự ẩn.

**Đã sửa (`components/ChatBox.tsx`):**
- Đổi điều kiện thành `mine && i === visibleMessages.length - 1` — tức CHỈ
  gắn trạng thái vào tin nhắn đang là **điểm cuối thật sự của toàn bộ cuộc trò
  chuyện** tại thời điểm hiện tại. Ngay khi đối phương gửi tin mới, tin đó trở
  thành điểm cuối mới và dòng trạng thái dưới tin cũ tự động biến mất.
- Đổi thiết kế UI: bỏ avatar 12px lặp lại, thay bằng text nhỏ + icon tick
  (mới thêm `CheckSingleIcon`, `CheckDoubleIcon` trong `icons.tsx`) — tick đơn
  màu muted cho "Đã gửi", tick đúp màu `--brand` cho "Đã xem" — nhất quán với
  "Đang gửi..." / "Gửi thất bại" trong cùng 1 hệ icon, giống Messenger/Zalo.

> Ghi chú kỹ thuật còn lại (chưa đổi trong lượt này vì ngoài phạm vi bug này):
> hiện app chưa phân biệt "đã nhận" (delivered) và "đã xem" (read) — chỉ có
> 1 mốc `partnerLastReadAt`. Nếu muốn thêm trạng thái "đã nhận" thật sự cần 1
> cột/event riêng (ví dụ ghi nhận khi tin nhắn tới được client đối phương qua
> Realtime, trước khi họ đọc) — có thể làm ở migration riêng nếu cần.
>
> **→ ĐÃ TRIỂN KHAI ở lượt sau, xem mục 2b ngay bên dưới.**

### 2b. Triển khai ghi chú kỹ thuật ở mục 2: tách "đã nhận" khỏi "đã xem" — ĐÃ XONG

**Schema:** `migration-v10-delivered-status.sql` (mới) — bảng `message_deliveries`
CÙNG HÌNH DẠNG với `message_reads` đã có (`couple_id`, `user_id`,
`last_delivered_at`), thay vì thêm cột `delivered_at` trên từng dòng
`messages` — lý do: tái dùng nguyên logic "1 mốc thời gian cắt lát, so sánh
`created_at <= mốc`" đang chạy tốt cho read, tránh phải `UPDATE` từng dòng
`messages` mỗi lần nhận 1 tin (tốn ghi hơn khi lịch sử dài). RLS + bật
realtime publication giống hệt pattern `message_reads` ở migration v6.

**Đã dựng (lượt này):**
- `lib/types.ts`: thêm `MessageDeliveryRow`.
- `lib/actions.ts`: thêm `markMessagesDelivered(coupleId)` — upsert
  `last_delivered_at = now()` cho user hiện tại, cùng khuôn với
  `markMessagesRead` nhưng KHÔNG có điều kiện `document.visibilityState`.
- `app/chat/page.tsx`: query thêm `message_deliveries` song song với
  `message_reads`, truyền xuống `ChatBox` qua prop `initialDeliveries`.
- `components/ChatBox.tsx`:
  - State `partnerLastDeliveredAt`, khởi tạo từ `initialDeliveries`.
  - Gọi `markMessagesDelivered` ngay khi component mount (không chờ tab hiện,
    khác hẳn `markMessagesRead`) — vì lúc này client đã tải xong toàn bộ tin
    nhắn hiện có, tức đã "nhận" hết về mặt kỹ thuật.
  - Trong handler `INSERT` của kênh `messages-${coupleId}`, nếu tin đến từ
    đối phương (`msg.sender_id !== userId`) thì gọi `markMessagesDelivered`
    ngay lập tức — đây là thời điểm chính xác tin "tới máy" mình qua
    Realtime, độc lập với việc mình có đang xem màn hình hay không.
  - Kênh realtime mới `deliveries-${coupleId}` lắng nghe bảng
    `message_deliveries`, cập nhật `partnerLastDeliveredAt` khi đối phương
    nhận tin của mình (dọn kênh khi unmount như các kênh khác).
  - UI trạng thái tin nhắn (dòng dưới tin cuối cùng của mình) giờ có 3 nấc
    thay vì 2, ưu tiên theo thứ tự: `Đang gửi...` → `Gửi thất bại` → `Đã xem`
    (tick đúp màu `--brand`, khi `partnerLastReadAt` phủ tới) → `Đã nhận`
    (tick đúp màu XÁM `--muted`, khi có `partnerLastDeliveredAt` phủ tới
    nhưng CHƯA có read) → `Đã gửi` (tick đơn, chưa có delivery nào phủ tới).
    "Đã xem" luôn được kiểm tra trước "Đã nhận" vì đọc thì chắc chắn cũng đã
    nhận.
- Đã chạy thật `npm install && npx tsc --noEmit && npm run build && npm run
  lint` — cả 4 đều sạch (2 vấn đề còn lại ở `SearchOverlay.tsx` và
  `PetAccessoryLayer.tsx` là lỗi/warning có từ trước, không liên quan).

> Lưu ý kỹ thuật cho mục 7 (gộp channel realtime): lượt này thêm 1 kênh MỚI
> (`deliveries-${coupleId}`) — nằm trong diện cần rà soát gộp chung với
> `reads-${coupleId}` (cùng scope 1 coupleId, có thể gộp thành 1 kênh phát ra
> nhiều loại thay đổi). Tổng số kênh mở riêng trong `ChatBox` hiện là 6:
> `messages`, `chatbox-pet`, `reactions`, `reads`, `deliveries`, `pins`.
>
> Chưa làm trong lượt này: hiển thị trạng thái "đã nhận"/"đã xem" tương tự
> cho DANH SÁCH HỘI THOẠI (`ConversationRow`, hiện chỉ có unreadCount) — có
> thể bổ sung sau nếu cần, không nằm trong phạm vi bug/ghi chú gốc ở mục 2.

### 3. Schema cho tuỳ chỉnh chủ đề & biệt danh

Đã tạo `migration-v9-chat-customization.sql` theo đúng convention các file
`migration-vN-*.sql` hiện có — mở rộng bảng `couples` với:
- `theme_color text` (mặc định `#ec4f83`, check định dạng hex) — map trực
  tiếp vào biến CSS `--brand` phía client, `--brand-dark`/`--brand-light`
  được tính lại (darken/lighten) trong code, không cần lưu thêm cột.
- `nickname_for_user1`, `nickname_for_user2 text` (nullable, tối đa 40 ký tự)
  — biệt danh mỗi người đặt cho đối phương.

Đây là schema, **UI + server action đọc/ghi 2 cột này (sheet "Tuỳ chỉnh đoạn
chat" mở từ `ChatHeader`) chưa được dựng trong lượt này** — xem mục 4 ở kế
hoạch bên dưới để triển khai tiếp.

### 4. Sheet "Tuỳ chỉnh đoạn chat" (theme + nickname) — ĐÃ XONG

**Schema:** `migration-v9-chat-customization.sql` (đã có từ lượt trước) —
`theme_color`, `nickname_for_user1`, `nickname_for_user2` trên `couples`.

**Đã dựng (lượt này):**
- `lib/theme.ts`: validate hex, 8 màu preset (`THEME_PRESETS`), và
  `shadesForThemeColor()`/`themeCssVars()` tự tính `--brand-dark`/
  `--brand-light` từ 1 mã hex gốc (cùng tỉ lệ tối/sáng với bộ màu mặc định
  `#ec4f83` → `#c73868`/`#ffe1ea` đang có trong `globals.css`) — không cần
  lưu thêm cột.
- `lib/nickname.ts`: `nicknameForPartner()` (tên hiệu lực để hiển thị,
  ưu tiên biệt danh → fallback `display_name` → fallback "Người ấy") và
  `myNicknameForPartner()` (biệt danh thô, dùng điền sẵn vào ô input) — suy
  ra đúng cột `nickname_for_user1`/`nickname_for_user2` theo vai trò của
  người xem, dùng chung ở cả `ChatHeader` lẫn danh sách hội thoại.
- `lib/actions.ts`: `updateCoupleTheme(coupleId, hex)` và
  `updateNickname(coupleId, nickname)` — validate hex/độ dài, tự xác định
  đúng cột nickname cần ghi dựa theo `user1_id`/`user2_id` của người gọi
  (không tin client gửi tên cột lên), kiểm tra người gọi thuộc couple trước
  khi ghi.
- `components/ChatSettingsSheet.tsx` (mới, theo đúng pattern
  `PetSheet.tsx`): palette 8 màu + ô nhập hex tuỳ ý, ô đặt biệt danh — cả 2
  đều optimistic update kèm rollback khi lỗi, giống `PetSheet`.
- `lib/chat-theme-context.tsx` (mới): 1 `ChatThemeProvider` bọc quanh CẢ
  `ChatHeader` lẫn `ChatBox` ngay tại `app/chat/page.tsx` (2 component này
  là anh em, không lồng nhau, nên cần 1 ancestor chung để CSS custom
  property `--brand`/`--brand-dark`/`--brand-light` áp được cho cả bong
  bóng chat lẫn header) — chỉ 1 subscription realtime duy nhất cho
  `theme_color`, chia sẻ qua React Context (`useChatTheme()`) thay vì mỗi
  component tự mở 1 channel riêng.
- `ChatHeader.tsx`: thêm nút menu (`MoreIcon`, 3 chấm) mở
  `ChatSettingsSheet`; đổi chữ tên đối phương trong header sang dùng
  nickname hiệu lực (tự cập nhật lại nếu đối phương đổi `display_name`
  NHƯNG mình chưa đặt biệt danh riêng).
- `app/chat/page.tsx`: tính sẵn `nickname`/`myNicknameRaw` ở server, bọc
  `ChatThemeProvider` quanh `ChatHeader`+`ChatBox`.
- Đã build (`npm run build`) + `tsc --noEmit` sạch để xác nhận không có lỗi
  biên dịch (môi trường lượt trước không cài được `node_modules`; lượt này
  cài được nên đã verify thật thay vì chỉ rà soát tay).

> Chưa làm trong lượt này: palette emoji reaction nhanh riêng theo màu theme,
> đổi background chat, đổi emoji mặc định — để dành cho mục 6.

### 5. Danh sách hội thoại (`app/page.tsx`) — ĐÃ XONG

**Đã dựng (lượt này):**
- `lib/types.ts`: thêm `ConversationSummary` — cấu trúc dữ liệu tổng quát
  hoá (id, type: 'couple' | 'friend' | 'family', partner info, nickname,
  preview, unread count, theme color...) dùng chung cho danh sách, sẵn sàng
  khi có nhiều loại hội thoại mà không cần viết lại UI.
- `components/ConversationRow.tsx` (mới, client component): avatar + dot
  online (tái dùng `usePartnerOnline` từ `lib/presence.ts`), tên ưu tiên
  nickname, preview tin cuối in đậm khi chưa đọc, timestamp
  (`formatMessageTime` có sẵn), `FlameBadge`, badge số tin chưa đọc.
- `components/ConversationListClient.tsx` (mới): header có nút tìm kiếm
  (mở thanh input lọc client-side theo tên/preview — vì hiện chỉ có tối đa 1
  hội thoại nên chưa cần gọi server, nhưng đã viết theo dạng filter mảng nên
  tự động work khi có nhiều hội thoại) + nút "+" hiện sheet "Sắp ra mắt"
  (app chưa hỗ trợ multi-conversation ở tầng dữ liệu, nên không giả vờ có
  chức năng thật); render danh sách rỗng/có dữ liệu, banner chờ ghép cặp.
- `app/page.tsx`: viết lại hoàn toàn — query thêm `message_reads` của mình
  để tính `unreadCount` (đếm tin nhắn `sender_id != mình` có
  `created_at > last_read_at`), build mảng `conversations: ConversationSummary[]`
  (hiện có đúng 1 phần tử), dùng `nicknameForPartner()` cho tên hiển thị.
- Skeleton loading: `app/loading.tsx` đã có sẵn từ trước và về cơ bản khớp
  cấu trúc mới (header + 1 row) — CHƯA cập nhật lại chi tiết (avatar dot,
  unread badge) trong lượt này, để dành tinh chỉnh khi có nhiều hội thoại
  thật để test.

> **Đổi hướng thao tác vuốt (quyết định của lượt này):** kế hoạch gốc để dành
> "vuốt trái/phải trên `ConversationRow` để ghim/tắt thông báo/xoá" cho mục 7,
> với lý do cần ≥2 hội thoại thật mới kiểm thử UX có ý nghĩa. Vì hiện tại vẫn
> chỉ có đúng 1 hội thoại (app chưa hỗ trợ multi-conversation), thao tác vuốt
> đó vẫn CHƯA có nhiều giá trị để test — nên đã **đổi mục tiêu của thao tác
> vuốt sang vuốt SANG PHẢI ngay TRÊN TỪNG TIN NHẮN trong `ChatBox` để mở
> nhanh chế độ trả lời** (kiểu Telegram/Messenger/Zalo), vì tính năng này
> dùng được ngay bây giờ với đúng 1 hội thoại và mang lại giá trị UX thực sự.
> Xem chi tiết triển khai ở mục 5b ngay bên dưới. Vuốt-để-ghim/xoá trên danh
> sách hội thoại vẫn giữ nguyên trong backlog mục 7, không xoá khỏi kế hoạch.

### 5b. Vuốt sang phải trên tin nhắn để trả lời nhanh — ĐÃ XONG

**Vấn đề với cách mở trả lời cũ:** trước đây muốn trả lời 1 tin phải
long-press (giữ ~300ms) rồi bấm nút "..." hoặc chọn "Trả lời" trong
`MessageActionDock` — mất ít nhất 2 thao tác. Các app nhắn tin phổ biến
(Telegram, Messenger, Zalo, WhatsApp) đều hỗ trợ vuốt ngang trên bong bóng để
trả lời nhanh trong 1 thao tác.

**Đã dựng (`components/ChatBox.tsx`):**
- Bắt cử chỉ vuốt ở cấp HÀNG bao quanh avatar+bong bóng (không phải trên
  chính bong bóng, vì bong bóng đã dùng `onPointerDown` riêng cho long-press
  mở `ReactionPicker`/`MessageActionDock`) — dùng `onPointerDown/Move/Up`
  chuẩn Pointer Events (đã có sẵn trong codebase, cùng cơ chế long-press
  đang dùng), không cần thêm thư viện.
- **Khoá trục (axis lock):** chỉ khi di chuyển ngang vượt quá di chuyển dọc
  và vượt `SWIPE_AXIS_LOCK_PX` (8px) mới coi là đang vuốt ngang — di chuyển
  dọc (cuộn danh sách chat) hoàn toàn không bị ảnh hưởng. Ngay khi xác định
  là vuốt ngang, tự động huỷ timer long-press đang chờ (`cancelLongPress()`)
  để 2 cử chỉ không tranh chấp nhau — cùng tinh thần "tách tầng, không mở
  đồng thời" đã áp dụng khi sửa bug #1.
- Chỉ cho vuốt SANG PHẢI (kẹp `dx` về 0 nếu kéo sang trái) — áp dụng cho MỌI
  bong bóng, không phân biệt tin của mình hay của đối phương, giống hành vi
  chuẩn của Telegram/Messenger. Kéo tối đa `SWIPE_MAX_DRAG` (76px), qua
  ngưỡng `SWIPE_REPLY_THRESHOLD` (56px) rồi thả tay mới kích hoạt
  `setReplyingTo`; thả trước ngưỡng thì bong bóng tự trượt về vị trí cũ
  (transition 150ms) mà không làm gì.
- Icon trả lời (`ReplyIcon`) được gắn làm con của chính khối avatar+bong bóng
  đang trôi (không phải con của cả hàng full-width) và đặt lệch trái bằng
  `absolute -left-9` — nhờ vậy icon LUÔN bám sát ngay bên trái bong bóng
  trong lúc kéo, kể cả với tin nhắn "của mình" (canh phải màn hình); nếu gắn
  icon cố định bên trái CẢ HÀNG thì với tin của mình, icon sẽ hiện ra ở tít lề
  trái màn hình — cách xa hẳn bong bóng đang trôi bên phải, trông like một
  lỗi UI. Độ đậm (opacity) của icon tăng dần theo tỉ lệ đã kéo được so với
  ngưỡng kích hoạt.
- Rung nhẹ xác nhận (`navigator.vibrate?.(8)`) khi vượt ngưỡng và thả tay —
  gọi qua optional chaining nên im lặng bỏ qua trên thiết bị/trình duyệt
  không hỗ trợ Vibration API (ví dụ iOS Safari), không throw lỗi.
- Vô hiệu hoá vuốt khi đang có overlay khác mở trên đúng tin nhắn đó
  (`reactionPickerFor`/`dockFor`) hoặc đang ở chế độ sửa tin (`editingId`), và
  không kích hoạt trả lời trên tin đã bị thu hồi (`deleted_at`).
- Đã build (`npm run build`) + `npx tsc --noEmit` + `npm run lint` sạch —
  chỉ còn 2 vấn đề có từ trước ở `SearchOverlay.tsx`/`PetAccessoryLayer.tsx`,
  không liên quan tới thay đổi lượt này.

> Khuyến nghị QA thủ công trên iOS Safari + Android Chrome thật trước khi
> release (đặc biệt cảm giác "khoá trục" khi vừa vuốt vừa đang cuộn danh sách
> tin nhắn, và độ nhạy của ngưỡng 56px trên các kích cỡ màn hình khác nhau).

---

## 📋 Kế hoạch cho phần còn lại (theo đúng thứ tự ưu tiên gốc)

### 6. Mở rộng emoji & sticker/GIF — ĐÃ XONG (phần cốt lõi)

**Đã dựng (lượt này):**
- `components/EmojiFullPicker.tsx` (mới) — ~260 emoji phổ biến nhóm theo 6
  category (Cảm xúc, Cử chỉ, Trái tim, Động vật, Đồ ăn, Hoạt động), mỗi emoji
  có alias tiếng Việt để gõ tìm theo nghĩa thay vì tên tiếng Anh. KHÔNG dùng
  `emoji-mart` (giữ bundle nhẹ như ghi chú gốc) — tự build từ 1 mảng dữ liệu
  tĩnh trong chính component.
- `ReactionPicker.tsx`: thêm nút "+" MỚI, TÁCH RIÊNG khỏi nút "..." đã có từ
  bug fix #1 (nút "..." đó vẫn mở `MessageActionDock` như cũ, không đổi) —
  nút "+" mở `EmojiFullPicker` nổi ngay trên bong bóng để chọn 1 cảm xúc bất
  kỳ ngoài 6 quick reaction. `ChatBox.tsx` có state `fullEmojiFor` riêng,
  cùng cơ chế "chỉ 1 lớp nền, không chồng overlay" như dock/picker.
- `StickerPicker.tsx`: đổi thành 3 tab "Sticker" / "Emoji" / "GIF":
  - "Sticker": giữ nguyên kho cũ, không đổi hành vi.
  - "Emoji": nhúng thẳng `EmojiFullPicker`, chọn 1 emoji sẽ CHÈN vào ô nhập
    text đang gõ (`handlePickComposerEmoji`), không gửi luôn — khác hẳn
    sticker/GIF (gửi ngay khi chọn).
  - "GIF": tìm kiếm + mặc định hiện xu hướng, gọi qua route server mới
    `app/api/gif/route.ts` (proxy Tenor v2, đọc `TENOR_API_KEY` — CHỈ ở
    server, không lộ key ra client, đúng yêu cầu gốc). Debounce 350ms khi
    gõ tìm, cache tự nhiên qua `next: { revalidate: 120 }` cho trending. Nếu
    chưa cấu hình key, tab hiện thông báo hướng dẫn thay vì lỗi mạng khó
    hiểu (xem `.env.example` — đã thêm biến `TENOR_API_KEY`).
- `lib/message-format.ts`: thêm `encodeGif`/`decodeMessage` loại `"gif"` —
  CÙNG CHIÊU với sticker/ảnh (mã hoá vào cột `content` có sẵn, không cần
  migration DB mới): `::gif::<url>::<w>x<h>`.
- `lib/actions.ts`: thêm `sendGif()` (giống `sendImage` nhưng chỉ lưu URL
  Tenor, không tải file lên Storage của mình) và loại trừ `::gif::%` khỏi
  kết quả tìm kiếm tin nhắn text (`searchMessages`), giống sticker/ảnh/voice.
- `components/ChatBox.tsx`: render bong bóng GIF (badge "GIF" góc dưới trái,
  bấm để mở lightbox — dùng lại `setLightbox` đã có cho ảnh).
- Mọi nút emoji/category/tab đều ≥ 36×36px (thumb-friendly), ảnh GIF preview
  dùng `loading="lazy"` (không thêm `IntersectionObserver` riêng — lazy-load
  chuẩn của trình duyệt đã đủ cho lưới GIF nhỏ này).
- Đã chạy thật `npx tsc --noEmit && npm run build && npm run lint` — cả 3
  sạch, chỉ còn đúng 2 vấn đề có từ trước ở `SearchOverlay.tsx`/
  `PetAccessoryLayer.tsx` (không liên quan tới lượt này).

**Việc CẦN làm trước khi dùng tab GIF thật (chưa làm được trong sandbox):**
1. Đăng ký API key miễn phí tại tenor.com/gifapi, thêm vào biến môi trường
   `TENOR_API_KEY` (Render/`.env.local`) — thiếu key thì tab GIF vẫn hiện
   nhưng báo "chưa cấu hình" thay vì lỗi.
2. QA thủ công tab GIF trên thiết bị thật (tốc độ mạng di động, độ trễ
   debounce 350ms có hợp lý không).

**Chưa làm trong lượt này (để phạm vi lượt này gọn, không nằm trong yêu cầu
lõi "mở rộng emoji/sticker/GIF"):**
- Tuỳ chỉnh lại 6 `QUICK_REACTIONS` mặc định theo từng user (cần cột
  `quick_reactions text[]` trên `profiles` + migration riêng + UI kéo-thả
  hoặc long-press từng slot để đổi) — để lại làm lượt sau nếu cần, không
  ảnh hưởng tới việc thả cảm xúc/emoji/GIF đã dùng được ngay bây giờ.
- Tab "Xu hướng" tách riêng khỏi tab "GIF" — gộp làm 1 tab "GIF" (mặc định
  hiện trending, gõ tìm thì chuyển sang kết quả tìm kiếm) cho gọn UI hơn so
  với việc tách 2 tab như phác thảo gốc.

### 7. Hiệu năng & hiệu ứng loading — ĐÃ TRIỂN KHAI PHẦN LỚN

**Đã dựng (lượt này):**
- **Vuốt trên `ConversationRow`:** dùng `framer-motion` `drag="x"` (đã có
  sẵn trong `package.json`) để lộ 2 nút "Tắt tin"/"Ghim" bên phải, chốt mở
  nếu vuốt quá nửa vùng hành động hoặc vuốt nhanh (velocity), tap lại vào
  hàng để đóng thay vì điều hướng nếu đang mở sẵn. Đã BỎ hành động "xoá
  khỏi danh sách" khỏi phác thảo gốc: app hiện mỗi user bắt buộc thuộc đúng
  1 couple, "xoá" cuộc trò chuyện duy nhất sẽ phá vỡ luồng chính — cần 1
  flow "rời couple" riêng có xác nhận rõ ràng, không hợp để nhét vào 1 cử
  chỉ vuốt nhanh dễ bấm nhầm.
  - Schema: `migration-v11-conversation-actions.sql` — 4 cột boolean trên
    `couples` (`pinned_by_user1/2`, `muted_by_user1/2`), theo đúng
    convention cá nhân-hoá như `nickname_for_user1/2` ở migration-v9 (ghim/
    tắt thông báo là sở thích riêng từng người, không phải cài đặt chung).
  - `lib/actions.ts`: thêm `setConversationFlag(coupleId, flag, value)` —
    tự suy ra cột user1/user2 từ session, không tin client gửi tên cột.
  - `ConversationRow.tsx`: optimistic update khi bấm ghim/tắt tin, rollback
    nếu action lỗi; hiển thị icon ghim/chuông tắt cạnh tên khi đã bật.
  - `ConversationListClient.tsx`: hội thoại đã ghim nổi lên đầu danh sách
    (chưa có ý nghĩa nhiều với đúng 1 hội thoại hiện tại, nhưng sẵn sàng khi
    mở rộng bạn bè/người thân).
- **Audit optimistic update:** rà lại toàn bộ, `sendMessage`/`sendSticker`/
  `sendGif` đã optimistic + rollback (`pending`→`failed`) từ trước. Bổ sung
  rollback còn thiếu cho 3 hàm:
  - `editMessage` (trong `handleSubmit` nhánh sửa tin): nếu server từ chối,
    trả lại `content` cũ thay vì để UI đứng yên ở nội dung "đã sửa" trong
    khi DB không đổi.
  - `handleRecall`: rollback `deleted_at` nếu `recallMessage` lỗi.
  - `handleHide`: rollback `hiddenIds` nếu `hideMessageForMe` lỗi.
  - Reaction và ghim tin đã optimistic sẵn từ lượt trước, không cần sửa.
- **Gộp channel realtime:** gộp đúng 2 cặp đã ghi chú ở mục 2b/4 (không gộp
  toàn bộ 9+ channel hiện có trên `coupleId` vì rủi ro/ phạm vi vượt quá ghi
  chú gốc — xem "Chưa làm" bên dưới):
  - `reads-${coupleId}` + `deliveries-${coupleId}` trong `ChatBox.tsx` → gộp
    thành 1 channel `read-status-${coupleId}` với 2 `.on(...)` riêng cho
    từng bảng.
  - `theme-${coupleId}` (trong `lib/chat-theme-context.tsx`) +
    `header-couple-${coupleId}` (trong `ChatHeader.tsx`) → gộp thành 1
    channel `couple-sync-${coupleId}` duy nhất trong `ChatThemeProvider`,
    phát ra cả `theme_color` lẫn `pet_accessory`; `accessory`/`setAccessory`
    chuyển hẳn vào `useChatTheme()` context, `ChatHeader` không tự mở
    channel `couples` riêng nữa.
- **Skeleton & transition:**
  - "Đang tải tin cũ hơn..." đổi thành 2 khối shimmer hình bong bóng chat
    thay vì chỉ chữ — dùng class `.animate-shimmer` mới (gradient quét
    ngang, nhẹ hơn `animate-spin` cho khối lớn).
  - `app/loading.tsx`: đổi từ `animate-pulse` sang `.animate-shimmer`, thêm
    2 hàng skeleton khớp chi tiết mới của `ConversationRow` (dot online,
    unread badge tròn) thay vì chỉ 1 hàng đơn giản.
  - Tin bị xoá qua "Xoá ở phía tôi" (`handleHide`) giờ chạy `.animate-bubble-out`
    (co lại + mờ dần trong 180ms) trước khi thực sự lọc khỏi
    `visibleMessages`, thay vì biến mất đột ngột — thêm state `fadingIds`
    tách riêng khỏi `hiddenIds` vì `hiddenIds` lọc ngay lập tức.
  - `animate-pop-in`/`animate-dock-up`/`animate-bubble-in` giữ nguyên timing
    cũ (đã rà lại, không thấy lệch so với mô tả gốc trong kế hoạch).
- Đã chạy thật `npx tsc --noEmit && npm run build && npm run lint` — cả 3
  sạch, chỉ còn đúng 2 vấn đề có từ trước ở `SearchOverlay.tsx`
  (react-hooks/set-state-in-effect) và `PetAccessoryLayer.tsx` (biến `stage`
  không dùng), không liên quan tới lượt này.

**Chưa làm trong lượt này (để lại nếu cần):**
- Gộp toàn bộ 9+ channel còn lại cùng scope 1 `coupleId` (vd `messages`/
  `chatbox-pet`/`reactions`/`pins` trong `ChatBox`; `header-pet`/
  `header-streak`/`header-profiles` trong `ChatHeader`; `pet`/`pet-streak`
  trong `PetDisplay`; `streak` trong `StreakCounter`; `presence`/`typing`
  trong `lib/presence.ts`) — kế hoạch gốc chỉ nêu đích danh 2 cặp đã gộp ở
  trên; gộp rộng hơn đòi hỏi tái cấu trúc state giữa nhiều component không
  cùng cây React (vd `PetDisplay` và `ChatHeader` độc lập nhau), rủi ro vượt
  quá phạm vi 1 lượt sửa.
- Skeleton riêng cho ảnh/GIF/sticker đang tải lên: đã có sẵn spinner
  (`animate-spin`) khi tin đang `pending`, xét thấy đã đủ làm rõ trạng thái
  đang tải, không đổi thêm để tránh xáo trộn UI ảnh không cần thiết.

**Việc CẦN làm trước khi deploy tính năng ghim/tắt thông báo:**
1. Chạy `migration-v11-conversation-actions.sql` trong Supabase SQL Editor.
2. QA thủ công cử chỉ vuốt trên thiết bị cảm ứng thật (iOS Safari + Android
   Chrome) — sandbox không có trình duyệt thật để test cảm giác chạm, chỉ
   xác nhận bằng đọc code + build/tsc/lint sạch.

---

## Ghi chú về môi trường

Lượt này `node_modules` cài được (mạng cho phép truy cập registry.npmjs.org),
nên đã chạy thật `npm install && npx tsc --noEmit && npm run build` — cả 3
đều sạch, không có lỗi biên dịch mới do các thay đổi trong lượt này (2 lỗi/
warning ESLint còn lại ở `SearchOverlay.tsx`/`PetAccessoryLayer.tsx` là lỗi
có từ trước, không liên quan tới lượt này). Vẫn khuyến nghị chạy thêm
`npm run lint` và QA thủ công trên thiết bị thật (đặc biệt phần realtime
đổi theme_color giữa 2 tài khoản) trước khi deploy.

**Lượt tiếp theo (mục 2b + 5b ở trên):** cũng chạy thật
`npm install && npx tsc --noEmit && npm run build && npm run lint` — cả 4
đều sạch, chỉ còn đúng 2 vấn đề có từ trước (như trên), không phát sinh mới.
Có 1 vòng sửa nhỏ giữa chừng: thêm điều kiện `msg.sender_id !== userId` vào
handler `INSERT` của kênh `messages-${coupleId}` (để gọi
`markMessagesDelivered`) làm ESLint báo thiếu `userId` trong dependency
array của `useEffect` chứa kênh đó — đã bổ sung `userId` vào mảng deps, lint
sạch trở lại.

**Việc CẦN làm trước khi deploy 2 tính năng mới này (chưa chạy được trong
sandbox vì không có kết nối Supabase thật):**
1. Chạy `migration-v10-delivered-status.sql` trong Supabase SQL Editor
   (giống cách đã chạy `migration-v9-...` trước đó).
2. Bật Realtime cho bảng `message_deliveries` nếu Dashboard không tự thêm
   vào publication qua khối `do $$ ... $$` trong migration (kiểm tra lại ở
   Database → Replication, giống bước đã làm cho `message_reads`/
   `message_reactions`).
3. QA vuốt-để-trả-lời trên thiết bị cảm ứng thật (iOS Safari + Android
   Chrome) — sandbox này không có trình duyệt thật để test cảm giác chạm,
   chỉ xác nhận được bằng đọc code + build/tsc/lint sạch.

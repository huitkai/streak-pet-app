/**
 * Cờ bật/tắt các mảng UI theo yêu cầu redesign (2107).
 *
 * QUAN TRỌNG: đây CHỈ là cờ ẩn/hiện ở tầng giao diện. Toàn bộ logic, dữ
 * liệu, service, realtime channel... phía dưới (streak, pet, couple...)
 * vẫn giữ nguyên 100%, không xoá gì cả — chỉ đang không render ra màn
 * hình để tập trung vào giao diện chat thường trước. Muốn bật lại các
 * tính năng "cặp đôi" (streak flame, thú cưng, thẻ ghép đôi...) sau này
 * chỉ cần đổi giá trị này về `true`.
 */
export const SHOW_COUPLE_FEATURES = false;

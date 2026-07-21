/**
 * Cờ tính năng tạm thời. Yêu cầu hiện tại: "bỏ cặp đôi đi, làm sau" — nghĩa
 * là ẨN trên UI các mảnh gắn với couple/pet/streak (badge lửa, pet sheet
 * trigger...) chứ KHÔNG xoá code/logic bên dưới, để bật lại chỉ bằng cách
 * đổi giá trị này về true.
 *
 * Mọi nơi đang ẩn theo cờ này đều giữ nguyên component/logic gốc (FlameBadge,
 * PetSheet, ChatSettingsSheet phần thống kê streak...), chỉ bọc điều kiện
 * render ở nơi gọi.
 */
export const SHOW_COUPLE_FEATURES = false;

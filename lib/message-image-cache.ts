"use client";

/**
 * Cache ẢNH TIN NHẮN (ảnh thường, ảnh "chụp nhanh" đóng khung tem, GIF...)
 * bằng IndexedDB, tách biệt hoàn toàn với HTTP cache của trình duyệt.
 *
 * Lý do KHÔNG thể chỉ dựa vào HTTP cache (dù ảnh đã upload với
 * cacheControl: 1 năm — xem ChatBox.tsx): trên webview di động (Capacitor)
 * hoặc khi trình duyệt cần giải phóng dung lượng, cache đĩa HTTP có thể bị
 * dọn bất cứ lúc nào ngoài tầm kiểm soát của app -> ảnh phải tải lại từ
 * server, đúng như người dùng phản ánh "thoát ra vào lại phải load lại".
 *
 * Với IndexedDB do chính app quản lý, ảnh đã từng xem 1 lần sẽ hiện NGAY từ
 * đĩa cục bộ (qua URL.createObjectURL) ở mọi lần sau, không cần mạng.
 */

const DB_NAME = "chat-image-cache";
const STORE_NAME = "images";
const DB_VERSION = 1;
/** Giới hạn tổng số ảnh cache — đủ cho nhu cầu xem lại lịch sử gần đây mà
 * không để IndexedDB phình vô hạn theo thời gian dùng app. Ảnh cũ nhất bị
 * dọn trước khi vượt ngưỡng (LRU đơn giản theo thời điểm truy cập gần nhất). */
const MAX_ENTRIES = 300;

interface CachedImageRecord {
  url: string;
  blob: Blob;
  lastAccessed: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getRecord(url: string): Promise<CachedImageRecord | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(url);
    req.onsuccess = () => resolve((req.result as CachedImageRecord) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function putRecord(record: CachedImageRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  void pruneIfNeeded();
}

/** Dọn bớt ảnh cũ nhất nếu vượt MAX_ENTRIES — chạy nền, không chặn gì cả. */
async function pruneIfNeeded(): Promise<void> {
  try {
    const db = await openDb();
    const all: CachedImageRecord[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as CachedImageRecord[]) ?? []);
      req.onerror = () => resolve([]);
    });
    if (all.length <= MAX_ENTRIES) return;
    const toDelete = all.sort((a, b) => a.lastAccessed - b.lastAccessed).slice(0, all.length - MAX_ENTRIES);
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const r of toDelete) store.delete(r.url);
  } catch {
    // Dọn cache là tối ưu hoá phụ, lỗi ở đây không nên ảnh hưởng gì tới việc
    // hiển thị ảnh — bỏ qua im lặng.
  }
}

/**
 * Trả về 1 object URL cục bộ nếu ảnh này đã có trong cache (gần như tức
 * thì), ngược lại trả về null để nơi gọi tạm dùng `remoteUrl` gốc trong lúc
 * hàm này tự tải + lưu cache ở nền cho lần sau.
 */
export async function getOrCacheImage(remoteUrl: string): Promise<string | null> {
  try {
    const existing = await getRecord(remoteUrl);
    if (existing) {
      // Cập nhật lastAccessed (không cần chờ) để LRU luôn phản ánh đúng ảnh
      // nào đang thực sự được xem lại.
      void putRecord({ ...existing, lastAccessed: Date.now() });
      return URL.createObjectURL(existing.blob);
    }

    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    await putRecord({ url: remoteUrl, blob, lastAccessed: Date.now() });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

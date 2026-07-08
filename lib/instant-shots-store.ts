"use client";

/**
 * Lưu TẠM các ảnh "Chụp ảnh tức thì" (đã đóng khung tem, chưa gửi) vào
 * IndexedDB — sửa đúng lỗi người dùng báo: trước đây danh sách ảnh chỉ nằm
 * trong React state của <InstantSessionFlow>, nên chỉ cần thoát camera/đóng
 * app là mất sạch, không có cách nào xem lại. Giờ mỗi ảnh vừa chụp được ghi
 * ngay vào IndexedDB, nên dù thoát ra rồi quay lại (thậm chí tắt hẳn app),
 * danh sách ảnh chưa gửi vẫn còn nguyên, xem qua nút xem danh sách.
 *
 * Dùng IndexedDB (không phải localStorage) vì cần lưu Blob nhị phân của ảnh
 * PNG gốc giữ nguyên chất lượng chụp — localStorage chỉ lưu được chuỗi text.
 */

const DB_NAME = "instant-capture-drafts";
const STORE_NAME = "shots";
const DB_VERSION = 1;

export interface StoredShot {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: number;
  /** Phân biệt ảnh nháp của luồng nào — "session" (Chụp ảnh tức thì ngoài
   * danh sách hội thoại) hoặc "chat" (Chụp nhanh trong khung chat). Không
   * set thì mặc định coi là "session" để tương thích ngược với dữ liệu cũ
   * đã lưu trước khi có field này. */
  source?: "session" | "chat";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftShot(shot: StoredShot): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(shot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteDraftShot(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteDraftShots(ids: string[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearDraftShots(source: "session" | "chat" = "session"): Promise<void> {
  const ids = (await listDraftShots(source)).map((s) => s.id);
  if (ids.length === 0) return;
  await deleteDraftShots(ids);
}

/** Sắp xếp cũ -> mới (thứ tự chụp) để hiện đúng thứ tự trong lưới. Truyền
 * `source` để chỉ lấy đúng ảnh nháp của luồng đó (2 luồng chụp dùng chung 1
 * IndexedDB nhưng không muốn ảnh nháp của luồng này lẫn vào luồng kia). */
export async function listDraftShots(source: "session" | "chat" = "session"): Promise<StoredShot[]> {
  const db = await openDb();
  const shots = await new Promise<StoredShot[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as StoredShot[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return shots
    .filter((s) => (s.source ?? "session") === source)
    .sort((a, b) => a.createdAt - b.createdAt);
}

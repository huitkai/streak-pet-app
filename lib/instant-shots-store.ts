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

export async function clearDraftShots(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Sắp xếp cũ -> mới (thứ tự chụp) để hiện đúng thứ tự trong lưới. */
export async function listDraftShots(): Promise<StoredShot[]> {
  const db = await openDb();
  const shots = await new Promise<StoredShot[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as StoredShot[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return shots.sort((a, b) => a.createdAt - b.createdAt);
}

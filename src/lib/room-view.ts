export type RoomView = "focus" | "gallery";

const STORAGE_KEY = "pomo:roomView";

export const getStoredRoomView = (): RoomView => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "gallery" || stored === "focus" ? stored : "focus";
  } catch {
    return "focus";
  }
};

export const setStoredRoomView = (view: RoomView): void => {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // storage unavailable (private mode / SSR) — ignore
  }
};

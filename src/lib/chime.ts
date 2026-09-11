const CHIME_SOUND_PATH = "/sounds/done.mp3";

export function playChime() {
  try {
    new Audio(CHIME_SOUND_PATH)
      .play()
      .catch((e) => console.log("Could not play sound:", e));
  } catch (error) {
    console.log("Sound file not found:", error);
  }
}

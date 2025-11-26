/**
 * Audio beep utility for transaction feedback
 * IN: ascending beep
 * CHECK: double beep
 * OUT: descending beep
 * NOT_FOUND: single beep
 */

type TransactionKind = "in" | "out" | "check" | "not_found";

function playTone(
  frequency: number,
  duration: number,
  audioContext: AudioContext
): Promise<void> {
  return new Promise((resolve) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);

    setTimeout(resolve, duration);
  });
}

export async function playBeep(kind: TransactionKind): Promise<void> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    if (kind === "in") {
      // Ascending beep: low -> mid -> high
      await playTone(400, 150, audioContext);
      await playTone(600, 150, audioContext);
      await playTone(800, 150, audioContext);
    } else if (kind === "check") {
      // Single beep
      await playTone(600, 200, audioContext);
    } else if (kind === "out") {
      // Descending beep: high -> mid -> low
      await playTone(800, 150, audioContext);
      await playTone(600, 150, audioContext);
      await playTone(400, 150, audioContext);
    } else if (kind === "not_found") {
      // Double beep
      await playTone(600, 150, audioContext);
      await playTone(600, 150, audioContext);
    }
  } catch (error) {
    console.error("Error playing beep:", error);
  }
}

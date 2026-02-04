// Haptic feedback utility for web
export const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  // Use Vibration API if available (mostly mobile browsers)
  if ("vibrate" in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
    };
    navigator.vibrate(patterns[type]);
  }
};

// Sound effect utility
let audioContext: AudioContext | null = null;

export const playClickSound = () => {
  try {
    // Create audio context lazily (must be after user interaction)
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Create a short "click" sound using oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound - subtle, high-pitched click
    oscillator.frequency.value = 1800;
    oscillator.type = "sine";

    // Quick attack and decay for a "click" effect
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch (error) {
    // Silently fail if audio is not supported
    console.debug("Audio feedback not available:", error);
  }
};

// Combined feedback function
export const triggerFeedback = (options?: { haptic?: boolean; sound?: boolean }) => {
  const { haptic = true, sound = true } = options || {};
  
  if (haptic) {
    triggerHaptic("light");
  }
  
  if (sound) {
    playClickSound();
  }
};

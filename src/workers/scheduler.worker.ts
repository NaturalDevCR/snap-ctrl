// Scheduler worker
// Used to keep the audio scheduling loop running even when the tab is in the background
// where requestAnimationFrame would be paused.

const INTERVAL_MS = 20; // Run at ~50Hz

let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e) => {
  if (e.data === "start") {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage("tick");
    }, INTERVAL_MS);
  } else if (e.data === "stop") {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }
};

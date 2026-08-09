const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function computeJitteredDelay(base, jitterPct, minimum = 0, random = Math.random) {
  const jitter = Math.min(0.5, Math.max(0, Number(jitterPct) || 0));
  return Math.max(minimum, Math.floor(base * (1 + (random() * 2 - 1) * jitter)));
}

module.exports = { sleep, clamp, computeJitteredDelay };

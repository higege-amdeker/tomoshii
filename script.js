const body = document.body;
const minutesInput = document.getElementById("minutes-input");
const timerForm = document.getElementById("timer-form");
const startButton = document.getElementById("start-button");
const resetButton = document.getElementById("reset-button");
const decreaseMinutesButton = document.getElementById("decrease-minutes-button");
const increaseMinutesButton = document.getElementById("increase-minutes-button");

let audioContext;
let animationFrameId = 0;
let startedAt = 0;
let durationMs = 0;
let endAt = 0;
let isRunning = false;

const MINUTES_MIN = 1;
const MINUTES_MAX = 180;
const DEFAULT_MINUTES = 10;
const SESSION_DARKNESS = 0.56;

function clampMinutes(value) {
    return Math.min(MINUTES_MAX, Math.max(MINUTES_MIN, value));
}

function setSceneProgress(progress) {
    document.documentElement.style.setProperty("--screen-darkness", SESSION_DARKNESS.toFixed(3));
    document.documentElement.style.setProperty("--candle-glow", "0.92");
    document.documentElement.style.setProperty("--candle-burn-progress", progress.toFixed(3));
}

function setFinishedScene() {
    document.documentElement.style.setProperty("--screen-darkness", "0");
    document.documentElement.style.setProperty("--candle-glow", "0.12");
    document.documentElement.style.setProperty("--candle-burn-progress", "1");
}

function setIdleScene() {
    document.documentElement.style.setProperty("--screen-darkness", "0");
    document.documentElement.style.setProperty("--candle-glow", "0.12");
    document.documentElement.style.setProperty("--candle-burn-progress", "0");
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
    }
}

function setMinutes(value) {
    minutesInput.value = String(clampMinutes(value));
}

function updateMinuteButtons() {
    const minutes = clampMinutes(Number(minutesInput.value) || DEFAULT_MINUTES);

    decreaseMinutesButton.disabled = isRunning || minutes <= MINUTES_MIN;
    increaseMinutesButton.disabled = isRunning || minutes >= MINUTES_MAX;
}

function changeMinutes(delta) {
    if (isRunning) {
        return;
    }

    const currentMinutes = clampMinutes(Number(minutesInput.value) || DEFAULT_MINUTES);
    setMinutes(currentMinutes + delta);
    updateMinuteButtons();
}

function showStartButton(label = "スタート") {
    startButton.hidden = false;
    startButton.disabled = false;
    startButton.textContent = label;
    resetButton.hidden = true;
}

function showResetButton() {
    startButton.hidden = true;
    resetButton.hidden = false;
}

function resetToIdleState() {
    isRunning = false;
    stopAnimation();
    body.classList.remove("session-active", "session-finished");
    showStartButton("スタート");
    minutesInput.disabled = false;
    setIdleScene();
    updateMinuteButtons();
}

async function ensureAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    return audioContext;
}

function playGentleChime() {
    if (!audioContext) {
        return;
    }

    const notes = [261.63, 329.63, 392.0, 523.25];
    const startTime = audioContext.currentTime + 0.04;

    notes.forEach((frequency, index) => {
        const noteTime = startTime + index * 0.38;
        const oscillator = audioContext.createOscillator();
        const overtone = audioContext.createOscillator();
        const filter = audioContext.createBiquadFilter();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, noteTime);

        overtone.type = "triangle";
        overtone.frequency.setValueAtTime(frequency * 0.5, noteTime);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, noteTime);

        gainNode.gain.setValueAtTime(0.0001, noteTime);
        gainNode.gain.exponentialRampToValueAtTime(0.08, noteTime + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.05);

        oscillator.connect(filter);
        overtone.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(noteTime);
        overtone.start(noteTime);
        oscillator.stop(noteTime + 1.1);
        overtone.stop(noteTime + 1.1);
    });
}

function finishSession() {
    isRunning = false;
    stopAnimation();
    body.classList.remove("session-active");
    body.classList.add("session-finished");
    showStartButton("もう一度はじめる");
    minutesInput.disabled = false;
    setFinishedScene();
    updateMinuteButtons();
    playGentleChime();
}

function tick() {
    const now = Date.now();
    const remaining = Math.max(0, endAt - now);
    const progress = durationMs === 0 ? 0 : Math.min(1, (now - startedAt) / durationMs);

    setSceneProgress(progress);

    if (remaining <= 0) {
        finishSession();
        return;
    }

    animationFrameId = requestAnimationFrame(tick);
}

async function startSession(minutes) {
    await ensureAudioContext();

    const clampedMinutes = clampMinutes(minutes);
    durationMs = clampedMinutes * 60 * 1000;
    startedAt = Date.now();
    endAt = startedAt + durationMs;
    isRunning = true;

    stopAnimation();
    body.classList.remove("session-finished");
    body.classList.add("session-active");
    showResetButton();
    minutesInput.disabled = true;
    updateMinuteButtons();
    setSceneProgress(0);
    tick();
}

timerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isRunning) {
        return;
    }

    const minutes = clampMinutes(Number(minutesInput.value) || DEFAULT_MINUTES);
    setMinutes(minutes);
    await startSession(minutes);
});

resetButton.addEventListener("click", () => {
    resetToIdleState();
});

decreaseMinutesButton.addEventListener("click", () => {
    changeMinutes(-1);
});

increaseMinutesButton.addEventListener("click", () => {
    changeMinutes(1);
});

minutesInput.addEventListener("input", () => {
    if (!isRunning) {
        setMinutes(Number(minutesInput.value) || DEFAULT_MINUTES);
        updateMinuteButtons();
    }
});

resetToIdleState();

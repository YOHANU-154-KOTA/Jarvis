/* J.A.R.V.I.S Stage 1
   Browser PWA prototype. Wake mode works only while the page is open/foregrounded
   and the browser supports Web Speech API. It is not an always-on Android service.
*/
"use strict";

const $ = id => document.getElementById(id);
const replyEl = $("reply");
const heardEl = $("heard");
const stateEl = $("stateText");
const statusEl = $("statusText");
const orb = $("orb");
const languageEl = $("language");

let recognition = null;
let wakeEnabled = false;
let listeningForCommand = false;
let lastCommand = "";
let restartTimer = null;
let voices = [];

const WAKE_WORDS = ["hey jarvis", "hey, jarvis", "హే జార్విస్", "హే జార్విస్"];
const MEMORY_KEY = "jarvis_stage1_notes";
const historyKey = "jarvis_stage1_history";

function setState(state, message) {
  stateEl.textContent = message || state;
  orb.classList.remove("listening", "thinking");
  if (state === "LISTENING") orb.classList.add("listening");
  if (state === "THINKING") orb.classList.add("thinking");
  statusEl.textContent = state === "LISTENING" ? "LISTENING" : state === "THINKING" ? "PROCESSING" : "READY";
}

function say(text) {
  replyEl.textContent = text;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageEl.value;
  utterance.rate = 0.94;
  utterance.pitch = 0.95;
  const wantedPrefix = languageEl.value.toLowerCase().split("-")[0];
  const voice = voices.find(v => v.lang.toLowerCase().startsWith(wantedPrefix));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function loadVoices() {
  voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
}
if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getNotes() {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]"); }
  catch { return []; }
}
function renderNotes() {
  const notes = getNotes();
  $("memoryInfo").textContent = notes.length
    ? `${notes.length} note(s) stored on this device. Latest: ${notes[notes.length - 1].slice(0, 90)}`
    : "No saved notes yet.";
}
function saveHistory(role, text) {
  try {
    const items = JSON.parse(localStorage.getItem(historyKey) || "[]");
    items.push({role, text, at: new Date().toISOString()});
    localStorage.setItem(historyKey, JSON.stringify(items.slice(-30)));
  } catch {}
}

function clean(text) {
  return String(text || "").toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
}
function containsAny(text, words) {
  return words.some(word => text.includes(word));
}

function getWeather() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is not available in this browser."));
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const {latitude, longitude} = position.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather service could not respond.");
        const data = await response.json();
        const c = data.current;
        resolve(`Current temperature is ${c.temperature_2m} degrees Celsius. Feels like ${c.apparent_temperature} degrees. Humidity is ${c.relative_humidity_2m} percent.`);
      } catch (error) { reject(error); }
    }, () => reject(new Error("Please allow location permission to check local weather.")), {timeout:12000, maximumAge:600000});
  });
}

function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

async function runTool(raw) {
  const t = clean(raw);
  if (containsAny(t, ["help", "సహాయం"])) {
    return "You can ask for time, date, weather, a timer, a joke, a quote, a translation, currency conversion, word meaning, Wikipedia, YouTube, news, Bitcoin price, dice, or a password.";
  }
  if (containsAny(t, ["time", "సమయం", "టైమ్"])) {
    return "The time is " + new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) + ".";
  }
  if (containsAny(t, ["date", "today", "తేదీ", "ఈరోజు"])) {
    return "Today is " + new Date().toLocaleDateString("en-IN", {weekday:"long", day:"numeric", month:"long", year:"numeric"}) + ".";
  }
  if (containsAny(t, ["weather", "వాతావరణం"])) return await getWeather();

  const timerMatch = t.match(/(?:timer|టైమర్).*?(\d+)\s*(second|seconds|sec|secs|minute|minutes|min|mins|hour|hours|hr|hrs|సెకన్లు|నిమిషాలు|గంటలు)/);
  if (timerMatch) {
    const amount = Number(timerMatch[1]);
    const unit = timerMatch[2];
    const factor = /hour|hr|గంట/.test(unit) ? 3600000 : /second|sec|సెకన/.test(unit) ? 1000 : 60000;
    if (amount > 0 && amount <= 1440) {
      setTimeout(() => say("Your timer is complete."), amount * factor);
      return `Timer set for ${amount} ${unit}. Keep this page open for the alert.`;
    }
  }
  if (containsAny(t, ["joke", "జోక్"])) {
    return randomItem([
      "Why did the computer go to the doctor? Because it had a virus.",
      "Why was the math book sad? It had too many problems.",
      "I told my phone I needed space. It opened the storage settings."
    ]);
  }
  if (containsAny(t, ["quote", "motivate", "inspiration", "కోటేషన్"])) {
    return randomItem([
      "Small progress every day adds up to big results.",
      "Discipline is choosing what matters most over what feels easy now.",
      "Start where you are. Use what you have. Do what you can."
    ]);
  }
  if (containsAny(t, ["flip a coin", "coin flip", "టాస్"])) return "The result is " + (Math.random() < .5 ? "Heads." : "Tails.");
  if (containsAny(t, ["roll a dice", "roll dice", "dice", "డైస్"])) return "You rolled " + (1 + Math.floor(Math.random() * 6)) + ".";
  if (containsAny(t, ["password", "పాస్వర్డ్"])) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const bytes = new Uint32Array(18);
    crypto.getRandomValues(bytes);
    let password = "";
    for (const n of bytes) password += chars[n % chars.length];
    return "Here is a generated password. Save it somewhere secure: " + password;
  }
  if (containsAny(t, ["translate", "translation", "అనువదించు"])) {
    const match = raw.match(/translate\s+(.+?)(?:\s+to\s+(telugu|english))?$/i);
    const phrase = match ? match[1] : "";
    const target = match && match[2] ? match[2].toLowerCase() : "telugu";
    if (!phrase) return "Say: translate hello to Telugu.";
    const pair = target === "english" ? "te|en" : "en|te";
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=${pair}`);
    if (!response.ok) throw new Error("Translation service unavailable.");
    const data = await response.json();
    return data.responseData?.translatedText || "I could not translate that phrase.";
  }
  if (containsAny(t, ["youtube", "play "])) {
    const q = raw.replace(/^(please\s+)?(open\s+)?youtube\s*/i, "").replace(/^play\s+/i, "").trim();
    const url = q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : "https://www.youtube.com/";
    window.open(url, "_blank", "noopener");
    return q ? `Searching YouTube for ${q}.` : "Opening YouTube.";
  }
  if (containsAny(t, ["google", "open browser", "search web"])) {
    const q = raw.replace(/.*?(?:search(?: google| web)? for|google)\s*/i, "").trim();
    window.open(q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : "https://www.google.com/", "_blank", "noopener");
    return q ? `Searching Google for ${q}.` : "Opening Google.";
  }
  if (containsAny(t, ["wikipedia", "wiki"])) {
    const q = raw.replace(/.*?wikipedia\s*(search\s*)?/i, "").trim();
    if (!q) return "Say: Wikipedia search solar system.";
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
    if (!response.ok) throw new Error("I could not find that Wikipedia page.");
    const data = await response.json();
    return data.extract || "No summary was available.";
  }
  if (containsAny(t, ["news", "headlines"])) {
    window.open("https://news.google.com/", "_blank", "noopener");
    return "Opening Google News for current headlines.";
  }
  if (containsAny(t, ["bitcoin", "crypto", "బిట్ కాయిన్"])) {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr");
    if (!response.ok) throw new Error("Crypto price service unavailable.");
    const data = await response.json();
    return `Bitcoin is approximately ${data.bitcoin.usd} US dollars or ${data.bitcoin.inr} Indian rupees.`;
  }
  if (containsAny(t, ["currency", "exchange rate", "convert"])) {
    const match = t.match(/(\d+(?:\.\d+)?)\s*(usd|dollars?)\s*(?:to|in)\s*(inr|rupees?)/);
    if (!match) return "Try saying: convert 10 USD to INR.";
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) throw new Error("Currency service unavailable.");
    const data = await response.json();
    return `${match[1]} US dollars is approximately ${(Number(match[1]) * data.rates.INR).toFixed(2)} Indian rupees.`;
  }
  if (containsAny(t, ["meaning", "define", "definition"])) {
    const word = raw.replace(/.*?(meaning of|define|definition of)\s*/i, "").trim().split(/\s+/)[0];
    if (!word) return "Tell me the word you want defined.";
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) throw new Error("I could not find that word.");
    const data = await response.json();
    return data[0]?.meanings?.[0]?.definitions?.[0]?.definition || "No definition found.";
  }
  return null;
}

// Cloudflare Worker endpoint. The Gemini API key stays on Cloudflare.
const JARVIS_AI_ENDPOINT = "https://jarvis-ai-backend.kotayohanu91.workers.dev";

async function askAI(message) {
  const response = await fetch(JARVIS_AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message
    })
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The AI server returned an unreadable response.");
  }

  if (!response.ok || !data.success) {
    const detail = data.error || `Server request failed (${response.status}).`;
    throw new Error(detail);
  }

  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("The AI server returned an empty answer.");
  }

  return data.reply.trim();
}

async function handleCommand(raw) {
  const command = String(raw || "").trim();
  if (!command) return;
  lastCommand = command;
  heardEl.textContent = command;
  saveHistory("user", command);
  setState("THINKING", "PROCESSING COMMAND");
  try {
    const result = await runTool(command);
    if (result) {
      say(result);
      saveHistory("assistant", result);
    } else {
      // Unknown built-in commands are sent to the Cloudflare Gemini backend.
      const aiReply = await askAI(command);
      say(aiReply);
      saveHistory("assistant", aiReply);
    }
  } catch (error) {
    say("Sorry. " + error.message);
  } finally {
    if (!wakeEnabled) setState("READY", "SYSTEM STANDBY");
  }
}

function makeRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.lang = languageEl.value;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognition() {
  clearTimeout(restartTimer);
  if (recognition) {
    recognition.onend = null;
    try { recognition.stop(); } catch {}
  }
  recognition = null;
  listeningForCommand = false;
  setState("READY", "SYSTEM STANDBY");
}

function startWakeRecognition() {
  if (!wakeEnabled) return;
  const rec = makeRecognition();
  if (!rec) {
    say("Speech recognition is not supported in this browser. Try Chrome.");
    wakeEnabled = false;
    updateWakeButton();
    return;
  }
  recognition = rec;
  rec.onstart = () => setState("LISTENING", listeningForCommand ? "LISTENING FOR COMMAND" : "LISTENING FOR HEY JARVIS");
  rec.onerror = event => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      wakeEnabled = false;
      updateWakeButton();
      say("Microphone permission was denied. Please allow microphone access.");
    }
  };
  rec.onresult = event => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim();
      if (!event.results[i].isFinal) continue;
      const normalized = clean(transcript);
      if (!listeningForCommand && WAKE_WORDS.some(w => normalized.includes(clean(w)))) {
        listeningForCommand = true;
        const afterWake = normalized.replace(clean("hey jarvis"), "").trim();
        say("Yes, how can I help?");
        if (afterWake.length > 2) {
          listeningForCommand = false;
          handleCommand(afterWake);
        } else {
          setState("LISTENING", "I'M LISTENING");
        }
      } else if (listeningForCommand) {
        listeningForCommand = false;
        handleCommand(transcript);
      }
    }
  };
  rec.onend = () => {
    recognition = null;
    if (wakeEnabled) restartTimer = setTimeout(startWakeRecognition, 900);
    else setState("READY", "SYSTEM STANDBY");
  };
  try { rec.start(); } catch { restartTimer = setTimeout(startWakeRecognition, 1200); }
}

function updateWakeButton() {
  $("wakeBtn").textContent = wakeEnabled ? "◉ DISABLE WAKE MODE" : "◉ ENABLE WAKE MODE";
  $("wakeBtn").classList.toggle("active", wakeEnabled);
  $("hintText").textContent = wakeEnabled
    ? "Wake mode enabled. Keep this app open and screen on. Say “Hey Jarvis”."
    : "Tap WAKE MODE, then say “Hey Jarvis”. Keep this app open.";
}
$("wakeBtn").addEventListener("click", () => {
  wakeEnabled = !wakeEnabled;
  if (wakeEnabled) {
    if (!makeRecognition()) {
      wakeEnabled = false;
      say("This browser does not support speech recognition. Please use a supported Chrome browser.");
      return;
    }
    startWakeRecognition();
  } else {
    stopRecognition();
  }
  updateWakeButton();
});

$("listenBtn").addEventListener("click", () => {
  const rec = makeRecognition();
  if (!rec) return say("Speech recognition is not supported in this browser.");
  if (recognition) stopRecognition();
  recognition = rec;
  rec.continuous = false;
  rec.interimResults = false;
  setState("LISTENING", "LISTENING FOR COMMAND");
  rec.onresult = event => handleCommand(event.results[0][0].transcript);
  rec.onerror = event => say("Voice input error: " + event.error);
  rec.onend = () => { recognition = null; if (!wakeEnabled) setState("READY", "SYSTEM STANDBY"); };
  try { rec.start(); } catch { say("Microphone is busy. Please try again."); }
});

$("stopBtn").addEventListener("click", () => {
  wakeEnabled = false;
  stopRecognition();
  updateWakeButton();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  say("Voice system stopped.");
});

languageEl.addEventListener("change", () => {
  if (wakeEnabled) {
    stopRecognition();
    startWakeRecognition();
  }
});

$("clearMemory").addEventListener("click", () => {
  if (!confirm("Delete all locally saved JARVIS notes and chat history on this device?")) return;
  localStorage.removeItem(MEMORY_KEY);
  localStorage.removeItem(historyKey);
  renderNotes();
  say("Local memory cleared.");
});
$("saveNote").addEventListener("click", () => {
  if (!lastCommand) return say("There is no command to save yet.");
  const notes = getNotes();
  notes.push(lastCommand);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(notes.slice(-100)));
  renderNotes();
  say("Saved your last command as a local note.");
});
$("readNotes").addEventListener("click", () => {
  const notes = getNotes();
  say(notes.length ? "Your saved notes are: " + notes.join(". ") : "You have no saved notes.");
});

document.querySelectorAll("[data-command]").forEach(button => {
  button.addEventListener("click", () => handleCommand(button.dataset.command));
});

function updateClock() {
  $("clock").textContent = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"});
}
setInterval(updateClock, 1000);
updateClock();
renderNotes();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(err => console.warn("Service worker:", err)));
}

if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
  $("listenBtn").disabled = true;
  $("wakeBtn").disabled = true;
  $("hintText").textContent = "Voice recognition is unavailable in this browser. Open the hosted app in a supported browser.";
}

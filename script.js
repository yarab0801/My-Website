/* ===========================================================
   Circuit Playground ✨
   Beginner-friendly JavaScript. Sections:
     1. Small helper functions
     2. A reusable graph-drawing function (canvas)
     3. The RC circuit demo
     4. The LC circuit demo
     5. The animation loop
     6. Navigation highlight
     7. The mini quiz + confetti
   =========================================================== */

"use strict";

/* ---------- 1. Helpers ---------- */

// Short name for document.getElementById
const $ = (id) => document.getElementById(id);

// People who prefer less motion get finished graphs instead of animated ones
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Colors used for the graph lines (the same as the legend chips in the HTML)
const PINK = "#ff2d95";
const PURPLE = "#7b3fe4";
const TEAL = "#00a6a6";
const PLUM = "#3d1a47";

// Turn a number of seconds into a friendly string like "100 ms" or "2.5 s"
function fmtTime(seconds) {
  const a = Math.abs(seconds);
  if (a < 1e-3) return (seconds * 1e6).toFixed(a * 1e6 < 10 ? 1 : 0) + " µs";
  if (a < 1) return (seconds * 1e3).toFixed(a * 1e3 < 10 ? 2 : a * 1e3 < 100 ? 1 : 0) + " ms";
  return seconds.toFixed(2) + " s";
}

// Resistance in ohms -> "470 Ω" or "2.2 kΩ"
function fmtOhm(ohms) {
  return ohms >= 1000 ? +(ohms / 1000).toFixed(1) + " kΩ" : ohms + " Ω";
}

// Volts with two decimals; the minus sign is a proper "−" for nicer looks
function fmtV(v) {
  const s = (Math.abs(v) < 0.005 ? 0 : v).toFixed(2) + " V";
  return s.replace("-", "−");
}

// Picks "nice" round axis numbers (1, 2, 5, 10, 20, 50...) for graph gridlines
function niceScale(lo, hi, wantedTicks) {
  if (hi - lo < 1e-9) hi = lo + 1;
  const raw = (hi - lo) / wantedTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
  return { min: Math.floor(lo / step + 1e-9) * step, max: Math.ceil(hi / step - 1e-9) * step, step };
}

// Pick the time unit (µs / ms / s) that fits a graph that is `seconds` wide
function timeUnit(seconds) {
  if (seconds < 1e-3) return { name: "µs", factor: 1e6 };
  if (seconds < 1) return { name: "ms", factor: 1e3 };
  return { name: "s", factor: 1 };
}

/* ---------- 2. Graph drawing ---------- */

/*
  drawGraph draws one canvas graph.
  cfg = {
    xMax:   graph width in seconds,
    t:      how far the "live" drawing has progressed (seconds),
    series: [{ color, fn }]  <- fn(t) returns the voltage at time t,
    yRange: optional [min, max]; otherwise it is worked out automatically
  }
*/
function drawGraph(canvas, cfg) {
  // Make the canvas crisp on high-resolution (phone) screens
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Empty space around the plot area (room for the axis labels); tighter on phones
  const small = w < 380;
  const m = { left: small ? 46 : 60, right: small ? 10 : 14, top: 14, bottom: 48 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;
  const STEPS = 300; // how many little line segments make up a curve

  // Work out the vertical range (find the lowest and highest voltage)
  let lo = 0;
  let hi = 0;
  if (cfg.yRange) {
    [lo, hi] = cfg.yRange;
  } else {
    for (const s of cfg.series) {
      for (let i = 0; i <= STEPS; i++) {
        const v = s.fn((cfg.xMax * i) / STEPS);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    // Small pad only when the curve would sit exactly on a gridline at the edge
    const pad = (hi - lo) * 0.005;
    hi += pad;
    if (lo < 0) lo -= pad;
  }
  const yScale = niceScale(lo, hi, cfg.yTicks || 6);
  const unit = timeUnit(cfg.xMax);
  const xScale = niceScale(0, cfg.xMax * unit.factor, small ? 3 : 5);

  // Converting a time / voltage into canvas pixels
  const px = (t) => m.left + (t / cfg.xMax) * pw;
  const py = (v) => m.top + ph - ((v - yScale.min) / (yScale.max - yScale.min)) * ph;

  ctx.font = "12px 'Trebuchet MS', 'Segoe UI', sans-serif";
  ctx.fillStyle = PLUM;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Horizontal grid lines + voltage numbers on the left
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const yTicks = Math.round((yScale.max - yScale.min) / yScale.step);
  for (let i = 0; i <= yTicks; i++) {
    const v = yScale.min + i * yScale.step;
    const y = py(v);
    ctx.strokeStyle = Math.abs(v) < 1e-9 ? PLUM : "#eadcff";
    ctx.lineWidth = Math.abs(v) < 1e-9 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(m.left, y);
    ctx.lineTo(m.left + pw, y);
    ctx.stroke();
    ctx.fillText(+v.toFixed(3) + "", m.left - 8, y);
  }

  // Vertical grid lines + time numbers at the bottom
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = 0; x <= xScale.max + 1e-9; x += xScale.step) {
    const tx = x / unit.factor;
    if (tx > cfg.xMax * 1.0001) break;
    ctx.strokeStyle = "#eadcff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(tx), m.top);
    ctx.lineTo(px(tx), m.top + ph);
    ctx.stroke();
    ctx.fillStyle = PLUM;
    ctx.fillText(+x.toFixed(3) + "", px(tx), m.top + ph + 6);
  }

  // Axis frame
  ctx.strokeStyle = PLUM;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(m.left, m.top);
  ctx.lineTo(m.left, m.top + ph);
  ctx.lineTo(m.left + pw, m.top + ph);
  ctx.stroke();

  // Axis titles
  ctx.fillStyle = PLUM;
  ctx.font = "bold 13px 'Trebuchet MS', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Time (" + unit.name + ")", m.left + pw / 2, h - 8);
  ctx.save();
  ctx.translate(small ? 11 : 15, m.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Voltage (V)", 0, 0);
  ctx.restore();

  // Clip so lines can never leak out of the plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(m.left - 4, m.top - 6, pw + 10, ph + 12);
  ctx.clip();

  const upTo = Math.min(Math.max(cfg.t, 0), cfg.xMax);

  // 1) faint dashed "preview" of the whole curve, 2) thick live part, 3) a dot
  for (const s of cfg.series) {
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = (cfg.xMax * i) / STEPS;
      i === 0 ? ctx.moveTo(px(t), py(s.fn(t))) : ctx.lineTo(px(t), py(s.fn(t)));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.lineWidth = 5;
    ctx.beginPath();
    const n = Math.max(1, Math.ceil((STEPS * upTo) / cfg.xMax));
    for (let i = 0; i <= n; i++) {
      const t = Math.min(upTo, (cfg.xMax * i) / STEPS);
      i === 0 ? ctx.moveTo(px(t), py(s.fn(t))) : ctx.lineTo(px(t), py(s.fn(t)));
    }
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(px(upTo), py(s.fn(upTo)), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- 3. The RC circuit ---------- */

/*
  The capacitor voltage follows:  Vc(t) = target + (v0 - target) * e^(-t / tau)
  - Charging:    target = Vs   (with v0 = 0 this is exactly Vs * (1 - e^(-t/tau)))
  - Discharging: target = 0    (so Vc = v0 * e^(-t/tau))
  Every time you press a button or move a slider we "re-anchor": we remember the
  capacitor's current voltage as v0 and start a fresh curve from there.
*/
const rc = {
  R: 1000,       // ohms
  C: 100,        // microfarads
  Vs: 9,         // volts
  mode: "charge",
  v0: 0,         // capacitor voltage at the start of the current curve
  t: 0           // seconds since the current curve started (simulated time)
};

const rcCanvas = $("rcCanvas");

const rcTau = () => rc.R * rc.C * 1e-6;                      // tau = R x C (seconds)
const rcTarget = () => (rc.mode === "charge" ? rc.Vs : 0);   // what Vc is heading towards
const rcA = () => rcTarget();                                // point A is battery + (or ground when discharging)
const rcVc = (t) => rcTarget() + (rc.v0 - rcTarget()) * Math.exp(-t / rcTau()); // voltage at B
const rcVr = (t) => rcA() - rcVc(t);                         // voltage across the resistor

// Remember where the capacitor is right now, then restart the curve from there
function rcReanchor() {
  rc.v0 = rcVc(rc.t);
  rc.t = 0;
}

// Read the sliders (called after re-anchoring so the old values were used for v0)
function rcReadSliders() {
  rc.R = +$("rcR").value;
  rc.C = +$("rcC").value;
  rc.Vs = +$("rcVs").value;
  $("rcROut").textContent = fmtOhm(rc.R);
  $("rcCOut").textContent = rc.C + " µF";
  $("rcVsOut").textContent = rc.Vs + " V";
  $("rcDiagVs").textContent = "Vs = " + rc.Vs + " V";
  if (reduceMotion) rc.t = 5 * rcTau();
}

// Slider moved: update everything immediately
["rcR", "rcC", "rcVs"].forEach((id) => {
  $(id).addEventListener("input", () => {
    rcReanchor();
    rcReadSliders();
    rcRender();
  });
});

$("rcCharge").addEventListener("click", () => {
  rcReanchor();
  rc.mode = "charge";
  if (reduceMotion) rc.t = 5 * rcTau();
  rcRender();
});

$("rcDischarge").addEventListener("click", () => {
  rcReanchor();
  rc.mode = "discharge";
  if (reduceMotion) rc.t = 5 * rcTau();
  rcRender();
});

// Draw the graph + update every number on the page
function rcRender() {
  const tau = rcTau();
  const tMax = 5 * tau;               // the graph shows 5 time constants
  rc.t = Math.min(rc.t, tMax);

  drawGraph(rcCanvas, {
    xMax: tMax,
    t: rc.t,
    series: [
      { color: PINK, fn: () => rcA() },        // A
      { color: PURPLE, fn: (t) => rcVc(t) },   // B (= voltage across the capacitor)
      { color: TEAL, fn: (t) => rcVr(t) }      // across the resistor
    ]
  });

  const a = rcA();
  const vc = rcVc(rc.t);
  const vr = rcVr(rc.t);
  const ratio = rc.t / tau;             // t measured in taus

  // Numbers inside the circuit diagram and under the graph
  $("rcVA").textContent = fmtV(a);
  $("rcVB").textContent = fmtV(vc);
  $("rcVcNum").textContent = fmtV(vc);
  $("rcVrNum").textContent = fmtV(vr);
  $("rcTauNum").textContent = fmtTime(tau);

  // "% charged" = how close Vc is to Vs
  const pct = rc.Vs > 0 ? (vc / rc.Vs) * 100 : 0;
  $("rcProgNum").textContent = ratio.toFixed(2) + " τ · " + Math.round(pct) + "%";

  // Show the formula with real numbers filled in, so you can check the math
  const tauTxt = ratio.toFixed(2);
  const e = Math.exp(-ratio).toFixed(3);
  if (rc.mode === "charge" && rc.v0 === 0) {
    $("rcCheck1").textContent = "Vc = " + rc.Vs + " × (1 − e^(−" + tauTxt + ")) = " + rc.Vs + " × " + (1 - Math.exp(-ratio)).toFixed(3) + " = " + fmtV(vc);
    $("rcCheck2").textContent = "Vr = " + rc.Vs + " × e^(−" + tauTxt + ") = " + rc.Vs + " × " + e + " = " + fmtV(vr);
  } else {
    $("rcCheck1").textContent = "Vc = " + fmtV(rcTarget()) + " + (" + fmtV(rc.v0) + " − " + fmtV(rcTarget()) + ") × e^(−" + tauTxt + ") = " + fmtV(vc);
    $("rcCheck2").textContent = "Vr = A − B = " + fmtV(a) + " − " + fmtV(vc) + " = " + fmtV(vr);
  }

  // Current dots: brighter when more current flows, reversed when it flips
  const maxV = Math.max(rc.Vs, 1);
  const flow = $("rcFlow");
  flow.style.opacity = Math.min(1, Math.abs(vr) / maxV * 1.2).toFixed(2);
  flow.classList.toggle("reverse", vr < 0);
}

/* ---------- 4. The LC circuit ---------- */

const V0 = 5;                 // the capacitor starts out holding 5 V
const LC_WINDOW = 0.02;       // the graph is 20 milliseconds wide
const LC_SLOWMO = 0.0025;     // simulated seconds per real second (slow motion!)

const lc = { L: 50, C: 20, damping: 10, t: 0, pause: 0 };
const lcCanvas = $("lcCanvas");

// All the numbers derived from the sliders
function lcParams() {
  const L = lc.L * 1e-3;                  // millihenry -> henry
  const C = lc.C * 1e-6;                  // microfarad -> farad
  const w0 = 1 / Math.sqrt(L * C);        // natural angular frequency (rad/s)
  const f = w0 / (2 * Math.PI);           // f = 1 / (2 pi sqrt(LC))
  const zeta = lc.damping / 200;          // damping ratio, 0 .. 0.5
  const alpha = zeta * w0;                // how fast the swing fades
  const wd = w0 * Math.sqrt(1 - zeta * zeta); // the swing is a tiny bit slower when damped
  return { L, C, w0, f, zeta, alpha, wd };
}

/*
  Capacitor voltage (a damped cosine):
     Vc(t) = V0 * e^(-alpha*t) * ( cos(wd*t) + (alpha/wd) * sin(wd*t) )
  Inductor voltage, drawn as the "drop" going around the loop:
     VL(t) = -V0 * e^(-alpha*t) * ( cos(wd*t) - (alpha/wd) * sin(wd*t) )
  With no damping (alpha = 0) this is simply Vc = V0*cos(w0*t) and VL = -Vc.
*/
function lcVc(t, p) {
  return V0 * Math.exp(-p.alpha * t) * (Math.cos(p.wd * t) + (p.alpha / p.wd) * Math.sin(p.wd * t));
}
function lcVL(t, p) {
  return -V0 * Math.exp(-p.alpha * t) * (Math.cos(p.wd * t) - (p.alpha / p.wd) * Math.sin(p.wd * t));
}

// Energy as a fraction of the starting energy (1/2 C V0^2)
function lcEnergyCap(t, p) {
  const v = lcVc(t, p) / V0;
  return v * v;
}
function lcEnergyInd(t, p) {
  const x = Math.exp(-p.alpha * t) * (p.w0 * p.w0 / p.wd) * Math.sin(p.wd * t);
  return (x * x) / (p.w0 * p.w0);
}

function dampingWord(d) {
  if (d === 0) return "none";
  if (d < 25) return "gentle";
  if (d < 60) return "medium";
  return "heavy";
}

["lcL", "lcC", "lcD"].forEach((id) => {
  $(id).addEventListener("input", () => {
    lc.L = +$("lcL").value;
    lc.C = +$("lcC").value;
    lc.damping = +$("lcD").value;
    $("lcLOut").textContent = lc.L + " mH";
    $("lcCOut").textContent = lc.C + " µF";
    $("lcDOut").textContent = lc.damping + " · " + dampingWord(lc.damping);
    lcRender();
  });
});

$("lcPluck").addEventListener("click", () => {
  lc.t = 0;
  lc.pause = 0;
  if (reduceMotion) lc.t = LC_WINDOW;
  lcRender();
});

function lcRender() {
  const p = lcParams();
  drawGraph(lcCanvas, {
    xMax: LC_WINDOW,
    t: lc.t,
    yRange: [-V0 * 1.1, V0 * 1.1],
    yTicks: 6,
    series: [
      { color: PINK, fn: (t) => lcVc(t, p) },
      { color: TEAL, fn: (t) => lcVL(t, p) }
    ]
  });

  const vc = lcVc(lc.t, p);
  $("lcVA").textContent = fmtV(vc);
  $("lcVcNum").textContent = fmtV(vc);
  $("lcFNum").textContent = p.f.toFixed(1) + " Hz";
  $("lcTNum").textContent = fmtTime(1 / p.f);
  $("lcFdNum").textContent = (p.wd / (2 * Math.PI)).toFixed(1) + " Hz";
  $("lcCheck").textContent =
    "f = 1 / (2π × √(" + lc.L / 1000 + " H × " + lc.C / 1e6 + " F)) = " + p.f.toFixed(2) + " Hz";

  // Energy bars: they take turns being full (the swing!)
  $("lcEc").style.width = Math.min(100, lcEnergyCap(lc.t, p) * 100).toFixed(1) + "%";
  $("lcEl").style.width = Math.min(100, lcEnergyInd(lc.t, p) * 100).toFixed(1) + "%";
}

/* ---------- 5. Animation loop ---------- */

// Only animate a demo while it's on screen (saves battery)
const onScreen = { rc: true, lc: true };
if ("IntersectionObserver" in window) {
  const watch = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      onScreen[en.target.id === "rc" ? "rc" : "lc"] = en.isIntersecting;
    });
  });
  watch.observe($("rc"));
  watch.observe($("lc"));
}

let lastTime = null;
function frame(now) {
  if (lastTime === null) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.05); // seconds since last frame
  lastTime = now;

  if (!reduceMotion) {
    if (onScreen.rc) {
      // The RC demo plays in "time-lapse": one tau per real second
      rc.t = Math.min(rc.t + dt * rcTau(), 5 * rcTau());
      rcRender();
    }
    if (onScreen.lc) {
      if (lc.t >= LC_WINDOW) {
        // Rest for a moment at the end, then pluck again automatically
        lc.pause += dt;
        if (lc.pause > 1.5) { lc.t = 0; lc.pause = 0; }
      } else {
        lc.t = Math.min(lc.t + dt * LC_SLOWMO, LC_WINDOW);
      }
      lcRender();
    }
  }
  requestAnimationFrame(frame);
}

// Initial setup: read slider values, start charging, draw once
rcReadSliders();
if (reduceMotion) { rc.t = 5 * rcTau(); lc.t = LC_WINDOW; }
rcRender();
lcRender();
requestAnimationFrame(frame);

// Redraw graphs when the window is resized or rotated
window.addEventListener("resize", () => { rcRender(); lcRender(); });

/* ---------- 6. Navigation highlight ---------- */

const navLinks = document.querySelectorAll(".pill a");
const sectionIds = ["top", "voltage", "rc", "lc", "cheat", "quiz"];
if ("IntersectionObserver" in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-35% 0px -60% 0px" });
  sectionIds.forEach((id) => spy.observe($(id)));
}

/* ---------- 7. Mini quiz + confetti ---------- */

const questions = [
  {
    q: "In an RC circuit, after one time constant (1 τ) of charging, the capacitor has reached about...",
    options: ["37% of the battery voltage", "50% of the battery voltage", "63% of the battery voltage", "100% of the battery voltage"],
    answer: 2,
    why: "Vc = Vs × (1 − e^−1) ≈ 0.63 × Vs. After 5 τ he's basically full."
  },
  {
    q: "Where does Indy the Inductor store his energy?",
    options: ["In an electric field", "In a magnetic field", "As heat", "In a tiny battery"],
    answer: 1,
    why: "Indy's coil makes a magnetic field when current flows. Cappy is the one with the electric field."
  },
  {
    q: "In an LC circuit, what happens to the frequency if you make C bigger (and keep L the same)?",
    options: ["It goes up", "It goes down", "It stays the same", "It becomes zero"],
    answer: 1,
    why: "f = 1 / (2π√(LC)). A bigger C means a lazier, slower swing, so f goes down."
  }
];

const quizBox = $("quizBox");
let qIndex = 0;
let score = 0;

function showQuestion() {
  const item = questions[qIndex];
  quizBox.innerHTML = "";

  const progress = document.createElement("p");
  progress.className = "q-progress";
  progress.textContent = "Question " + (qIndex + 1) + " of " + questions.length;

  const text = document.createElement("p");
  text.className = "q-text";
  text.textContent = item.q;

  const list = document.createElement("div");
  list.className = "choices";

  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");

  item.options.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.textContent = label;
    b.addEventListener("click", () => answer(i, b, list, feedback));
    list.appendChild(b);
  });

  quizBox.append(progress, text, list, feedback);
}

function answer(i, button, list, feedback) {
  const item = questions[qIndex];
  const buttons = list.querySelectorAll(".choice");
  buttons.forEach((b) => (b.disabled = true));

  if (i === item.answer) {
    score++;
    button.classList.add("right");
    feedback.textContent = "🎉 Correct! " + item.why;
    confetti(button);
  } else {
    button.classList.add("wrong");
    buttons[item.answer].classList.add("right");
    feedback.textContent = "Not quite, but you're doing great! 💖 " + item.why;
  }

  // "Next" (or "See my score") button
  const next = document.createElement("button");
  next.type = "button";
  next.className = "btn";
  next.style.marginTop = "12px";
  next.textContent = qIndex < questions.length - 1 ? "Next question ➜" : "See my score ✨";
  next.addEventListener("click", () => {
    qIndex++;
    qIndex < questions.length ? showQuestion() : showScore();
  });
  quizBox.appendChild(next);
}

function showScore() {
  const messages = ["Every expert starts somewhere. Try again! 🌱", "Nice start! One more go? 💪", "So close! Almost a circuit wizard. 🧙", "Perfect! You're a circuit wizard! 🧙‍♀️✨"];
  quizBox.innerHTML = "";
  const s = document.createElement("p");
  s.className = "score";
  s.textContent = "You got " + score + " out of " + questions.length + "! " + messages[score];
  const again = document.createElement("button");
  again.type = "button";
  again.className = "btn";
  again.textContent = "Play again 🔁";
  again.addEventListener("click", () => { qIndex = 0; score = 0; showQuestion(); });
  quizBox.append(s, again);
  if (score === questions.length) confetti(again);
}

// Burst of emoji + sparkles from the middle of an element
function confetti(from) {
  if (reduceMotion) return;
  const box = $("confetti");
  const r = from.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const pieces = ["✨", "💖", "⭐", "🎉", "💜", "🩷"];
  for (let i = 0; i < 32; i++) {
    const bit = document.createElement("span");
    bit.className = "bit";
    bit.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 180;
    bit.style.left = cx + "px";
    bit.style.top = cy + "px";
    bit.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    bit.style.setProperty("--dy", Math.sin(angle) * dist - 60 + "px");
    bit.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
    box.appendChild(bit);
    setTimeout(() => bit.remove(), 1400);
  }
}

showQuestion();

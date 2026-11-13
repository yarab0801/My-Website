# ✨ Circuit Playground

**Live site:** https://yarab0801.github.io/My-Website/

A cute, pink and whimsical website that explains **RC and LC circuits** and shows what the voltage is at each point of the circuit. Think of it as a cozy storybook for grown-up nerds.

## What's inside

- **Voltage 101:** voltage as "electrical pressure", explained with a water-pipe analogy.
- **Meet the characters:**
  - 🔸 **Rita the Resistor:** a narrow pipe that limits the current.
  - 🔋 **Cappy the Capacitor:** a water tank that stores charge.
  - 🌀 **Indy the Inductor:** a heavy paddle wheel that resists changes in current.
- **The RC Circuit:** the time constant (τ = R × C), charging and discharging, and a handy rule of thumb.
- **The LC Circuit:** energy swinging back and forth between the capacitor and the inductor, the resonant frequency, and damping.
- **RC vs LC cheat sheet:** a quick comparison of the two circuits.
- **Mini quiz:** three questions with sparkly feedback.

## Interactive demos

- **RC simulator:** sliders for resistance (R), capacitance (C) and source voltage (Vs), with Charge and Discharge buttons. A live graph shows the voltages, and readouts show the capacitor voltage, resistor voltage, time constant and percent charged.
- **LC simulator:** sliders for inductance (L), capacitance (C) and damping, with a "Pluck again" button. Graphs show the capacitor and inductor voltages and the energy swapping between them, plus the frequency and period.

## Key formulas

| Circuit | Formula |
|---------|---------|
| RC time constant | τ = R × C |
| Capacitor voltage while charging | Vc = Vs × (1 − e^(−t/RC)) |
| Resistor voltage | Vr = Vs × e^(−t/RC) |
| LC resonant frequency | f = 1 / (2π√(LC)) |

## Built with

- HTML, CSS and vanilla JavaScript (no frameworks or libraries)
- Created with **VS Code** and **GitHub Copilot**
- Hosted for free with **GitHub Pages**

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in your browser. No installation needed.

## Project structure

```
My-Website/
├── index.html   # page structure and content
├── style.css    # the pink, whimsical styling
├── script.js    # the interactive simulators and quiz
└── README.md    # this file
```

## Author

Made by **yarab0801** as part of an AI course assignment.

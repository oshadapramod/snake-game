# React Neon Snake

A modern cyberpunk-styled Snake game built with React + HTML5 Canvas. Features smooth animation (requestAnimationFrame), glassmorphism UI, neon glow gradients, keyboard + swipe controls, particle effects, multiple glow skins, and responsive scaling.

## Features
- React functional component with hooks
- 60fps game loop via rAF
- Neon glowing snake with gradient body
- Glowing orb food
- Particle burst when eating food
- Multiple selectable skins
- Animated subtle background grid
- Difficulty auto-scales with score (speed increases)
- Keyboard (Arrow / WASD) + mobile swipe controls
- Glass score panel & animated Game Over overlay

## Getting Started
Install deps and run dev server:
```bash
npm install
npm run dev
```
Open the shown local URL (usually http://localhost:5173) in desktop or mobile.

## Controls
Desktop: Arrow Keys or WASD
Mobile: Swipe in the canvas area.
Restart: Press Enter or click Play Again when game over.

## Skins
Click the Skin button to cycle through available glow palettes.

## Build
```bash
npm run build
npm run preview
```

## Customization Ideas
- Change GRID_COLS / GRID_ROWS in `SnakeGame.jsx`
- Adjust INITIAL_SPEED / MAX_SPEED
- Add more skins to the SKINS array

## License
MIT

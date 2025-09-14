import React, { useState, useEffect, useRef, useCallback } from 'react';

/* SnakeGame Component
   Features: neon cyberpunk canvas snake, responsive scaling, keyboard + swipe, particles, skins.
*/

const GRID_COLS = 32; // logical grid
const GRID_ROWS = 32;
// Difficulty settings (restricted to four tiers)
const DIFFICULTIES = [
    { level: 3, label: 'Easy' },
    { level: 5, label: 'Medium' },
    { level: 7, label: 'Hard' },
    { level: 9, label: 'Very Hard' }
];
const BASE_SPEED_PER_LEVEL = 2.2; // multiplier to derive cells/sec
const INITIAL_LEVEL = DIFFICULTIES[0].level;

// Scoring constants
// Regular food always awards 15 points (flat, no level multiplier per user spec)
const NORMAL_POINTS = 15;
// Special (bonus) food lasts 5 seconds and always awards 30 points when eaten
const SPECIAL_DURATION = 5; // seconds
const SPECIAL_POINTS = 30; // flat award
const SPECIAL_CHANCE = 0.18; // chance on spawn to be special

const SNAKE_INITIAL = [{ x: 8, y: 16 }, { x: 7, y: 16 }, { x: 6, y: 16 }];
const DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 }
};

const SKINS = [
    { name: 'Aqua Violet', colors: ['#12fff7', '#9326ff'], particle: '#6efcff' },
    { name: 'Neon Ember', colors: ['#ff009d', '#ffa300'], particle: '#ff56d9' },
    { name: 'Cyber Lime', colors: ['#3dff92', '#14f1ff'], particle: '#7dffc2' },
];

// --- Audio helpers ---
let sharedAudioCtx = null;
function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    if (!sharedAudioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) sharedAudioCtx = new AC();
    }
    return sharedAudioCtx;
}

function playEatSound(isSpecial = false) {
    const ctx = getAudioCtx(); if (!ctx) return;
    // resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    // Different timbre for special
    const baseFreq = isSpecial ? 520 : 340;
    osc.type = isSpecial ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.9, now + 0.15);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
}

function playGameOverSound() {
    const ctx = getAudioCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    // Two detuned oscillators falling
    for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const startFreq = 300 - i * 40;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(80 - i * 20, now + 0.6);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
    }
}

function playStartSound() {
    const ctx = getAudioCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
}

function playPauseResumeSound(pausing) {
    const ctx = getAudioCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    if (pausing) {
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.25);
    } else {
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.25);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.30);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
}

function playQuitSound() {
    const ctx = getAudioCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
}

function randomInt(max) { return Math.floor(Math.random() * max); }

function placeFood(snake) {
    while (true) {
        const fx = randomInt(GRID_COLS);
        const fy = randomInt(GRID_ROWS);
        if (!snake.some(seg => seg.x === fx && seg.y === fy)) return { x: fx, y: fy };
    }
}

function maybeSpawnSpecial(regularFood, snake) {
    if (Math.random() < SPECIAL_CHANCE) {
        // pick a different tile than regular food and snake
        let tries = 0;
        while (tries < 200) {
            const fx = randomInt(GRID_COLS);
            const fy = randomInt(GRID_ROWS);
            if ((fx !== regularFood.x || fy !== regularFood.y) && !snake.some(seg => seg.x === fx && seg.y === fy)) {
                return { x: fx, y: fy, spawnTime: performance.now() / 1000 };
            }
            tries++;
        }
        // fallback: allow overlap with regular if no space found
        return { x: regularFood.x, y: regularFood.y, spawnTime: performance.now() / 1000 };
    }
    return null;
}

const useAnimationFrame = (callback) => {
    const reqRef = useRef();
    const lastTimeRef = useRef(performance.now());
    const animate = useCallback((time) => {
        const dt = (time - lastTimeRef.current) / 1000; // seconds
        lastTimeRef.current = time;
        callback(dt, time);
        reqRef.current = requestAnimationFrame(animate);
    }, [callback]);
    useEffect(() => { reqRef.current = requestAnimationFrame(animate); return () => cancelAnimationFrame(reqRef.current); }, [animate]);
};

const SnakeGame = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    // Snake will be represented as an array of points (float coordinates in grid units)
    const [snake, setSnake] = useState(SNAKE_INITIAL);
    const [dir, setDir] = useState({ x: 1, y: 0 }); // target direction (unit grid vector)
    const dirRef = useRef(dir);
    const velocityRef = useRef({ x: 1, y: 0 }); // continuous velocity (lerps toward dirRef)
    const segmentSpacing = 1; // distance between segment centers in grid units
    const pathRef = useRef([]); // list of head positions for trailing interpolation
    const [food, setFood] = useState(placeFood(SNAKE_INITIAL));
    const [pendingGrowth, setPendingGrowth] = useState(0);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [level, setLevel] = useState(INITIAL_LEVEL);
    const [speed, setSpeed] = useState(BASE_SPEED_PER_LEVEL * INITIAL_LEVEL);
    const [skinIndex, setSkinIndex] = useState(0);
    const skin = SKINS[skinIndex];
    const particlesRef = useRef([]); // {x,y,vx,vy,life}
    const [specialFood, setSpecialFood] = useState(null); // {x,y,spawnTime}
    const [specialRemaining, setSpecialRemaining] = useState(0);
    // New gameplay control states
    const [gameStarted, setGameStarted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const cellSizeRef = useRef(20);
    const logicalToPhysical = (x) => x * cellSizeRef.current;

    const handleDirection = useCallback((next) => {
        const c = dirRef.current;
        // prevent reversing directly
        if (next.x === -c.x && next.y === -c.y) return;
        dirRef.current = next;
        setDir(next);
    }, []);

    useEffect(() => {
        const keyHandler = (e) => {
            if (DIRECTIONS[e.key]) {
                if (!gameStarted || paused || gameOver) return; // ignore turns if not active
                e.preventDefault();
                handleDirection(DIRECTIONS[e.key]);
            } else if (gameOver && e.key === 'Enter') {
                // restart instantly
                restart();
                setGameStarted(true);
                setPaused(false);
            } else if (e.key === 'p' || e.key === 'P') {
                if (gameStarted && !gameOver) setPaused(p => !p);
            } else if (e.key === 'Enter' && !gameStarted && !gameOver) {
                // start from panel
                startGame();
            }
        };
        window.addEventListener('keydown', keyHandler, { passive: false });
        return () => window.removeEventListener('keydown', keyHandler);
    }, [handleDirection, gameOver, gameStarted, paused]);

    // mobile detection
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Swipe handling
    useEffect(() => {
        let startX = 0, startY = 0, active = false, startT = 0;
        const threshold = 24; // px
        const el = containerRef.current;
        const onTouchStart = (e) => {
            if (e.touches.length !== 1) return; active = true; startT = performance.now();
            startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        };
        const onTouchMove = (e) => { if (!active) return; };
        const onTouchEnd = (e) => {
            if (!active) return; active = false; const dx = e.changedTouches[0].clientX - startX; const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
            if (Math.abs(dx) > Math.abs(dy)) handleDirection({ x: dx > 0 ? 1 : -1, y: 0 });
            else handleDirection({ x: 0, y: dy > 0 ? 1 : -1 });
        };
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); };
    }, [handleDirection]);

    // Helper: award special food points exactly once
    const awardSpecial = useCallback(() => {
        setScore(s => s + SPECIAL_POINTS);
    }, []);

    const restart = useCallback(() => {
        setSnake(SNAKE_INITIAL);
        dirRef.current = { x: 1, y: 0 }; setDir({ x: 1, y: 0 });
        velocityRef.current = { x: 1, y: 0 };
        pathRef.current = [...SNAKE_INITIAL.map(p => ({ ...p }))];
        const f = placeFood(SNAKE_INITIAL); setFood(f);
        setPendingGrowth(0); setScore(0); setGameOver(false); setSpeed(BASE_SPEED_PER_LEVEL * level);
        particlesRef.current = [];
        setSpecialFood(null);
        setSpecialRemaining(0);
    }, [level]);

    const startGame = useCallback(() => {
        restart();
        setGameStarted(true);
        setPaused(false);
        playStartSound();
    }, [restart]);

    const quitGame = useCallback(() => {
        // Return to start panel & reset game
        restart();
        setGameStarted(false);
        setPaused(false);
        playQuitSound();
    }, [restart]);

    // Game update state
    const accRef = useRef(0);
    useAnimationFrame((dt) => {
        if (!gameStarted || paused || gameOver) return;
        accRef.current += dt;
        const stepInterval = 1 / speed; // seconds per move
        if (accRef.current >= stepInterval) {
            accRef.current -= stepInterval;
            setSnake(prev => {
                const head = prev[0];
                let nextHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
                // wrap-around (toroidal) world for walls
                if (nextHead.x < 0) nextHead.x = GRID_COLS - 1;
                else if (nextHead.x >= GRID_COLS) nextHead.x = 0;
                if (nextHead.y < 0) nextHead.y = GRID_ROWS - 1;
                else if (nextHead.y >= GRID_ROWS) nextHead.y = 0;
                // self-collision still ends game
                if (prev.some(s => s.x === nextHead.x && s.y === nextHead.y)) {
                    setGameOver(true);
                    playGameOverSound();
                    return prev;
                }
                const newSnake = [nextHead, ...prev];
                let ate = false;
                if (specialFood && nextHead.x === specialFood.x && nextHead.y === specialFood.y) {
                    ate = true;
                    awardSpecial();
                    playEatSound(true);
                    // Debug: uncomment to verify in console
                    // console.log('Special food eaten: +', SPECIAL_POINTS);
                    setSpecialFood(null);
                    setSpecialRemaining(0);
                    setPendingGrowth(g => g + 2);
                } else if (nextHead.x === food.x && nextHead.y === food.y) {
                    ate = true;
                    // award flat points for regular food
                    setScore(s => s + NORMAL_POINTS);
                    playEatSound(false);
                    const nf = placeFood(newSnake);
                    setFood(nf);
                    const special = maybeSpawnSpecial(nf, newSnake);
                    setSpecialFood(special);
                    if (special) setSpecialRemaining(SPECIAL_DURATION);
                    setPendingGrowth(g => g + 1);
                }
                if (ate) {
                    for (let i = 0; i < 18; i++) {
                        particlesRef.current.push({
                            x: nextHead.x + 0.5,
                            y: nextHead.y + 0.5,
                            vx: (Math.random() - 0.5) * 3,
                            vy: (Math.random() - 0.5) * 3,
                            life: 0.6 + Math.random() * 0.4,
                            age: 0,
                            color: skin.particle
                        });
                    }
                }
                if (pendingGrowth > 0) {
                    setPendingGrowth(g => g - 1);
                } else {
                    newSnake.pop();
                }
                return newSnake;
            });
        }
        // update particles
        particlesRef.current = particlesRef.current.filter(p => (p.age += dt) < p.life);
        // update special remaining timer
        if (specialFood) {
            setSpecialRemaining(r => {
                const elapsed = (performance.now() / 1000) - specialFood.spawnTime;
                const left = Math.max(0, SPECIAL_DURATION - elapsed);
                if (left <= 0) {
                    setSpecialFood(null);
                    return 0;
                }
                return left;
            });
        }
    });

    // Update speed when level changes
    useEffect(() => {
        setSpeed(BASE_SPEED_PER_LEVEL * level);
    }, [level]);

    // Resize canvas to fit container
    useEffect(() => {
        const resize = () => {
            const canvas = canvasRef.current; if (!canvas) return;
            const parent = canvas.parentElement; if (!parent) return;
            const w = parent.clientWidth || 640; const h = parent.clientHeight || 640;
            // Determine cell size to fit while keeping grid ratio
            const cell = Math.floor(Math.min(w / GRID_COLS, h / GRID_ROWS));
            cellSizeRef.current = Math.max(10, cell); // min size
            const cw = cellSizeRef.current * GRID_COLS;
            const ch = cellSizeRef.current * GRID_ROWS;
            const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
            canvas.width = cw * dpr; canvas.height = ch * dpr;
            canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
            const ctx = canvas.getContext && canvas.getContext('2d');
            if (ctx && ctx.scale) ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Rendering
    useAnimationFrame(() => {
        const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
        const cw = canvas.clientWidth; const ch = canvas.clientHeight;
        ctx.clearRect(0, 0, cw, ch);

        // background grid animated subtle
        const t = performance.now() * 0.0003;
        ctx.save();
        ctx.globalAlpha = 0.33;
        ctx.lineWidth = 1;
        const gradBg = ctx.createLinearGradient(0, 0, cw, ch);
        gradBg.addColorStop(0, '#0b0f1f');
        gradBg.addColorStop(1, '#090c18');
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = 'rgba(40,120,255,0.08)';
        const cs = cellSizeRef.current;
        const offset = (Math.sin(t) * 0.5 + 0.5) * cs; // subtle drift
        for (let x = 0; x <= GRID_COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(Math.round(x * cs + (x % 2 ? offset : 0) % cs) + 0.5, 0);
            ctx.lineTo(Math.round(x * cs + (x % 2 ? offset : 0) % cs) + 0.5, ch);
            ctx.stroke();
        }
        for (let y = 0; y <= GRID_ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, Math.round(y * cs + (y % 2 ? offset : 0) % cs) + 0.5);
            ctx.lineTo(cw, Math.round(y * cs + (y % 2 ? offset : 0) % cs) + 0.5);
            ctx.stroke();
        }
        ctx.restore();

        // food
        const drawFood = () => {
            const fx = logicalToPhysical(food.x); const fy = logicalToPhysical(food.y);
            const cx = fx + cs / 2; const cy = fy + cs / 2;
            if (skin.classic) {
                // Classic Nokia style: blinking solid square
                const blink = (Math.sin(performance.now() * 0.01) * 0.5 + 0.5);
                ctx.save();
                ctx.fillStyle = `rgba(140,255,140,${0.6 + 0.4 * blink})`;
                ctx.shadowColor = '#6aff3d';
                ctx.shadowBlur = 18 * blink;
                ctx.fillRect(fx + cs * 0.15, fy + cs * 0.15, cs * 0.7, cs * 0.7);
                ctx.restore();
            } else {
                const r = cs * 0.45;
                const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
                g.addColorStop(0, '#fff');
                g.addColorStop(0.2, skin.colors[0]);
                g.addColorStop(1, 'rgba(255,0,180,0)');
                ctx.beginPath(); ctx.fillStyle = g; ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.shadowColor = skin.colors[0]; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
            }
        };

        drawFood();
        // special food
        if (specialFood) {
            const fx = logicalToPhysical(specialFood.x); const fy = logicalToPhysical(specialFood.y);
            const blink = (Math.sin(performance.now() * 0.02) * 0.5 + 0.5);
            if (skin.classic) {
                ctx.save();
                ctx.fillStyle = `rgba(255,255,255,${0.9})`;
                ctx.shadowColor = '#b8ff9a'; ctx.shadowBlur = 22;
                ctx.fillRect(fx + cs * 0.1, fy + cs * 0.1, cs * 0.8, cs * 0.8);
                ctx.restore();
            } else {
                const cx = fx + cs / 2; const cy = fy + cs / 2;
                const r = cs * 0.5;
                const g2 = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
                g2.addColorStop(0, '#fff');
                g2.addColorStop(0.2, '#ffe066');
                g2.addColorStop(1, 'rgba(255,230,100,0)');
                ctx.beginPath(); ctx.fillStyle = g2; ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
                ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 22 * blink; ctx.fill(); ctx.shadowBlur = 0;
            }
            // countdown ring (non-classic only or keep subtle if classic)
            const remainRatio = specialRemaining / SPECIAL_DURATION;
            const cx2 = fx + cs / 2; const cy2 = fy + cs / 2;
            ctx.save();
            ctx.strokeStyle = skin.classic ? 'rgba(180,255,180,0.7)' : '#ffe066';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx2, cy2, cs * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainRatio);
            ctx.stroke();
            ctx.restore();
        }

        // snake
        const drawSnake = () => {
            if (skin.classic) {
                ctx.save();
                for (let i = 0; i < snake.length; i++) {
                    const seg = snake[i];
                    const x = logicalToPhysical(seg.x); const y = logicalToPhysical(seg.y);
                    const base = '#6aff3d';
                    const isHead = i === 0;
                    if (!isHead) {
                        const pad = 2;
                        const size = cs - pad * 2;
                        ctx.fillStyle = '#91ff6d';
                        ctx.shadowColor = base;
                        ctx.shadowBlur = 10;
                        ctx.fillRect(x + pad, y + pad, size, size);
                        continue;
                    }
                    // Cobra-like pointed head (triangle + slight flare at base) with outline and eyes
                    const d = dirRef.current;
                    ctx.save();
                    ctx.translate(x + cs / 2, y + cs / 2);
                    const ang = Math.atan2(d.y, d.x);
                    ctx.rotate(ang);
                    const headLen = cs * 0.95;
                    const headWidth = cs * 0.78; // base width
                    const tipInset = headLen * 0.52;
                    // shape: a pointed diamond-ish front with slight hood base
                    ctx.beginPath();
                    ctx.moveTo(-headLen * 0.40, -headWidth * 0.42); // back left
                    ctx.lineTo(tipInset, -headWidth * 0.18);          // upper mid near tip
                    ctx.lineTo(headLen * 0.50, 0);                    // sharp tip
                    ctx.lineTo(tipInset, headWidth * 0.18);           // lower mid near tip
                    ctx.lineTo(-headLen * 0.40, headWidth * 0.42);    // back right
                    ctx.closePath();
                    const gradHead = ctx.createLinearGradient(-headLen * 0.4, 0, headLen * 0.5, 0);
                    gradHead.addColorStop(0, '#88ff66');
                    gradHead.addColorStop(0.55, '#caffb0');
                    gradHead.addColorStop(1, '#e6ffe0');
                    ctx.fillStyle = gradHead;
                    ctx.shadowColor = base;
                    ctx.shadowBlur = 20;
                    ctx.fill();
                    // outline
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#2c6f24';
                    ctx.stroke();
                    // inner darker center
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.moveTo(-headLen * 0.30, -headWidth * 0.28);
                    ctx.lineTo(tipInset * 0.92, -headWidth * 0.12);
                    ctx.lineTo(headLen * 0.46, 0);
                    ctx.lineTo(tipInset * 0.92, headWidth * 0.12);
                    ctx.lineTo(-headLen * 0.30, headWidth * 0.28);
                    ctx.closePath();
                    ctx.fillStyle = 'rgba(10,60,18,0.45)';
                    ctx.fill();
                    // simple eyes
                    const eyeOffsetX = headLen * 0.05;
                    const eyeOffsetY = headWidth * 0.22;
                    ctx.fillStyle = '#0b2109';
                    ctx.beginPath(); ctx.arc(eyeOffsetX, -eyeOffsetY, cs * 0.07, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(eyeOffsetX, eyeOffsetY, cs * 0.07, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#d8ffd0';
                    ctx.beginPath(); ctx.arc(eyeOffsetX + cs * 0.015, -eyeOffsetY - cs * 0.01, cs * 0.025, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(eyeOffsetX + cs * 0.015, eyeOffsetY - cs * 0.01, cs * 0.025, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
                ctx.restore();
            } else {
                for (let i = 0; i < snake.length; i++) {
                    const seg = snake[i];
                    const isHead = i === 0;
                    const x = logicalToPhysical(seg.x); const y = logicalToPhysical(seg.y);
                    const cx = x + cs / 2; const cy = y + cs / 2;
                    const prog = i / (snake.length - 1 || 1);
                    const col = lerpColor(skin.colors[0], skin.colors[1], prog);
                    if (!isHead) {
                        const radius = cs * 0.48;
                        const gradBody = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.15);
                        gradBody.addColorStop(0, '#ffffff');
                        gradBody.addColorStop(0.18, col);
                        gradBody.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = gradBody;
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                        ctx.fill();
                        continue;
                    }
                    // Cobra neon head: tapered polygon with glow, outline, and eyes
                    const d = dirRef.current;
                    const ang = Math.atan2(d.y, d.x);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(ang);
                    const headLen = cs * 1.15;
                    const headWidth = cs * 0.95;
                    const tip = headLen * 0.60;
                    ctx.beginPath();
                    ctx.moveTo(-headLen * 0.42, -headWidth * 0.40);
                    ctx.lineTo(tip * 0.80, -headWidth * 0.18);
                    ctx.lineTo(tip, 0);
                    ctx.lineTo(tip * 0.80, headWidth * 0.18);
                    ctx.lineTo(-headLen * 0.42, headWidth * 0.40);
                    ctx.closePath();
                    const headGrad = ctx.createLinearGradient(-headLen * 0.42, 0, tip, 0);
                    headGrad.addColorStop(0, skin.colors[1]);
                    headGrad.addColorStop(0.55, skin.colors[0]);
                    headGrad.addColorStop(1, '#ffffff');
                    ctx.fillStyle = headGrad;
                    ctx.shadowColor = skin.colors[0];
                    ctx.shadowBlur = 28;
                    ctx.fill();
                    ctx.lineWidth = 2.2;
                    ctx.strokeStyle = col;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // Inner dark accent
                    ctx.beginPath();
                    ctx.moveTo(-headLen * 0.30, -headWidth * 0.24);
                    ctx.lineTo(tip * 0.70, -headWidth * 0.11);
                    ctx.lineTo(tip * 0.95, 0);
                    ctx.lineTo(tip * 0.70, headWidth * 0.11);
                    ctx.lineTo(-headLen * 0.30, headWidth * 0.24);
                    ctx.closePath();
                    const innerGrad = ctx.createLinearGradient(-headLen * 0.30, 0, tip * 0.95, 0);
                    innerGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
                    innerGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
                    ctx.fillStyle = innerGrad;
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.fill();
                    // Eyes (glowing)
                    const eyeOffsetX = headLen * 0.02;
                    const eyeOffsetY = headWidth * 0.24;
                    const eyeR = cs * 0.11;
                    const eyeGlow = ctx.createRadialGradient(eyeOffsetX, -eyeOffsetY, eyeR * 0.2, eyeOffsetX, -eyeOffsetY, eyeR);
                    eyeGlow.addColorStop(0, '#fff');
                    eyeGlow.addColorStop(0.3, skin.colors[0]);
                    eyeGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.beginPath(); ctx.fillStyle = eyeGlow; ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
                    const eyeGlow2 = ctx.createRadialGradient(eyeOffsetX, eyeOffsetY, eyeR * 0.2, eyeOffsetX, eyeOffsetY, eyeR);
                    eyeGlow2.addColorStop(0, '#fff');
                    eyeGlow2.addColorStop(0.3, skin.colors[0]);
                    eyeGlow2.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.beginPath(); ctx.fillStyle = eyeGlow2; ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2); ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.restore();
                }
                // outline glow pass
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (let i = 0; i < snake.length; i++) {
                    const seg = snake[i];
                    const x = logicalToPhysical(seg.x); const y = logicalToPhysical(seg.y);
                    const cx = x + cs / 2; const cy = y + cs / 2;
                    const prog = i / (snake.length - 1 || 1);
                    const col = lerpColor(skin.colors[0], skin.colors[1], prog);
                    if (i === 0) {
                        // stroke an approximate outline ellipse for head base glow
                        const radius = cs * 0.60;
                        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, radius * 0.85, radius * 0.60, 0, 0, Math.PI * 2); ctx.stroke();
                    } else {
                        const radius = cs * 0.48;
                        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2); ctx.stroke();
                    }
                }
                ctx.restore();
            }
        };

        drawSnake();

        // particles
        const drawParticles = () => {
            particlesRef.current.forEach(p => {
                const px = logicalToPhysical(p.x); const py = logicalToPhysical(p.y);
                const lifeRatio = 1 - p.age / p.life;
                ctx.globalAlpha = lifeRatio;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, cs * 0.25 * lifeRatio, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                // integrate position for visual smoothness (not affecting logic grid)
                p.x += p.vx * 0.02; p.y += p.vy * 0.02;
            });
        };
        drawParticles();

        if (gameOver) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, cw, ch);
            ctx.restore();
        }
    });

    function lerpColor(a, b, t) {
        const ca = hexToRgb(a); const cb = hexToRgb(b);
        const r = Math.round(ca.r + (cb.r - ca.r) * t);
        const g = Math.round(ca.g + (cb.g - ca.g) * t);
        const bl = Math.round(ca.b + (cb.b - ca.b) * t);
        return `rgb(${r},${g},${bl})`;
    }
    function hexToRgb(h) {
        const p = h.replace('#', '');
        const bigint = parseInt(p.length === 3 ? p.split('').map(c => c + c).join('') : p, 16);
        return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    }

    const cycleSkin = () => setSkinIndex(i => (i + 1) % SKINS.length);

    return (
        <div ref={containerRef} style={styles.wrapper}>
            <div style={isMobile ? styles.topBarMobile : styles.topBar}>
                <div style={{ ...styles.panel, ...(isMobile ? styles.panelMobile : {}) }} className="glass" >
                    <div style={styles.scoreRow}>
                        <div style={styles.scoreBlock}>
                            <div style={styles.scoreLabel}>SCORE</div>
                            <div style={styles.scoreValue}>{score}</div>
                        </div>
                        <div style={styles.levelBlock}>
                            <div style={styles.scoreLabel}>DIFFICULTY</div>
                            <div style={styles.levelValue}>{DIFFICULTIES.find(d => d.level === level)?.label}</div>
                        </div>
                        {specialFood && (
                            <div style={styles.specialBlock}>
                                <div style={styles.scoreLabel}>BONUS</div>
                                <div style={styles.bonusTimer}>{Math.ceil(specialRemaining)}</div>
                            </div>
                        )}
                    </div>
                    <div style={isMobile ? styles.levelButtonsMobile : styles.levelButtons}> {
                        DIFFICULTIES.map(d => (
                            <button key={d.level} disabled={gameStarted && !gameOver && score > 0} onClick={() => { setLevel(d.level); setSpeed(BASE_SPEED_PER_LEVEL * d.level); }} style={{ ...styles.levelBtn, ...(d.level === level ? styles.levelBtnActive : {}) }}>{d.label}</button>
                        ))
                    }</div>
                    <div style={styles.actionButtonsRow}>
                        <button onClick={cycleSkin} style={styles.skinChip}>{skin.name}</button>
                        {gameStarted && !gameOver && (
                            <button onClick={quitGame} style={styles.quitChip}>Quit</button>
                        )}
                    </div>
                </div>
                {/* Removed separate pause + right controls; actions consolidated inside panel */}
            </div>
            {gameStarted && !gameOver && (
                <div style={styles.pauseRow}>
                    <button onClick={() => setPaused(p => { playPauseResumeSound(!p); return !p; })} style={styles.pauseInline}>{paused ? 'Resume' : 'Pause'}</button>
                </div>
            )}
            <div style={styles.canvasHolder}>
                <canvas ref={canvasRef} style={styles.canvas} />
                {!gameStarted && !gameOver && (
                    <div style={styles.startOverlay}>
                        <h1 style={styles.gameTitle}>NEON SNAKE</h1>
                        <p style={styles.tagline}>Eat the pulses. Avoid yourself. Wrap the grid. Choose a level & skin then begin.</p>
                        <div style={styles.startButtons}>
                            <button onClick={startGame} style={styles.playAgain}>Start Game</button>
                        </div>
                        <p style={styles.hint}>Controls: Arrows / WASD / Swipe • Pause: P • Quit: Button</p>
                        <p style={styles.creditline}>Developed By Oshada Pramod • 2025</p>
                    </div>
                )}
                {/* Pause button relocated below top panel; overlay removed */}
                {gameOver && (
                    <div style={styles.overlay}>
                        <h1 style={styles.overTitle}>GAME OVER</h1>
                        <p style={styles.overScore}>Score: {score}</p>
                        <div style={styles.pauseBtns}>
                            <button onClick={() => { restart(); setGameStarted(true); playStartSound(); }} style={styles.playAgain}>Play Again</button>
                            <button onClick={quitGame} style={styles.quitBtn}>Quit</button>
                        </div>
                    </div>
                )}
            </div>
            <footer style={styles.footer}>Arrows / WASD or Swipe • React Neon Snake</footer>
        </div>
    );
};

const styles = {
    wrapper: { position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 'clamp(8px,1.5vh,24px)', gap: '16px', overflow: 'hidden' },
    topBar: { display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'stretch', maxWidth: '1080px', gap: '12px', marginTop: '-8px' },
    topBarMobile: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '640px', gap: '10px', marginTop: '-6px' },
    panel: { backdropFilter: `blur(var(--panel-blur))`, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '14px 22px 16px', borderRadius: '20px', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 22px -8px #0ff4', display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: '240px', gap: '14px', position: 'relative' },
    panelMobile: { minWidth: 'unset', width: '100%', padding: '16px 18px 18px', gap: '16px' },
    scoreLabel: { fontSize: '0.75rem', letterSpacing: '4px', opacity: 0.75 },
    scoreValue: { fontSize: '2.2rem', fontWeight: 700, textShadow: '0 0 8px #14f1ff, 0 0 18px #14f1ff', color: '#dfffff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
    scoreRow: { display: 'flex', gap: '18px', alignItems: 'flex-end' },
    scoreBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    levelBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    levelValue: { fontSize: '1.8rem', fontWeight: 600, textShadow: '0 0 8px #6aff3d', color: '#cfffdf' },
    specialBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    bonusTimer: { fontSize: '1.5rem', fontWeight: 600, color: '#ffe066', textShadow: '0 0 8px #ffe066' },
    levelButtons: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', paddingTop: '4px' },
    levelButtonsMobile: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', paddingTop: '2px' },
    levelBtn: { cursor: 'pointer', background: 'linear-gradient(120deg,#1a2435,#121a29)', border: '1px solid #243140', borderRadius: '8px', fontSize: '0.75rem', padding: '4px 8px', color: '#c6e7ff', letterSpacing: '1px', minWidth: '30px', transition: '0.25s' },
    levelBtnActive: { background: 'linear-gradient(120deg,#0b3144,#0a473d)', color: '#b8ff9a', border: '1px solid #1d603e', boxShadow: '0 0 8px -2px #3dff92' },
    skinBtn: { cursor: 'pointer', background: 'linear-gradient(120deg,#1b253a,#141b29)', color: '#d0ecff', border: '1px solid #26324a', borderRadius: '14px', padding: '10px 18px', fontFamily: 'inherit', fontSize: '0.9rem', letterSpacing: '1px', position: 'relative', overflow: 'hidden', boxShadow: '0 0 0 1px #1c2535, 0 4px 14px -6px rgba(0,0,0,0.5)', transition: '0.3s', },
    actionButtonsRow: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', alignItems: 'center', marginTop: '4px' },
    skinChip: { cursor: 'pointer', flex: '1 1 90px', background: 'linear-gradient(120deg,#261c36,#1b1427)', border: '1px solid #3b2d52', color: '#efe2ff', padding: '10px 12px', borderRadius: '14px', fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 600, textTransform: 'uppercase', boxShadow: '0 0 0 1px #2a203a, 0 0 10px -4px #9326ff', transition: '0.25s', overflow: 'hidden', textOverflow: 'ellipsis' },
    quitChip: { cursor: 'pointer', flex: '1 1 70px', background: 'linear-gradient(120deg,#4d1827,#300f18)', border: '1px solid #6a2538', color: '#ffd4e1', padding: '10px 12px', borderRadius: '14px', fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 600, textTransform: 'uppercase', boxShadow: '0 0 0 1px #421823, 0 0 10px -4px #ff2f6b', transition: '0.25s' },
    pauseRow: { display: 'flex', justifyContent: 'center', width: '100%', marginTop: '-4px', marginBottom: '-4px' },
    pauseInline: { cursor: 'pointer', background: 'linear-gradient(120deg,#18273a,#132030)', border: '1px solid #214056', color: '#d2f6ff', padding: '10px 30px', borderRadius: '40px', fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600, boxShadow: '0 0 0 1px #1c2e3d, 0 0 14px -4px #14f1ff', transition: '0.3s', minWidth: '160px' },
    canvasHolder: { position: 'relative', flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '1080px' },
    canvas: { background: 'transparent', boxShadow: '0 0 0 2px #121a27, 0 0 20px -4px #0ff, 0 0 60px -10px #9326ff', borderRadius: '14px', imageRendering: 'pixelated', touchAction: 'none', maxWidth: '100%', height: 'auto' },
    overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, rgba(10,14,24,0.72), rgba(8,10,18,0.78))', backdropFilter: 'blur(10px)', gap: '18px', borderRadius: '14px', animation: 'fadeIn 0.6s ease' },
    startOverlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', textAlign: 'center', gap: '22px', background: 'linear-gradient(130deg, rgba(10,14,24,0.85), rgba(8,10,18,0.88))', backdropFilter: 'blur(14px)', borderRadius: '14px' },
    gameTitle: { margin: 0, fontSize: 'clamp(2.8rem,8vw,5rem)', background: 'linear-gradient(90deg,#14f1ff,#ff009d)', WebkitBackgroundClip: 'text', color: 'transparent', textShadow: '0 0 12px #14f1ff,0 0 28px #ff009d', letterSpacing: '4px' },
    tagline: { maxWidth: '640px', lineHeight: 1.4, fontSize: '0.95rem', opacity: 0.8 },
    creditline: { maxWidth: '640px', fontWeight: 500, lineHeight: 1.4, marginTop: '68px', fontSize: '0.95rem', opacity: 0.8 },
    hint: { fontSize: '0.65rem', letterSpacing: '2px', opacity: 0.45, textTransform: 'uppercase' },
    startButtons: { display: 'flex', gap: '14px' },
    overTitle: { margin: 0, fontSize: 'clamp(2.5rem,7vw,4.5rem)', background: 'linear-gradient(90deg,#ff2f6b,#14f1ff)', WebkitBackgroundClip: 'text', color: 'transparent', textShadow: '0 0 10px #ff2f6b,0 0 18px #14f1ff' },
    overScore: { margin: 0, fontSize: '1.4rem', opacity: 0.85 },
    playAgain: { cursor: 'pointer', fontSize: '1.1rem', padding: '14px 32px', borderRadius: '30px', border: '1px solid #1d3144', background: 'linear-gradient(140deg,#13283d,#0d1523)', color: '#e9fbff', letterSpacing: '2px', fontWeight: 600, boxShadow: '0 0 0 2px rgba(20,241,255,0.1), 0 0 16px -4px #14f1ff, 0 0 40px -6px #ff009d', position: 'relative', overflow: 'hidden', transition: '0.35s', },
    quitBtn: { cursor: 'pointer', fontSize: '0.95rem', padding: '12px 26px', borderRadius: '30px', border: '1px solid #401d2f', background: 'linear-gradient(140deg,#2a1421,#1a0d15)', color: '#ffd9ec', letterSpacing: '2px', fontWeight: 600, boxShadow: '0 0 0 2px rgba(255,0,157,0.15), 0 0 18px -6px #ff009d', position: 'relative', overflow: 'hidden', transition: '0.35s' },
    pauseBtns: { display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' },
    footer: { fontSize: '0.7rem', opacity: 0.5, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '6px' }
};

export default SnakeGame;

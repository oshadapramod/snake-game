import '@testing-library/jest-dom';

// Mock canvas for jsdom environment (basic 2D context subset used by SnakeGame rendering)
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function () {
        return {
            save: () => { },
            restore: () => { },
            scale: () => { },
            clearRect: () => { },
            fillRect: () => { },
            beginPath: () => { },
            moveTo: () => { },
            lineTo: () => { },
            stroke: () => { },
            arc: () => { },
            fill: () => { },
            strokeRect: () => { },
            createLinearGradient: () => ({ addColorStop: () => { } }),
            createRadialGradient: () => ({ addColorStop: () => { } }),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            globalAlpha: 1,
            shadowColor: '',
            shadowBlur: 0,
            globalCompositeOperation: 'source-over'
        };
    };
}

// Provide requestAnimationFrame if missing
if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
}

// Any global test setup (custom matchers, mocks) can go here.

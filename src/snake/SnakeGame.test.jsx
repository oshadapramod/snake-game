import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SnakeGame from './SnakeGame.jsx';

describe('SnakeGame', () => {
    test('renders start screen and starts game', () => {
        render(<SnakeGame />);
        // Ensure start overlay title present (multiple matches includes footer); use getAllByText
        expect(screen.getAllByText(/NEON SNAKE/i)[0]).toBeInTheDocument();
        const startBtn = screen.getByRole('button', { name: /start game/i });
        fireEvent.click(startBtn);
        expect(screen.queryByRole('button', { name: /start game/i })).not.toBeInTheDocument();
        expect(screen.getByText(/score/i)).toBeInTheDocument();
    });

    test('can pause and resume', () => {
        render(<SnakeGame />);
        fireEvent.click(screen.getByRole('button', { name: /start game/i }));
        const pauseBtn = screen.getByRole('button', { name: /pause/i });
        fireEvent.click(pauseBtn);
        expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /resume/i }));
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    test('difficulty button reflects change before score gained', () => {
        render(<SnakeGame />);
        fireEvent.click(screen.getByRole('button', { name: /^medium$/i }));
        fireEvent.click(screen.getByRole('button', { name: /start game/i }));
        const hardButton = screen.getAllByRole('button').find(b => b.textContent === 'Hard');
        expect(hardButton).toBeTruthy();
        fireEvent.click(hardButton);
        // Level label should now read Hard (allowed change until score increases)
        const levelDisplays = screen.getAllByText(/hard/i).filter(el => el.tagName.toLowerCase() !== 'button');
        expect(levelDisplays.length).toBeGreaterThan(0);
    });
});

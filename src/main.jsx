import React from 'react';
import { createRoot } from 'react-dom/client';
import SnakeGame from './snake/SnakeGame.jsx';
import './global.css';

createRoot(document.getElementById('root')).render(<SnakeGame />);

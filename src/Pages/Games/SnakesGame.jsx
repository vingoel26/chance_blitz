"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { ethers } from 'ethers';
import { ArrowLeft } from 'lucide-react';
import "./snakes.css";
import "./globals.css";
import Navbar from "../navbar";
import contractManager from '../../contract_data/contract-utils';

// --- Helper Components ---

// SVG for a snake
const Snake = ({ from, to, boardSize }) => {
    const getCoords = (pos) => {
        const row = 9 - Math.floor((pos - 1) / 10);
        let col = (pos - 1) % 10;
        if (row % 2 !== 1) { // For even rows (from top, 0-indexed), reverse the column
            col = 9 - col;
        }
        const x = col * (boardSize / 10) + (boardSize / 20);
        const y = row * (boardSize / 10) + (boardSize / 20);
        return { x, y };
    };

    const start = getCoords(from);
    const end = getCoords(to);

    const controlX1 = start.x + (end.x - start.x) * 0.2 + (start.y - end.y) * 0.2;
    const controlY1 = start.y + (end.y - start.y) * 0.4 - (start.x - end.x) * 0.2;
    const controlX2 = start.x + (end.x - start.x) * 0.8 - (start.y - end.y) * 0.2;
    const controlY2 = start.y + (end.y - start.y) * 0.6 + (start.x - end.x) * 0.2;

    return (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ zIndex: 2 }}>
            <path
                d={`M ${start.x} ${start.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${end.x} ${end.y}`}
                className="snake-path"
            />
            <circle cx={start.x} cy={start.y} r="10" className="snake-head" />
            <circle cx={start.x - 4} cy={start.y - 4} r="2" className="snake-eye" />
            <circle cx={start.x + 4} cy={start.y - 4} r="2" className="snake-eye" />
            <defs>
                <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#d32f2f', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#f44336', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
        </svg>
    );
};

// SVG for a ladder
const Ladder = ({ from, to, boardSize }) => {
    const getCoords = (pos) => {
        const row = 9 - Math.floor((pos - 1) / 10);
        let col = (pos - 1) % 10;
        if (row % 2 !== 1) {
            col = 9 - col;
        }
        const x = col * (boardSize / 10) + (boardSize / 20);
        const y = row * (boardSize / 10) + (boardSize / 20);
        return { x, y };
    };

    const start = getCoords(from);
    const end = getCoords(to);

    return (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ zIndex: 1 }}>
            <line x1={start.x - 8} y1={start.y} x2={end.x - 8} y2={end.y} className="ladder-rail" />
            <line x1={start.x + 8} y1={start.y} x2={end.x + 8} y2={end.y} className="ladder-rail" />
            {Array.from({ length: 8 }).map((_, i) => {
                const ratio = (i + 1) / 9;
                const rungX1 = start.x - 8 + (end.x - start.x) * ratio;
                const rungY1 = start.y + (end.y - start.y) * ratio;
                const rungX2 = start.x + 8 + (end.x - start.x) * ratio;
                const rungY2 = start.y + (end.y - start.y) * ratio;
                return <line key={i} x1={rungX1} y1={rungY1} x2={rungX2} y2={rungY2} className="ladder-rung" />
            })}
        </svg>
    );
};

// Dice Component
const Dice = ({ value, isRolling }) => {
    // Ensure value is between 1 and 6
    const diceValue = Math.max(1, Math.min(6, value));
    
    // Standard dice rotation mapping (opposite faces sum to 7)
    const rotations = {
        1: { rotateX: 0, rotateY: 0 },      // Front face
        2: { rotateX: -90, rotateY: 0 },    // Top face  
        3: { rotateX: 0, rotateY: 90 },     // Right face
        4: { rotateX: 0, rotateY: -90 },    // Left face
        5: { rotateX: 90, rotateY: 0 },     // Bottom face
        6: { rotateX: 180, rotateY: 0 }     // Back face
    };
    
    const rotation = rotations[diceValue];
    
    return (
        <div className="w-24 h-24 perspective-500">
            <div
                className={`relative w-full h-full transform-style-3d transition-transform duration-1000 ${isRolling ? 'animate-spin-dice' : ''}`}
                style={{ 
                    transform: `rotateX(${rotation.rotateX}deg) rotateY(${rotation.rotateY}deg)` 
                }}
            >
                {/* Front Face (1) */}
                <div className="dice-face translate-z-12">
                    <span className="dice-dot"></span>
                </div>
                {/* Back Face (6) */}
                <div className="dice-face rotate-x-180 translate-z-12">
                    <div className="flex flex-col justify-around p-2 w-full h-full">
                        <div className="flex justify-between"><span className="dice-dot-small"></span><span className="dice-dot-small"></span></div>
                        <div className="flex justify-between"><span className="dice-dot-small"></span><span className="dice-dot-small"></span></div>
                        <div className="flex justify-between"><span className="dice-dot-small"></span><span className="dice-dot-small"></span></div>
                    </div>
                </div>
                {/* Top Face (2) */}
                <div className="dice-face rotate-x-90 translate-z-12">
                    <div className="flex justify-between p-2 w-full h-full">
                        <span className="dice-dot self-start"></span>
                        <span className="dice-dot self-end"></span>
                    </div>
                </div>
                {/* Bottom Face (5) */}
                 <div className="dice-face rotate-x-[-90deg] translate-z-12">
                    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-2">
                        <span className="dice-dot-small col-start-1 row-start-1"></span>
                        <span className="dice-dot-small col-start-3 row-start-1"></span>
                        <span className="dice-dot-small col-start-2 row-start-2"></span>
                        <span className="dice-dot-small col-start-1 row-start-3"></span>
                        <span className="dice-dot-small col-start-3 row-start-3"></span>
                    </div>
                </div>
                {/* Right Face (3) */}
                <div className="dice-face rotate-y-90 translate-z-12">
                     <div className="flex justify-between p-2 w-full h-full">
                         <span className="dice-dot self-start"></span>
                         <span className="dice-dot self-center"></span>
                         <span className="dice-dot self-end"></span>
                    </div>
                </div>
                {/* Left Face (4) */}
                <div className="dice-face rotate-y-[-90deg] translate-z-12">
                    <div className="flex flex-col justify-between p-2 w-full h-full">
                        <div className="flex justify-between"><span className="dice-dot"></span><span className="dice-dot"></span></div>
                        <div className="flex justify-between"><span className="dice-dot"></span><span className="dice-dot"></span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Game Component ---

const SnakesGame = () => {
    const router = useRouter();
    
    // Game constants
    const BOARD_SIZE = 500;
    const WINNING_POSITION = 100;
    const snakes = useMemo(() => ({ 17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78 }), []);
    const ladders = useMemo(() => ({ 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 }), []);

    // Game State
    const [playerPosition, setPlayerPosition] = useState(1);
    const [computerPosition, setComputerPosition] = useState(1);
    const [diceValue, setDiceValue] = useState(1);
    const [isRolling, setIsRolling] = useState(false);
    const [gameState, setGameState] = useState("ready"); // "ready", "playing", "gameOver"
    const [gameMessage, setGameMessage] = useState("Place your bet to start!");
    const [betAmount, setBetAmount] = useState(0.01);
    const [currentPlayer, setCurrentPlayer] = useState('player'); // 'player' or 'computer'
    const [playerAnimation, setPlayerAnimation] = useState(''); // 'climbing-ladder' or 'sliding-snake'
    const [computerAnimation, setComputerAnimation] = useState(''); // 'climbing-ladder' or 'sliding-snake'

    // Web3 State
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [walletConnected, setWalletConnected] = useState(false);
    
    // Initialize wallet connection
    const initializeWallet = async () => {
        try {
            const result = await contractManager.initialize();
            setAccount(result.account);
            setContract(result.contract);
            setProvider(result.provider);
            setSigner(result.signer);
            setWalletConnected(true);
            console.log("Wallet connected:", result.account);
        } catch (error) {
            console.error("Error connecting wallet:", error);
        }
    };
    
    // This effect would handle connecting to MetaMask
    useEffect(() => {
        if (window.ethereum) {
            initializeWallet();
        }
    }, []);

    // This effect handles the computer's turn
    useEffect(() => {
        if (gameState === 'playing' && currentPlayer === 'computer') {
            setGameMessage("Computer is thinking...");
            setTimeout(() => {
                const roll = Math.floor(Math.random() * 6) + 1;
                setGameMessage(`Computer rolled a ${roll}!`);
                setIsRolling(true);
                
                setTimeout(async () => {
                    setDiceValue(roll);
                    setIsRolling(false);
                    await handleMove(roll, 'computer', setComputerPosition);
                }, 1000);
            }, 2000); // Wait 2 seconds before computer rolls
        }
    }, [currentPlayer, gameState]);

    // Function to get a token's position on the board
    const getTokenPositionStyles = (position) => {
        const row = 9 - Math.floor((position - 1) / 10);
        let col = (position - 1) % 10;
        if (row % 2 !== 1) { // For even rows (from top, 0-indexed), reverse the column
            col = 9 - col;
        }
        return {
            top: `${row * 10}%`,
            left: `${col * 10}%`,
            transform: 'translate(0%, 0%)',
            transition: 'top 0.5s ease-in-out, left 0.5s ease-in-out',
        };
    };

    // --- Game Logic ---
    const handleMove = async (roll, mover, setMoverPosition) => {
        let currentPosition = mover === 'player' ? playerPosition : computerPosition;
        let newPosition = currentPosition;
        
        // Calculate new position after roll
        if (currentPosition + roll <= WINNING_POSITION) {
            newPosition = currentPosition + roll;
        } else {
            // If roll would exceed 100, stay in place
            newPosition = currentPosition;
        }

        const onSnakeOrLadder = (position) => {
            if (snakes[position]) {
                setGameMessage(`${mover === 'player' ? 'You' : 'Computer'} hit a snake at ${position}! 🐍`);
                // Trigger sliding animation
                if (mover === 'player') {
                    setPlayerAnimation('sliding-snake');
                } else {
                    setComputerAnimation('sliding-snake');
                }
                setTimeout(() => {
                    setMoverPosition(snakes[position]);
                    // Clear animation after movement
                    setTimeout(() => {
                        if (mover === 'player') {
                            setPlayerAnimation('');
                        } else {
                            setComputerAnimation('');
                        }
                    }, 600);
                }, 600);
            } else if (ladders[position]) {
                setGameMessage(`${mover === 'player' ? 'You' : 'Computer'} found a ladder at ${position}! 🪜`);
                // Trigger climbing animation
                if (mover === 'player') {
                    setPlayerAnimation('climbing-ladder');
                } else {
                    setComputerAnimation('climbing-ladder');
                }
                setTimeout(() => {
                    setMoverPosition(ladders[position]);
                    // Clear animation after movement
                    setTimeout(() => {
                        if (mover === 'player') {
                            setPlayerAnimation('');
                        } else {
                            setComputerAnimation('');
                        }
                    }, 600);
                }, 600);
            } else {
                setMoverPosition(position);
            }
        };

        onSnakeOrLadder(newPosition);

        // Check for winner
        if (newPosition === WINNING_POSITION) {
            setGameState("gameOver");
            if (mover === 'player') {
                const winnings = betAmount * 5;
                setGameMessage(`Congratulations! You won ${winnings} MON!`);
                
                try {
                    // Cashout winnings from contract
                    await contractManager.cashout(winnings);
                } catch (error) {
                    console.error('Error cashing out:', error);
                    setGameMessage(`You won ${winnings} MON, but there was an error processing the payout: ${error.message}`);
                }
            } else {
                setGameMessage(`The computer won. You lost ${betAmount} MON.`);
            }
        } else {
             // If no winner, switch turns
            setTimeout(() => {
                setCurrentPlayer(mover === 'player' ? 'computer' : 'player');
            }, 1000); // Give time for the piece to move
        }
    };
    
    const handleRollDice = () => {
        if (isRolling || gameState !== "playing" || currentPlayer !== 'player') return;

        setIsRolling(true);
        const roll = Math.floor(Math.random() * 6) + 1;
        setGameMessage(`You rolled a ${roll}!`);
        
        setTimeout(async () => {
            setDiceValue(roll);
            setIsRolling(false);
            await handleMove(roll, 'player', setPlayerPosition);
        }, 1000);
    };



    const handleStartGame = async () => {
        if (betAmount <= 0) {
            alert("Please enter a valid bet amount.");
            return;
        }
        
        if (!walletConnected) {
            alert("Please connect your wallet first.");
            return;
        }
        
        try {
            // Place bet on contract
            await contractManager.placeBet(betAmount);
            
            console.log(`Betting ${betAmount} MON...`);
            setGameState("playing");
            setCurrentPlayer('player');
            setGameMessage("Game started! It's your turn to roll.");
        } catch (error) {
            console.error('Error placing bet:', error);
            alert(`Error placing bet: ${error.message}`);
        }
    };

    const handleResetGame = () => {
        setPlayerPosition(1);
        setComputerPosition(1);
        setDiceValue(1);
        setGameState("ready");
        setGameMessage("Place your bet to start again!");
        setCurrentPlayer('player');
    };

    // --- Board Rendering ---
    const renderBoard = () => {
        const board = [];
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const base = 100 - row * 10;
                let cellNumber;
                if (row % 2 === 0) { // Even rows (0, 2, ..) from right to left
                    cellNumber = base - col;
                } else { // Odd rows (1, 3, ..) from left to right
                    cellNumber = base - (9 - col);
                }
                board.push(
                    <div key={cellNumber} className="board-cell">
                        <span className="board-cell-number">{cellNumber}</span>
                    </div>
                );
            }
        }
        return board;
    };

    return (
        <div className="min-h-screen bg-[#191919] text-white">
            <Navbar />
            
            <div className="page">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 px-6">
                    <button 
                        onClick={() => router.push('/games')}
                        className="flex items-center text-white hover:text-gray-300 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Games
                    </button>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
                        SNAKES & LADDERS
                    </h1>
                    <div className="text-sm text-gray-400">Don't refresh page</div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto px-6">
                    {/* Game Board */}
                    <div className="flex-grow lg:w-2/3 flex items-center justify-center">
                        <div
                            className="relative game-board"
                            style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
                        >
                            <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
                                {renderBoard()}
                            </div>
                            {Object.entries(snakes).map(([from, to]) => <Snake key={`s-${from}`} from={from} to={to} boardSize={BOARD_SIZE} />)}
                            {Object.entries(ladders).map(([from, to]) => <Ladder key={`l-${from}`} from={from} to={to} boardSize={BOARD_SIZE} />)}
                            
                            <div className="absolute w-[10%] h-[10%] z-10 flex items-center justify-center" style={getTokenPositionStyles(playerPosition)}>
                               <div className={`player-token ${playerAnimation}`}></div>
                            </div>
                            <div className="absolute w-[10%] h-[10%] z-10 flex items-center justify-center" style={getTokenPositionStyles(computerPosition)}>
                               <div className={`computer-token ${computerAnimation}`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Game Controls */}
                    <div className="lg:w-1/3 game-controls flex flex-col justify-between">
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-300 border-b border-gray-700 pb-2">Game Controls</h3>
                            
                            {/* Wallet Connection */}
                            <div className="mb-6">
                                {!walletConnected ? (
                                    <button
                                        onClick={initializeWallet}
                                        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 px-4 rounded-lg font-bold hover:opacity-80 transition-opacity"
                                    >
                                        Connect Wallet
                                    </button>
                                ) : (
                                    <div className="text-green-400 font-bold text-center py-3 bg-gray-700 rounded-lg">
                                        ✅ Wallet Connected
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Bet Amount (MON)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                                    disabled={gameState === "playing"}
                                    className="bet-input"
                                />
                            </div>

                            {gameState === "ready" && (
                                <button
                                    onClick={handleStartGame}
                                    className="start-button"
                                >
                                    Place Bet & Start
                                </button>
                            )}

                            {gameState === "playing" && (
                                <button
                                    onClick={handleRollDice}
                                    disabled={isRolling || currentPlayer !== 'player'}
                                    className="roll-button"
                                >
                                    {isRolling ? "Rolling..." : "Roll Dice"}
                                </button>
                            )}
                            
                             {gameState === "gameOver" && (
                                <button
                                    onClick={handleResetGame}
                                    className="reset-button"
                                >
                                    Play Again
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center my-6">
                           <Dice value={diceValue} isRolling={isRolling} />
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <h3 className="text-xl font-bold mb-4 text-gray-300">Game Status</h3>
                            <div className="game-status">
                                <p className="game-message">{gameMessage}</p>
                                <div className="position-info">
                                    <p>Your Position: <span className="position-value">{playerPosition}</span></p>
                                    <p>Computer: <span className="position-value">{computerPosition}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnakesGame;
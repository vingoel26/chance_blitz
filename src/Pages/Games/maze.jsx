"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { ethers } from 'ethers';
import { Timer, DollarSign, Trophy, Play, RotateCcw, ArrowLeft } from 'lucide-react';
import "./maze.css";
import "./globals.css";
import Navbar from "../navbar";
import contractManager from '../../contract_data/contract-utils';

const MazeGame = () => {
  const router = useRouter();
  const [maze, setMaze] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [gameState, setGameState] = useState('betting'); // betting, playing, won, lost
  const [betAmount, setBetAmount] = useState('');
  const [timeBet, setTimeBet] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const MAZE_SIZE = 25; // Increased from 15 to 25 for more difficulty
  const CELL_SIZE = 20; // Reduced cell size to fit larger maze

  // Calculate dynamic payout based on time limit
  const calculatePayout = (betAmount, timeLimit) => {
    const timeInSeconds = parseInt(timeLimit) || 0;
    
    // Base payout is 10x, but decreases with longer time limits
    let multiplier = 10;
    
    if (timeInSeconds <= 30) {
      // Very short time (30 seconds or less) - highest reward
      multiplier = 20;
    } else if (timeInSeconds <= 60) {
      // Short time (30-60 seconds) - very high reward
      multiplier = 15;
    } else if (timeInSeconds <= 90) {
      // Medium-short time (60-90 seconds) - high reward
      multiplier = 12;
    } else if (timeInSeconds <= 120) {
      // Medium time (90-120 seconds) - standard reward
      multiplier = 10;
    } else if (timeInSeconds <= 150) {
      // Medium-long time (120-150 seconds) - reduced reward
      multiplier = 8;
    } else if (timeInSeconds <= 180) {
      // Long time (150-180 seconds) - low reward
      multiplier = 6;
    } else {
      // Default for any other time
      multiplier = 6;
    }
    
    const bet = parseFloat(betAmount) || 0;
    return bet * multiplier;
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      const result = await contractManager.initialize();
      setProvider(result.provider);
      setSigner(result.signer);
      setAccount(result.account);
      setContract(result.contract);
      setWalletConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert(`Error connecting wallet: ${error.message}`);
    }
  };

  // Generate proper maze using recursive backtracking
  const generateMaze = useCallback(() => {
    const newMaze = Array(MAZE_SIZE).fill().map(() => Array(MAZE_SIZE).fill(1));
    
    // Initialize with walls
    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        if (x % 2 === 0 || y % 2 === 0) {
          newMaze[y][x] = 1; // Wall
        } else {
          newMaze[y][x] = 0; // Path
        }
      }
    }
    
    // Recursive backtracking maze generation
    const stack = [{ x: 1, y: 1 }];
    const visited = new Set();
    visited.add('1,1');
    
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];
      
      // Check all 4 directions
      const directions = [
        { dx: 0, dy: -2 }, // up
        { dx: 2, dy: 0 },  // right
        { dx: 0, dy: 2 },  // down
        { dx: -2, dy: 0 }  // left
      ];
      
      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;
        
        if (nx > 0 && nx < MAZE_SIZE - 1 && ny > 0 && ny < MAZE_SIZE - 1 && 
            !visited.has(key) && newMaze[ny][nx] === 0) {
          neighbors.push({ x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2 });
        }
      }
      
      if (neighbors.length > 0) {
        // Randomly select a neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const wallX = current.x + next.dx;
        const wallY = current.y + next.dy;
        
        newMaze[wallY][wallX] = 0; // Remove wall
        newMaze[next.y][next.x] = 0; // Mark as path
        
        visited.add(`${next.x},${next.y}`);
        stack.push({ x: next.x, y: next.y });
      } else {
        stack.pop();
      }
    }
    
    // Add some strategic dead ends and misleading paths
    for (let i = 0; i < MAZE_SIZE * 2; i++) {
      const x = Math.floor(Math.random() * (MAZE_SIZE - 4)) + 2;
      const y = Math.floor(Math.random() * (MAZE_SIZE - 4)) + 2;
      
      if (newMaze[y][x] === 0) {
        // Create a short dead end path
        const directions = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, 
          { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];
        
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const newX = x + dir.dx;
        const newY = y + dir.dy;
        
        if (newX > 0 && newX < MAZE_SIZE - 1 && newY > 0 && newY < MAZE_SIZE - 1 &&
            newMaze[newY][newX] === 1) {
          newMaze[newY][newX] = 0;
        }
      }
    }
    
    // Set start and end points
    newMaze[1][1] = 0; // Start
    newMaze[MAZE_SIZE - 2][MAZE_SIZE - 2] = 2; // End
    
    return newMaze;
  }, []);

  // Initialize new game
  const startNewGame = useCallback(() => {
    const newMaze = generateMaze();
    setMaze(newMaze);
    setPlayerPos({ x: 1, y: 1 });
    setGameState('betting');
    setTimeLeft(0);
    setStartTime(0);
  }, [generateMaze]);

  // Start the actual game after betting
  const startGame = async () => {
    if (!betAmount || !timeBet || !walletConnected) {
      alert('Please enter bet amount, time, and connect wallet!');
      return;
    }
    
    try {
      // Place bet on contract
      await contractManager.placeBet(betAmount);
      
      const timeInSeconds = parseInt(timeBet); // Time is already in seconds
      setTimeLeft(timeInSeconds);
      setStartTime(Date.now());
      setGameState('playing');
    } catch (error) {
      console.error('Error placing bet:', error);
      alert(`Error placing bet: ${error.message}`);
    }
  };

  // Handle player movement
  const movePlayer = useCallback(async (dx, dy) => {
    if (gameState !== 'playing') return;
    
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    
    if (newX >= 0 && newX < MAZE_SIZE && newY >= 0 && newY < MAZE_SIZE) {
      if (maze[newY][newX] !== 1) {
        setPlayerPos({ x: newX, y: newY });
        
        // Check if reached end
        if (maze[newY][newX] === 2) {
          const timeUsed = Math.floor((Date.now() - startTime) / 1000);
          const timeBetSeconds = parseInt(timeBet);
          
          if (timeUsed <= timeBetSeconds) {
            setGameState('won');
            const payout = calculatePayout(betAmount, timeBetSeconds);
            
            try {
              // Cashout winnings from contract
              await contractManager.cashout(payout.toFixed(4));
              alert(`Congratulations! You won ${payout.toFixed(4)} MON!`);
            } catch (error) {
              console.error('Error cashing out:', error);
              alert(`You won ${payout.toFixed(4)} MON, but there was an error processing the payout: ${error.message}`);
            }
          } else {
            setGameState('lost');
            alert("Time's up! You lost your bet.");
          }
        }
      }
    }
  }, [playerPos, maze, gameState, startTime, timeBet, betAmount]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = async (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          await movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
          await movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
          await movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
          await movePlayer(1, 0);
          break;
        default:
          break;
      }
    };

    if (gameState === 'playing') {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [movePlayer, gameState]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('lost');
            alert("Time's up! You lost your bet.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  // Initialize game on mount
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            MAZE GAME
          </h1>
          <div className="text-sm text-gray-400">Don't refresh page</div>
        </div>

        <div className="flex gap-6 px-6">
          {/* Left Panel - Game Controls */}
          <div className="w-1/3">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">Game Setup</h2>
              
              {/* Game Instructions */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-bold mb-3 text-cyan-400">🎮 How to Play</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Navigate from the blue dot to the green square</li>
                  <li>• Use arrow keys or WASD to move</li>
                  <li>• Complete the maze within your time limit</li>
                  <li>• Choose your risk level and potential reward:</li>
                  <li className="ml-4">  🟢 20-30s = 20x reward (Extreme Risk)</li>
                  <li className="ml-4">  🟠 30-60s = 15x reward (High Risk)</li>
                  <li className="ml-4">  🟡 60-90s = 12x reward (Medium Risk)</li>
                  <li className="ml-4">  🔵 90-120s = 10x reward (Standard)</li>
                  <li className="ml-4">  🟣 120-150s = 8x reward (Low Risk)</li>
                  <li className="ml-4">  🟢 150-180s = 6x reward (Safe)</li>
                  <li>• Each maze is randomly generated for fairness</li>
                </ul>
              </div>

              {/* Time Options and Rewards */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-bold mb-3 text-cyan-400">⏱️ Choose Your Challenge</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-red-900/50 rounded border border-red-500">
                    <div className="font-bold text-red-400">20-30s</div>
                    <div className="text-green-400">20x Reward</div>
                    <div className="text-xs text-gray-400">Extreme Risk</div>
                  </div>
                  <div className="p-2 bg-orange-900/50 rounded border border-orange-500">
                    <div className="font-bold text-orange-400">30-60s</div>
                    <div className="text-green-400">15x Reward</div>
                    <div className="text-xs text-gray-400">High Risk</div>
                  </div>
                  <div className="p-2 bg-yellow-900/50 rounded border border-yellow-500">
                    <div className="font-bold text-yellow-400">60-90s</div>
                    <div className="text-green-400">12x Reward</div>
                    <div className="text-xs text-gray-400">Medium Risk</div>
                  </div>
                  <div className="p-2 bg-blue-900/50 rounded border border-blue-500">
                    <div className="font-bold text-blue-400">90-120s</div>
                    <div className="text-green-400">10x Reward</div>
                    <div className="text-xs text-gray-400">Standard</div>
                  </div>
                  <div className="p-2 bg-purple-900/50 rounded border border-purple-500">
                    <div className="font-bold text-purple-400">120-150s</div>
                    <div className="text-green-400">8x Reward</div>
                    <div className="text-xs text-gray-400">Low Risk</div>
                  </div>
                  <div className="p-2 bg-green-900/50 rounded border border-green-500">
                    <div className="font-bold text-green-400">150-180s</div>
                    <div className="text-green-400">6x Reward</div>
                    <div className="text-xs text-gray-400">Safe</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setTimeBet('25')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '25' ? 'bg-red-700 border-2 border-red-400' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    25s (20x)
                  </button>
                  <button 
                    onClick={() => setTimeBet('45')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '45' ? 'bg-orange-700 border-2 border-orange-400' : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    45s (15x)
                  </button>
                  <button 
                    onClick={() => setTimeBet('75')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '75' ? 'bg-yellow-700 border-2 border-yellow-400' : 'bg-yellow-600 hover:bg-yellow-700'
                    }`}
                  >
                    75s (12x)
                  </button>
                  <button 
                    onClick={() => setTimeBet('105')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '105' ? 'bg-blue-700 border-2 border-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    105s (10x)
                  </button>
                  <button 
                    onClick={() => setTimeBet('135')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '135' ? 'bg-purple-700 border-2 border-purple-400' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    135s (8x)
                  </button>
                  <button 
                    onClick={() => setTimeBet('165')}
                    className={`p-2 text-white text-xs rounded font-bold transition-colors ${
                      timeBet === '165' ? 'bg-green-700 border-2 border-green-400' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    165s (6x)
                  </button>
                </div>
              </div>
              
              {/* Wallet Connection */}
              <div className="mb-6">
                {!walletConnected ? (
                  <button 
                    onClick={connectWallet} 
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 px-4 rounded-lg font-bold hover:opacity-80 transition-opacity"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <div className="text-green-400 font-bold text-center py-3">
                    ✅ Wallet Connected
                  </div>
                )}
              </div>

              {gameState === 'betting' && (
                <>
                  {/* Bet Amount */}
                  <div className="mb-4">
                    <label className="block text-white mb-2">Bet Amount (MON)</label>
                    <input
                      type="number"
                      placeholder="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      step="0.001"
                      min="0.001"
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none"
                    />
                  </div>

                  {/* Time Limit */}
                  <div className="mb-6">
                    <label className="block text-white mb-2">Time Limit (seconds)</label>
                    <input
                      type="number"
                      placeholder="60"
                      value={timeBet}
                      onChange={(e) => setTimeBet(e.target.value)}
                      min="20"
                      max="180"
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border-none outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Min: 20s, Max: 180s (3 minutes)</p>
                    
                    {/* Show potential reward */}
                    {betAmount && timeBet && (
                      <div className="mt-3 p-3 bg-gray-600 rounded text-center">
                        <p className="text-sm text-gray-300">Potential Reward:</p>
                        <p className="text-lg font-bold text-green-400">
                          {calculatePayout(betAmount, parseInt(timeBet)).toFixed(4)} MON
                        </p>
                        <p className="text-xs text-gray-400">
                          ({calculatePayout(betAmount, parseInt(timeBet)) / parseFloat(betAmount)}x your bet)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Start Game Button */}
                  <button 
                    onClick={startGame} 
                    disabled={!walletConnected}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 px-4 rounded-lg font-bold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Game
                  </button>
                </>
              )}

              {gameState === 'playing' && (
                <>
                  {/* Game Stats */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">Game Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700 p-3 rounded text-center">
                        <div className="text-white text-sm">Time Left</div>
                        <div className="text-2xl font-bold text-cyan-400">{formatTime(timeLeft)}</div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded text-center">
                        <div className="text-white text-sm">Bet Amount</div>
                        <div className="text-2xl font-bold text-cyan-400">{betAmount} MON</div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3">Controls</h3>
                    <p className="text-gray-300 text-sm mb-3">Use arrow keys or WASD to move</p>
                    <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto">
                      <div></div>
                      <button 
                        onClick={() => movePlayer(0, -1)}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold text-xl transition-colors"
                      >
                        ↑
                      </button>
                      <div></div>
                      <button 
                        onClick={() => movePlayer(-1, 0)}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold text-xl transition-colors"
                      >
                        ←
                      </button>
                      <div className="bg-gray-700 w-10 h-10 rounded flex items-center justify-center">
                        <div className="w-4 h-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"></div>
                      </div>
                      <button 
                        onClick={() => movePlayer(1, 0)}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold text-xl transition-colors"
                      >
                        →
                      </button>
                      <div></div>
                      <button 
                        onClick={() => movePlayer(0, 1)}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold text-xl transition-colors"
                      >
                        ↓
                      </button>
                      <div></div>
                    </div>
                  </div>
                </>
              )}

              {(gameState === 'won' || gameState === 'lost') && (
                <div className="text-center">
                  {gameState === 'won' ? (
                    <>
                      <Trophy className="mx-auto text-yellow-400 mb-4" size={60} />
                      <h3 className="text-2xl font-bold text-green-400 mb-2">🎉 You Won!</h3>
                      <p className="text-lg text-green-400 mb-4">
                        Prize: {calculatePayout(betAmount, parseInt(timeBet)).toFixed(4)} MON
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-red-400 mb-2">💀 Game Over</h3>
                      <p className="text-gray-300 mb-4">Better luck next time!</p>
                    </>
                  )}
                  
                  <button 
                    onClick={startNewGame} 
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 px-4 rounded-lg font-bold hover:opacity-80 transition-opacity"
                  >
                    New Game
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Maze */}
          <div className="w-2/3">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg h-full flex items-center justify-center">
              {gameState === 'betting' ? (
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-xl font-bold mb-2">Ready to Play?</h3>
                  <p className="text-sm">Connect your wallet and place your bet to start the maze challenge!</p>
                </div>
              ) : (
                <div className="maze-grid">
                  {maze.map((row, y) => (
                    <div key={y} className="maze-row">
                      {row.map((cell, x) => (
                        <div
                          key={x}
                          className={`maze-cell ${
                            cell === 1 ? 'wall' :
                            cell === 2 ? 'end' :
                            playerPos.x === x && playerPos.y === y ? 'player' : 'path'
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MazeGame;
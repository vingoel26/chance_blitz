"use client";
import React, { useState, useRef, useEffect } from "react";
// import "./sudoku-bet.css"; // If using CSS from prior steps

// Font import suggestion (if not in CSS):
// Place in global css: @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

const demoSudokus = {
  easy: {
    puzzle: [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9],
    ],
    solution: [
      [5,3,4,6,7,8,9,1,2],
      [6,7,2,1,9,5,3,4,8],
      [1,9,8,3,4,2,5,6,7],
      [8,5,9,7,6,1,4,2,3],
      [4,2,6,8,5,3,7,9,1],
      [7,1,3,9,2,4,8,5,6],
      [9,6,1,5,3,7,2,8,4],
      [2,8,7,4,1,9,6,3,5],
      [3,4,5,2,8,6,1,7,9],
    ],
  },
  medium: {
    puzzle: [
      [0,0,0,0,0,0,2,0,0],
      [0,8,0,0,0,7,0,9,0],
      [6,0,2,0,0,0,5,0,0],
      [0,7,0,0,6,0,0,0,0],
      [0,0,0,9,0,1,0,0,0],
      [0,0,0,0,2,0,0,4,0],
      [0,0,5,0,0,0,6,0,3],
      [0,9,0,4,0,0,0,7,0],
      [0,0,6,0,0,0,0,0,0],
    ],
    solution: [
      [5,9,7,6,1,3,2,8,4],
      [2,8,3,5,4,7,1,9,6],
      [6,1,2,8,9,4,5,3,7],
      [1,7,4,2,6,5,3,8,9],
      [3,5,8,9,7,1,4,6,2],
      [9,6,2,3,2,8,7,4,5],
      [4,2,5,7,8,9,6,1,3],
      [8,9,1,4,3,6,2,7,5],
      [7,3,6,1,5,2,8,9,4],
    ],
  },
  hard: { // Sparse board: swap for generator for max difficulty!
    puzzle: [
      [0,0,0,0,0,0,0,1,2],
      [0,0,0,0,0,0,0,0,0],
      [0,0,0,3,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0],
      [0,0,0,0,5,0,4,0,0],
      [0,0,5,0,0,0,0,0,0],
      [0,0,0,0,0,0,2,0,0],
      [0,8,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0],
    ],
    solution: [
      [3,5,9,4,7,8,6,1,2],
      [4,2,1,5,6,9,3,7,8],
      [7,6,8,3,2,1,9,5,4],
      [2,9,4,7,3,5,8,6,1],
      [8,1,6,2,5,4,7,3,9],
      [6,7,5,8,1,2,1,4,3],
      [5,3,7,1,8,6,2,9,1],
      [9,8,2,6,4,3,5,2,7],
      [1,4,3,9,2,7,5,8,6],
    ]
  },
  expert: { // Extremely sparse, for demo
    puzzle: [
      [0,0,0,0,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,0],
      [0,2,0,0,0,0,3,0,0],
      [0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,4,0,0,0],
      [0,0,0,0,0,0,0,7,0],
      [0,0,0,0,0,0,0,0,0],
      [4,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0],
    ],
    solution: [
      [7,3,4,8,2,5,6,9,1],
      [6,5,1,7,3,9,8,4,2],
      [8,2,9,4,6,1,3,5,7],
      [9,1,2,5,7,8,4,6,3],
      [5,7,3,9,1,4,2,8,6],
      [2,4,6,3,8,6,9,7,5],
      [3,8,5,6,4,2,1,2,9],
      [4,6,7,1,9,3,5,3,8],
      [1,9,8,2,5,7,7,1,4]
    ]
  },
  lord: { // Near minimal, demo only!
    puzzle: [
      [0,0,0,0,0,0,0,0,0],
      [0,0,1,0,0,0,0,0,0],
      [0,0,0,0,0,2,0,0,0],
      [0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,4,0],
      [0,0,0,1,0,0,3,0,0],
      [0,0,0,0,0,0,0,5,0],
      [0,0,0,0,0,0,0,0,0],
      [0,0,0,0,8,0,0,0,0],
    ],
    solution: [
      [5,1,6,7,4,9,8,3,2],
      [3,7,1,8,2,5,6,9,4],
      [4,9,8,3,1,2,5,7,6],
      [8,6,3,2,9,4,7,1,5],
      [1,5,2,6,3,7,9,4,8],
      [6,8,9,1,5,8,3,2,7],
      [7,2,4,9,6,3,1,5,8],
      [9,3,5,4,7,1,2,6,3],
      [2,4,7,5,8,6,4,8,1]
    ]
  }
};

const difficultyOptions = [
  { label: "Easy", key: "easy" },
  { label: "Medium", key: "medium" },
  { label: "Hard", key: "hard" },
  { label: "Expert", key: "expert" },
  { label: "Lord", key: "lord" },
];

const timeOptions = [
  { label: "2 min", value: 2 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
];

const multipliers = {
    easy:   { 2: 2,  5: 1.5, 10: 1.2, 15: 1.1, 20: 1.05 },
    medium: { 2: 3,  5: 2,   10: 1.5, 15: 1.2, 20: 1.1 },
    hard:   { 2: 5,  5: 3,   10: 2,   15: 1.5, 20: 1.2 },
    expert: { 2: 10, 5: 5,   10: 3,   15: 2,   20: 1.5 },
    lord:   { 2: 25, 5: 15,  10: 7,   15: 3,   20: 2 },
  };

function getMultiplier(difficulty, minutes) {
  if (!multipliers[difficulty]) return 1;
  return multipliers[difficulty][minutes] || 1;
}

const SudokuBetGame = () => {
  // Game states
  const [difficulty, setDifficulty] = useState("easy");
  const [timerOption, setTimerOption] = useState(5);
  const [betAmount, setBetAmount] = useState("");
  const [board, setBoard] = useState([]);
  const [sudoku, setSudoku] = useState({ puzzle: [], solution: [] });
  const [gameState, setGameState] = useState("ready");
  const [timer, setTimer] = useState(timerOption * 60);
  const [isPencil, setIsPencil] = useState(false);
  const [selectedCell, setSelectedCell] = useState([-1, -1]);
  const [pencilMarks, setPencilMarks] = useState([]);
  const timerRef = useRef();

  function getSudokuSet(diff) {
    return demoSudokus[diff] || demoSudokus["medium"];
  }

  // Start/reset game
  const startGame = () => {
    if (!betAmount || Number(betAmount) <= 0) {
      alert("Please enter a valid bet amount.");
      return;
    }
    const sset = getSudokuSet(difficulty);
    setSudoku(sset);
    setBoard(sset.puzzle.map(row => row.map(val => (val === 0 ? "" : val))));
    setPencilMarks(Array(9).fill().map(() => Array(9).fill().map(() => [])));
    setTimer(timerOption * 60);
    setGameState("playing");
    if(timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState("lose");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => setTimer(timerOption * 60), [timerOption]);
  useEffect(() => (() => { if(timerRef.current) clearInterval(timerRef.current); }), []);
  useEffect(() => {
    if (gameState !== "playing") return;
    if (board.length && sudoku.solution.length) {
      const current = board.map(row => row.map(cell =>
        typeof cell === "number" ? cell : (parseInt(cell, 10) || 0)
      ));
      const solved = JSON.stringify(current) === JSON.stringify(sudoku.solution);
      if (solved) {
        clearInterval(timerRef.current);
        setGameState("win");
      }
    }
  }, [board]); // eslint-disable-line

  function handleCellInput(r, c, v) {
    const val = v.replace(/[^1-9]/g, "");
    // Only allow if the cell is NOT prefilled
    if (sudoku.puzzle[r][c] !== 0) return;
    setSelectedCell([r, c]);
    if (isPencil) {
      setPencilMarks(prev => {
        const newMarks = prev.map(row => row.map(cell => [...cell]));
        // If already exists, remove; else add.
        if (val && !newMarks[r][c].includes(val)) {
          newMarks[r][c].push(val);
        } else if (val && newMarks[r][c].includes(val)) {
          newMarks[r][c] = newMarks[r][c].filter(x => x !== val);
        }
        return newMarks;
      });
    } else {
      setBoard(prev => {
        const updated = prev.map(row => [...row]);
        updated[r][c] = val;
        return updated;
      });
      // Clear pencil marks if a value is entered
      if (val) {
        setPencilMarks(prev => {
          const newMarks = prev.map(row => row.map(cell => [...cell]));
          newMarks[r][c] = [];
          return newMarks;
        });
      }
    }
  }

  function handleErase() {
    const [r, c] = selectedCell;
    if (r === -1 || c === -1 || sudoku.puzzle[r][c] !== 0) return;
    setBoard(prev => {
      const updated = prev.map(row => [...row]);
      updated[r][c] = "";
      return updated;
    });
    setPencilMarks(prev => {
      const newMarks = prev.map(row => row.map(cell => [...cell]));
      newMarks[r][c] = [];
      return newMarks;
    });
  }

  const multiplier = getMultiplier(difficulty, timerOption);
  const payout = (Number(betAmount) * multiplier).toFixed(2);
  const mm = String(Math.floor(timer / 60));
  const ss = String(timer % 60).padStart(2, "0");
  const timerText = mm + ":" + ss;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600" style={{fontFamily:"'JetBrains Mono', monospace"}}>SUDOKU BETTING</h1>
          <div className="text-sm text-gray-400">Don&apos;t refresh page</div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel */}
          <div>
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <h3 className="text-xl font-bold mb-6 text-gray-300">Game Setup</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Difficulty</label>
                <select
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  value={difficulty}
                  onChange={e=>setDifficulty(e.target.value)}
                  disabled={gameState==="playing"}
                >
                  {difficultyOptions.map(opt=>(
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Timer</label>
                <select
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  value={timerOption}
                  onChange={e=>setTimerOption(Number(e.target.value))}
                  disabled={gameState==="playing"}
                >
                  {timeOptions.map(o=>(
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-1">Bet Amount</label>
                <input
                  type="number"
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  value={betAmount}
                  disabled={gameState==="playing"}
                  min="0"
                  step="any"
                  placeholder="MON"
                  onChange={e=>setBetAmount(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <span className="text-sm text-gray-400">
                  <b>Reward:</b> {betAmount ? payout : "--"} MON<br/>
                  <span className="text-xs text-gray-400">(Mult: ×{multiplier})</span>
                </span>
              </div>
              {gameState==="ready"&&
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-all mt-2"
                >Start Game</button>
              }
              {gameState==="playing"&&
                <div className="w-full text-center bg-gray-900 border border-blue-600 rounded-lg py-3 my-2 font-mono text-2xl">
                  {timerText}
                </div>
              }
              {(gameState==="win"||gameState==="lose")&&
                <button
                  onClick={()=>{
                    setGameState("ready");
                    setTimer(timerOption * 60);
                    setBetAmount("");
                    setSudoku({ puzzle: [], solution: [] });
                    setBoard([]);
                    setPencilMarks([]);
                    setSelectedCell([-1, -1]);
                  }}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 rounded-lg shadow mt-2"
                >Play Again</button>
              }
              <div className="mt-6 border-t border-gray-700 pt-4 space-y-1">
                <div className="text-sm text-gray-300"><b>Payout (if win):</b> {betAmount?payout:"--"} MON</div>
                <div className="text-sm text-gray-300">Difficulty: {difficulty.charAt(0).toUpperCase()+difficulty.slice(1)}</div>
                <div className="text-sm text-gray-300">Timer: {timerOption} minutes</div>
                <div className="text-xs text-gray-400">Higher difficulty and lower time gives higher rewards!</div>
              </div>
            </div>
          </div>
          {/* Center panel (Sudoku) */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              {/* Controls: Pencil, Normal, Erase */}
              {gameState==="playing" && (
                <div style={{display:"flex", gap:"12px", marginBottom:"1rem", justifyContent: "center"}}>
                  <button 
                    onClick={() => setIsPencil(false)} 
                    className={`px-4 py-1 rounded shadow border ${!isPencil ? "bg-blue-700 text-white" : "bg-gray-600 text-gray-200"}`}
                  >Normal</button>
                  <button 
                    onClick={() => setIsPencil(true)} 
                    className={`px-4 py-1 rounded shadow border ${isPencil ? "bg-blue-700 text-white" : "bg-gray-600 text-gray-200"}`}
                  >✏️ Pencil</button>
                  <button
                    onClick={handleErase}
                    className="bg-gray-700 border text-white px-4 py-1 rounded shadow"
                  >Erase</button>
                </div>
              )}
              <div className="mb-4 font-bold text-xl text-blue-300" style={{fontFamily:"'JetBrains Mono', monospace"}}>Complete the Sudoku!</div>
              {/* SUDOKU GRID */}
              {gameState === "playing" && (
                <div className="w-full flex items-center justify-center mt-3">
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(9, 35px)",
                    gridTemplateRows: "repeat(9, 35px)",
                    gap: "2px",
                    border: "2px solid #aaa",
                    background: "#262626",
                  }}>
                    {board.length === 9 && board.map((row, r) =>
                      row.map((cell, c) => {
                        const prefilled = sudoku.puzzle[r][c] !== 0;
                        // Thicker borders for 3x3 blocks:
                        const style = {
                          border: "1px solid #444",
                          background: prefilled 
                            ? "#2b3c53" 
                            : (selectedCell[0] === r && selectedCell[1] === c ? "#213548":"#3b414c"),
                          color: prefilled
                            ? "#89c2fc"
                            : "#fff",
                          fontWeight: prefilled ? 600 : 400,
                          textAlign: "center",
                          fontFamily: "'JetBrains Mono', monospace",
                          borderTopWidth: r % 3 === 0 ? 3 : 1,
                          borderLeftWidth: c % 3 === 0 ? 3 : 1,
                          borderBottomWidth: r === 8 ? 3 : 1,
                          borderRightWidth: c === 8 ? 3 : 1,
                          borderColor: "#5e5e76",
                          width: 35,
                          height: 35,
                          fontSize: 19,
                          outline: "none",
                          position: "relative",
                          cursor: prefilled ? "default" : "pointer"
                        };
                        return prefilled ? (
                          <div 
                            key={r+"-"+c}
                            style={style}
                          >{cell}</div>
                        ) : (
                          <div key={r+"-"+c} style={style} onClick={()=>setSelectedCell([r,c])}>
                            <input
                              style={{
                                width: "100%",
                                height: "100%",
                                position: "absolute",
                                top: 0,
                                left: 0,
                                background: "transparent",
                                color: isPencil ? "#4cc9db" : "#fff",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 400,
                                fontSize: 19,
                                textAlign: "center",
                                border: "none",
                                outline: "none",
                                zIndex: 2,
                                padding: 0,
                              }}
                              disabled={gameState!=="playing"}
                              value={cell}
                              maxLength={1}
                              tabIndex={r*9+c+1}
                              onChange={e => handleCellInput(r, c, e.target.value)}
                              onFocus={() => setSelectedCell([r, c])}
                              autoComplete="off"
                            />
                            {pencilMarks[r] && pencilMarks[r][c] && pencilMarks[r][c].length > 0 && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 3, left: 5,
                                  fontSize: "0.7em",
                                  color: "#99c9ff",
                                  fontFamily: "'JetBrains Mono', monospace",
                                  pointerEvents: "none",
                                  zIndex: 3,
                                  opacity: 0.9
                                }}
                              >
                                {pencilMarks[r][c].sort().join(' ')}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {(gameState==="win"||gameState==="lose")&&
                <div className="flex flex-col items-center mt-8">
                  {gameState==="win" && (
                    <>
                      <div className="text-3xl font-bold text-green-400 animate-pulse mb-2" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        🎉 Success!
                      </div>
                      <div className="text-xl text-green-200">
                        {payout} MON won!
                      </div>
                    </>
                  )}
                  {gameState==="lose" && (
                    <>
                      <div className="text-3xl font-bold text-red-400 animate-pulse mb-2" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                        Time's up!
                      </div>
                      <div className="text-xl text-red-200">
                        You lost your bet.
                      </div>
                    </>
                  )}
                </div>
              }
              {gameState==="ready" &&
                <div className="text-gray-400 mt-6 text-lg text-center" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                  <p>1. Choose your <b>difficulty</b>, <b>timer</b>, and <b>bet</b> above.<br/></p>
                  <p>2. The <b>harder</b> and <b>faster</b> you play, the more you win!</p>
                  <p>3. When you finish Sudoku before time runs out, get <b>bet × multiplier</b> as reward.</p>
                  <p>4. <i>Wrong answer, or timeout, means losing your bet.</i></p>
                  <p style={{fontSize:"1rem", color:"#8ef", marginTop:12}}>Use <b>Pencil</b> to mark candidates in cells.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SudokuBetGame;

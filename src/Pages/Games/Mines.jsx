"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./mines.css";
import "./globals.css";
import Navbar from "../navbar";
import MineSelection from "./components/ui/selection";
import { cn } from "./components/utils/cn";
import { Spotlight } from "./components/ui/Spotlight";
import { ethers } from "ethers";
import contractABI from "../../contract_data/Mines.json";
import contractAddress from "../../contract_data/Mines-address.json";
import { switchToMonadNetwork, isConnectedToMonad } from "../../contract_data/monad-config";

// These utility functions can remain outside the component
const factorial = (n) => {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

const combinations = (n, k) => {
  if (k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
};

const getMultiplier = (safePicks, totalTiles = 25, bombs = 10, houseEdge = 0.01) => {
  if(safePicks === 0){
    return 0;
  }
  const totalComb = combinations(totalTiles, safePicks);
  const safeComb = combinations(totalTiles - bombs, safePicks);
  const rawMultiplier = totalComb / safeComb;
  return (rawMultiplier * (1 - houseEdge)).toFixed(2);
};

const MineGamblingGame = () => {
  const router = useRouter();
  
  // All useState hooks moved inside the component function
  const [value, setValue] = useState(""); 
  const [retrievedValue, setRetrievedValue] = useState(null);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [userBalance, setUserBalance] = useState(null);
  const [clickedBoxes, setClickedBoxes] = useState(Array(25).fill(false));
  const [isGameOver, setIsGameOver] = useState(false);
  const [bombs, setBombs] = useState([]);
  const [selectedMines, setSelectedMines] = useState({
    id: 10,
    name: "10 Mines",
  });
  const [betAmount, setBetAmount] = useState(0);
  const [gameState, setGameState] = useState("ready"); // ready, playing, gameOver, cashout
  const [lastWin, setLastWin] = useState(null);
  const [hoverTile, setHoverTile] = useState(null);
  
  const initializeEthers = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }
    
    try {
      // Check if connected to Monad network
      const isMonad = await isConnectedToMonad();
      if (!isMonad) {
        const switchNetwork = confirm("You're not connected to Monad network. Would you like to switch to Monad Testnet?");
        if (switchNetwork) {
          await switchToMonadNetwork('testnet');
        } else {
          alert("Please connect to Monad network to play this game");
          return;
        }
      }

      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _contract = new ethers.Contract(contractAddress.address, contractABI.abi, _signer);

      setProvider(_provider);
      setSigner(_signer);
      setContract(_contract);

      const accounts = await _provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (error) {
      console.error("Error initializing ethers:", error);
    }
  };
  
  const getDiamondCount = () => {
    if (isGameOver) return 0;
    return clickedBoxes.filter((clicked, index) => clicked && !bombs.includes(index)).length;
  };
  
  const sendtocontract = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to place a bet.");
      return;
    }
  
    try {
      if (!contract) {
        await initializeEthers();
      }
      
      const tx = await contract.bet({
        value: ethers.parseEther(betAmount.toString()),
        gasLimit: 200_000n, // using BigInt syntax as required in ethers v6
      });
  
      await tx.wait(); // wait for transaction to be mined
      console.log("Bet placed successfully!");
    } catch (err) {
      console.error("Bet failed:", err);
      alert("Bet transaction failed. Please try again.");
    }
  };
  
  // Add cashout functionality that connects to the Solidity contract
  const cashoutFromContract = async (amount) => {
    if (!window.ethereum || !contract || !account) {
      alert("MetaMask not connected properly.");
      return false;
    }
    
    try {
      const amountWei = ethers.parseEther(amount.toString());
      const tx = await contract.sendEtherFromContract(account, amountWei);
      await tx.wait();
      console.log("Cashout successful!");
      return true;
    } catch (err) {
      console.error("Cashout failed:", err);
      alert("Cashout transaction failed. Please try again.");
      return false;
    }
  };
  
  const placeBombs = () => {
    const bombIndices = [];
    while (bombIndices.length < selectedMines.id) {
      const index = Math.floor(Math.random() * 25);
      if (!bombIndices.includes(index)) {
        bombIndices.push(index);
      }
    }
    setBombs(bombIndices);
  };

  useEffect(() => {
    placeBombs();
  }, [selectedMines]);

  const handleClick = (index) => {
    if (isGameOver || clickedBoxes[index] || gameState === "ready") return;
    
    const newClickedBoxes = [...clickedBoxes];
    newClickedBoxes[index] = true;
    setClickedBoxes(newClickedBoxes);

    if (bombs.includes(index)) {
      setIsGameOver(true);
      setGameState("gameOver");
    }
  };

  const resetGame = () => {
    setClickedBoxes(Array(25).fill(false));
    setIsGameOver(false);
    setGameState("ready");
    placeBombs();
  };
  
  const startGame = async () => {
    if (betAmount <= 0) {
      alert("Please enter a valid bet amount");
      return;
    }
    try {
      await sendtocontract(); // Call smart contract bet() function
      resetGame();
      setGameState("playing");
    } catch (err) {
      console.error("Game start failed:", err);
    }
  };
  
  const cashOut = async () => {
    const winAmount = (betAmount * multi).toFixed(2);
    
    try {
      const success = await cashoutFromContract(winAmount);
      if (success) {
        setLastWin(winAmount);
        setGameState("cashout");
        setTimeout(() => {
          resetGame();
        }, 3000);
      }
    } catch (err) {
      console.error("Cashout failed:", err);
    }
  };

  const multi = getMultiplier(getDiamondCount(), 25, selectedMines.id);
  const payout = (betAmount * multi).toFixed(2);
  
  const safeTilesLeft = 25 - selectedMines.id - getDiamondCount();
  const nextMulti = getMultiplier(getDiamondCount() + 1, 25, selectedMines.id);

  useEffect(() => {
    if (window.ethereum) {
      initializeEthers();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/games')} className="flex items-center text-gray-300 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Games
          </button>
          
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            MINES
          </h1>
          
          <div className="text-sm text-gray-400">
            Don't refresh page
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Stats & Controls */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4 text-gray-300">Game Setup</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Select Mines</label>
                  <MineSelection
                    selectedMines={selectedMines}
                    setSelectedMines={setSelectedMines}
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bet Amount</label>
                  <div className="relative flex items-center">
                    
                    <input
                      type="number"
                      placeholder="ETH"
                      id="BetAmt"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={gameState === "playing"}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-colors"
                    />
                  </div>
                </div>
                
                {gameState === "ready" && (
                  <button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200 transform hover:-translate-y-1"
                  >
                    Start Game
                  </button>
                )}
                
                {gameState === "playing" && !isGameOver && (
                  <button
                    onClick={cashOut}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200 transform hover:-translate-y-1"
                  >
                    Cash Out {payout} ETH
                  </button>
                )}
                
                {(gameState === "gameOver" || gameState === "cashout") && (
                  <button
                    onClick={resetGame}
                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200"
                  >
                    Play Again
                  </button>
                )}
              </div>
              
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-bold mb-4 text-gray-300">Game Stats</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Safe Tiles Found</div>
                    <div className="text-2xl font-bold">{getDiamondCount()}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Safe Tiles Left</div>
                    <div className="text-2xl font-bold">{safeTilesLeft}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Current Multiplier</div>
                    <div className="text-2xl font-bold text-green-400">×{multi}</div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Next Multiplier</div>
                    <div className="text-2xl font-bold text-blue-400">×{nextMulti}</div>
                  </div>
                </div>
                
                {lastWin && gameState === "cashout" && (
                  <div className="mt-4 bg-green-900/30 border border-green-600/30 rounded-lg p-4 text-center animate-pulse">
                    <div className="text-sm text-green-400">You won</div>
                    <div className="text-3xl font-bold text-green-400">{lastWin} ETH</div>
                  </div>
                )}
                
                {isGameOver && (
                  <div className="mt-4 bg-red-900/30 border border-red-600/30 rounded-lg p-4 text-center animate-pulse">
                    <div className="text-3xl font-bold text-red-500">BOOM! Game Over</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Game Grid */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <div className="grid grid-cols-5 gap-3">
                {clickedBoxes.map((clicked, index) => (
                  <div
                    key={index}
                    className={`relative aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all duration-200 transform ${
                      clicked 
                        ? bombs.includes(index)
                          ? "bg-red-900/60 border-2 border-red-600"
                          : "bg-green-900/60 border-2 border-green-500" 
                        : "bg-gray-700 hover:bg-gray-600 border-2 border-gray-600"
                    } ${hoverTile === index && !clicked ? "scale-105" : ""}`}
                    onClick={() => handleClick(index)}
                    onMouseEnter={() => setHoverTile(index)}
                    onMouseLeave={() => setHoverTile(null)}
                  >
                    {clicked && bombs.includes(index) && (
                      <div className="animate-bomb-reveal flex items-center justify-center w-full h-full">
                        <img
                          src="https://static.vecteezy.com/system/resources/thumbnails/009/350/665/small_2x/explosive-bomb-black-png.png"
                          alt="bomb"
                          className="w-3/4 h-3/4 object-contain"
                        />
                      </div>
                    )}
                    {clicked && !bombs.includes(index) && (
                      <div className="animate-diamond-reveal flex items-center justify-center w-full h-full">
                        <img
                          src="https://freepngimg.com/thumb/diamond/30147-1-diamond-vector-clip-art-thumb.png"
                          alt="diamond"
                          className="w-3/4 h-3/4 object-contain"
                        />
                      </div>
                    )}
                    {isGameOver && bombs.includes(index) && !clicked && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-50">
                        <img
                          src="https://static.vecteezy.com/system/resources/thumbnails/009/350/665/small_2x/explosive-bomb-black-png.png"
                          alt="bomb"
                          className="w-1/2 h-1/2 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-300">How To Play</h3>
              <div className="text-gray-400 space-y-2">
                <p>1. Select the number of mines and enter your bet amount.</p>
                <p>2. Click "Start Game" to begin.</p>
                <p>3. Click on tiles to reveal diamonds (safe) or bombs (game over).</p>
                <p>4. Each safe tile increases your multiplier.</p>
                <p>5. Cash out anytime before hitting a bomb to collect your winnings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add these CSS animations to your mines.css file */}
      <style jsx>{`
        @keyframes bomb-reveal {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes diamond-reveal {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        .animate-bomb-reveal {
          animation: bomb-reveal 0.5s ease-out forwards;
        }
        
        .animate-diamond-reveal {
          animation: diamond-reveal 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MineGamblingGame;
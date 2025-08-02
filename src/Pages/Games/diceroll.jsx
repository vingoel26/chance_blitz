"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ethers } from "ethers"
import { useRouter } from "next/navigation"
import contractABI from "../../contract_data/Mines.json";
import contractAddress from "../../contract_data/Mines-address.json";
import { switchToMonadNetwork, isConnectedToMonad } from "../../contract_data/monad-config";
import "./dice.css";

const DiceGame = () => {
  const router = useRouter();
  
  // Game states
  const [bet, setBet] = useState(0.1) // Bet in Monad
  const [isRolling, setIsRolling] = useState(false)
  const [dice1, setDice1] = useState(1)
  const [dice2, setDice2] = useState(1)
  const [result, setResult] = useState(null)
  const [showCongrats, setShowCongrats] = useState(false)
  const [prediction, setPrediction] = useState("greater") // "less", "equal", "greater"
  const [gameHistory, setGameHistory] = useState([])

  // Contract integration states
  const [account, setAccount] = useState(null)
  const [contract, setContract] = useState(null)
  const [balance, setBalance] = useState(0)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)

  // Connect to MetaMask and initialize contract
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
      const address = accounts[0];
      setAccount(address);
      
      // Get balance
      const balance = await _provider.getBalance(address);
      setBalance(parseFloat(ethers.formatEther(balance)));
    } catch (error) {
      console.error("Error initializing ethers:", error);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      initializeEthers();
    }
  }, []);

  // Place bet via contract
  const placeBet = async () => {
    if (!window.ethereum || !contract) {
      alert("Please connect MetaMask and ensure you're on Monad network!");
      return false;
    }

    try {
      if (!contract) {
        await initializeEthers();
      }
      
      const tx = await contract.bet({
        value: ethers.parseEther(bet.toString()),
        gasLimit: 200_000n,
      });
      
      await tx.wait();
      console.log("Bet placed successfully!");
      return true;
    } catch (err) {
      console.error("Bet failed:", err);
      alert("Bet transaction failed. Please try again.");
      return false;
    }
  };

  // Cash out function
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

  // Dice rolling animation
  const rollDice = async () => {
    if (isRolling || bet <= 0) return
    
    // Place bet via contract
    const betSuccess = await placeBet();
    if (!betSuccess) return;

    setIsRolling(true)
    setResult(null)
    setShowCongrats(false)

    // Animate dice rolling
    const rollDuration = 2000
    const rollInterval = 100
    let rollCount = 0
    const maxRolls = rollDuration / rollInterval

    const rollAnimation = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1)
      setDice2(Math.floor(Math.random() * 6) + 1)
      rollCount++

      if (rollCount >= maxRolls) {
        clearInterval(rollAnimation)
        finishRoll()
      }
    }, rollInterval)
  }

  const finishRoll = () => {
    // Generate final dice values
    const finalDice1 = Math.floor(Math.random() * 6) + 1
    const finalDice2 = Math.floor(Math.random() * 6) + 1
    const sum = finalDice1 + finalDice2

    setDice1(finalDice1)
    setDice2(finalDice2)
    setIsRolling(false)

    // Calculate winnings
    let winAmount = 0
    let isWin = false

    if (prediction === "less" && sum < 7) {
      winAmount = bet * 2
      isWin = true
    } else if (prediction === "greater" && sum > 7) {
      winAmount = bet * 2
      isWin = true
    } else if (prediction === "equal" && sum === 7) {
      winAmount = bet * 3
      isWin = true
    }

    const gameResult = {
      dice1: finalDice1,
      dice2: finalDice2,
      sum,
      prediction,
      bet,
      winAmount,
      isWin,
      timestamp: new Date().toLocaleTimeString()
    }

    setResult(gameResult)
    setGameHistory(prev => [gameResult, ...prev.slice(0, 4)]) // Keep last 5 games

    // Update balance after bet
    if (provider && account) {
      provider.getBalance(account).then(newBalance => {
        setBalance(parseFloat(ethers.formatEther(newBalance)));
      });
    }

    if (isWin) {
      setTimeout(() => {
        setShowCongrats(true)
      }, 500)
      
      setTimeout(() => {
        setShowCongrats(false)
      }, 4000)
    }
  }

  // Cash out function
  const cashOut = async () => {
    if (!result || result.winAmount <= 0) return
    
    try {
      const success = await cashoutFromContract(result.winAmount);
      if (success) {
        alert(`Cashed out: ${result.winAmount.toFixed(4)} MONAD`);
        // Update balance after successful cashout
        if (provider && account) {
          const newBalance = await provider.getBalance(account);
          setBalance(parseFloat(ethers.formatEther(newBalance)));
        }
      }
    } catch (err) {
      console.error("Cash out error:", err);
      alert("Cash out failed");
    }
  }

  // Dice face component
  const DiceFace = ({ value, isRolling }) => {
    const getDots = (num) => {
      const positions = {
        1: ["center"],
        2: ["top-left", "bottom-right"],
        3: ["top-left", "center", "bottom-right"],
        4: ["top-left", "top-right", "bottom-left", "bottom-right"],
        5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
        6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"]
      }
      return positions[num] || []
    }

    return (
      <motion.div
        className="dice-face"
        animate={isRolling ? { 
          rotateX: [0, 360, 720, 1080],
          rotateY: [0, 360, 720, 1080]
        } : {}}
        transition={{ duration: 0.1, ease: "linear" }}
      >
        {getDots(value).map((position, index) => (
          <div key={index} className={`dice-dot ${position}`} />
        ))}
      </motion.div>
    )
  }

  // Prediction buttons data
  const predictions = [
    { key: "less", label: "Less than 7", multiplier: "2x", color: "#ef4444" },
    { key: "equal", label: "Equal to 7", multiplier: "3x", color: "#f59e0b" },
    { key: "greater", label: "Greater than 7", multiplier: "2x", color: "#22c55e" }
  ]

  return (
    <div className="dice-game-container">
      {/* Control Panel */}
      <div className="control-panel">
        <div className="flex items-center mb-4">
          <button 
            className="bg-gray-800 text-white px-4 py-2 rounded-lg mr-3 flex items-center hover:bg-gray-700" 
            onClick={() => router.push('/games')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Games
          </button>          
        </div>

        <h1 className="game-title">Dice Betting Game</h1>
        
        {/* Wallet Info */}
        <div className="wallet-info">
          <div className="text-sm text-gray-400 mb-2">
            Balance: {balance.toFixed(4)} MONAD
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
          </div>
        </div>

        {/* Bet Control */}
        <div className="bet-control">
          <label className="control-label">Bet Amount (MONAD)</label>
          <div className="bet-input-group">
            <input
              type="number"
              step="0.01"
              value={bet}
              onChange={(e) => setBet(Math.max(0.01, Number(e.target.value) || 0.01))}
              className="bet-input"
              disabled={isRolling}
            />
            <button
              onClick={() => setBet(b => Math.max(0.01, b / 2))}
              className="bet-modifier"
              disabled={isRolling}
            >
              ½
            </button>
            <button
              onClick={() => setBet(b => b * 2)}
              className="bet-modifier"
              disabled={isRolling}
            >
              2×
            </button>
          </div>
        </div>
        
        {/* Prediction Control */}
        <div className="prediction-control">
          <label className="control-label">Your Prediction</label>
          <div className="prediction-buttons">
            {predictions.map((pred) => (
              <button
                key={pred.key}
                onClick={() => setPrediction(pred.key)}
                className={`prediction-button ${prediction === pred.key ? 'active' : ''}`}
                style={{ 
                  backgroundColor: prediction === pred.key ? pred.color : '#374151',
                  borderColor: pred.color 
                }}
                disabled={isRolling}
              >
                <div className="prediction-label">{pred.label}</div>
                <div className="prediction-multiplier">{pred.multiplier}</div>
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={rollDice}
          disabled={isRolling || bet <= 0}
          className={`roll-button ${isRolling ? 'rolling' : ''}`}
        >
          {isRolling ? 'Rolling...' : 'ROLL DICE'}
        </button>

        {/* Cash Out Button */}
        {result && result.winAmount > 0 && (
          <button
            onClick={cashOut}
            className="cash-out-button"
          >
            Cash Out {result.winAmount.toFixed(4)} MONAD
          </button>
        )}

        {/* Game History */}
        <div className="game-history">
          <h3 className="section-title">Recent Games</h3>
          <div className="history-list">
            {gameHistory.map((game, index) => (
              <div key={index} className="history-item">
                <div className="history-dice">
                  {game.dice1} + {game.dice2} = {game.sum}
                </div>
                <div className={`history-result ${game.isWin ? 'win' : 'lose'}`}>
                  {game.isWin ? `+${game.winAmount.toFixed(2)}` : `-${game.bet.toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Game Display */}
      <div className="game-display">
        <div className="dice-container">
          <motion.div 
            className="dice-pair"
            initial={{ scale: 1 }}
            animate={isRolling ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.2, repeat: isRolling ? Infinity : 0 }}
          >
            <DiceFace value={dice1} isRolling={isRolling} />
            <DiceFace value={dice2} isRolling={isRolling} />
          </motion.div>
          
          <div className="dice-sum">
            Sum: {dice1 + dice2}
          </div>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="result-display"
              >
                <div className={`result-card ${result.isWin ? 'win' : 'lose'}`}>
                  <div className="result-title">
                    {result.isWin ? 'YOU WIN!' : 'YOU LOSE'}
                  </div>
                  <div className="result-amount">
                    {result.isWin ? `+${result.winAmount.toFixed(4)}` : `-${result.bet.toFixed(4)}`} MONAD
                  </div>
                  <div className="result-details">
                    Predicted: {predictions.find(p => p.key === result.prediction)?.label} | 
                    Actual: {result.sum}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Congratulations Animation */}
          <AnimatePresence>
            {showCongrats && (
              <>
                <motion.div
                  className="congrats-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                
                <motion.div 
                  className="congrats-banner-container"
                  initial={{ y: -100, opacity: 0 }}
                  animate={{ y: 20, opacity: 1 }}
                  exit={{ y: -100, opacity: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 15
                  }}
                >
                  <motion.div 
                    className="congrats-banner"
                    animate={{ 
                      rotateZ: [-2, 2, -2],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut" 
                    }}
                  >
                    <h2 className="congrats-title">JACKPOT!</h2>
                    <div className="congrats-amount">
                      +{result?.winAmount.toFixed(4)} MONAD
                    </div>
                  </motion.div>
                </motion.div>

                {/* Confetti Animation */}
                {Array.from({ length: 50 }).map((_, i) => (
                  <motion.div
                    key={`confetti-${i}`}
                    className="confetti-particle"
                    initial={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `-10%`,
                      opacity: 1,
                      scale: Math.random() * 0.5 + 0.5,
                      rotate: 0
                    }}
                    animate={{ 
                      y: '110%',
                      x: `${Math.random() * 100}%`,
                      rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                      opacity: [1, 1, 0]
                    }}
                    transition={{ 
                      duration: 2 + Math.random() * 2,
                      ease: "easeOut",
                      times: [0, 0.7, 1]
                    }}
                    style={{
                      backgroundColor: ['#FFD700', '#FF6347', '#00CED1', '#FF1493', '#32CD32'][Math.floor(Math.random() * 5)],
                      width: '8px',
                      height: '8px',
                      borderRadius: Math.random() > 0.5 ? '50%' : '0%'
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        .dice-game-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: white;
          font-family: 'Inter', sans-serif;
        }

        @media (min-width: 768px) {
          .dice-game-container {
            flex-direction: row;
          }
        }

        .control-panel {
          width: 100%;
          padding: 2rem;
          background: rgba(31, 41, 55, 0.9);
          backdrop-filter: blur(10px);
          border-right: 1px solid rgba(55, 65, 81, 0.5);
        }

        @media (min-width: 768px) {
          .control-panel {
            width: 35%;
          }
        }

        .game-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 2rem;
          background: linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align: center;
        }

        .wallet-info {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .bet-control {
          margin-bottom: 2rem;
        }

        .control-label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #d1d5db;
        }

        .bet-input-group {
          display: flex;
          border-radius: 0.5rem;
          overflow: hidden;
          border: 1px solid #4b5563;
        }

        .bet-input {
          flex: 1;
          background: rgba(55, 65, 81, 0.8);
          border: none;
          padding: 0.75rem;
          color: white;
          font-size: 1rem;
        }

        .bet-input:focus {
          outline: none;
          background: rgba(55, 65, 81, 1);
        }

        .bet-modifier {
          background: rgba(75, 85, 99, 0.8);
          padding: 0 1rem;
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .bet-modifier:hover:not(:disabled) {
          background: rgba(75, 85, 99, 1);
        }

        .bet-modifier:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .prediction-control {
          margin-bottom: 2rem;
        }

        .prediction-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .prediction-button {
          padding: 1rem;
          border-radius: 0.5rem;
          border: 2px solid;
          background: rgba(55, 65, 81, 0.5);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .prediction-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .prediction-button.active {
          transform: scale(1.02);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
        }

        .prediction-label {
          font-weight: 600;
        }

        .prediction-multiplier {
          font-size: 1.25rem;
          font-weight: 800;
          color: #fbbf24;
        }

        .roll-button, .cash-out-button {
          width: 100%;
          padding: 1rem;
          border-radius: 0.5rem;
          font-weight: 800;
          font-size: 1.1rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
        }

        .roll-button {
          background: linear-gradient(45deg, #22c55e, #16a34a);
          color: white;
        }

        .roll-button:hover:not(:disabled) {
          background: linear-gradient(45deg, #16a34a, #15803d);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
        }

        .roll-button.rolling {
          background: linear-gradient(45deg, #6b7280, #4b5563);
          cursor: not-allowed;
        }

        .cash-out-button {
          background: linear-gradient(45deg, #f59e0b, #d97706);
          color: white;
        }

        .cash-out-button:hover {
          background: linear-gradient(45deg, #d97706, #b45309);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .game-history {
          margin-top: 2rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #d1d5db;
        }

        .history-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 0.375rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-dice {
          font-family: monospace;
          font-weight: 600;
        }

        .history-result.win {
          color: #4ade80;
          font-weight: 700;
        }

        .history-result.lose {
          color: #f87171;
          font-weight: 700;
        }

        .game-display {
          width: 100%;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 768px) {
          .game-display {
            width: 65%;
          }
        }

        .dice-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          width: 100%;
          max-width: 500px;
        }

        .dice-pair {
          display: flex;
          gap: 2rem;
          perspective: 1000px;
        }

        .dice-face {
          width: 100px;
          height: 100px;
          background: linear-gradient(145deg, #ffffff, #e0e0e0);
          border-radius: 15px;
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.8);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          padding: 10px;
          position: relative;
          transform-style: preserve-3d;
        }

        .dice-dot {
          width: 14px;
          height: 14px;
          background: #1f2937;
          border-radius: 50%;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .dice-dot.top-left { grid-area: 1 / 1; }
        .dice-dot.top-right { grid-area: 1 / 3; }
        .dice-dot.middle-left { grid-area: 2 / 1; }
        .dice-dot.center { grid-area: 2 / 2; }
        .dice-dot.middle-right { grid-area: 2 / 3; }
        .dice-dot.bottom-left { grid-area: 3 / 1; }
        .dice-dot.bottom-right { grid-area: 3 / 3; }

        .dice-sum {
          font-size: 2rem;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        .result-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .result-card {
          background: rgba(0, 0, 0, 0.9);
          padding: 2rem;
          border-radius: 1rem;
          text-align: center;
          border: 3px solid;
          backdrop-filter: blur(10px);
        }

        .result-card.win {
          border-color: #22c55e;
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.5);
        }

        .result-card.lose {
          border-color: #ef4444;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
        }

        .result-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .result-card.win .result-title {
          color: #22c55e;
        }

        .result-card.lose .result-title {
          color: #ef4444;
        }

        .result-amount {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }

        .result-card.win .result-amount {
          color: #4ade80;
        }

        .result-card.lose .result-amount {
          color: #f87171;
        }

        .result-details {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .congrats-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 20;
        }

        .congrats-banner-container {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
        }

        .congrats-banner {
          background: linear-gradient(45deg, #f59e0b, #ef4444, #8b5cf6);
          padding: 1.5rem 3rem;
          border-radius: 1rem;
          text-align: center;
          border: 4px solid white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .congrats-title {
          font-size: 2rem;
          font-weight: 900;
          color: white;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          margin-bottom: 0.5rem;
        }

        .congrats-amount {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fbbf24;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .confetti-particle {
          position: fixed;
          z-index: 25;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

export default DiceGame
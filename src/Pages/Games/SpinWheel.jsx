"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import contractABI from "../../contract_data/Mines.json";
import contractAddress from "../../contract_data/Mines-address.json";
import "./SpinWheel.css"

const WheelGame = () => {
  const router = useRouter();
  
  // Updated number of segments to 15
  const SEGMENTS = 15
  
  // Multiplier configurations based on risk level
  const multiplierConfigs = {
    Low: [
      { value: 0, color: "#ff0000", probability: 0.2 },
      { value: 1.5, color: "#00ff00", probability: 0.3 },
      { value: 1.7, color: "#ffffff", probability: 0.2 },
      { value: 2, color: "#ffff00", probability: 0.2 },
      { value: 3, color: "#9966ff", probability: 0.07 },
      { value: 4, color: "#ff9933", probability: 0.03 },
    ],
    Medium: [
      { value: 0, color: "#ff0000", probability: 0.3 },
      { value: 1.5, color: "#00ff00", probability: 0.2 },
      { value: 1.7, color: "#ffffff", probability: 0.1 },
      { value: 2, color: "#ffff00", probability: 0.25 },
      { value: 3, color: "#9966ff", probability: 0.1 },
      { value: 4, color: "#ff9933", probability: 0.05 },
    ],
    High: [
      { value: 0, color: "#ff0000", probability: 0.4 },
      { value: 1.5, color: "#00ff00", probability: 0.1 },
      { value: 1.7, color: "#ffffff", probability: 0.05 },
      { value: 2, color: "#ffff00", probability: 0.2 },
      { value: 3, color: "#9966ff", probability: 0.15 },
      { value: 4, color: "#ff9933", probability: 0.1 },
    ],
  }

  // Game states
  const [bet, setBet] = useState(100)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [segments, setSegments] = useState([])
  const [result, setResult] = useState(null)
  const [showCongrats, setShowCongrats] = useState(false)
  const [riskLevel, setRiskLevel] = useState("Medium")

  // Contract integration states
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Connect to MetaMask and initialize contract
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          const contractInstance = new ethers.Contract(
            contractAddress.address,
            contractABI.abi,
            signer
          );
          setContract(contractInstance);
        } catch (err) {
          console.error("Wallet connection error:", err);
          alert("Failed to connect wallet. Please try again.");
        }
      } else {
        alert("Please install MetaMask!");
      }
    };
    connectWallet();
  }, []);

  // Generate wheel segments using weighted probabilities based on risk level
  const generateSegments = (risk) => {
    const multipliers = multiplierConfigs[risk]
    const newSegments = []
    for (let i = 0; i < SEGMENTS; i++) {
      const rand = Math.random()
      let cumulativeProb = 0
      let selectedMultiplier = multipliers[0]
      for (const multiplier of multipliers) {
        cumulativeProb += multiplier.probability
        if (rand <= cumulativeProb) {
          selectedMultiplier = multiplier
          break
        }
      }
      newSegments.push({ id: i, value: selectedMultiplier.value, color: selectedMultiplier.color })
    }
    return newSegments
  }

  // Draw the wheel on canvas
  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = Math.min(canvas.width, canvas.height)
    const center = size / 2
    const radius = center - 10
    const segmentAngle = (2 * Math.PI) / SEGMENTS

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    segments.forEach((segment, i) => {
      const startAngle = i * segmentAngle - rotation
      const endAngle = (i + 1) * segmentAngle - rotation
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = segment.color
      ctx.fill()
      ctx.strokeStyle = "#1a1a1a"
      ctx.stroke()
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(center, center, radius * 0.6, 0, 2 * Math.PI)
    ctx.fillStyle = "#1a1a1a"
    ctx.fill()
  }

  // Spin function with smart contract bet() call
  const spin = async () => {
    if (isSpinning || bet <= 0) return
    if (!contract) {
      alert("Contract not connected");
      return;
    }

    // Place bet via contract
    try {
      const tx = await contract.bet({
        value: ethers.parseEther(bet.toString()),
        gasLimit: 200_000n,
      });
      await tx.wait();
    } catch (err) {
      console.error("Bet transaction failed:", err);
      alert("Bet failed, please try again.");
      return;
    }

    setIsSpinning(true)
    setResult(null)
    setShowCongrats(false)

    // Calculate winning segment using weighted probabilities
    let randomWeight = Math.random()
    let cumulative = 0
    let winningIndex = 0
    for (let i = 0; i < segments.length; i++) {
      const multiplier = multiplierConfigs[riskLevel].find(mult => mult.value === segments[i].value && mult.color === segments[i].color)
      const prob = multiplier ? multiplier.probability : 0
      cumulative += prob
      if (randomWeight <= cumulative) {
        winningIndex = i
        break
      }
    }

    // Calculate the winning segment's center angle
    const segmentAngle = (2 * Math.PI) / SEGMENTS
    const winningCenterAngle = winningIndex * segmentAngle + segmentAngle / 2

    const desiredMod = (winningCenterAngle + Math.PI/2) % (2 * Math.PI)
    const currentRotationMod = rotation % (2 * Math.PI)
    let delta = desiredMod - currentRotationMod
    if (delta < 0) {
      delta += 2 * Math.PI
    }
    const extraRotations = 3
    const targetRotation = rotation + extraRotations * 2 * Math.PI + delta

    const spinDuration = 3000
    const startTime = Date.now()
    let animationFrameId

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentRotationValue = rotation + easedProgress * (targetRotation - rotation)
      setRotation(currentRotationValue)
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }
    animationFrameId = requestAnimationFrame(animate)

    setTimeout(() => {
      cancelAnimationFrame(animationFrameId)
      setRotation(targetRotation)
      finishSpin(winningIndex)
    }, spinDuration)
  }

  const finishSpin = (winningIndex) => {
    setIsSpinning(false)
    const winningSegment = segments[winningIndex]
    const multiplier = winningSegment.value
    const winAmount = bet * multiplier

    setResult({
      amount: winAmount,
      multiplier: multiplier,
      color: winningSegment.color,
      id: winningSegment.id
    })

    if (winAmount > 0) {
      setTimeout(() => {
        setShowCongrats(true)
      }, 500)
      
      setTimeout(() => {
        setShowCongrats(false)
      }, 4500)
    }
  }

  // Cash out function that calls the contract's sendEtherFromContract to transfer winnings
  const cashOut = async () => {
    if (!result || result.amount <= 0) return;
    const amount = result.amount;
    const amountString = amount.toFixed(18);
    if (!contract || !account) {
      alert("Contract not connected");
      return;
    }
    try {
      const tx = await contract.sendEtherFromContract(
        account,
        ethers.parseEther(amountString)
      );
      await tx.wait();
              alert(`Cashed out: MON ${amount.toFixed(2)}`);
    } catch (err) {
      console.error("Cash out error:", err);
      alert("Cash out failed");
    }
  }

  // Resize and redraw the canvas
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const size = Math.min(containerRef.current.clientWidth, containerRef.current.clientHeight)
        canvasRef.current.width = size
        canvasRef.current.height = size
        drawWheel()
      }
    }
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => window.removeEventListener("resize", handleResize)
  }, [segments])

  useEffect(() => {
    drawWheel()
  }, [rotation, segments])

  useEffect(() => {
    setSegments(generateSegments(riskLevel))
  }, [riskLevel])

  const confettiCount = 150
  const confettiColors = ["#FFD700", "#FF6347", "#00CED1", "#FF1493", "#32CD32", "#FF8C00", "#9370DB", "#00BFFF"]
  const confetti = Array.from({ length: confettiCount }).map((_, i) => {
    const shape = Math.random() > 0.3 ? "circle" : Math.random() > 0.5 ? "square" : "triangle"
    return {
      id: i,
      x: Math.random() * 120 - 10,
      y: Math.random() * -100 - 20,
      rotation: Math.random() * 360,
      size: Math.random() * 15 + 5,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 0.7,
      scale: 0.5 + Math.random() * 1.5,
      shape
    }
  })

  const coins = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: 50 + (Math.random() * 40 - 20),
    y: 50 + (Math.random() * 40 - 20),
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5,
    scale: 0.7 + Math.random() * 0.6
  }))

  return (
    <div className="wheel-game-container min-w-full m-0">
      {/* Control Panel */}

      
      <div className="control-panel">
      <div className="flex items-center mb-4">
          <button 
            className="#111828 text-white px-4 py-2 rounded-lg mr-3 flex items-center" 
            onClick={() => router.push('/games')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Games
          </button>          
        </div>
        <h1 className="game-title">Wheel Game</h1>
        <div className="bet-control">
          <label className="control-label">Bet Amount</label>
          <div className="bet-input-group">
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              className="bet-input"
              disabled={isSpinning}
            />
            <button
              onClick={() => setBet(b => Math.max(1, Math.floor(b / 2)))}
              className="bet-modifier half"
              disabled={isSpinning}
            >
              ½
            </button>
            <button
              onClick={() => setBet(b => b * 2)}
              className="bet-modifier double"
              disabled={isSpinning}
            >
              2×
            </button>
          </div>
        </div>
        
        {/* Risk level selector */}
        <div className="risk-control">
          <label className="control-label">Risk Level</label>
          <div className="risk-buttons">
            {["Low", "Medium", "High"].map((level) => (
              <button
                key={level}
                onClick={() => setRiskLevel(level)}
                className={`risk-button ${riskLevel === level ? level.toLowerCase() : ''}`}
                disabled={isSpinning}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={spin}
          disabled={isSpinning || bet <= 0}
          className={`spin-button ${isSpinning ? 'spinning' : ''}`}
        >
          {isSpinning ? 'Spinning...' : 'SPIN'}
        </button>
        {/* Cash Out Button */}
        <button
          onClick={cashOut}
          disabled={!result || result.amount <= 0 || isSpinning}
          className="spin-button"
          style={{ marginTop: "1rem", backgroundColor: "#f59e0b" }}
        >
          Cash Out
        </button>
        
        <div className="multipliers-section">
          <h2 className="section-title">Multipliers</h2>
          <div className="multipliers-grid">
            {multiplierConfigs[riskLevel].map((mult, i) => (
              <div
                key={i}
                className="multiplier-item"
                style={{
                  borderBottom: `3px solid ${mult.color}`
                }}
              >
                {mult.value.toFixed(1)}×
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Wheel Display */}
      <div className="wheel-display">
        <div ref={containerRef} className="wheel-container">
          <canvas ref={canvasRef} className="wheel-canvas" />
          {/* Pointer */}
          <div className="wheel-pointer"></div>
          
          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="result-display"
              >
                <div
                  className="result-circle"
                  style={{ border: `4px solid ${result.color}` }}
                >
                  <div className={`result-amount ${result.amount > 0 ? 'win' : 'lose'}`}>
                    {result.amount > 0 ? `+${result.amount.toFixed(2)}` : result.amount.toFixed(2)}
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
                  animate={{ y: 10, opacity: 1 }}
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
                      rotateZ: [-3, 3, -3],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut" 
                    }}
                  >
                    <motion.h2 className="congrats-title">
                      YOU WIN!
                    </motion.h2>
                  </motion.div>
                </motion.div>
                
                <motion.div 
                  className="win-amount-container"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.3
                  }}
                >
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0], 
                      rotateZ: [-2, 2, -2]
                    }}
                    transition={{ 
                      y: { duration: 1.5, repeat: Infinity },
                      rotateZ: { duration: 2, repeat: Infinity }
                    }}
                    className="win-amount-content"
                  >
                    <motion.div 
                      className="win-amount-text"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        textShadow: [
                          "0 0 10px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.5)",
                          "0 0 15px rgba(74, 222, 128, 1), 0 0 30px rgba(74, 222, 128, 0.8)",
                          "0 0 10px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.5)"
                        ]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity 
                      }}
                    >
                      {result?.amount.toFixed(2)}
                    </motion.div>
                    <motion.div 
                      className="congrats-text"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      CONGRATULATIONS!
                    </motion.div>
                  </motion.div>
                </motion.div>
                
                {/* Confetti */}
                {confetti.map((particle) => (
                  <motion.div
                    key={particle.id}
                    className="confetti-particle"
                    initial={{ 
                      x: `${particle.x}%`, 
                      y: `${particle.y}%`,
                      opacity: 1,
                      scale: particle.scale,
                      rotate: 0
                    }}
                    animate={{ 
                      y: '120%',
                      x: `${particle.x + (Math.random() * 40 - 20)}%`,
                      rotate: particle.rotation * (Math.random() > 0.5 ? -1 : 1),
                      opacity: [1, 1, 0]
                    }}
                    transition={{ 
                      duration: particle.duration,
                      ease: "easeOut",
                      delay: particle.delay,
                      times: [0, 0.7, 1]
                    }}
                    style={{
                      width: particle.shape === "circle" ? `${particle.size}px` : `${particle.size}px`,
                      height: particle.shape === "circle" ? `${particle.size}px` : `${particle.size}px`,
                      backgroundColor: particle.shape === "triangle" ? "transparent" : particle.color,
                      borderRadius: particle.shape === "circle" ? '50%' : '0%',
                      borderLeft: particle.shape === "triangle" ? `${particle.size/2}px solid transparent` : "",
                      borderRight: particle.shape === "triangle" ? `${particle.size/2}px solid transparent` : "",
                      borderBottom: particle.shape === "triangle" ? `${particle.size}px solid ${particle.color}` : ""
                    }}
                  />
                ))}
                
                {/* Coin animation */}
                {coins.map((coin) => (
                  <motion.div
                    key={`coin-${coin.id}`}
                    className="win-coin"
                    initial={{ 
                      x: "50%", 
                      y: "50%", 
                      scale: 0, 
                      opacity: 0 
                    }}
                    animate={{ 
                      x: `${coin.x}%`,
                      y: `${coin.y}%`,
                      scale: coin.scale,
                      opacity: 1,
                      rotateY: [0, 180, 360],
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: 0.2 + coin.delay,
                      rotateY: { 
                        duration: 1, 
                        repeat: Infinity,
                        ease: "linear" 
                      }
                    }}
                  >
                    <div className="coin-symbol">$</div>
                  </motion.div>
                ))}
                
                {/* Animated stars and sparkles */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={`star-${i}`}
                    className="win-star"
                    initial={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `${Math.random() * 100}%`,
                      opacity: 0 
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                        fill="#FFD700" stroke="#FFD700" strokeWidth="1" />
                    </svg>
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default WheelGame

const styles = `
.wheel-game-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #111827;
  color: white;
}

@media (min-width: 768px) {
  .wheel-game-container {
    flex-direction: row;
  }
}

.control-panel {
  width: 100%;
  padding: 1.5rem;
  background-color: #1f2937;
  border-right: 1px solid #374151;
}

@media (min-width: 768px) {
  .control-panel {
    width: 33.333333%;
  }
}

.game-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.bet-control {
  margin-bottom: 1.5rem;
}

.control-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.bet-input-group {
  display: flex;
}

.bet-input {
  flex: 1;
  background-color: #374151;
  border: 1px solid #4b5563;
  border-radius: 0.25rem 0 0 0.25rem;
  padding: 0.5rem;
  color: white;
}

.bet-input:disabled {
  opacity: 0.7;
}

.bet-modifier {
  background-color: #4b5563;
  padding: 0 0.75rem;
  border: 1px solid #4b5563;
  color: white;
}

.bet-modifier.half {
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.bet-modifier.double {
  border-radius: 0 0.25rem 0.25rem 0;
}

.bet-modifier:disabled {
  opacity: 0.7;
}

.risk-control {
  margin-bottom: 1.5rem;
}

.risk-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.risk-button {
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
  background-color: #374151;
  color: #d1d5db;
}

.risk-button.low {
  background-color: #16a34a;
  color: white;
}

.risk-button.medium {
  background-color: #ca8a04;
  color: white;
}

.risk-button.high {
  background-color: #dc2626;
  color: white;
}

.risk-button:disabled {
  opacity: 0.7;
}

.spin-button {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.25rem;
  font-weight: 700;
  background-color: #22c55e;
  color: white;
  margin-top: 0.5rem;
}

.spin-button:hover:not(:disabled) {
  background-color: #16a34a;
}

.spin-button.spinning {
  background-color: #4b5563;
}

.multipliers-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.multipliers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.multiplier-item {
  padding: 0.5rem;
  border-radius: 0.25rem;
  text-align: center;
  font-size: 0.875rem;
  background-color: #1a1a1a;
}

.wheel-display {
  width: 100%;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 768px) {
  .wheel-display {
    width: 66.666667%;
  }
}

.wheel-container {
  position: relative;
  width: 100%;
  max-width: 28rem;
  aspect-ratio: 1/1;
}

.wheel-canvas {
  width: 100%;
  height: 100%;
}

.wheel-pointer {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
}

.wheel-pointer::before {
  content: '';
  display: block;
  width: 1rem;
  height: 2rem;
  background-color: #ef4444;
  border-radius: 0.5rem 0.5rem 0 0;
}

.result-display {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-circle {
  border-radius: 9999px;
  padding: 2rem;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.8);
}

.result-amount {
  font-size: 1.5rem;
  font-weight: 700;
}

.result-amount.win {
  color: #4ade80;
}

.result-amount.lose {
  color: #f87171;
}

.congrats-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 20;
}

.congrats-banner-container {
  position: absolute;
  inset-x: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 30;
  overflow: hidden;
}

.congrats-banner {
  background: linear-gradient(to right, #f59e0b, #f97316, #f59e0b);
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: rotate(3deg);
  border: 4px solid white;
}

.congrats-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4);
}

.win-amount-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.win-amount-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.win-amount-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: #4ade80;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.5);
}

.congrats-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #facc15;
  padding: 0.25rem 1rem;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.6);
}

.confetti-particle {
  position: absolute;
  z-index: 20;
}

.win-coin {
  position: absolute;
  z-index: 25;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  background-color: #facc15;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3), 0 0 5px rgba(255, 215, 0, 0.7);
  border: 2px solid #FFD700;
}

.coin-symbol {
  font-weight: 700;
  color: #92400e;
}

.win-star {
  position: absolute;
  z-index: 20;
  width: 15px;
  height: 15px;
}
`

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}

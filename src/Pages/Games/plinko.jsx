"use client"
import { useState, useEffect, useRef } from "react"
import "./plinko.css"
import { ethers } from "ethers"
import contractManager from "../../contract_data/contract-utils"

const PlinkoGame = () => {
  // State management
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [betAmount, setBetAmount] = useState(0)
  const [gameState, setGameState] = useState("ready") // ready, dropping, finished
  const [lastWin, setLastWin] = useState(null)
  const [balls, setBalls] = useState([])
  const [gameHistory, setGameHistory] = useState([])
  const [selectedRisk, setSelectedRisk] = useState("medium")
  const [ballCount, setBallCount] = useState(1)
  const [maxBalls, setMaxBalls] = useState(10)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [gameResults, setGameResults] = useState(null)

  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const audioContextRef = useRef(null)

  // Plinko configuration
  const CANVAS_WIDTH = 600
  const CANVAS_HEIGHT = 500
  const PEG_RADIUS = 4
  const BALL_RADIUS = 8
  const ROWS = 12
  const SLOTS = 13

  // Multipliers for different risk levels
  const multipliers = {
    low: [1.5, 1.2, 1.1, 1.0, 0.5, 0.3, 0.5, 1.0, 1.1, 1.2, 1.5],
    medium: [5.6, 2.1, 1.1, 1.0, 0.5, 0.2, 0.2, 0.5, 1.0, 1.1, 2.1, 5.6],
    high: [29, 8.1, 3.0, 1.5, 0.3, 0.2, 0.2, 0.3, 1.5, 3.0, 8.1, 29],
  }

  // Sound generation functions
  const createAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }

  const playPegSound = (intensity = 1) => {
    if (!soundEnabled) return

    try {
      const audioContext = createAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Peg collision sound - higher pitch, short duration
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audioContext.currentTime)
      oscillator.type = "triangle"

      gainNode.gain.setValueAtTime(0.1 * intensity, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      console.log("Audio not supported")
    }
  }

  const playBallSound = (intensity = 1) => {
    if (!soundEnabled) return

    try {
      const audioContext = createAudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Ball collision sound - lower pitch, slightly longer
      oscillator.frequency.setValueAtTime(400 + Math.random() * 200, audioContext.currentTime)
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.08 * intensity, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.15)
    } catch (error) {
      console.log("Audio not supported")
    }
  }

  const playWinSound = () => {
    if (!soundEnabled) return

    try {
      const audioContext = createAudioContext()

      // Play a sequence of notes for win sound
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
        oscillator.type = "sine"

        const startTime = audioContext.currentTime + index * 0.1
        gainNode.gain.setValueAtTime(0.1, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
      })
    } catch (error) {
      console.log("Audio not supported")
    }
  }

  // Contract functions
  const initializeEthers = async () => {
    try {
      const result = await contractManager.initialize();
      setAccount(result.account);
      setProvider(result.provider);
      setSigner(result.signer);
      setContract(result.contract);
      console.log("Wallet connected:", result.account);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert(`Error connecting wallet: ${error.message}`);
    }
  }

  const sendToContract = async () => {
    try {
      const totalBet = betAmount * ballCount;
      await contractManager.placeBet(totalBet);
      console.log(`Bet placed: ${totalBet} MON`);
    } catch (error) {
      console.error("Error placing bet:", error);
      throw error;
    }
  }

  const cashoutFromContract = async (amount) => {
    try {
      await contractManager.cashout(amount);
      console.log(`Cashout: ${amount} MON`);
      return true;
    } catch (error) {
      console.error("Error cashing out:", error);
      throw error;
    }
  }

  // Ball physics class
  class Ball {
    constructor(x, y, id = 0) {
      this.id = id
      this.x = x + (Math.random() - 0.5) * 30 // More initial spread
      this.y = y
      this.vx = (Math.random() - 0.5) * 4 // More initial horizontal velocity
      this.vy = Math.random() * 1 + 0.5 // Slower initial downward velocity
      this.radius = BALL_RADIUS
      this.gravity = 0.3 + Math.random() * 0.4 // Variable gravity (0.3-0.7)
      this.bounce = 0.6 + Math.random() * 0.3 // Variable bounce (0.6-0.9)
      this.friction = 0.98 + Math.random() * 0.02 // Variable friction
      this.finished = false
      this.slot = -1
      this.color = `hsl(${200 + Math.random() * 60}, 70%, ${50 + Math.random() * 20}%)` // Variable blue colors
      this.rotationSpeed = (Math.random() - 0.5) * 0.2
      this.rotation = 0
      this.startDelay = id * 100 // Delay based on ball ID
      this.active = false
      this.lastCollisionTime = 0
    }

    // Ball-to-ball collision detection and response
    checkBallCollision(otherBall) {
      if (!this.active || !otherBall.active || this.finished || otherBall.finished) return

      const dx = this.x - otherBall.x
      const dy = this.y - otherBall.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = this.radius + otherBall.radius

      if (distance < minDistance && distance > 0) {
        // Prevent multiple collisions in quick succession
        const currentTime = Date.now()
        if (currentTime - this.lastCollisionTime < 100) return

        this.lastCollisionTime = currentTime
        otherBall.lastCollisionTime = currentTime

        // Play ball collision sound
        const intensity = Math.min(
          1,
          (Math.abs(this.vx) + Math.abs(this.vy) + Math.abs(otherBall.vx) + Math.abs(otherBall.vy)) / 10,
        )
        playBallSound(intensity)

        // Calculate collision normal
        const nx = dx / distance
        const ny = dy / distance

        // Separate balls to prevent overlap
        const overlap = minDistance - distance
        const separationX = (overlap / 2) * nx
        const separationY = (overlap / 2) * ny

        this.x += separationX
        this.y += separationY
        otherBall.x -= separationX
        otherBall.y -= separationY

        // Calculate relative velocity
        const dvx = this.vx - otherBall.vx
        const dvy = this.vy - otherBall.vy

        // Calculate relative velocity along collision normal
        const dvn = dvx * nx + dvy * ny

        // Do not resolve if velocities are separating
        if (dvn > 0) return

        // Calculate collision impulse
        const impulse = (2 * dvn) / 2 // Assuming equal mass

        // Apply impulse to velocities with some randomness
        const randomFactor = 0.1
        this.vx -= impulse * nx + (Math.random() - 0.5) * randomFactor
        this.vy -= impulse * ny + (Math.random() - 0.5) * randomFactor
        otherBall.vx += impulse * nx + (Math.random() - 0.5) * randomFactor
        otherBall.vy += impulse * ny + (Math.random() - 0.5) * randomFactor

        // Add some spin after collision
        this.rotationSpeed += (Math.random() - 0.5) * 0.2
        otherBall.rotationSpeed += (Math.random() - 0.5) * 0.2
      }
    }

    update(pegs, allBalls) {
      // Handle start delay
      if (!this.active) {
        this.startDelay -= 16 // Approximate frame time
        if (this.startDelay <= 0) {
          this.active = true
        }
        return
      }

      if (this.finished) return

      // Check collisions with other balls
      allBalls.forEach((otherBall) => {
        if (otherBall.id !== this.id) {
          this.checkBallCollision(otherBall)
        }
      })

      // Apply variable gravity
      this.vy += this.gravity

      // Add slight random air resistance variations
      const airResistance = 0.999 + Math.random() * 0.001
      this.vx *= airResistance
      this.vy *= airResistance

      // Update position
      this.x += this.vx
      this.y += this.vy

      // Update rotation
      this.rotation += this.rotationSpeed

      // Check collision with pegs
      pegs.forEach((peg) => {
        const dx = this.x - peg.x
        const dy = this.y - peg.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < this.radius + PEG_RADIUS) {
          // Play peg collision sound
          const intensity = Math.min(1, (Math.abs(this.vx) + Math.abs(this.vy)) / 8)
          playPegSound(intensity)

          // Calculate collision angle with some randomness
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3

          // Move ball away from peg
          const targetX = peg.x + Math.cos(angle) * (PEG_RADIUS + this.radius)
          const targetY = peg.y + Math.sin(angle) * (PEG_RADIUS + this.radius)

          this.x = targetX
          this.y = targetY

          // Apply bounce with more randomness
          const bounceForce = 1.5 + Math.random() * 3
          const randomFactor = (Math.random() - 0.5) * 4

          this.vx = Math.cos(angle) * bounceForce * this.bounce + randomFactor
          this.vy = Math.abs(Math.sin(angle) * bounceForce * this.bounce) + 0.5

          // Add random spin after collision
          this.rotationSpeed = (Math.random() - 0.5) * 0.3
        }
      })

      // Apply friction with variation
      this.vx *= this.friction

      // Keep ball in bounds horizontally with variable bounce
      if (this.x < this.radius) {
        this.x = this.radius
        this.vx = Math.abs(this.vx) * this.bounce + Math.random() * 0.5
      }
      if (this.x > CANVAS_WIDTH - this.radius) {
        this.x = CANVAS_WIDTH - this.radius
        this.vx = -Math.abs(this.vx) * this.bounce - Math.random() * 0.5
      }

      // Check if ball reached bottom
      if (this.y > CANVAS_HEIGHT - 60) {
        this.finished = true
        this.y = CANVAS_HEIGHT - 60
        this.slot = Math.floor((this.x / CANVAS_WIDTH) * SLOTS)
        this.slot = Math.max(0, Math.min(SLOTS - 1, this.slot))
      }
    }

    draw(ctx) {
      // Don't draw if not active yet
      if (!this.active) return

      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.rotate(this.rotation)

      // Draw ball with gradient
      const gradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius)
      gradient.addColorStop(0, this.color)
      gradient.addColorStop(1, this.color.replace("50%", "30%"))

      ctx.beginPath()
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = this.color.replace("50%", "20%")
      ctx.lineWidth = 2
      ctx.stroke()

      // Add highlight
      ctx.beginPath()
      ctx.arc(-2, -2, this.radius * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.fill()

      ctx.restore()
    }
  }

  // Generate pegs
  const generatePegs = () => {
    const pegs = []
    for (let row = 0; row < ROWS; row++) {
      const pegsInRow = row + 3
      const spacing = CANVAS_WIDTH / (pegsInRow + 1)
      const y = 80 + row * 30

      for (let col = 0; col < pegsInRow; col++) {
        const x = spacing * (col + 1)
        pegs.push({ x, y })
      }
    }
    return pegs
  }

  const pegs = generatePegs()

  // Animation loop
  const animate = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw pegs
    pegs.forEach((peg) => {
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = "#6b7280"
      ctx.fill()
      ctx.strokeStyle = "#4b5563"
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw slots
    const slotWidth = CANVAS_WIDTH / SLOTS
    const currentMultipliers = multipliers[selectedRisk]

    for (let i = 0; i < SLOTS; i++) {
      const x = i * slotWidth
      const y = CANVAS_HEIGHT - 50
      const multiplier = currentMultipliers[i] || 0

      // Color based on multiplier
      let color = "#374151" // default gray
      if (multiplier > 2)
        color = "#059669" // green
      else if (multiplier > 1)
        color = "#0891b2" // blue
      else if (multiplier < 0.5) color = "#dc2626" // red

      ctx.fillStyle = color
      ctx.fillRect(x, y, slotWidth - 2, 40)

      // Draw multiplier text
      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${multiplier}x`, x + slotWidth / 2, y + 25)
    }

    // Update and draw balls
    const updatedBalls = []
    const finishedBalls = []

    balls.forEach((ball) => {
      if (!ball.finished) {
        ball.update(pegs, balls) // Pass all balls for collision detection
        ball.draw(ctx)

        if (ball.finished) {
          finishedBalls.push(ball)
        }

        updatedBalls.push(ball)
      } else {
        // Keep finished balls visible for a moment
        ball.draw(ctx)
        updatedBalls.push(ball)
      }
    })

    // Handle finished balls
    if (finishedBalls.length > 0 && gameState === "dropping") {
      let totalWin = 0
      const results = []

      finishedBalls.forEach((ball) => {
        const multiplier = currentMultipliers[ball.slot] || 0
        const winAmount = betAmount * multiplier
        totalWin += winAmount

        results.push({
          ballId: ball.id + 1,
          slot: ball.slot,
          multiplier: multiplier,
          win: winAmount.toFixed(4),
          color: ball.color,
        })
      })

      // Check if all balls are finished
      const allFinished = updatedBalls.every((ball) => ball.finished)

      if (allFinished) {
        // Collect all ball results
        const allResults = []
        let finalTotalWin = 0

        updatedBalls.forEach((ball) => {
          const multiplier = currentMultipliers[ball.slot] || 0
          const winAmount = betAmount * multiplier
          finalTotalWin += winAmount

          allResults.push({
            ballId: ball.id + 1,
            slot: ball.slot,
            multiplier: multiplier,
            win: winAmount.toFixed(4),
            color: ball.color,
            betAmount: betAmount,
          })
        })

        // Sort results by ball ID
        allResults.sort((a, b) => a.ballId - b.ballId)

        setGameResults({
          results: allResults,
          totalWin: finalTotalWin.toFixed(4),
          totalBet: (betAmount * ballCount).toFixed(4),
          profit: (finalTotalWin - betAmount * ballCount).toFixed(4),
          ballCount: ballCount,
        })

        setLastWin(finalTotalWin.toFixed(4))
        setGameState("finished")

        // Play win sound if there are winnings
        if (finalTotalWin > betAmount * ballCount) {
          playWinSound()
        }

        // Add to history
        setGameHistory((prev) => [
          ...prev.slice(-9),
          {
            bet: betAmount,
            ballCount: ballCount,
            totalWin: finalTotalWin.toFixed(4),
            results: allResults,
          },
        ])

        // Cashout total winnings
        if (finalTotalWin > 0) {
          try {
            await cashoutFromContract(finalTotalWin.toFixed(4))
          } catch (error) {
            console.error("Error cashing out:", error);
            alert(`Error processing payout: ${error.message}`);
          }
        }

        // Clear balls after delay and reset for next game
        setTimeout(() => {
          setBalls([])
        }, 5000) // Increased delay to show results longer
      }
    }

    setBalls(updatedBalls)

    if (gameState === "dropping" || balls.length > 0) {
      animationRef.current = requestAnimationFrame(() => animate())
    }
  }

  // Start game
  const startGame = async () => {
    if (betAmount <= 0) {
      alert("Please enter a valid bet amount")
      return
    }

    if (!account) {
      alert("Please connect your wallet first")
      return
    }

    try {
      await sendToContract()

      // Clear any existing balls first
      setBalls([])
      setGameState("dropping")
      setLastWin(null)
      setGameResults(null) // Clear results when starting new game

      // Create all balls at once with staggered positions
      const newBalls = []
      for (let i = 0; i < ballCount; i++) {
        const ball = new Ball(CANVAS_WIDTH / 2, 20 - i * 15, i) // Stagger vertically
        newBalls.push(ball)
      }

      // Set all balls at once
      setBalls(newBalls)
    } catch (error) {
      console.error("Error starting game:", error);
      alert(`Error starting game: ${error.message}`);
    }
  }

  // Reset game
  const resetGame = () => {
    setBalls([])
    setGameState("ready")
    setLastWin(null)
    setGameResults(null) // Clear results
  }

  // Initialize canvas animation
  useEffect(() => {
    if (canvasRef.current && (gameState === "dropping" || balls.length > 0)) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      animationRef.current = requestAnimationFrame(() => animate())
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, selectedRisk, balls.length])

  // Initialize Ethereum on mount
  useEffect(() => {
    if (window.ethereum) {
      initializeEthers()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-8">
          <a href="./games" className="flex items-center text-gray-300 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Games
          </a>
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            PLINKO
          </h1>
          <div className="text-sm text-gray-400">{"Don't refresh page"}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4 text-gray-300">Game Setup</h3>

                {/* Wallet Connection */}
                <div className="mb-4">
                  {!account ? (
                    <button
                      onClick={initializeEthers}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="text-green-400 font-bold text-center py-3 bg-gray-700 rounded-lg">
                      ✅ Wallet Connected: {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                  )}
                </div>

                {/* Sound Toggle */}
                <div className="mb-4">
                  <label className="flex items-center justify-between text-sm font-medium text-gray-400">
                    Sound Effects
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        soundEnabled ? "bg-blue-600" : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          soundEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Risk Level Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Risk Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["low", "medium", "high"].map((risk) => (
                      <button
                        key={risk}
                        onClick={() => setSelectedRisk(risk)}
                        disabled={gameState === "dropping"}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedRisk === risk
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {risk.charAt(0).toUpperCase() + risk.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Balls */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Number of Balls: {ballCount}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="1"
                      max={maxBalls}
                      value={ballCount}
                      onChange={(e) => setBallCount(Number.parseInt(e.target.value))}
                      disabled={gameState === "dropping"}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex space-x-1">
                      {[1, 5, 10].map((count) => (
                        <button
                          key={count}
                          onClick={() => setBallCount(count)}
                          disabled={gameState === "dropping"}
                          className={`px-2 py-1 text-xs rounded ${
                            ballCount === count
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bet Amount */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bet Amount</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      placeholder="MON"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={gameState === "dropping"}
                      className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Game Controls */}
                {gameState === "ready" && (
                  <button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200 transform hover:-translate-y-1"
                  >
                    Drop Ball
                  </button>
                )}

                {gameState === "dropping" && (
                  <button
                    disabled
                    className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg shadow opacity-50 cursor-not-allowed"
                  >
                    Ball Dropping...
                  </button>
                )}

                {gameState === "finished" && (
                  <button
                    onClick={resetGame}
                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-4 rounded-lg shadow transition-all duration-200"
                  >
                    Drop Another Ball
                  </button>
                )}
              </div>

              {/* Game Stats */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-bold mb-4 text-gray-300">Game Info</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Balls Dropping</div>
                    <div className="text-2xl font-bold">{balls.filter((b) => !b.finished).length}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="text-sm text-gray-400">Total Bet</div>
                    <div className="text-2xl font-bold">{(betAmount * ballCount).toFixed(4)} MON</div>
                  </div>
                </div>

                <h4 className="text-lg font-bold mb-2 text-gray-300">Current Multipliers</h4>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {multipliers[selectedRisk].map((mult, index) => (
                    <div
                      key={index}
                      className={`p-1 rounded text-center ${
                        mult > 2
                          ? "bg-green-900/30 text-green-400"
                          : mult > 1
                            ? "bg-blue-900/30 text-blue-400"
                            : mult < 0.5
                              ? "bg-red-900/30 text-red-400"
                              : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {mult}x
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Display */}
              {lastWin && gameState === "finished" && (
                <div className="mt-4 bg-green-900/30 border border-green-600/30 rounded-lg p-4 text-center animate-pulse">
                  <div className="text-sm text-green-400">You won</div>
                  <div className="text-3xl font-bold text-green-400">{lastWin} MON</div>
                </div>
              )}
            </div>

            {/* Game History */}
            {gameHistory.length > 0 && (
              <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-gray-300">Recent Games</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {gameHistory
                    .slice(-5)
                    .reverse()
                    .map((game, index) => (
                      <div key={index} className="flex justify-between items-center text-sm bg-gray-700 rounded p-2">
                        <span className="text-gray-400">{game.bet} MON</span>
                        <span
                          className={`font-bold ${Number.parseFloat(game.totalWin) > Number.parseFloat(game.bet) ? "text-green-400" : "text-red-400"}`}
                        >
                          {game.results.map((r) => r.multiplier).join(", ")}x
                        </span>
                        <span
                          className={`${Number.parseFloat(game.totalWin) > Number.parseFloat(game.bet) ? "text-green-400" : "text-red-400"}`}
                        >
                          {game.totalWin} MON
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Game Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="w-full border border-gray-600 rounded-lg bg-gray-900"
              />
            </div>

            {/* Detailed Results Display - Only show when game is finished and results exist */}
            {gameResults && gameState === "finished" && (
              <div className="mt-6 space-y-4 transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-bottom-4">
                {/* Overall Results */}
                <div
                  className={`bg-gray-800 rounded-2xl p-6 shadow-xl border ${
                    Number.parseFloat(gameResults.profit) > 0
                      ? "border-green-600/30 bg-green-900/10"
                      : Number.parseFloat(gameResults.profit) < 0
                        ? "border-red-600/30 bg-red-900/10"
                        : "border-gray-600/30"
                  }`}
                >
                  <h3 className="text-xl font-bold mb-4 text-gray-300">Game Results</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Total Bet</div>
                      <div className="text-2xl font-bold">{gameResults.totalBet} MON</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Total Win</div>
                      <div className="text-2xl font-bold text-blue-400">{gameResults.totalWin} MON</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
                      <div
                        className={`text-2xl font-bold ${
                          Number.parseFloat(gameResults.profit) > 0
                            ? "text-green-400"
                            : Number.parseFloat(gameResults.profit) < 0
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {Number.parseFloat(gameResults.profit) > 0 ? "+" : ""}
                        {gameResults.profit} MON
                      </div>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">Winning Balls</div>
                        <div className="font-bold text-green-400">
                          {gameResults.results.filter((r) => Number.parseFloat(r.win) > r.betAmount).length} /{" "}
                          {gameResults.ballCount}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Best Multiplier</div>
                        <div className="font-bold text-blue-400">
                          {Math.max(...gameResults.results.map((r) => r.multiplier))}x
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Ball Results */}
                <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
                  <h3 className="text-xl font-bold mb-4 text-gray-300">Individual Ball Results</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {gameResults.results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3 transition-all duration-200 hover:bg-gray-900/70"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white/20 shadow-lg"
                            style={{ backgroundColor: result.color }}
                          ></div>
                          <span className="text-gray-300 font-medium">Ball #{result.ballId}</span>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Slot</div>
                            <div className="font-medium text-gray-200">{result.slot + 1}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Multiplier</div>
                            <div
                              className={`font-bold ${
                                result.multiplier > 1
                                  ? "text-green-400"
                                  : result.multiplier < 1
                                    ? "text-red-400"
                                    : "text-gray-400"
                              }`}
                            >
                              {result.multiplier}x
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Win</div>
                            <div
                              className={`font-bold ${
                                Number.parseFloat(result.win) > result.betAmount
                                  ? "text-green-400"
                                  : Number.parseFloat(result.win) < result.betAmount
                                    ? "text-red-400"
                                    : "text-gray-400"
                              }`}
                            >
                              {result.win} MON
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* How to Play */}
            <div className="mt-6 bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
              <h3 className="text-xl font-bold mb-4 text-gray-300">How To Play</h3>
              <div className="text-gray-400 space-y-2">
                <p>1. Choose your risk level (Low, Medium, High) - higher risk = higher potential rewards.</p>
                <p>2. Select the number of balls to drop simultaneously.</p>
                <p>3. Enter your bet amount in MON (multiplied by number of balls).</p>
                <p>4. Click "Drop Ball" to release the balls from the top.</p>
                <p>5. Watch as balls bounce off pegs and each other, creating chaotic paths!</p>
                <p>6. Your winnings are calculated based on where each ball lands.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlinkoGame
"use client"
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import { useRouter } from "next/navigation";
import { ArrowLeft } from 'lucide-react';
import './hangman.css';
import './globals.css';
import Navbar from "../navbar";
import contractManager from '../../contract_data/contract-utils';

const Hangman = () => {
  const router = useRouter();
  
  // Game state
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameStatus, setGameStatus] = useState('betting'); // 'betting', 'playing', 'won', 'lost'
  const [showConfetti, setShowConfetti] = useState(false);
  const [betAmount, setBetAmount] = useState(0.01);
  const [difficulty, setDifficulty] = useState(0); // 0: Easy, 1: Medium, 2: Hard
  const [winAmount, setWinAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const easyWords = ['CRYPTO', 'TOKEN', 'COIN', 'HASH', 'BLOCK', 'NODE', 'PEER', 'FORK', 'GAS', 'MINT'];
  const mediumWords = ['BLOCKCHAIN', 'BITCOIN', 'ETHEREUM', 'WALLET', 'MINING', 'STAKING', 'YIELD', 'DEFI', 'NFT', 'LEDGER'];
  const hardWords = ['SMART CONTRACT', 'DECENTRALIZED', 'CONSENSUS', 'LIQUIDITY', 'METAVERSE', 'WEB3', 'VALIDATOR', 'ORACLE', 'SHARDING', 'ZERO KNOWLEDGE'];

  const maxWrongGuesses = 6;

  useEffect(() => {
    if (gameStatus === 'won') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      const result = await contractManager.initialize();
      setAccount(result.account);
      setContract(result.contract);
      setWalletConnected(true);
      console.log("Wallet connected:", result.account);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert(`Error connecting wallet: ${error.message}`);
    }
  };

  const placeBet = async () => {
    if (!walletConnected) {
      alert("Please connect your wallet first!");
      return;
    }

    if (betAmount <= 0) {
      alert("Please enter a valid bet amount!");
      return;
    }

    setIsLoading(true);
    
    try {
      // Place bet on contract
      await contractManager.placeBet(betAmount);
      
      setTimeout(() => {
        let selectedWord;
        if (difficulty === 0) {
          selectedWord = easyWords[Math.floor(Math.random() * easyWords.length)];
        } else if (difficulty === 1) {
          selectedWord = mediumWords[Math.floor(Math.random() * mediumWords.length)];
        } else {
          selectedWord = hardWords[Math.floor(Math.random() * hardWords.length)];
        }
        setWord(selectedWord);
        setGameStatus('playing');
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error placing bet:', error);
      alert(`Error placing bet: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleGuess = (letter) => {
    if (gameStatus !== 'playing' || guessedLetters.has(letter)) return;
    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    if (!word.includes(letter)) {
      const newWrongGuesses = wrongGuesses + 1;
      setWrongGuesses(newWrongGuesses);
      if (newWrongGuesses >= maxWrongGuesses) {
        setGameStatus('lost');
      }
    } else {
      const isWordComplete = word.split('').every(char => char === ' ' || newGuessedLetters.has(char));
      if (isWordComplete) {
        setGameStatus('won');
        let multiplier;
        if (difficulty === 0) multiplier = 1.5;
        else if (difficulty === 1) multiplier = 2.5;
        else multiplier = 4;
        setWinAmount((betAmount * multiplier).toFixed(2));
      }
    }
  };

  const cashOut = async () => {
    try {
      // Cashout winnings from contract
      await contractManager.cashout(winAmount);
      alert(`Successfully cashed out ${winAmount} MON!`);
      resetGame();
    } catch (error) {
      console.error('Error cashing out:', error);
      alert(`You won ${winAmount} MON, but there was an error processing the payout: ${error.message}`);
    }
  };

  const resetGame = () => {
    setGameStatus('betting');
    setWord('');
    setGuessedLetters(new Set());
    setWrongGuesses(0);
    setWinAmount(0);
    setBetAmount(0.01);
    setDifficulty(0);
  };

  const getDifficultyInfo = () => {
    switch(difficulty) {
      case 0: return { name: 'Easy', multiplier: '1.5x' };
      case 1: return { name: 'Medium', multiplier: '2.5x' };
      case 2: return { name: 'Hard', multiplier: '4x' };
      default: return { name: 'Easy', multiplier: '1.5x' };
    }
  };
  const difficultyInfo = getDifficultyInfo();

  const displayWord = word.split('').map((letter, index) => {
    if (letter === ' ') return <span key={index} className="letter-space"> </span>;
    return (
      <span key={index} className={`letter ${guessedLetters.has(letter) || gameStatus === 'lost' ? 'guessed' : ''}`}>
        {guessedLetters.has(letter) || gameStatus === 'lost' ? letter : '_'}
      </span>
    );
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const renderHangman = () => {
    return (
      <svg className="hangman-svg" viewBox="0 0 200 200" width="200" height="200">
        {/* Gallows */}
        <line x1="20" y1="180" x2="180" y2="180" stroke="#4ecdc4" strokeWidth="3"/>
        <line x1="100" y1="180" x2="100" y2="20" stroke="#4ecdc4" strokeWidth="3"/>
        <line x1="100" y1="20" x2="160" y2="20" stroke="#4ecdc4" strokeWidth="3"/>
        <line x1="160" y1="20" x2="160" y2="40" stroke="#4ecdc4" strokeWidth="3"/>
        
        {/* Hangman figure - only show parts based on wrong guesses */}
        {wrongGuesses >= 1 && <circle cx="160" cy="60" r="15" stroke="#ff6b6b" strokeWidth="3" fill="none"/>}
        {wrongGuesses >= 2 && <line x1="160" y1="75" x2="160" y2="100" stroke="#ff6b6b" strokeWidth="3"/>}
        {wrongGuesses >= 3 && <line x1="160" y1="85" x2="140" y2="95" stroke="#ff6b6b" strokeWidth="3"/>}
        {wrongGuesses >= 4 && <line x1="160" y1="85" x2="180" y2="95" stroke="#ff6b6b" strokeWidth="3"/>}
        {wrongGuesses >= 5 && <line x1="160" y1="100" x2="140" y2="120" stroke="#ff6b6b" strokeWidth="3"/>}
        {wrongGuesses >= 6 && <line x1="160" y1="100" x2="180" y2="120" stroke="#ff6b6b" strokeWidth="3"/>}
      </svg>
    );
  };

  const Confetti = () => {
    if (!showConfetti) return null;
    
    return (
      <div className="confetti-container">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffd93d', '#a8e6cf', '#ff8b94'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
      </div>
    );
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
            HANGMAN
          </h1>
          <div className="text-sm text-gray-400">Don't refresh page</div>
        </div>

        <div className="hangman-game">
          <Confetti />
          
          <div className="game-container">
            {/* Left Panel: Game Controls and Info */}
            <div className="left-panel">
              
              {/* TOP: Word Display */}
              <motion.div 
                className="word-display-container"
                key={word}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="word-container">
                  {gameStatus === 'betting' ? 'Place Your Bet' : displayWord}
                </div>
              </motion.div>

              {/* MIDDLE: Interactive Area */}
              <div className="interactive-area">
                {gameStatus === 'betting' && (
                  <motion.div 
                    className="betting-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Wallet Connection */}
                    <div className="wallet-section">
                      {!walletConnected ? (
                        <motion.button 
                          className="connect-wallet-btn" 
                          onClick={connectWallet}
                          whileHover={{ scale: 1.05 }} 
                          whileTap={{ scale: 0.95 }}
                        >
                          Connect Wallet
                        </motion.button>
                      ) : (
                        <div className="wallet-connected">
                          ✅ Wallet Connected: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connected'}
                        </div>
                      )}
                    </div>

                    <div className="difficulty-section">
                      <h3>Select Difficulty</h3>
                      <div className="difficulty-buttons">
                        {[
                          { id: 0, name: 'Easy', multiplier: '1.5x', color: '#4ecdc4' },
                          { id: 1, name: 'Medium', multiplier: '2.5x', color: '#ffd93d' },
                          { id: 2, name: 'Hard', multiplier: '4x', color: '#ff6b6b' }
                        ].map((diff) => (
                          <motion.button 
                            key={diff.id} 
                            className={`difficulty-btn ${difficulty === diff.id ? 'active' : ''}`} 
                            onClick={() => setDifficulty(diff.id)} 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            style={{ borderColor: diff.color, backgroundColor: difficulty === diff.id ? diff.color : 'transparent' }}
                          >
                            <div className="difficulty-name">{diff.name}</div>
                            <div className="difficulty-multiplier">{diff.multiplier}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="bet-section">
                      <h3>Bet Amount (MON)</h3>
                      <input 
                        type="number" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.01)} 
                        min="0.01" 
                        max="5" 
                        step="0.01" 
                        className="bet-input" 
                      />
                      <p className="bet-info">Min: 0.01 MON | Max: 5 MON</p>
                    </div>

                    <motion.button 
                      className="place-bet-btn" 
                      onClick={placeBet} 
                      disabled={isLoading || betAmount <= 0 || !walletConnected} 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }}
                    >
                      {isLoading ? 'Shuffling Words...' : `Place Bet & Play`}
                    </motion.button>
                  </motion.div>
                )}

                {gameStatus === 'playing' && (
                  <motion.div 
                    className="keyboard" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ duration: 0.5 }}
                  >
                    <div className="keyboard-grid">
                      {alphabet.map((letter) => (
                        <motion.button 
                          key={letter} 
                          className={`key ${guessedLetters.has(letter) ? (word.includes(letter) ? 'correct' : 'wrong') : ''}`} 
                          onClick={() => handleGuess(letter)} 
                          disabled={guessedLetters.has(letter)} 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.95 }}
                        >
                          {letter}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {(gameStatus === 'won' || gameStatus === 'lost') && (
                  <motion.div 
                    className="game-status" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ duration: 0.5 }}
                  >
                    {gameStatus === 'won' && (
                      <div className="status-message won">
                        <h3>🎉 You Won! 🎉</h3>
                        <p className="winnings-highlight">You won <strong>{winAmount} MON</strong>!</p>
                        <motion.button 
                          className="cashout-btn" 
                          onClick={cashOut} 
                          whileHover={{ scale: 1.05 }} 
                          whileTap={{ scale: 0.95 }}
                        >
                          Play Again
                        </motion.button>
                      </div>
                    )}
                    {gameStatus === 'lost' && (
                      <div className="status-message lost">
                        <h3>💀 Game Over 💀</h3>
                        <p>The word was: <strong>{word}</strong></p>
                        <motion.button 
                          className="new-game-btn" 
                          onClick={resetGame} 
                          whileHover={{ scale: 1.05 }} 
                          whileTap={{ scale: 0.95 }}
                        >
                          Try Again
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* BOTTOM: Game Info and Rules */}
              <div className="info-panel">
                <div className="game-stats">
                  <div className="stat-item">
                    <span>Bet</span>
                    <p>{betAmount.toFixed(2)} MON</p>
                  </div>
                  <div className="stat-item">
                    <span>Multiplier</span>
                    <p>{difficultyInfo.multiplier}</p>
                  </div>
                  <div className="stat-item">
                    <span>Errors</span>
                    <p>{wrongGuesses} / {maxWrongGuesses}</p>
                  </div>
                </div>
                <div className="rules-section">
                  <h4>🎯 How to Play</h4>
                  <p>Guess the crypto-themed word. You have 6 chances to make a mistake. Good luck!</p>
                </div>
              </div>
            </div>

            {/* Right Panel: Hangman Drawing */}
            <div className="right-panel">
              <motion.div 
                className="hangman-section"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {renderHangman()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hangman;
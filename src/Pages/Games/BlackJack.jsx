import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { useRouter } from 'next/navigation';
import contractABI from "../../contract_data/Mines.json";
import contractAddress from "../../contract_data/Mines-address.json";
import { switchToMonadNetwork, isConnectedToMonad } from "../../contract_data/monad-config";
import './App.css';

// Define types
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Confetti component
const Confetti = ({ active }) => {
  if (!active) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none">
      {Array(100).fill().map((_, i) => (
        <div 
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            backgroundColor: ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B'][Math.floor(Math.random() * 6)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${Math.random() * 5}s`,
            zIndex: 50,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
};

// Helper functions
function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, numericValue: calculateCardValue(value) });
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

function calculateCardValue(value) {
  if (value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(value)) return 10;
  return parseInt(value);
}

function calculateHandScore(hand) {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === 'A') aces += 1;
    score += card.numericValue;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function Hand({ cards, isDealer = false, gameStatus, animate = false }) {
  return (
    <div className="flex justify-center gap-2">
      {cards.map((card, index) => {
        if (isDealer && index === 1 && gameStatus !== 'gameOver') {
          return (
            <div key={index} className="w-20 h-32 bg-gray-700 rounded-lg shadow-md flex items-center justify-center border border-gray-600">
              <div className="w-8 h-8 rounded-full bg-gray-600"></div>
            </div>
          );
        }

        const suitColor = card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black';
        const suitSymbol = card.suit === 'hearts' ? '♥️' : card.suit === 'diamonds' ? '♦️' : card.suit === 'clubs' ? '♣️' : '♠️';

        return (
          <div 
            key={index} 
            className={`w-20 h-32 bg-white rounded-lg shadow-md flex flex-col items-center justify-between p-2 ${
              animate && index === cards.length - 1 ? 'animate-dealCard' : ''
            }`}
          >
            <div className={`text-2xl font-bold self-start ${suitColor}`}>{card.value}</div>
            <div className={`text-3xl ${suitColor}`}>{suitSymbol}</div>
            <div className={`text-2xl font-bold self-end rotate-180 ${suitColor}`}>{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function BlackjackGame() {
  const router = useRouter();
  
  // Game state
  const [gameState, setGameState] = useState({
    playerHand: [],
    dealerHand: [],
    deck: createDeck(),
    playerScore: 0,
    dealerScore: 0,
    gameStatus: 'betting',
    bet: 0,
    message: 'Place your bet!',
  });
  
  // UI state
  const [showConfetti, setShowConfetti] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Web3 state
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);

  // Connect to wallet
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
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
          const _contract = new ethers.Contract(
            contractAddress.address,
            contractABI.abi,
            _signer
          );
          
          setProvider(_provider);
          setContract(_contract);
          
          const accounts = await _provider.send("eth_requestAccounts", []);
          setAccount(accounts[0]);
          
          window.ethereum.on("accountsChanged", (accounts) => {
            setAccount(accounts[0] || null);
          });
          
          window.ethereum.on("chainChanged", () => window.location.reload());
        } catch (error) {
          console.error("Wallet connection error:", error);
        }
      }
    };
    connectWallet();
  }, []);

  // Place bet with Web3
  const placeBet = async (amount) => {
    if (gameState.gameStatus !== 'betting') return;
    
    try {
      setIsLoading(true);
      const tx = await contract.bet({
        value: ethers.parseEther(amount.toString()),
        gasLimit: 200_000n
      });
      await tx.wait();
      
      setGameState(prev => ({
        ...prev,
        bet: amount,
        message: 'Click Deal to start!',
      }));
    } catch (error) {
      console.error("Bet failed:", error);
      setGameState(prev => ({ ...prev, message: 'Bet failed! Try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Cash out winnings
  const cashOut = async (amount) => {
    try {
      setIsLoading(true);
      const tx = await contract.sendEtherFromContract(
        account,
        ethers.parseEther(amount.toString())
      );
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Cashout failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Deal cards
  const dealCards = () => {
    if (gameState.bet === 0) {
      setGameState(prev => ({ ...prev, message: 'Please place a bet first!' }));
      return;
    }

    const newDeck = [...gameState.deck];
    const playerHand = [newDeck.pop(), newDeck.pop()];
    const dealerHand = [newDeck.pop(), newDeck.pop()];
    const playerScore = calculateHandScore(playerHand);

    setAnimateCards(true);
    setTimeout(() => setAnimateCards(false), 1000);
    setPlayerWon(false);

    setGameState(prev => ({
      ...prev,
      playerHand,
      dealerHand,
      deck: newDeck,
      playerScore,
      dealerScore: calculateHandScore([dealerHand[0]]),
      gameStatus: 'playing',
      message: '',
    }));
  };

  // Player hits
  const hit = () => {
    const newDeck = [...gameState.deck];
    const newCard = newDeck.pop();
    const newHand = [...gameState.playerHand, newCard];
    const newScore = calculateHandScore(newHand);

    setAnimateCards(true);
    setTimeout(() => setAnimateCards(false), 500);

    if (newScore > 21) {
      setGameState(prev => ({
        ...prev,
        playerHand: newHand,
        playerScore: newScore,
        gameStatus: 'gameOver',
        message: 'Bust! You lose!',
      }));
      setPlayerWon(false);
    } else {
      setGameState(prev => ({
        ...prev,
        playerHand: newHand,
        playerScore: newScore,
        deck: newDeck,
      }));
    }
  };

  // Player stands
  const stand = async () => {
    let currentDealerHand = [...gameState.dealerHand];
    let currentDeck = [...gameState.deck];
    let dealerScore = calculateHandScore(currentDealerHand);

    while (dealerScore < 17) {
      const newCard = currentDeck.pop();
      currentDealerHand.push(newCard);
      dealerScore = calculateHandScore(currentDealerHand);
    }

    let message;
    let winAmount = 0;
    let didPlayerWin = false;

    if (dealerScore > 21 || dealerScore < gameState.playerScore) {
      message = '🎉 Congratulations! You win! 🎉';
      winAmount = gameState.bet * 2;
      setShowConfetti(true);
      setShowWinMessage(true);
      didPlayerWin = true;
      setTimeout(() => setShowConfetti(false), 6000);
      setTimeout(() => setShowWinMessage(false), 6000);
    } else if (dealerScore > gameState.playerScore) {
      message = 'Dealer wins!';
      didPlayerWin = false;
    } else {
      message = 'Push!';
      winAmount = gameState.bet;
      didPlayerWin = false;
    }

    if (didPlayerWin || winAmount > 0) {
      const success = await cashOut(winAmount);
      if (!success) {
        message = 'Cashout failed! Contact support.';
      }
    }

    setPlayerWon(didPlayerWin);
    setGameState(prev => ({
      ...prev,
      dealerHand: currentDealerHand,
      dealerScore,
      deck: currentDeck,
      gameStatus: 'gameOver',
      message,
    }));
  };

  // Reset game
  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      playerHand: [],
      dealerHand: [],
      deck: createDeck(),
      playerScore: 0,
      dealerScore: 0,
      gameStatus: 'betting',
      bet: 0,
      message: 'Place your bet!',
    }));
    setPlayerWon(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-between p-4 relative overflow-hidden">
      <Confetti active={showConfetti} />
      
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
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
          <h1 className="text-4xl font-bold text-center text-cyan-400 flex-grow">
            Blackjack
          </h1>
          
        </div>
        
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700">
              <div className="flex flex-col items-center gap-8">
                <div className="text-center w-full">
                  <h3 className="text-cyan-400 mb-2 text-lg">Dealer's Hand</h3>
                  <div className="h-40">
                    {gameState.dealerHand.length > 0 && (
                      <Hand
                        cards={gameState.dealerHand}
                        isDealer={true}
                        gameStatus={gameState.gameStatus}
                        animate={animateCards}
                      />
                    )}
                  </div>
                  {(gameState.gameStatus === 'gameOver' || gameState.dealerScore > 0) && (
                    <div className="text-green-400 mt-2">Score: {gameState.dealerScore}</div>
                  )}
                </div>

                <div className="text-center w-full">
                  <h3 className="text-cyan-400 mb-2 text-lg">Your Hand</h3>
                  <div className="h-40">
                    {gameState.playerHand.length > 0 && (
                      <Hand
                        cards={gameState.playerHand}
                        gameStatus={gameState.gameStatus}
                        animate={animateCards}
                      />
                    )}
                  </div>
                  {gameState.playerHand.length > 0 && (
                    <div className="text-green-400 mt-2">Score: {gameState.playerScore}</div>
                  )}
                </div>
              </div>

              {showWinMessage && (
                <div className="mt-4 mb-4 text-center">
                  <div className="bg-green-900 text-green-300 py-3 px-6 rounded-lg inline-block animate-pulse">
                    🎉 Congratulations! You win! 🎉
                  </div>
                </div>
              )}

              <div className="mt-8">
                {gameState.message && (
                  <div className={`text-cyan-400 text-center text-lg mb-4 ${gameState.message.includes('Congratulations') ? 'animate-pulse font-bold' : ''}`}>
                    {gameState.message}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {gameState.gameStatus === 'betting' && (
                    <>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[0.1, 0.25, 0.5, 1].map(amount => (
                          <button
                            key={amount}
                            onClick={() => placeBet(amount)}
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                              isLoading 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                          >
                            {amount} ETH
                          </button>
                        ))}
                      </div>
                      {gameState.bet > 0 && (
                        <button
                          onClick={dealCards}
                          disabled={isLoading}
                          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-500 font-semibold transition-all transform hover:scale-105 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                          </svg>
                          Deal Cards
                        </button>
                      )}
                    </>
                  )}

                  {gameState.gameStatus === 'playing' && (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={hit}
                        disabled={isLoading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 font-semibold transition-all transform hover:scale-105"
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Hit
                        </span>
                      </button>
                      <button
                        onClick={stand}
                        disabled={isLoading}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-500 font-semibold transition-all transform hover:scale-105"
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          Stand
                        </span>
                      </button>
                    </div>
                  )}

                  {gameState.gameStatus === 'gameOver' && (
                    <button
                      onClick={resetGame}
                      disabled={isLoading}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-500 font-semibold transition-all transform hover:scale-105"
                    >
                      Play Again
                    </button>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <div className="bg-gray-700 p-4 rounded-lg text-center flex-1 mr-2">
                    <div className="text-gray-400 text-sm">Current Bet</div>
                    <div className="text-yellow-400 text-xl">{gameState.bet} ETH</div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg text-center flex-1 ml-2">
                    <div className="text-gray-400 text-sm">Game Status</div>
                    <div className="text-cyan-400 text-xl capitalize">
                      {gameState.gameStatus === 'gameOver' ? 'Game Over' : gameState.gameStatus}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6 border border-gray-700">
              <h2 className="text-cyan-400 text-2xl mb-4">How To Play</h2>
              <ol className="text-gray-300 space-y-3">
                <li>
                  <span className="text-cyan-400 font-semibold mr-2">1.</span>
                  Place your bet in ETH
                </li>
                <li>
                  <span className="text-cyan-400 font-semibold mr-2">2.</span>
                  Click "Deal Cards" to start
                </li>
                <li>
                  <span className="text-cyan-400 font-semibold mr-2">3.</span>
                  Hit to draw cards or Stand to keep your hand
                </li>
                <li>
                  <span className="text-cyan-400 font-semibold mr-2">4.</span>
                  Beat the dealer without going over 21
                </li>
                <li>
                  <span className="text-cyan-400 font-semibold mr-2">5.</span>
                  Winnings are automatically paid to your wallet
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
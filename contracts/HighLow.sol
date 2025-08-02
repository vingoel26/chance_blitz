// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HighLow {
    // Events
    event GameStarted(address indexed player, uint256 bet, uint256 firstCard);
    event GuessMade(address indexed player, uint256 secondCard, bool isCorrect, uint256 streak);
    event CashOut(address indexed player, uint256 amount);
    event GameEnded(address indexed player, bool isWin, uint256 winAmount);
    event BetPlaced(address indexed player, uint256 amount);

    // Game state
    struct Game {
        uint256 firstCard;
        uint256 secondCard;
        uint256 betAmount;
        uint256 startTime;
        bool isActive;
        bool isCompleted;
        uint256 streak;
        uint256 multiplier; // 1000 = 1.0
        address player;
    }

    // Player state
    mapping(address => Game) public activeGames;
    mapping(address => uint256) public playerStreaks;
    mapping(address => uint256) public playerMultipliers;
    mapping(address => uint256) public playerBalance;

    // Constants
    uint256 public constant GAME_TIMEOUT = 10; // 10 seconds
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant MAX_BET = 10 ether;

    // Card values (2-14, where 14 = Ace)
    uint256 public constant MIN_CARD_VALUE = 2;
    uint256 public constant MAX_CARD_VALUE = 14;

    // Modifiers
    modifier onlyActiveGame() {
        require(activeGames[msg.sender].isActive, "No active game");
        require(!activeGames[msg.sender].isCompleted, "Game already completed");
        _;
    }

    modifier gameNotExpired() {
        require(block.timestamp <= activeGames[msg.sender].startTime + GAME_TIMEOUT, "Game expired");
        _;
    }

    // Simple bet function for local game logic
    function placeBet() public payable {
        require(msg.value >= MIN_BET, "Bet too small");
        require(msg.value <= MAX_BET, "Bet too large");
        
        // Just store the bet amount in player balance for now
        playerBalance[msg.sender] += msg.value;
        
        emit BetPlaced(msg.sender, msg.value);
    }

    // Start a new game
    function startGame() public payable {
        require(msg.value >= MIN_BET, "Bet too small");
        require(msg.value <= MAX_BET, "Bet too large");
        require(!activeGames[msg.sender].isActive, "Game already in progress");

        // Generate first card using block data
        uint256 firstCard = _generateCard(msg.sender, block.timestamp);
        
        // Create new game
        activeGames[msg.sender] = Game({
            firstCard: firstCard,
            secondCard: 0,
            betAmount: msg.value,
            startTime: block.timestamp,
            isActive: true,
            isCompleted: false,
            streak: 0,
            multiplier: 1000, // 1.0 as integer (1000 = 1.0)
            player: msg.sender
        });

        emit GameStarted(msg.sender, msg.value, firstCard);
    }

    // Make a guess (higher or lower)
    function makeGuess(bool isHigher) public onlyActiveGame gameNotExpired {
        Game storage game = activeGames[msg.sender];
        
        // Generate second card
        uint256 secondCard = _generateCard(msg.sender, block.timestamp + 1);
        game.secondCard = secondCard;

        bool isCorrect = false;
        
        // Check if guess is correct
        if (isHigher && secondCard > game.firstCard) {
            isCorrect = true;
        } else if (!isHigher && secondCard < game.firstCard) {
            isCorrect = true;
        }

        if (isCorrect) {
            // Win - increase streak and multiplier
            game.streak++;
            game.multiplier = 1000 + (game.streak * 100); // 1.0 + (streak * 0.1)
            
            // Update player stats
            playerStreaks[msg.sender] = game.streak;
            playerMultipliers[msg.sender] = game.multiplier;
            
            emit GuessMade(msg.sender, secondCard, true, game.streak);
        } else {
            // Lose - reset streak and multiplier
            game.streak = 0;
            game.multiplier = 1000;
            game.isCompleted = true;
            game.isActive = false;
            
            playerStreaks[msg.sender] = 0;
            playerMultipliers[msg.sender] = 1000;
            
            emit GuessMade(msg.sender, secondCard, false, 0);
        }
    }

    // Cash out winnings
    function cashOut() public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        require(game.streak > 0, "No winnings to cash out");
        
        // Calculate winnings
        uint256 winnings = (game.betAmount * game.multiplier) / 1000;
        
        // Reset game
        game.isCompleted = true;
        game.isActive = false;
        game.streak = 0;
        game.multiplier = 1000;
        
        playerStreaks[msg.sender] = 0;
        playerMultipliers[msg.sender] = 1000;
        
        // Add to player balance
        playerBalance[msg.sender] += winnings;
        
        emit CashOut(msg.sender, winnings);
        emit GameEnded(msg.sender, true, winnings);
    }

    // Withdraw winnings
    function withdraw() public {
        uint256 balance = playerBalance[msg.sender];
        require(balance > 0, "No winnings to withdraw");
        
        playerBalance[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
        
        emit CashOut(msg.sender, balance);
    }

    // Get player's active game
    function getGame(address player) public view returns (Game memory) {
        return activeGames[player];
    }

    // Get player stats
    function getPlayerStats(address player) public view returns (uint256 streak, uint256 multiplier) {
        return (playerStreaks[player], playerMultipliers[player]);
    }

    // Get time remaining for current game
    function getTimeRemaining(address player) public view returns (uint256) {
        Game storage game = activeGames[player];
        if (!game.isActive) return 0;
        
        uint256 elapsed = block.timestamp - game.startTime;
        if (elapsed >= GAME_TIMEOUT) return 0;
        
        return GAME_TIMEOUT - elapsed;
    }

    // Get player balance
    function getPlayerBalance(address player) public view returns (uint256) {
        return playerBalance[player];
    }

    // Generate card value (2-14)
    function _generateCard(address player, uint256 seed) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(player, seed, block.timestamp)));
        return (random % (MAX_CARD_VALUE - MIN_CARD_VALUE + 1)) + MIN_CARD_VALUE;
    }

    // Get contract balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    // Reset game state (for testing)
    function resetGame() public {
        Game storage game = activeGames[msg.sender];
        if (game.isActive) {
            game.isCompleted = true;
            game.isActive = false;
            game.streak = 0;
            game.multiplier = 1000;
            
            playerStreaks[msg.sender] = 0;
            playerMultipliers[msg.sender] = 1000;
        }
    }
} 
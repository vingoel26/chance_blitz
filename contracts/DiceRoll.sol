// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DiceRoll {
    // Events
    event DiceRolled(address indexed player, uint256 bet, uint256 dice1, uint256 dice2, uint256 sum, bool isWin, uint256 winAmount);
    event BetPlaced(address indexed player, uint256 amount);
    event CashOut(address indexed player, uint256 amount);

    // Game state
    struct Game {
        uint256 bet;
        uint256 dice1;
        uint256 dice2;
        uint256 sum;
        bool isWin;
        uint256 winAmount;
        bool isActive;
        uint256 timestamp;
    }

    // Player state
    mapping(address => Game) public activeGames;
    mapping(address => uint256) public playerBalance;

    // Constants
    uint256 public constant MIN_BET = 0.01 ether;
    uint256 public constant MAX_BET = 10 ether;
    uint256 public constant HOUSE_EDGE = 2; // 2% house edge

    // Modifiers
    modifier onlyActiveGame() {
        require(activeGames[msg.sender].isActive, "No active game");
        _;
    }

    modifier validBet(uint256 bet) {
        require(bet >= MIN_BET, "Bet too small");
        require(bet <= MAX_BET, "Bet too large");
        _;
    }

    // Place a bet
    function placeBet() public payable validBet(msg.value) {
        require(!activeGames[msg.sender].isActive, "Game already in progress");
        
        activeGames[msg.sender] = Game({
            bet: msg.value,
            dice1: 0,
            dice2: 0,
            sum: 0,
            isWin: false,
            winAmount: 0,
            isActive: true,
            timestamp: block.timestamp
        });

        emit BetPlaced(msg.sender, msg.value);
    }

    // Roll the dice
    function rollDice(uint256 prediction) public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        
        // Generate dice values using block data
        uint256 dice1 = _generateDice(msg.sender, block.timestamp);
        uint256 dice2 = _generateDice(msg.sender, block.timestamp + 1);
        uint256 sum = dice1 + dice2;
        
        game.dice1 = dice1;
        game.dice2 = dice2;
        game.sum = sum;
        
        // Determine win based on prediction
        bool isWin = false;
        uint256 winAmount = 0;
        
        if (prediction == 0) {
            // Under 7
            isWin = sum < 7;
            if (isWin) winAmount = (game.bet * 2 * (100 - HOUSE_EDGE)) / 100;
        } else if (prediction == 1) {
            // Over 7
            isWin = sum > 7;
            if (isWin) winAmount = (game.bet * 2 * (100 - HOUSE_EDGE)) / 100;
        } else if (prediction == 2) {
            // Exactly 7
            isWin = sum == 7;
            if (isWin) winAmount = (game.bet * 4 * (100 - HOUSE_EDGE)) / 100;
        }
        
        game.isWin = isWin;
        game.winAmount = winAmount;
        game.isActive = false;
        
        // Update player balance
        if (isWin) {
            playerBalance[msg.sender] += winAmount;
        }
        
        emit DiceRolled(msg.sender, game.bet, dice1, dice2, sum, isWin, winAmount);
    }

    // Cash out winnings
    function cashOut() public {
        uint256 balance = playerBalance[msg.sender];
        require(balance > 0, "No winnings to cash out");
        
        playerBalance[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
        
        emit CashOut(msg.sender, balance);
    }

    // Get player's active game
    function getActiveGame(address player) public view returns (Game memory) {
        return activeGames[player];
    }

    // Get player balance
    function getPlayerBalance(address player) public view returns (uint256) {
        return playerBalance[player];
    }

    // Generate dice value (1-6)
    function _generateDice(address player, uint256 seed) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(player, seed, block.timestamp)));
        return (random % 6) + 1;
    }

    // Get contract balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Reset game (for testing)
    function resetGame() public {
        delete activeGames[msg.sender];
        playerBalance[msg.sender] = 0;
    }
} 
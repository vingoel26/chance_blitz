// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SpinWheel {
    // Events
    event SpinWheelSpun(address indexed player, uint256 bet, uint256 result, uint256 multiplier, bool isWin, uint256 winAmount);
    event BetPlaced(address indexed player, uint256 amount, uint256 riskLevel);
    event CashOut(address indexed player, uint256 amount);

    // Game state
    struct Game {
        uint256 bet;
        uint256 riskLevel; // 0=Low, 1=Medium, 2=High
        uint256 result;
        uint256 multiplier;
        bool isWin;
        uint256 winAmount;
        bool isActive;
        uint256 timestamp;
    }

    // Player state
    mapping(address => Game) public activeGames;
    mapping(address => uint256) public playerBalance;

    // Constants
    uint256 public constant MIN_BET = 1 ether;
    uint256 public constant MAX_BET = 100 ether;
    uint256 public constant HOUSE_EDGE = 2; // 2% house edge

    // Multipliers for different risk levels
    uint256[3][3] public multipliers = [
        [2, 3, 5],    // Low risk
        [5, 10, 20],  // Medium risk
        [20, 50, 100] // High risk
    ];

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
    function placeBet(uint256 riskLevel) public payable validBet(msg.value) {
        require(!activeGames[msg.sender].isActive, "Game already in progress");
        require(riskLevel < 3, "Invalid risk level");
        
        activeGames[msg.sender] = Game({
            bet: msg.value,
            riskLevel: riskLevel,
            result: 0,
            multiplier: 0,
            isWin: false,
            winAmount: 0,
            isActive: true,
            timestamp: block.timestamp
        });

        emit BetPlaced(msg.sender, msg.value, riskLevel);
    }

    // Spin the wheel
    function spinWheel() public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        
        // Generate result (0-2 for the three segments)
        uint256 result = _generateResult(msg.sender, block.timestamp);
        uint256 multiplier = multipliers[game.riskLevel][result];
        
        game.result = result;
        game.multiplier = multiplier;
        
        // Determine win (random chance based on risk level)
        bool isWin = _determineWin(game.riskLevel, result);
        uint256 winAmount = 0;
        
        if (isWin) {
            winAmount = (game.bet * multiplier * (100 - HOUSE_EDGE)) / 100;
            playerBalance[msg.sender] += winAmount;
        }
        
        game.isWin = isWin;
        game.winAmount = winAmount;
        game.isActive = false;
        
        emit SpinWheelSpun(msg.sender, game.bet, result, multiplier, isWin, winAmount);
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

    // Get multipliers for a risk level
    function getMultipliers(uint256 riskLevel) public view returns (uint256[3] memory) {
        require(riskLevel < 3, "Invalid risk level");
        return multipliers[riskLevel];
    }

    // Generate result (0-2)
    function _generateResult(address player, uint256 seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(player, seed, block.timestamp))) % 3;
    }

    // Determine win based on risk level and result
    function _determineWin(uint256 riskLevel, uint256 result) internal view returns (bool) {
        uint256 winChance;
        
        if (riskLevel == 0) {
            // Low risk: 60% chance to win
            winChance = 60;
        } else if (riskLevel == 1) {
            // Medium risk: 30% chance to win
            winChance = 30;
        } else {
            // High risk: 10% chance to win
            winChance = 10;
        }
        
        uint256 random = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, result))) % 100;
        return random < winChance;
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
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BlackJack {
    // Events
    event GameStarted(address indexed player, uint256 bet);
    event CardDealt(address indexed player, uint256 card, uint256 playerScore, uint256 dealerScore);
    event GameEnded(address indexed player, bool isWin, uint256 winAmount);
    event BetPlaced(address indexed player, uint256 amount);
    event CashOut(address indexed player, uint256 amount);

    // Game state
    struct Game {
        uint256 bet;
        uint256[] playerCards;
        uint256[] dealerCards;
        uint256 playerScore;
        uint256 dealerScore;
        bool isActive;
        bool isWin;
        uint256 winAmount;
        uint256 timestamp;
    }

    // Player state
    mapping(address => Game) public activeGames;
    mapping(address => uint256) public playerBalance;

    // Constants
    uint256 public constant MIN_BET = 0.1 ether;
    uint256 public constant MAX_BET = 10 ether;
    uint256 public constant HOUSE_EDGE = 2; // 2% house edge
    uint256 public constant BLACKJACK_PAYOUT = 3; // 3:2 payout for blackjack

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

    // Place a bet and start game
    function placeBet() public payable validBet(msg.value) {
        require(!activeGames[msg.sender].isActive, "Game already in progress");
        
        // Initialize game
        activeGames[msg.sender] = Game({
            bet: msg.value,
            playerCards: new uint256[](0),
            dealerCards: new uint256[](0),
            playerScore: 0,
            dealerScore: 0,
            isActive: true,
            isWin: false,
            winAmount: 0,
            timestamp: block.timestamp
        });

        emit BetPlaced(msg.sender, msg.value);
        emit GameStarted(msg.sender, msg.value);
    }

    // Deal initial cards
    function dealCards() public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        require(game.playerCards.length == 0, "Cards already dealt");
        
        // Deal two cards to player
        uint256 card1 = _generateCard(msg.sender, block.timestamp);
        uint256 card2 = _generateCard(msg.sender, block.timestamp + 1);
        
        game.playerCards.push(card1);
        game.playerCards.push(card2);
        game.playerScore = _calculateScore(game.playerCards);
        
        // Deal two cards to dealer (one face down)
        uint256 dealerCard1 = _generateCard(msg.sender, block.timestamp + 2);
        uint256 dealerCard2 = _generateCard(msg.sender, block.timestamp + 3);
        
        game.dealerCards.push(dealerCard1);
        game.dealerCards.push(dealerCard2);
        game.dealerScore = _calculateScore(game.dealerCards);
        
        emit CardDealt(msg.sender, card1, game.playerScore, dealerCard1);
        emit CardDealt(msg.sender, card2, game.playerScore, dealerCard1);
    }

    // Hit (draw a card)
    function hit() public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        require(game.playerCards.length >= 2, "Must deal cards first");
        require(game.playerScore < 21, "Cannot hit on 21 or bust");
        
        uint256 newCard = _generateCard(msg.sender, block.timestamp + game.playerCards.length);
        game.playerCards.push(newCard);
        game.playerScore = _calculateScore(game.playerCards);
        
        emit CardDealt(msg.sender, newCard, game.playerScore, game.dealerScore);
        
        // Check for bust
        if (game.playerScore > 21) {
            _endGame(false);
        }
    }

    // Stand (dealer's turn)
    function stand() public onlyActiveGame {
        Game storage game = activeGames[msg.sender];
        require(game.playerCards.length >= 2, "Must deal cards first");
        require(game.playerScore <= 21, "Player busted");
        
        // Dealer hits until 17 or higher
        while (game.dealerScore < 17) {
            uint256 newCard = _generateCard(msg.sender, block.timestamp + 100 + game.dealerCards.length);
            game.dealerCards.push(newCard);
            game.dealerScore = _calculateScore(game.dealerCards);
            
            emit CardDealt(msg.sender, newCard, game.playerScore, game.dealerScore);
        }
        
        // Determine winner
        bool isWin = _determineWinner(game.playerScore, game.dealerScore);
        _endGame(isWin);
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

    // Calculate score from cards
    function _calculateScore(uint256[] memory cards) internal pure returns (uint256) {
        uint256 score = 0;
        uint256 aces = 0;
        
        for (uint256 i = 0; i < cards.length; i++) {
            uint256 cardValue = cards[i] % 13 + 1; // 1-13
            
            if (cardValue == 1) {
                // Ace
                aces++;
                score += 11;
            } else if (cardValue >= 10) {
                // Face cards
                score += 10;
            } else {
                score += cardValue;
            }
        }
        
        // Adjust aces if needed
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        
        return score;
    }

    // Generate card value (1-13)
    function _generateCard(address player, uint256 seed) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(player, seed, block.timestamp)));
        return (random % 13) + 1;
    }

    // Determine winner
    function _determineWinner(uint256 playerScore, uint256 dealerScore) internal pure returns (bool) {
        if (playerScore > 21) return false; // Player bust
        if (dealerScore > 21) return true;  // Dealer bust
        return playerScore > dealerScore;    // Higher score wins
    }

    // End game and calculate winnings
    function _endGame(bool isWin) internal {
        Game storage game = activeGames[msg.sender];
        game.isActive = false;
        game.isWin = isWin;
        
        uint256 winAmount = 0;
        if (isWin) {
            // Check for blackjack (21 with 2 cards)
            if (game.playerScore == 21 && game.playerCards.length == 2) {
                winAmount = (game.bet * BLACKJACK_PAYOUT * (100 - HOUSE_EDGE)) / 100;
            } else {
                winAmount = (game.bet * 2 * (100 - HOUSE_EDGE)) / 100;
            }
            playerBalance[msg.sender] += winAmount;
        }
        
        game.winAmount = winAmount;
        
        emit GameEnded(msg.sender, isWin, winAmount);
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
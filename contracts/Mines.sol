// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Mines {
    // Event for logging received bets
    event BetPlaced(address indexed player, uint256 amount);
    event CashoutSuccessful(address indexed player, uint256 amount);

    // Function to place a bet
    function bet() public payable {
        require(msg.value > 0, "Bet must be greater than 0");
        emit BetPlaced(msg.sender, msg.value);
        // Funds are automatically stored in the contract
    }

    // Allow receiving plain Ether transfers
    receive() external payable {
        emit BetPlaced(msg.sender, msg.value);
    }

    // Optional fallback to handle unexpected function calls
    fallback() external payable {
        emit BetPlaced(msg.sender, msg.value);
    }
    
    function sendEtherFromContract(address payable recipient, uint256 amount) public {
        require(address(this).balance >= amount, "Insufficient contract balance");
        require(recipient != address(0), "Invalid recipient address");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit CashoutSuccessful(recipient, amount);
    }
    
    // Get contract balance
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
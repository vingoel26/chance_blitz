"use client";
import React from 'react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#191919] text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
          Contact Us
        </h1>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">
              Get in Touch
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">
                  🎮 Gaming Support
                </h3>
                <p className="text-gray-300">
                  Having issues with our blockchain games? Need help with wallet connections or contract interactions?
                </p>
                <p className="text-cyan-400 mt-2">
                  Email: support@chanceblitz.com
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">
                  💰 Technical Support
                </h3>
                <p className="text-gray-300">
                  Questions about smart contracts, Monad network, or blockchain transactions?
                </p>
                <p className="text-cyan-400 mt-2">
                  Email: tech@chanceblitz.com
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">
                  🤝 Partnerships
                </h3>
                <p className="text-gray-300">
                  Interested in integrating our gaming platform or smart contracts?
                </p>
                <p className="text-cyan-400 mt-2">
                  Email: partnerships@chanceblitz.com
                </p>
              </div>
              
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">
                  📍 Connect With Us
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🐦</div>
                    <p className="text-sm text-gray-400">Twitter</p>
                    <p className="text-cyan-400">@ChanceBlitz</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">💬</div>
                    <p className="text-sm text-gray-400">Discord</p>
                    <p className="text-cyan-400">discord.gg/chanceblitz</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-cyan-400">hello@chanceblitz.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-lg font-semibold mb-3 text-yellow-400">
                ⚠️ Important Notes
              </h4>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• All games are on Monad testnet - use test MON tokens only</li>
                <li>• Never share your private keys or seed phrases</li>
                <li>• Always verify contract addresses before transactions</li>
                <li>• Keep your MetaMask updated for best compatibility</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
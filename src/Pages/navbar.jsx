import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // ✅ Correct import

function Navbar() {
  const [expanded, setExpanded] = useState(false);

  const navLinks = [
    ["Home", "/launcher"],
    
    ["Games", "/Games/games"],
    ["Contact us", "/ContactUs"]
  ];

  return (
    <header className="py-4 bg-black sm:py-6 min-w-full">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="shrink-0">
            <a href="#" className="flex">
              <img
                className="w-12 max-w-10 mx-auto md:max-w-md"
                src="https://landingfoliocom.imgix.net/store/collection/dusk/images/hero/1/3d-illustration.png"
                alt=""
              />
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 m-2 mx-5 text-2xl font-bold">
                Chance
              </p>
            </a>
          </div>

          <div className="flex md:hidden">
            <button
              type="button"
              className="text-white"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {!expanded ? (
                <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          <nav className="hidden md:flex md:items-center md:justify-end md:space-x-12">
  <a
    href="/launcher"
    className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
  >
    Home
  </a>

  <a
    href="./Games/games"
    className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
  >
    Games
  </a>
  <a
    href="/ContactUs"
    className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
  >
    Contact us
  </a>
</nav>

        </div>

        {expanded && (
          <nav className="hidden md:flex md:items-center md:justify-end md:space-x-12">
          <a
            href="/launcher"
            className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
          >
            Home
          </a>

          <a
            href="./Games/games"
            className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
          >
            Games
          </a>
          <a
            href="/ContactUs"
            className="text-base font-normal text-gray-400 transition-all duration-200 hover:text-white"
          >
            Contact us
          </a>
        </nav>
        
        )}
      </div>
    </header>
  );
}

export default Navbar;

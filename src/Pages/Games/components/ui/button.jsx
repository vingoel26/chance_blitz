// Button component - /components/ui/button.js
export const Button = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${className}`}
  >
    {children}
  </button>
);
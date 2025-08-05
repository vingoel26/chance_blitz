// Input component - /components/ui/input.js
export const Input = ({ className = "", ...props }) => (
  <input
    {...props}
    className={`px-4 py-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
  />
);
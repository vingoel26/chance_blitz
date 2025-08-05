// Card component - /components/ui/card.js
export const Card = ({ children, className = "" }) => (
    <div className={`rounded-2xl overflow-hidden shadow-md ${className}`}>
      {children}
    </div>
  );
  
  // CardContent component - /components/ui/card.js
  export const CardContent = ({ children, className = "" }) => (
    <div className={`p-4 ${className}`}>{children}</div>
  );
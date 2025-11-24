export default function ShadcnButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition ${className}`}
    >
      {children}
    </button>
  );
}

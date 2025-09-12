export default function StatusSwitch({ status, onToggle, values = ["Pending", "Existing"] }) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
      <button
        onClick={() => onToggle?.(values[0])}
        className={`px-4 py-1 rounded-l-full focus:outline-none text-lg ${status === values[0] ? "font-bold text-black" : "text-gray-400"}`}
      >
        {values[0]}
      </button>
      <span className="w-px bg-gray-300 h-5" />
      <button
        onClick={() => onToggle?.(values[1])}
        className={`px-4 py-1 rounded-r-full focus:outline-none text-lg ${status === values[1] ? "font-bold text-black" : "text-gray-400"}`}
      >
        {values[1]}
      </button>
    </div>
  );
}
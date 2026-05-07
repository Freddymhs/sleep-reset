import { useStorage } from "../../src/hooks/useStorage";

export default function App() {
  const [count, setCount] = useStorage<number>("count", 0);

  return (
    <div className="w-72 p-4 bg-white">
      <h1 className="text-lg font-bold text-gray-900 mb-4">My Extension</h1>

      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-4">
        <span className="text-sm text-gray-600">Count (persisted)</span>
        <span className="text-xl font-bold text-blue-600">{count}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCount(count + 1)}
          className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Increment
        </button>
        <button
          onClick={() => setCount(0)}
          className="flex-1 bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Value persists across popup opens via chrome.storage
      </p>
    </div>
  );
}

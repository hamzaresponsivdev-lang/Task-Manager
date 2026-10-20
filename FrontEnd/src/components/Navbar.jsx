import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiRequest, setSessionToken } from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setSessionToken(null);
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold text-blue-600">
          Glacier Task Manager
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {error && <span role="alert" className="text-sm text-red-600">{error}</span>}
        <button
          type="button"
          onClick={handleLogout}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition duration-200"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

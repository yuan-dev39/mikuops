import { useEffect, useState } from "react";

function App() {
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const fetchSystemInfo = () => {
    fetch("http://127.0.0.1:8000/api/system")
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);
      });
  };

  useEffect(() => {
    fetchSystemInfo();

    const interval = setInterval(fetchSystemInfo, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        MikuOps Dashboard
      </h1>

      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-600 mb-4">
              CPU Usage
            </h2>

            <p className="text-5xl font-bold text-blue-500">
              {systemInfo.cpu_percent}%
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-600 mb-4">
              Memory Usage
            </h2>

            <p className="text-5xl font-bold text-green-500">
              {systemInfo.memory_percent}%
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-600 mb-4">
              Disk Usage
            </h2>

            <p className="text-5xl font-bold text-red-500">
              {systemInfo.disk_percent}%
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
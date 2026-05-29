import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);

  const fetchSystemInfo = () => {
    // システム監視データの取得
    fetch("http://127.0.0.1:8000/api/system")
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);

        // CPU履歴チャートの更新
        setCpuHistory((prev) => {
          const newData = [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              cpu: data.cpu_percent,
            },
          ];

          return newData.slice(-10);
        });
      });

    // Dockerコンテナデータの取得
    fetch("http://127.0.0.1:8000/api/docker")
      .then((res) => res.json())
      .then((dockerData) => {
        setContainers(dockerData);
      });
  };

  useEffect(() => {
    fetchSystemInfo();

    // 3秒ごとにデータを定期更新（ポーリング）
    const interval = setInterval(fetchSystemInfo, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        MikuOps Dashboard
      </h1>

      {systemInfo && (
        <>
          {/* システム監視カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

          {/* CPU リアルタイムチャート */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              CPU Real-Time Monitoring
            </h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={cpuHistory}>
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Docker コンテナエリア */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              Docker Containers
            </h2>
            <div className="space-y-4">
              {containers.length > 0 ? (
                containers.map((container, index) => (
                  <div
                    key={index}
                    className="border rounded-xl p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-lg">{container.name}</p>
                      <p className="text-gray-500">
                        {container.image?.[0] || "Unknown Image"}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-4 py-2 rounded-full text-white ${
                          container.status === "running"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      >
                        {container.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No Docker containers found.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
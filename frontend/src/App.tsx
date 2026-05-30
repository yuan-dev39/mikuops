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
  // システム監視情報
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // CPU履歴データ
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);

  // Dockerコンテナ一覧
  const [containers, setContainers] = useState<any[]>([]);

  // 死活監視結果
  const [healthChecks, setHealthChecks] = useState<any[]>([]);

  // Dockerログ
  const [logs, setLogs] = useState<string[]>([]);

  // バックエンドAPIから監視情報を取得
  const fetchSystemInfo = () => {
    // システム情報取得
    fetch("http://127.0.0.1:8000/api/system")
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);
      })
      .catch((err) => console.error("System API Error:", err));

    // DB保存済み履歴データ取得
    fetch("http://127.0.0.1:8000/api/history")
      .then((res) => res.json())
      .then((history) => {
        setCpuHistory(history);
      })
      .catch((err) => console.error("History API Error:", err));

    // Dockerコンテナ一覧取得
    fetch("http://127.0.0.1:8000/api/docker")
      .then((res) => res.json())
      .then((dockerData) => {
        setContainers(dockerData);
      })
      .catch((err) => console.error("Docker API Error:", err));

    // 外部サービス死活監視取得
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((healthData) => {
        setHealthChecks(healthData);
      })
      .catch((err) => console.error("Health API Error:", err));
  };

  useEffect(() => {
    // 初回ロード時実行
    fetchSystemInfo();

    // 3秒ごとに監視情報更新
    const interval = setInterval(fetchSystemInfo, 3000);

    // DockerログWebSocket接続
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs");

    ws.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data].slice(-50));
    };

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-5xl font-bold mb-8 text-gray-800">
        MikuOps Dashboard
      </h1>

      {systemInfo && (
        <>
          {/* アラート表示エリア */}
          {systemInfo.alert && (
            <div
              className={`mb-8 p-5 rounded-2xl shadow-lg text-white text-xl font-bold ${
                systemInfo.status === "critical"
                  ? "bg-red-600"
                  : "bg-yellow-500"
              }`}
            >
              🚨 {systemInfo.alert}
            </div>
          )}

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

          {/* CPU履歴グラフ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              CPU Real-Time Monitoring (Persistent)
            </h2>

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
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

          {/* サービス死活監視 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              Service Health Check
            </h2>

            <div className="space-y-4">
              {healthChecks.map((service, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg">{service.name}</p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <span
                      className={`px-4 py-2 rounded-full text-white ${
                        service.status === "UP"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {service.status}
                    </span>

                    <span className="font-bold text-gray-700">
                      HTTP {service.code}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dockerコンテナ監視 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-700">
              Docker Containers
            </h2>

            <div className="space-y-4">
              {containers.map((container, index) => (
                <div
                  key={index}
                  className="border rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg">{container.name}</p>
                    <p className="text-gray-500">
                      {container.image?.[0] || "Unknown"}
                    </p>
                  </div>

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
              ))}
            </div>
          </div>

          {/* Dockerリアルタイムログ */}
          <div className="bg-black rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-green-400">
              Real-Time Docker Logs
            </h2>

            <div className="font-mono text-sm text-green-300 space-y-1 max-h-96 overflow-y-auto bg-neutral-900 p-4 rounded-xl">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  Waiting for container logs...
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
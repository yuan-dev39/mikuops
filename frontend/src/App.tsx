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
  const [logs, setLogs] = useState<string[]>([]);

  // システム監視データおよびDockerコンテナ一覧を取得する関数
  const fetchSystemInfo = () => {
    // 1. システムリソース情報の取得
    fetch("http://127.0.0.1:8000/api/system")
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);

        // CPU履歴チャートの更新（直近10回分のデータを保持）
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
      })
      .catch((err) => console.error("System API Error:", err));

    // 2. Dockerコンテナ一覧の取得
    fetch("http://127.0.0.1:8000/api/docker")
      .then((res) => res.json())
      .then((dockerData) => {
        setContainers(dockerData);
      })
      .catch((err) => console.error("Docker API Error:", err));
  };

  useEffect(() => {
    // 初回レンダリング時にデータを取得
    fetchSystemInfo();

    // 3秒ごとにデータを定期更新（ポーリング）
    const interval = setInterval(fetchSystemInfo, 3000);

    // WebSocket接続の初期化（無限接続バグ防止のためuseEffect内に配置）
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs");

    // バックエンドからログを受信したときの処理
    ws.onmessage = (event) => {
      // 直近の20行のログを画面に保持
      setLogs((prev) => [...prev, event.data].slice(-20));
    };

    // コンポーネントがアンマウント（破棄）されたときのクリーンアップ処理
    return () => {
      clearInterval(interval);
      ws.close(); // WebSocket接続を正しく切断
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">
        MikuOps Dashboard
      </h1>

      {systemInfo && (
        <>
          {/* 0. アラート表示エリア（バックエンドからの警告/危険を日本語で検知） */}
          {systemInfo.alert && (
            <div
              className={`mb-8 p-6 rounded-2xl shadow-lg text-white text-xl font-bold ${
                systemInfo.status === "critical"
                  ? "bg-red-600"
                  : "bg-yellow-500"
              }`}
            >
              🚨 {systemInfo.alert}
            </div>
          )}

          {/* 1. システム監視メトリクスカード */}
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

          {/* 2. CPUリアルタイムモニタリングチャート */}
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

          {/* 3. Docker コンテナステータスエリア */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
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

          {/* 4. リアルタイム Docker ログストリーミングエリア */}
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
                <p className="text-gray-500 italic">Waiting for container logs...</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";

function App() {
  const [systemInfo, setSystemInfo] = useState<any>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/system")
      .then((res) => res.json())
      .then((data) => {
        setSystemInfo(data);
      });
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>MikuOps Dashboard</h1>

      {systemInfo ? (
        <div>
          <h2>System Monitoring</h2>

          <p>CPU Usage: {systemInfo.cpu_percent}%</p>

          <p>Memory Usage: {systemInfo.memory_percent}%</p>

          <p>Disk Usage: {systemInfo.disk_percent}%</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default App;
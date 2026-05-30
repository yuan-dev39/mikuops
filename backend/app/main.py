from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import psutil
import docker

app = FastAPI()

# CORSミドルウェアの設定（フロントエンドのReactからのクロスドメインアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Welcome to MikuOps"
    }

# 1. システムリソース監視API
# 1. システムリソース監視API
# 1. システムリソース監視API
@app.get("/api/system")
def get_system_info():
    # メモ：APIのレスポンス遅延を防ぐため、intervalはNoneに設定
    cpu_usage = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    status = "normal"
    alert = None

    # テスト用（低い閾値で判定）
    if cpu_usage >= 10:
        status = "critical"
        alert = "CPU使用率が非常に高くなっています（危険）"
    elif cpu_usage >= 5:
        status = "warning"
        alert = "CPU使用率が高くなっています（警告）"

    return {
        "cpu_percent": cpu_usage,
        "memory_percent": memory.percent,
        "disk_percent": disk.percent,
        "status": status,
        "alert": alert
    }

# 2. Dockerコンテナ一覧取得API
@app.get("/api/docker")
def get_docker_containers():
    try:
        client = docker.from_env()
        containers = client.containers.list(all=True)
        result = []
        for container in containers:
            result.append({
                "name": container.name,
                "status": container.status,
                "image": container.image.tags if container.image.tags else ["Unknown"]
            })
        return result
    except Exception as e:
        return {"error": f"Dockerへの接続に失敗しました: {str(e)}"}

# 3. WebSocketによるリアルタイムログ配信（イベントループをブロックしない非同期最適化版）
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    
    # 同期処理であるログ取得（ブロック処理）をラップする関数
    def get_container_logs():
        client = docker.from_env()
        container = client.containers.get("nginx-test")
        # tail=100 により、接続時に直近100行の過去ログを取得（画面白飛び防止）
        return container.logs(stream=True, follow=True, tail=100)

    try:
        # Docker SDKのブロッキング操作をスレッド池に逃がし、FastAPIのメインイベントループのハングを防ぐ
        log_stream = await asyncio.to_thread(get_container_logs)
        
        # 同様に、ストリームからの次のログ読み込みをスレッド化
        def read_next_log(stream):
            try:
                return next(stream)
            except StopIteration:
                return None

        while True:
            # 次のログ行の読み込みを非同期で待機
            log = await asyncio.to_thread(read_next_log, log_stream)
            if log is None:
                break
                
            await websocket.send_text(log.decode("utf-8"))
            await asyncio.sleep(0.05)  # CPU高負荷を防止するためのわずかなバッファ

    except Exception as e:
        await websocket.send_text(f"エラーが発生しました: {str(e)}")
    finally:
        await websocket.close()
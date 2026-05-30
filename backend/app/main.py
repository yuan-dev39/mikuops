import asyncio
import docker
import psutil
import requests
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

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
    """ルートエンドポイント：APIが稼働しているかの基本チェック"""
    return {"message": "Welcome to MikuOps"}


# 1. システムリソース監視API
@app.get("/api/system")
def get_system_info():
    """CPU、メモリ、ディスクの使用率を取得し、閾値に応じたアラート判定を行うAPI"""
    cpu_usage = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    status = "normal"
    alert = None

    # テスト用（検証しやすいよう低めの閾値で判定）
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
        "alert": alert,
    }


# 2. Dockerコンテナ一覧取得API
@app.get("/api/docker")
def get_docker_containers():
    """ローカルで稼働・停止しているすべてのDockerコンテナのステータスを取得するAPI"""
    try:
        client = docker.from_env()
        containers = client.containers.list(all=True)
        result = []
        for container in containers:
            result.append(
                {
                    "name": container.name,
                    "status": container.status,
                    "image": (
                        container.image.tags
                        if container.image.tags
                        else ["Unknown"]
                    ),
                }
            )
        return result
    except Exception as e:
        return {"error": f"Dockerへの接続に失敗しました: {str(e)}"}


# 3. 外部サービス外部ヘルスチェックAPI【URL修正版】
@app.get("/api/health")
def health_check():
    """対象となる外部サービス（Nginxなど）にHTTPリクエストを送り、死活監視を行うAPI"""
    # 修正ポイント：ホストPCにマッピングされた 8080 ポート経由でNginxコンテナにアクセス
    targets = [{"name": "Nginx", "url": "http://127.0.0.1:8080"}]

    results = []

    for target in targets:
        try:
            # 3秒のタイムアウトを設定してHTTP GETリクエストを送信
            response = requests.get(target["url"], timeout=3)

            # ステータスコードが取得できれば稼働中(UP)と判定
            results.append(
                {
                    "name": target["name"],
                    "status": "UP",
                    "code": response.status_code,
                }
            )
        except Exception:
            # 接続拒否やタイムアウトの場合は停止中(DOWN)と判定
            results.append({"name": target["name"], "status": "DOWN", "code": "-"})

    return results


# 4. WebSocketによるリアルタイムログ配信（イベントループをブロックしない非同期最適化版）
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """Dockerコンテナ(nginx-test)のログをリアルタイムにストリーミング配信するWebSocketエンドポイント"""
    await websocket.accept()

    def get_container_logs():
        client = docker.from_env()
        container = client.containers.get("nginx-test")
        return container.logs(stream=True, follow=True, tail=100)

    try:
        log_stream = await asyncio.to_thread(get_container_logs)

        def read_next_log(stream):
            try:
                return next(stream)
            except StopIteration:
                return None

        while True:
            log = await asyncio.to_thread(read_next_log, log_stream)
            if log is None:
                break

            await websocket.send_text(log.decode("utf-8"))
            await asyncio.sleep(0.05)

    except Exception as e:
        await websocket.send_text(f"エラーが発生しました: {str(e)}")
    finally:
        await websocket.close()
import asyncio
from datetime import datetime

import docker
import psutil
import requests
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# Prometheus監視メトリクスのインポート
from prometheus_client import Gauge, generate_latest

# データベース設定、セッション、およびモデルのインポート
from app.database import SessionLocal, engine
from app.models import Base, Metric

app = FastAPI()

# Prometheus監視メトリクスの初期化登録
cpu_gauge = Gauge("mikuops_cpu_usage", "CPU Usage Percent")
memory_gauge = Gauge("mikuops_memory_usage", "Memory Usage Percent")
disk_gauge = Gauge("mikuops_disk_usage", "Disk Usage Percent")

# アプリケーション起動時にデータベース内にすべてのテーブルを自動作成
Base.metadata.create_all(bind=engine)

# CORSミドルウェアの設定（フロントエンドからのクロスドメインアクセスを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """ルートエンドポイント：API稼働チェック"""
    return {"message": "Welcome to MikuOps"}


@app.get("/api/system")
def get_system_info():
    """CPU、メモリ、ディスクの使用率を取得し、DB保存およびPrometheusへ登録するAPI"""
    cpu_usage = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    # Prometheusへリアルタイム値を登録
    cpu_gauge.set(cpu_usage)
    memory_gauge.set(memory.percent)
    disk_gauge.set(disk.percent)

    # データベースへの保存処理
    db = SessionLocal()
    try:
        metric = Metric(
            cpu=cpu_usage,
            memory=memory.percent,
            disk=disk.percent,
        )
        db.add(metric)
        db.commit()
        db.refresh(metric)
    except Exception as e:
        print(f"データベースの保存に失敗しました: {str(e)}")
    finally:
        db.close()

    # アラート判定ロジック（デモ用に低めの閾値に設定）
    status = "normal"
    alert = None

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


@app.get("/api/docker")
def get_docker_containers():
    """すべてのDockerコンテナのステータスを取得するAPI"""
    try:
        # Dockerデーモンへの接続（Docker Compose環境内）
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


@app.get("/api/health")
def health_check():
    """Docker Compose内部のNginxサービスに対してHTTPリクエストを送り、死活監視を行うAPI"""
    # ターゲットをホスト名「nginx」に変更（Dockerネットワーク内の名前解決）
    targets = [{"name": "Nginx", "url": "http://mikuops-nginx"}]
    results = []

    for target in targets:
        try:
            response = requests.get(target["url"], timeout=3)
            results.append(
                {
                    "name": target["name"],
                    "status": "UP",
                    "code": response.status_code,
                }
            )
        except Exception:
            results.append({"name": target["name"], "status": "DOWN", "code": "-"})

    return results


@app.get("/metrics")
def metrics():
    """Prometheusサーバーがデータをスクレイピングするための標準エンドポイント"""
    return Response(
        generate_latest(),
        media_type="text/plain"
    )


@app.get("/api/history")
def get_history():
    """データベースから直近100件のメトリクス履歴を取得するAPI"""
    db = SessionLocal()
    try:
        metrics = (
            db.query(Metric)
            .order_by(Metric.id.desc())
            .limit(100)
            .all()
        )

        result = []
        for item in reversed(metrics):
            result.append({
                "cpu": item.cpu,
                "memory": item.memory,
                "disk": item.disk,
                "time": item.created_at.strftime("%H:%M:%S")
            })
        return result
    finally:
        db.close()


@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """mikuops-nginxコンテナのログをリアルタイムにストリーミング配信するWebSocketエンドポイント"""
    await websocket.accept()

    def get_container_logs():
        client = docker.from_env()
        # ターゲットをコンテナ名「mikuops-nginx」に指定
        container = client.containers.get("mikuops-nginx")
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
        await websocket.send_text(f"ログの取得中にエラーが発生しました: {str(e)}")
    finally:
        await websocket.close()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import docker

app = FastAPI()

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

@app.get("/api/system")
def get_system_info():
    cpu_usage = psutil.cpu_percent(interval=1)

    memory = psutil.virtual_memory()

    disk = psutil.disk_usage("/")

    return {
        "cpu_percent": cpu_usage,
        "memory_percent": memory.percent,
        "disk_percent": disk.percent
    }

@app.get("/api/docker")
def get_docker_containers():

    client = docker.from_env()

    containers = client.containers.list(all=True)

    result = []

    for container in containers:
        result.append({
            "name": container.name,
            "status": container.status,
            "image": container.image.tags
        })

    return result
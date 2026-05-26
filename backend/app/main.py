from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil

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
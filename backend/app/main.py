from fastapi import FastAPI
import psutil

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Welcome to MikuOps"}

@app.get("/api/system")
def get_system_info():
    cpu_usage = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    
    # 将返回的 JSON 键名修改为日语
    return {
        "cpu_使用率": f"{cpu_usage}%",
        "メモリ_使用率": f"{memory.percent}%",
        "ディスク_使用率": f"{disk.percent}%"
    }
# 軽量なPythonイメージを使用
FROM python:3.12-slim

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係定義ファイルをコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 残りのソースコードをコピー
COPY . .

# ポートの開放
EXPOSE 8000

# FastAPI(Uvicorn)の起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
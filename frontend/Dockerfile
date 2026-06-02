# Node.js公式イメージを使用
FROM node:22

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係ファイルをコピーしてインストール
COPY package*.json ./
RUN npm install

# 残りのソースコードをコピー
COPY . .

# Viteの開発用サーバーポートを開放
EXPOSE 5173

# フロントエンドの起動（外部からのアクセスを許可するために --host を指定）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
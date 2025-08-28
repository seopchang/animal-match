from flask import Flask, send_from_directory
import os

# 정적 파일 폴더를 web/ 로 지정, 정적 URL 경로는 루트 "" 로 매핑
app = Flask(__name__, static_folder="web", static_url_path="")

# 루트 -> index.html
@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# /admin -> admin.html
@app.get("/admin")
def admin():
    return send_from_directory(app.static_folder, "admin.html")

# 정적 파일 라우팅 (CSS/JS/이미지 등)
@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

# 헬스체크(선택)
@app.get("/healthz")
def healthz():
    return "ok", 200

if __name__ == "__main__":
    # Render가 PORT 환경변수 주입
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

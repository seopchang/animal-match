from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder="web", static_url_path="")

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/admin")
def admin():
    return send_from_directory(app.static_folder, "admin.html")

@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

@app.get("/healthz")
def healthz():
    return "ok", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

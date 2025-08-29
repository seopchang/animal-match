import sqlite3, threading
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

DB_PATH = "database.db"
db_lock = threading.Lock()  # 멀티스레드 환경에서 SQLite 쓰기락 보조


# ---------- DB 초기화 ----------
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            animal TEXT NOT NULL,
            matched INTEGER NOT NULL DEFAULT 0,
            match_id INTEGER
        )
        """)
        c.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            animal TEXT NOT NULL,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_waiting ON participants(animal, matched)")
        conn.commit()


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _already_matched_payload(conn, me_row):
    c = conn.cursor()
    m = c.execute("SELECT * FROM matches WHERE id=?", (me_row["match_id"],)).fetchone()
    if not m:
        return None
    other_id = m["user2_id"] if m["user1_id"] == me_row["id"] else m["user1_id"]
    other = c.execute("SELECT id, name, animal FROM participants WHERE id=?", (other_id,)).fetchone()
    if not other:
        return None
    return {
        "match_id": m["id"],
        "animal": m["animal"],
        "me": {"id": me_row["id"], "name": me_row["name"]},
        "partner": {"id": other["id"], "name": other["name"]}
    }


def try_match(conn, me_id):
    """
    같은 animal 대기자 중 임의 1명과 '원자적으로' 매칭.
    이미 매칭된 경우엔 그 결과를 즉시 반환.
    """
    c = conn.cursor()
    me = c.execute("SELECT id, name, animal, matched, match_id FROM participants WHERE id=?", (me_id,)).fetchone()
    if not me:
        return None, "NOT_FOUND"

    if me["matched"] and me["match_id"]:
        payload = _already_matched_payload(conn, me)
        return payload, "ALREADY_MATCHED"

    partner = c.execute("""
        SELECT id, name FROM participants
        WHERE animal=? AND matched=0 AND id<>?
        ORDER BY RANDOM() LIMIT 1
    """, (me["animal"], me["id"])).fetchone()

    if not partner:
        return None, "WAIT"

    # 매칭 생성 (트랜잭션 내)
    c.execute("INSERT INTO matches (animal, user1_id, user2_id) VALUES (?, ?, ?)",
              (me["animal"], me["id"], partner["id"]))
    match_id = c.lastrowid
    c.execute("UPDATE participants SET matched=1, match_id=? WHERE id IN (?, ?)",
              (match_id, me["id"], partner["id"]))
    conn.commit()

    return {
        "match_id": match_id,
        "animal": me["animal"],
        "me": {"id": me["id"], "name": me["name"]},
        "partner": {"id": partner["id"], "name": partner["name"]}
    }, "NEWLY_MATCHED"


# ---------- 라우트 ----------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/healthz")
def healthz():
    return "ok", 200


@app.route("/join", methods=["POST"])
def join():
    """
    body(JSON): {name, animal}
    - 참가자 생성 -> 같은 animal 즉시 매칭 시도
    - 성공: {status: matched, data: {...}}
    - 실패(상대 없음): {status: waiting, participant_id}
    """
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    animal = (data.get("animal") or "").strip()

    if not name or not animal:
        return jsonify({"ok": False, "error": "NAME_AND_ANIMAL_REQUIRED"}), 400

    # 참가자 등록 (쓰기락으로 직렬화)
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute("BEGIN IMMEDIATE")
        c.execute("INSERT INTO participants (name, animal) VALUES (?, ?)", (name, animal))
        me_id = c.lastrowid
        conn.commit()

    # 매칭 시도 (원자성 보장)
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute("BEGIN IMMEDIATE")
        result, status = try_match(conn, me_id)
        if status in ("NEWLY_MATCHED", "ALREADY_MATCHED"):
            return jsonify({"ok": True, "status": "matched", "data": result})
        conn.commit()
        return jsonify({"ok": True, "status": "waiting", "participant_id": me_id})


@app.route("/await", methods=["GET"])
def await_match():
    """
    query: ?pid=123
    - 아직이면 waiting
    - 매칭되었거나 같은 트랜잭션에서 재시도 성공시 matched
    """
    pid_raw = request.args.get("pid", "")
    try:
        pid = int(pid_raw)
    except ValueError:
        return jsonify({"ok": False, "error": "BAD_PID"}), 400

    conn = get_conn()
    c = conn.cursor()
    me = c.execute("SELECT id, name, animal, matched, match_id FROM participants WHERE id=?", (pid,)).fetchone()
    if not me:
        return jsonify({"ok": False, "error": "NOT_FOUND"}), 404

    if me["matched"] and me["match_id"]:
        payload = _already_matched_payload(conn, me)
        return jsonify({"ok": True, "status": "matched", "data": payload})

    # 아직 매칭 전 → 같은 락으로 재시도 매칭
    with db_lock:
        conn = get_conn()
        c = conn.cursor()
        c.execute("BEGIN IMMEDIATE")
        result, status = try_match(conn, me["id"])
        if status in ("NEWLY_MATCHED", "ALREADY_MATCHED"):
            return jsonify({"ok": True, "status": "matched", "data": result})
        conn.commit()
        return jsonify({"ok": True, "status": "waiting"})


@app.route("/reset", methods=["POST"])
def reset():
    """(테스트용) 전체 초기화"""
    with db_lock:
        with sqlite3.connect(DB_PATH) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM matches")
            c.execute("DELETE FROM participants")
            conn.commit()
    return jsonify({"ok": True})


# 앱 시작 시 DB 준비
init_db()

if __name__ == "__main__":
    # 로컬 개발용
    app.run(host="0.0.0.0", port=5000, debug=True)

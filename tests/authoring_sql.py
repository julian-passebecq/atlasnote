"""Independent SQL study examples executed in SQLite; not PostgreSQL or screenshot transcription."""
import sqlite3, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
doc=json.loads((root/'examples/authoring/sql-study.cheatsheet.json').read_text(encoding='utf-8'))
db=sqlite3.connect(':memory:')
db.executescript("""
CREATE TABLE customers(id TEXT PRIMARY KEY);
CREATE TABLE orders(id INTEGER PRIMARY KEY,customer_id TEXT,amount INTEGER,ordered_at TEXT);
INSERT INTO customers VALUES ('Ada'),('Bo'),('Cy');
INSERT INTO orders VALUES (1,'Ada',10,'2026-10-01'),(2,'Ada',20,'2026-10-01'),(3,'Bo',8,'2026-10-02');
""")
expected=[ [('Ada',2)], [('Ada',2),('Bo',1),('Cy',0)], [(2,'Ada'),(3,'Bo')], [(1,'Ada',10,10),(2,'Ada',20,30),(3,'Bo',8,8)], [(2,)], [('Cy',)] ]
queries=[b['code'] for p in doc['pages'] for b in p['blocks'] if b['type']=='code']
assert len(queries)==len(expected)
for query,wanted in zip(queries,expected):assert db.execute(query).fetchall()==wanted
print(json.dumps({'status':'PASS','engine':'SQLite '+sqlite3.sqlite_version,'queries':6,'scope':__doc__},indent=2))

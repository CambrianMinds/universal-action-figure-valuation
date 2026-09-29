import sqlite3
from datetime import datetime, timezone

conn = sqlite3.connect('universal_action_figures.db')
c = conn.cursor()

c.execute('CREATE TABLE IF NOT EXISTS db_metadata (key TEXT PRIMARY KEY, value TEXT)')

now_iso = datetime.now(timezone.utc).isoformat()
c.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_price_update', ?)", (now_iso,))
c.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_full_scrape', ?)", (now_iso,))

c.execute('SELECT COUNT(*) FROM figures')
total = c.fetchone()[0]
c.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('total_items', ?)", (str(total),))
c.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('items_updated_last_run', '0')")
c.execute("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('new_items_last_run', '0')")

conn.commit()
conn.close()

print(f"[+] db_metadata seeded successfully. Total figures in DB: {total}")

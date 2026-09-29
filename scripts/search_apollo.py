import sqlite3

conn = sqlite3.connect("universal_action_figures.db")
c = conn.cursor()

c.execute("SELECT id, name, release_year, group_name FROM figures WHERE name LIKE '%Apollo%' OR name LIKE '%Lunar%' OR name LIKE '%Space%' OR name LIKE '%Moon%'")
matches = c.fetchall()

print(f"Found {len(matches)} matches:")
for m in matches:
    print(" ", m)

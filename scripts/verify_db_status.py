import sqlite3

db_path = "universal_action_figures.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT COUNT(*) FROM figures")
total_figures = c.fetchone()[0]

c.execute("SELECT franchise, COUNT(*) FROM figures GROUP BY franchise")
franchise_counts = c.fetchall()

c.execute("SELECT valuation_source, COUNT(*) FROM figures GROUP BY valuation_source")
source_counts = c.fetchall()

c.execute("SELECT name, release_year, series, group_name, valuation_source FROM figures WHERE name LIKE '%Lunar Leonardo%' OR name LIKE '%Apollo%' LIMIT 5")
lunar_leo_matches = c.fetchall()

conn.close()

print(f"=== DATABASE VERIFICATION REPORT FOR D:\\projects\\universal-action-figure-valuation\\universal_action_figures.db ===")
print(f"Total Collectibles in DB: {total_figures}")
print("\nBreakdown by Franchise:")
for f, count in franchise_counts:
    print(f"  - {f:15}: {count} items")

print("\nBreakdown by Valuation Source:")
for s, count in source_counts:
    print(f"  - {s:35}: {count} items")

print("\nSample Search (Lunar Leonardo / Apollo 11):")
for m in lunar_leo_matches:
    print(" ", m)

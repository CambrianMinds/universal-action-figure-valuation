import os
import shutil

src = r"D:\projects\universal-action-figure-valuation\public\assets"
dst = r"D:\projects\universal-action-figure-valuation\dist\assets"

os.makedirs(dst, exist_ok=True)

for fname in os.listdir(src):
    s_path = os.path.join(src, fname)
    d_path = os.path.join(dst, fname)
    shutil.copy2(s_path, d_path)
    print("Copied asset to dist:", fname)

print("[+] Copied all assets to dist/assets!")

import os
import shutil
import glob

artifacts_dir = r"C:\Users\Justi\.gemini\antigravity-ide\brain\958b6e8f-2c11-4b90-8e46-acfada0feb77"
public_dir = r"D:\projects\universal-action-figure-valuation\public\assets"
dist_dir = r"D:\projects\universal-action-figure-valuation\dist\assets"

os.makedirs(public_dir, exist_ok=True)
os.makedirs(dist_dir, exist_ok=True)

png_files = glob.glob(os.path.join(artifacts_dir, "*.png"))
print(f"Found {len(png_files)} generated PNG files in artifacts.")

copied = []
for p in png_files:
    fname = os.path.basename(p)
    if 'bg_default_multiverse' in fname:
        dest_name = "bg_default.png"
    elif 'bg_tmnt_sewer' in fname:
        dest_name = "bg_tmnt.png"
    elif 'bg_starwars_hyperspace' in fname:
        dest_name = "bg_starwars.png"
    elif 'bg_marvel_cosmic' in fname:
        dest_name = "bg_marvel.png"
    elif 'bg_transformers_cybertron' in fname:
        dest_name = "bg_transformers.png"
    elif 'bg_dc_gotham' in fname:
        dest_name = "bg_dc.png"
    elif 'hero_logo' in fname:
        dest_name = "hero_logo.png"
    elif 'tmnt_franchise' in fname:
        dest_name = "tmnt_emblem.png"
    elif 'starwars_franchise' in fname:
        dest_name = "starwars_emblem.png"
    elif 'dc_emblem' in fname:
        dest_name = "dc_emblem.png"
    elif 'marvel_franchise' in fname:
        dest_name = "marvel_emblem.png"
    elif 'transformers_emblem' in fname:
        dest_name = "transformers_emblem.png"
    elif 'ai_box_scanner' in fname:
        dest_name = "scanner_hud.png"
    else:
        dest_name = fname

    p_dest = os.path.join(public_dir, dest_name)
    d_dest = os.path.join(dist_dir, dest_name)
    shutil.copy2(p, p_dest)
    shutil.copy2(p, d_dest)
    copied.append(dest_name)
    print(f"  Copied: {dest_name} -> public/assets & dist/assets")

print(f"\n[+] Successfully updated all {len(copied)} graphics in public/assets & dist/assets!")

import os
import shutil
import subprocess
import zipfile

app_dir = r"D:\projects\universal-action-figure-valuation"

# Find system node.exe
node_path = shutil.which("node")
print(f"System node.exe found at: {node_path}")

if node_path and os.path.exists(node_path):
    target_node = os.path.join(app_dir, "node.exe")
    shutil.copy2(node_path, target_node)
    print(f"[+] Copied portable node.exe ({os.path.getsize(target_node)/1024/1024:.1f} MB) to project directory!")

# Create a zip archive of the standalone app
zip_filename = r"D:\projects\universal-action-figure-valuation\Universal_Action_Figure_Appraiser_Standalone.zip"
print(f"[*] Packaging Standalone Portable Zip Archive: {zip_filename}...")

files_to_zip = [
    "LAUNCH_APPRAISER.bat",
    "node.exe",
    "server.js",
    "universal_action_figures.db",
    "user_inventory.json",
    "package.json"
]

folders_to_zip = [
    "dist",
    "uploads"
]

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for f in files_to_zip:
        fpath = os.path.join(app_dir, f)
        if os.path.exists(fpath):
            zipf.write(fpath, arcname=f)
            print(f"  Added file: {f}")

    for folder in folders_to_zip:
        folder_path = os.path.join(app_dir, folder)
        if os.path.exists(folder_path):
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, app_dir)
                    zipf.write(full_path, arcname=rel_path)
            print(f"  Added folder: {folder}/")

    # Add necessary node_modules (express, sqlite3, cors, multer)
    modules_path = os.path.join(app_dir, "node_modules")
    if os.path.exists(modules_path):
        print("  Adding node_modules dependencies...")
        for root, dirs, files in os.walk(modules_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, app_dir)
                zipf.write(full_path, arcname=rel_path)

zip_size_mb = os.path.getsize(zip_filename) / 1024 / 1024
print(f"\n[+] SUCCESS! Standalone Portable Zip Created: '{zip_filename}' ({zip_size_mb:.1f} MB)")

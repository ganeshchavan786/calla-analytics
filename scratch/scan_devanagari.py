import os
import re
import sys

# Devanagari block range in Unicode is U+0900 to U+097F
DEVANAGARI_PATTERN = re.compile(r'[\u0900-\u097F]')

EXCLUDE_DIRS = {'.git', 'node_modules', '.next', 'dist', 'build', 'scratch'}

def scan_files(root_dir):
    found_any = False
    scanned_count = 0
    for root, dirs, files in os.walk(root_dir):
        # Prune excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if not file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.prisma', '.md', '.html', '.css')):
                continue
                
            file_path = os.path.join(root, file)
            scanned_count += 1
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        matches = DEVANAGARI_PATTERN.findall(line)
                        if matches:
                            found_any = True
                            print(f"FOUND: {file_path}:{line_num}: {line.strip()}", flush=True)
            except Exception as e:
                print(f"ERROR reading {file_path}: {e}", file=sys.stderr, flush=True)
                
    print(f"Scan complete. Total files scanned: {scanned_count}", flush=True)
    if not found_any:
        print("SUCCESS: No Devanagari characters found in the codebase.", flush=True)

if __name__ == '__main__':
    project_dir = r"d:\HR\Claud\calllog-production"
    print(f"Scanning {project_dir} for Devanagari characters...", flush=True)
    scan_files(project_dir)

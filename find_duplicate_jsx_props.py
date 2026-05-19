import os
import re

def check_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    # Simple regex to find JSX tags and their attributes
    tags = re.findall(r'<[A-Za-z0-9_.-]+\s+([^>]+)>', content)
    for tag in tags:
        # Match word=...
        attrs = re.findall(r'(\b[A-Za-z0-9_-]+\b)=', tag)
        if len(attrs) != len(set(attrs)):
            # Find which one is duplicated
            counts = {}
            for a in attrs:
                counts[a] = counts.get(a, 0) + 1
            dups = [a for a, c in counts.items() if c > 1]
            print(f"{path}: duplicate props {dups} in tag with attrs: {attrs}")

for root, dirs, files in os.walk('src'):
    for f in files:
        if f.endswith(('.tsx', '.jsx')):
            check_file(os.path.join(root, f))

from pathlib import Path
import re

p = Path(__file__).resolve().parents[0].joinpath('..','data','t.csv').resolve()
print('target path:', p)
print('exists:', p.exists())
try:
    b = p.read_bytes()
    print('byte length:', len(b))
    # try utf-8 first, fallback to shift_jis
    try:
        text = b.decode('utf-8')
        print('decoded using utf-8')
    except Exception:
        try:
            text = b.decode('shift_jis')
            print('decoded using shift_jis')
        except Exception as e:
            print('decode error:', e)
            raise
except Exception as e:
    print('read error:', e)
    raise
lines = text.splitlines()
if not lines:
    raise SystemExit('empty file')

header = lines[0]
new_lines = [header]
count = 1
pattern = re.compile(r'T-\d{3}\b')
for line in lines[1:]:
    # replace the first occurrence of T-xxx anywhere in the line
    if pattern.search(line):
        new_id = f"T-{count:03d}"
        new_line = pattern.sub(new_id, line, count=1)
        new_lines.append(new_line)
        count += 1
    else:
        new_lines.append(line)

p.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')
print(f'Updated {p} with {count-1} ids.')

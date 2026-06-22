import urllib.request
import re
import json
import sys

def fetch_match_stats(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        return {"error": f"Error al descargar la página con Python: {str(e)}"}

    # Reconstruir el RSC payload de Next.js
    pushed_chunks = []
    pattern = re.compile(r'self\.__next_f\.push\(\s*\[\s*\d+\s*,\s*"(.*?)"\s*\]\s*\)', re.DOTALL)
    for match in pattern.finditer(html):
        chunk = match.group(1)
        try:
            decoded = json.loads('"' + chunk + '"')
            pushed_chunks.append(decoded)
        except Exception:
            chunk_unescaped = chunk.replace('\\"', '"').replace('\\\\', '\\')
            pushed_chunks.append(chunk_unescaped)
            
    rsc_text = "".join(pushed_chunks)
    
    # Extraer candidatos a objetos JSON de jugadores
    results = []
    for match in re.finditer(r'\{"name(Full)?":', rsc_text):
        start = match.start()
        brace_count = 0
        in_string = False
        escape = False
        for i in range(start, len(rsc_text)):
            char = rsc_text[i]
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        results.append(rsc_text[start:i+1])
                        break
                        
    players = []
    seen = set()
    for item in results:
        try:
            cleaned = re.sub(r'\$[a-zA-Z0-9]+', 'null', item)
            data = json.loads(cleaned)
            if isinstance(data, dict) and "nameFull" in data and "stats" in data:
                key = (data.get("nameFull"), data.get("number"))
                if key not in seen:
                    seen.add(key)
                    players.append(data)
        except:
            pass
            
    return {"players": players}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Falta la URL del partido"}))
        sys.exit(1)
        
    url = sys.argv[1]
    result = fetch_match_stats(url)
    print(json.dumps(result, ensure_ascii=False))

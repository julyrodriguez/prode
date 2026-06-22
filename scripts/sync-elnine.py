import urllib.request
import json
import re
import datetime
import os
import sys

TRANSLATIONS = {
    'Brazil': 'Brasil',
    'France': 'Francia',
    'Germany': 'Alemania',
    'Spain': 'España',
    'England': 'Inglaterra',
    'Belgium': 'Bélgica',
    'Croatia': 'Croacia',
    'Netherlands': 'Países Bajos',
    'Holland': 'Holanda',
    'Japan': 'Japón',
    'Saudi Arabia': 'Arabia Saudita',
    'South Korea': 'Corea del Sur',
    'Switzerland': 'Suiza',
    'Denmark': 'Dinamarca',
    'Poland': 'Polonia',
    'Mexico': 'México',
    'Morocco': 'Marruecos',
    'United States': 'Estados Unidos',
    'USA': 'Estados Unidos',
    'Cameroon': 'Camerún',
    'Canada': 'Canadá',
    'Ecuador': 'Ecuador',
    'Senegal': 'Senegal',
    'Tunisia': 'Túnez',
    'Wales': 'Gales',
    'Qatar': 'Qatar',
    'Serbia': 'Serbia',
    'Ghana': 'Ghana',
    'Uruguay': 'Uruguay',
    'Argentina': 'Argentina',
    'Portugal': 'Portugal',
    'Italy': 'Italia',
    'Colombia': 'Colombia',
    'Chile': 'Chile',
    'Peru': 'Perú',
    'Paraguay': 'Paraguay',
    'Venezuela': 'Venezuela',
    'Bolivia': 'Bolivia',
    'Algeria': 'Argelia',
    'Austria': 'Austria',
    'Egypt': 'Egipto',
    'Sweden': 'Suecia',
    'Norway': 'Noruega',
    'Scotland': 'Escocia',
    'Ireland': 'Irlanda',
    'Greece': 'Grecia',
    'Turkey': 'Turquía',
    'Ukraine': 'Ucrania',
    'Czech Republic': 'República Checa',
    'Czechia': 'República Checa',
    'Romania': 'Rumania',
    'Russia': 'Rusia',
    'New Zealand': 'Nueva Zelanda',
    'South Africa': 'Sudáfrica',
    'Panama': 'Panamá',
    'Costa Rica': 'Costa Rica',
    'Honduras': 'Honduras',
    'El Salvador': 'El Salvador',
    'Jamaica': 'Jamaica',
    'Hungary': 'Hungría'
}

def translate_team(name):
    if not name:
        return ""
    name_clean = name.strip()
    return TRANSLATIONS.get(name_clean, name_clean)

def slugify(text):
    import unicodedata
    text = text.lower()
    text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = text.replace('ñ', 'n')
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def fetch_url(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def main():
    print("Iniciando sincronización automática con elnine.com.ar (Priorizando Mundial 2026)...")
    
    # 1. Obtener todos los partidos de nuestra API
    print("Obteniendo partidos del proyecto...")
    db_matches_raw = fetch_url("https://apivacas.jariel.com.ar/api/matches/all")
    if not db_matches_raw:
        print("Error: No se pudieron obtener los partidos del proyecto.")
        sys.exit(1)
        
    try:
        all_db_matches = json.loads(db_matches_raw)
    except Exception as e:
        print(f"Error al parsear JSON de partidos: {e}")
        sys.exit(1)
        
    print(f"Se obtuvieron {len(all_db_matches)} partidos totales en la base de datos.")
    
    # Filtrar por Mundial (Tournament ID 16)
    db_matches = [m for m in all_db_matches if m.get("tournament_id") == 16 or m.get("tournament", {}).get("id") == 16]
    print(f"Filtrados: {len(db_matches)} partidos corresponden al Mundial.")
    
    # 2. Identificar fechas únicas de los partidos en formato YYYY-MM-DD
    # Consideramos un rango de fechas (el día anterior, el mismo día y el día posterior por diferencias horarias)
    target_dates = set()
    for m in db_matches:
        ts = m.get("startTimestamp")
        if ts:
            dt = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)
            for offset in [-1, 0, 1]:
                d = dt + datetime.timedelta(days=offset)
                target_dates.add(d.strftime("%Y-%m-%d"))
                
    sorted_dates = sorted(list(target_dates))
    print(f"Se identificaron {len(sorted_dates)} fechas únicas a consultar en elnine.com.ar.")
    
    # 3. Consultar las páginas de elnine.com.ar para recopilar URLs de partidos
    elnine_matches = [] # lista de diccionarios: { slug, url, home_slug, away_slug, date_str }
    
    # regex para capturar enlaces de partidos: /partido/home-vs-away-yyyy-mm-dd-id
    match_pattern = re.compile(r'/partido/([a-z0-9\-]+-vs-[a-z0-9\-]+-(\d{4}-\d{2}-\d{2})-[a-zA-Z0-9]+)')
    
    for i, date_str in enumerate(sorted_dates):
        print(f"[{i+1}/{len(sorted_dates)}] Buscando partidos en fecha: {date_str}...")
        html = fetch_url(f"https://elnine.com.ar/?d={date_str}")
        if not html:
            continue
            
        found_links = match_pattern.findall(html)
        for link_tuple in found_links:
            slug = link_tuple[0]
            match_date = link_tuple[1]
            url = f"https://elnine.com.ar/partido/{slug}"
            
            # Parsear equipos del slug (e.g. nueva-zelanda-vs-egipto-2026-06-22-X3f4ZlTkLJ)
            parts = slug.split("-vs-")
            if len(parts) == 2:
                home_part = parts[0]
                away_part_full = parts[1]
                away_part = re.sub(r'-\d{4}-\d{2}-\d{2}-[a-zA-Z0-9]+$', '', away_part_full)
                
                match_entry = {
                    "slug": slug,
                    "url": url,
                    "home_slug": home_part,
                    "away_slug": away_part,
                    "date": match_date
                }
                
                if match_entry not in elnine_matches:
                    elnine_matches.append(match_entry)
                    
    print(f"Se recopilaron {len(elnine_matches)} partidos únicos desde elnine.com.ar.")
    
    # 4. Vincular partidos de base de datos con los de elnine.com.ar
    mappings = {}
    linked_count = 0
    
    for m in db_matches:
        match_id = str(m.get("_id"))
        if not match_id:
            continue
            
        home_name = m.get("home_team", {}).get("name") or m.get("homeTeam", {}).get("name")
        away_name = m.get("away_team", {}).get("name") or m.get("awayTeam", {}).get("name")
        ts = m.get("startTimestamp")
        
        if not home_name or not away_name or not ts:
            continue
            
        # Traducir y slugificar equipos de nuestra base de datos
        db_home_slug = slugify(translate_team(home_name))
        db_away_slug = slugify(translate_team(away_name))
        
        # Fecha en formato YYYY-MM-DD
        db_dt = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)
        db_date_str = db_dt.strftime("%Y-%m-%d")
        
        # Buscar coincidencia en elnine_matches
        matched_url = None
        for em in elnine_matches:
            # Comprobar si los nombres de los equipos coinciden
            teams_match = (db_home_slug == em["home_slug"] and db_away_slug == em["away_slug"]) or \
                          (db_home_slug == em["away_slug"] and db_away_slug == em["home_slug"])
                          
            if teams_match:
                # Comprobar si la fecha es similar (rango de 1 día por zona horaria)
                em_dt = datetime.datetime.strptime(em["date"], "%Y-%m-%d")
                days_diff = abs((db_dt.date() - em_dt.date()).days)
                if days_diff <= 1:
                    matched_url = em["url"]
                    break
                    
        if matched_url:
            mappings[match_id] = matched_url
            linked_count += 1
            
    print(f"Vinculación completada exitosamente: {linked_count} partidos vinculados de {len(db_matches)} del Mundial.")
    
    # 5. Escribir los resultados en src/lib/elnineMappings.ts
    lib_dir = os.path.join(os.path.dirname(__file__), "..", "src", "lib")
    mappings_file = os.path.join(lib_dir, "elnineMappings.ts")
    
    os.makedirs(lib_dir, exist_ok=True)
    
    with open(mappings_file, "w", encoding="utf-8") as f:
        f.write("export const elnineMappings: Record<string, string> = {\n")
        for m_id in sorted(mappings.keys()):
            f.write(f'  "{m_id}": "{mappings[m_id]}",\n')
        f.write("  // Se pueden agregar más vinculaciones de partidos aquí\n")
        f.write("};\n")
        
    print(f"Se actualizó el archivo de mapeos en: {mappings_file}")

    # 6. Escribir los resultados en data-processor/elnine_mappings.json
    try:
        dp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data-processor")
        dp_file = os.path.join(dp_dir, "elnine_mappings.json")
        os.makedirs(dp_dir, exist_ok=True)
        with open(dp_file, "w", encoding="utf-8") as f:
            json.dump(mappings, f, indent=2, ensure_ascii=False)
        print(f"Se actualizó el archivo de mapeos JSON en: {dp_file}")
    except Exception as e:
        print(f"Advertencia: No se pudo guardar en data-processor/elnine_mappings.json: {e}")

if __name__ == "__main__":
    main()

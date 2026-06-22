import sys
import subprocess
import json

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Falta la URL del partido"}))
        sys.exit(1)
        
    url = sys.argv[1]
    script_path = "/home/julian/vacas-locas/data-processor/scratch/fetch_match_stats_cli.js"
    
    try:
        result = subprocess.run(
            ["node", script_path, url],
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
    except Exception as e:
        print(json.dumps({"error": f"Error running node scraper: {str(e)}"}))

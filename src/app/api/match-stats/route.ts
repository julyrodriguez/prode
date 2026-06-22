import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 });
  }

  return new Promise<Response>((resolve) => {
    // Resolver la ruta absoluta al script de Python helper
    const scriptPath = path.join(process.cwd(), 'scripts', 'fetch-match-stats.py');
    
    // Ejecutar el scraper de Python que sí logra saltarse el 403 de Cloudflare
    exec(`python3 "${scriptPath}" "${url}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar fetch-match-stats.py: ${error.message}`);
        resolve(NextResponse.json({ error: `Error del scraper: ${error.message}` }, { status: 500 }));
        return;
      }
      
      if (stderr) {
        console.warn(`Advertencias del scraper: ${stderr}`);
      }

      try {
        const data = JSON.parse(stdout);
        if (data.error) {
          resolve(NextResponse.json({ error: data.error }, { status: 500 }));
        } else {
          resolve(NextResponse.json(data));
        }
      } catch (parseError: any) {
        console.error(`Error al parsear salida del script de Python: ${parseError.message}`);
        resolve(NextResponse.json({ error: 'Error al procesar la salida del scraper' }, { status: 500 }));
      }
    });
  });
}

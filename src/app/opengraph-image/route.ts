import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const body = await readFile(join(process.cwd(), "src/app/opengraph-image.png"));
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

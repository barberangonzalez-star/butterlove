import { getBcvRates } from "@/lib/bcv";

export const revalidate = 3600;

export async function GET() {
  const bcv = await getBcvRates();
  if (!bcv.usd && !bcv.eur) {
    return Response.json({ usd: null, eur: null }, { status: 502 });
  }
  return Response.json(bcv);
}

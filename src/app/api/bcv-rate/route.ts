import { getBcvRate } from "@/lib/bcv";

export const revalidate = 3600;

export async function GET() {
  const bcv = await getBcvRate();
  if (!bcv) {
    return Response.json({ rate: null, updatedAt: null }, { status: 502 });
  }
  return Response.json(bcv);
}

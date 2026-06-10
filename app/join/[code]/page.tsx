import { redirect } from "next/navigation";
import { findGameIdByCode } from "@/lib/server/repo";

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const gameId = normalized ? await findGameIdByCode(normalized) : null;
  redirect(gameId ? `/game/${gameId}` : `/online?code=${normalized}`);
}

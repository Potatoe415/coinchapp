import { GameRoom } from "@/components/GameRoom";
import { redirect } from "next/navigation";
import { findGameIdByCode } from "@/lib/server/repo";

const ROOM_CODE_REGEX = /^[A-Z0-9]{3}$/;

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const normalized = id.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (ROOM_CODE_REGEX.test(normalized)) {
    const gameId = await findGameIdByCode(normalized);
    if (!gameId) redirect(`/online?code=${normalized}`);
    return <GameRoom gameId={gameId} />;
  }

  return <GameRoom gameId={id} />;
}

import { Suspense } from "react";
import { AdHocLobby } from "@/components/AdHocLobby";

export default function AdHocPage() {
  return (
    <Suspense>
      <AdHocLobby />
    </Suspense>
  );
}

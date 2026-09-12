import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// Force dynamic rendering: this must generate a fresh room id per visit,
// not get statically prerendered into a single cached redirect target.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect(`/room/${uuidv4()}`);
}

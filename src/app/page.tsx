import { redirect } from "next/navigation";

/** Launch entry. Middleware sends signed-in users to /home and everyone else to /login before this renders. */
export default function Index() {
  redirect("/login");
}

import { redirect } from "next/navigation";

export default function RedirectToRegister() {
  redirect("/auth/register");
}

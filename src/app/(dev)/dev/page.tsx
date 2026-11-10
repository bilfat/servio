import { redirect } from "next/navigation";

export default function DevRootIndexPage() {
  redirect("/dev/dashboard");
}


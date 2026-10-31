import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <AuthForm mode="register" />;
}

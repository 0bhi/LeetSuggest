import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MobileNav, SidebarNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requireUser();
  const settings = await getSettings(user.id);
  if (!settings.onboardingComplete) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1560px]">
      <SidebarNav user={user} />
      <div className="min-w-0 flex-1">
        <MobileNav user={user} />
        <main className="px-4 pb-28 pt-6 sm:px-7 lg:px-10 lg:pb-14 lg:pt-9 xl:px-14">
          {children}
        </main>
      </div>
    </div>
  );
}

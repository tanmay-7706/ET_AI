import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  const user = await currentUser();

  const role = user?.publicMetadata?.role;

  if (role !== "officer") {
    redirect("/access-restricted");
  }

  return <>{children}</>;
}

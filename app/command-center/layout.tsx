import React from "react";
// import { auth, currentUser } from "@clerk/nextjs/server";
// import { redirect } from "next/navigation";

export default async function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  // TEMPORARILY DISABLED FOR DEMO RECORDING
  // await auth.protect();
  // const user = await currentUser();
  // const role = user?.publicMetadata?.role;
  // if (role !== "officer") {
  //   redirect("/access-restricted");
  // }

  return <>{children}</>;
}

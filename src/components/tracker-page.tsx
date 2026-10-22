import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppLoading } from "./preferences";
import { TrackerApp } from "./tracker-app";
import { currentProfile, trackerData } from "@/lib/session";
import { dateInZone } from "@/lib/tracker";

export type TrackerView = "overview" | "calendar" | "settings";

async function PersonalTracker({ view }: { view: TrackerView }) {
  await connection();
  const profile = await currentProfile();
  if (!profile && view === "settings") redirect("/onboarding");
  return (
    <TrackerApp
      key={view}
      view={view}
      today={dateInZone(profile?.timeZone ?? "Europe/Rome")}
      initialData={profile ? trackerData(profile) : null}
    />
  );
}

export function TrackerPage({ view }: { view: TrackerView }) {
  return (
    <Suspense fallback={<AppLoading />}>
      <PersonalTracker view={view} />
    </Suspense>
  );
}

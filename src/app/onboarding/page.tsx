import { Suspense } from "react";
import { connection } from "next/server";
import { currentProfile } from "@/lib/session";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { AppLoading } from "@/components/preferences";

async function Setup() {
  await connection();
  const profile = await currentProfile();
  if (!profile) return <OnboardingWizard />;
  const { id: _id, ...settings } = profile;
  void _id;
  return <OnboardingWizard profile={settings} />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Setup />
    </Suspense>
  );
}

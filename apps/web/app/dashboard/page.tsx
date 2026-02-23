import { redirect } from "next/navigation";
import { auth } from "../api/auth/[...nextauth]/route";

import { CreditMeter } from "../../components/CreditMeter";
import PromptForm from "../../components/PromptForm";
import ProjectList from "../../components/ProjectList";
import TwoFASetup from "../../components/2FASetup";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@cursorcode/ui";

import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { Suspense } from "react";

export const dynamic = "force-dynamic";


export default async function DashboardPage() {

  const session = await auth();

  if (!session?.user) {

    redirect("/auth/signin");

  }

  const user = session.user;

  const credits = user.credits ?? 10;

  const plan = user.plan ?? "starter";

  const totpEnabled = user.totp_enabled ?? false;


  let initialProjects = [];

  try {

    const accessToken =
      session.accessToken ??
      session.user.accessToken ??
      "";

    const res = await fetch(

      `${process.env.NEXT_PUBLIC_API_URL}/projects`,

      {

        headers: {

          Cookie: `access_token=${accessToken}`,

        },

        cache: "no-store",

      }

    );

    if (res.ok) {

      initialProjects = await res.json();

    }

  } catch (e) {

    console.error(e);

  }


  return (

    <div>

      {/* Your original UI remains unchanged */}

      <CreditMeter credits={credits} plan={plan} />

      <PromptForm />

      <Suspense>

        <ProjectList initialProjects={initialProjects} />

      </Suspense>

      <TwoFASetup />

    </div>

  );

}

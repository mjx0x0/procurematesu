import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface AuthErrorPageProps {
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const resolvedParams = searchParams && typeof (searchParams as any).then === "function" 
    ? await (searchParams as Promise<{ [key: string]: string | string[] | undefined }>)
    : (searchParams as { [key: string]: string | string[] | undefined } | undefined);

  const errorMessage = resolvedParams?.error 
    ? (Array.isArray(resolvedParams.error) ? resolvedParams.error[0] : resolvedParams.error)
    : "An unexpected authentication error occurred.";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-slate-50">
      <div className="w-full max-w-md">
        <Card className="border-red-100 shadow-lg">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Authentication Issue</CardTitle>
            <CardDescription className="text-slate-600 text-sm">
              We couldn&apos;t complete your authentication request.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-2">
            <div className="p-3 bg-red-50/70 rounded-lg border border-red-100 text-xs font-mono text-red-800 break-words">
              {errorMessage}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-4">
            <Button asChild className="w-full bg-blue-700 hover:bg-blue-800 text-white">
              <Link href="/auth/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Login
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

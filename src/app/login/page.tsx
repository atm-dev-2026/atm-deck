import { signIn } from "../../../auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          ATM Deck
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to view and manage boards.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl ?? "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Continue with Google
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("line", { redirectTo: callbackUrl ?? "/" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md bg-[#06C755] px-4 py-2 text-sm font-medium text-white hover:bg-[#05b34c]"
            >
              Continue with LINE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

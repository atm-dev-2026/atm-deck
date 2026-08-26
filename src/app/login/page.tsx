import { signIn } from "../../../auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          AD
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Sign in to ATM Deck
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Boards and team chat for ATM Holding.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl ?? "/" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              <GoogleMark />
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
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#06C755] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#05b34c]"
            >
              <LineMark />
              Continue with LINE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.996 11.996 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function LineMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.58 2 10c0 3.95 3.58 7.26 8.4 7.9.33.07.78.22.89.5.1.26.06.66.03.92l-.14.86c-.04.26-.2 1 .87.55 1.07-.46 5.77-3.4 7.87-5.82C21.24 12.9 22 11.53 22 10c0-4.42-4.48-8-10-8Z" />
    </svg>
  );
}

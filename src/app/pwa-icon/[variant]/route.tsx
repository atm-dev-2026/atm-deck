import { ImageResponse } from "next/og";

// Icons for the web app manifest and system notifications, drawn like
// app/apple-icon.tsx (scaled from its 180px layout). "badge" is Android's small
// status-bar icon, which only uses the alpha channel — so it's the card stack
// in white on transparent.
const SIZES = { "192": 192, "512": 512, badge: 96 } as const;
type Variant = keyof typeof SIZES;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ variant: string }> },
) {
  const { variant } = await params;
  if (!(variant in SIZES)) {
    return new Response("Not found", { status: 404 });
  }
  const size = SIZES[variant as Variant];
  const badge = variant === "badge";
  const s = size / 180;
  const colors = badge ? ["#ffffff99", "#ffffffcc", "#ffffff"] : ["#6f5525", "#8a6a2f", "#e2bd7c"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: badge ? "transparent" : "#1b1814",
        }}
      >
        <div style={{ position: "relative", width: 112 * s, height: 100 * s, display: "flex" }}>
          {colors.map((background, i) => (
            <div
              key={background}
              style={{
                position: "absolute",
                left: 11 * i * s,
                top: (22 - 11 * i) * s,
                width: 90 * s,
                height: 68 * s,
                borderRadius: 14 * s,
                background,
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=604800, immutable" },
    },
  );
}

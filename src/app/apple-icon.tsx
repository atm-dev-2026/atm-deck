import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1814",
        }}
      >
        <div style={{ position: "relative", width: 112, height: 100, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 22,
              width: 90,
              height: 68,
              borderRadius: 14,
              background: "#6f5525",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 11,
              top: 11,
              width: 90,
              height: 68,
              borderRadius: 14,
              background: "#8a6a2f",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 22,
              top: 0,
              width: 90,
              height: 68,
              borderRadius: 14,
              background: "#e2bd7c",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}

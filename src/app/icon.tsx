import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <div style={{ position: "relative", width: 20, height: 18, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 4,
              width: 16,
              height: 12,
              borderRadius: 2.5,
              background: "#6f5525",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 2,
              top: 2,
              width: 16,
              height: 12,
              borderRadius: 2.5,
              background: "#8a6a2f",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 4,
              top: 0,
              width: 16,
              height: 12,
              borderRadius: 2.5,
              background: "#e2bd7c",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}

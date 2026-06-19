import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        borderRadius: 38,
        background: "#b8ed61",
      }}
    >
      <div
        style={{
          width: 92,
          height: 134,
          display: "flex",
          position: "relative",
          alignItems: "center",
          flexDirection: "column",
          transform: "rotate(-28deg)",
        }}
      >
        <div
          style={{
            width: 92,
            height: 108,
            display: "flex",
            borderRadius: 999,
            background: "#102f27",
          }}
        />
        <div
          style={{
            width: 24,
            height: 36,
            display: "flex",
            marginTop: -8,
            borderRadius: 8,
            background: "#102f27",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 25,
          top: 25,
          width: 24,
          height: 24,
          display: "flex",
          borderRadius: 999,
          background: "#102f27",
        }}
      />
    </div>,
    size,
  );
}

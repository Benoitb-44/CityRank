import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          fontWeight: 700,
          fontSize: 72,
          color: '#ffffff',
          letterSpacing: '-2px',
        }}
      >
        IR
      </div>
    ),
    { ...size },
  );
}

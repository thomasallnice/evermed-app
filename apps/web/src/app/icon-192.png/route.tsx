import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          borderRadius: '25%',
        }}
      >
        {/* Medical Cross */}
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '256px',
            background: 'white',
            borderRadius: '16px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '256px',
            height: '120px',
            background: 'white',
            borderRadius: '16px',
          }}
        />
      </div>
    ),
    {
      width: 192,
      height: 192,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );

  return imageResponse;
}

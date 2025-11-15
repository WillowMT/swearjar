import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();

    (await cookies()).set('username', trimmedUsername, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ username: trimmedUsername });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to set username' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const username = (await cookies()).get('username')?.value;

    if (!username) {
      return NextResponse.json({ username: null });
    }

    return NextResponse.json({ username });
  } catch (error) {
    console.error('Get username error:', error);
    return NextResponse.json(
      { error: 'Failed to get username' },
      { status: 500 }
    );
  }
}


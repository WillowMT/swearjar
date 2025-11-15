import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getRedisClient from '@/lib/redis';

interface SwearEntry {
  id: string;
  word: string;
  timestamp: number;
  date: string;
}

async function getUsername(): Promise<string | null> {
  return (await cookies()).get('username')?.value || null;
}

function getRedisKey(username: string): string {
  return `swearjar:${username}:entries`;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const username = await getUsername();

    if (!username) {
      return NextResponse.json(
        { error: 'Not logged in' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const client = await getRedisClient();
    const key = getRedisKey(username);
    const data = await client.get(key);

    if (!data) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const entries: SwearEntry[] = JSON.parse(data);
    const filtered = entries.filter((entry) => entry.id !== id);

    if (filtered.length === entries.length) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    await client.set(key, JSON.stringify(filtered));

    return NextResponse.json({ success: true, entries: filtered });
  } catch (error) {
    console.error('Delete entry error:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}


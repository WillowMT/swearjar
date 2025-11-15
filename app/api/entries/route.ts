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

export async function GET() {
  try {
    const username = await getUsername();

    if (!username) {
      return NextResponse.json(
        { error: 'Not logged in' },
        { status: 401 }
      );
    }

    const client = await getRedisClient();
    const key = getRedisKey(username);
    const data = await client.get(key);

    if (!data) {
      return NextResponse.json({ entries: [] });
    }

    const entries: SwearEntry[] = JSON.parse(data);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const username = await getUsername();

    if (!username) {
      return NextResponse.json(
        { error: 'Not logged in' },
        { status: 401 }
      );
    }

    const { word } = await request.json();

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    const client = await getRedisClient();
    const key = getRedisKey(username);
    const data = await client.get(key);

    const entries: SwearEntry[] = data ? JSON.parse(data) : [];

    const newEntry: SwearEntry = {
      id: Date.now().toString(),
      word: word.trim().toLowerCase(),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };

    entries.unshift(newEntry);

    await client.set(key, JSON.stringify(entries));

    return NextResponse.json({ entry: newEntry, entries });
  } catch (error) {
    console.error('Add entry error:', error);
    return NextResponse.json(
      { error: 'Failed to add entry' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const username = await getUsername();

    if (!username) {
      return NextResponse.json(
        { error: 'Not logged in' },
        { status: 401 }
      );
    }

    const client = await getRedisClient();
    const key = getRedisKey(username);
    await client.del(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear entries error:', error);
    return NextResponse.json(
      { error: 'Failed to clear entries' },
      { status: 500 }
    );
  }
}


import { AssemblyAI } from 'assemblyai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { action } = await request.json();

        if (action === 'start') {
            // Get AssemblyAI API key from environment
            const apiKey = process.env.ASSEMBLYAI_API_KEY as string;

            if (!apiKey) {
                return NextResponse.json(
                    { error: 'AssemblyAI API key not configured' },
                    { status: 500 }
                );
            }

            const client = new AssemblyAI({ apiKey });
            const token = await client.realtime.createTemporaryToken({ expires_in: 480 });


            // Return the API key to the client (in production, use a more secure method)
            // Or create a temporary token
            return NextResponse.json({ token });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Transcription API error:', error);
        return NextResponse.json(
            { error: 'Failed to process transcription request' },
            { status: 500 }
        );
    }
}

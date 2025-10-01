import { getTweet } from 'react-tweet/api'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tweet = await getTweet((await params).id)
    
    if (!tweet) {
      return Response.json({ error: 'Tweet not found' }, { status: 404 })
    }

    return Response.json(tweet)
  } catch (error) {
    console.error('Error fetching tweet:', error)
    return Response.json({ error: 'Failed to fetch tweet' }, { status: 500 })
  }
}

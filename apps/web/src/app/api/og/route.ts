import { NodeVariants } from '@convex/tables/nodes'
import { NextRequest, NextResponse } from 'next/server'
import ogs from 'open-graph-scraper'
import { getTweet } from 'react-tweet/api'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

// ---------------------------------------------------------------------------
// ENUMS & TYPES
// ---------------------------------------------------------------------------
interface BaseMetadata {
  title: string
  description: string
  image: string
  siteName: string
  favicon: string
  url: string
  type: string
  author?: string
  publishedTime: string
  modifiedTime: string
  jsonLD: any[]
}

interface GitHubMetadata extends BaseMetadata {
  stars?: number
  forks?: number
  language?: string
  topics?: string[]
}

interface YouTubeMetadata extends BaseMetadata {
  thumbnail?: string
  channelName?: string
  duration?: string
  views?: number
  likes?: number
  publishedAt?: string
  videoUrl?: string
  videoDuration?: string
  videoWidth?: string
  videoHeight?: string
}

interface FigmaMetadata extends BaseMetadata {
  team?: string
  fileType?: string
}

interface NotionMetadata extends BaseMetadata {
  workspace?: string
  icon?: string
  lastEdited?: string
  pageType?: string
}

interface TikTokMetadata extends BaseMetadata {
  author?: string
  authorUrl?: string
  videoId?: string
  thumbnailUrl?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
}

interface PlatformMetadataMap {
  [NodeVariants.Link]: BaseMetadata
  [NodeVariants.GitHub]: GitHubMetadata
  [NodeVariants.Figma]: FigmaMetadata
  [NodeVariants.YouTube]: YouTubeMetadata
  [NodeVariants.Notion]: NotionMetadata
  [NodeVariants.Instagram]: BaseMetadata
  [NodeVariants.TikTok]: TikTokMetadata
  [NodeVariants.Spotify]: BaseMetadata
  [NodeVariants.Twitter]: BaseMetadata
}

type PlatformMetadata = PlatformMetadataMap[keyof PlatformMetadataMap]

// ---------------------------------------------------------------------------
// PLATFORM DETECTION
// ---------------------------------------------------------------------------

function detectNodeVariant(url: string): NodeVariants {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes('github.com')) return NodeVariants.GitHub
  if (hostname.includes('figma.com')) return NodeVariants.Figma
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
    return NodeVariants.YouTube
  if (hostname.includes('notion.so') || hostname.includes('notion.com'))
    return NodeVariants.Notion
  if (hostname.includes('instagram.com')) return NodeVariants.Instagram
  if (hostname.includes('tiktok.com')) return NodeVariants.TikTok
  if (hostname.includes('spotify.com')) return NodeVariants.Spotify
  if (hostname.includes('twitter.com') || hostname.includes('x.com'))
    return NodeVariants.Twitter

  return NodeVariants.Link
}

function extractBaseMetadata(result: any, url: string): BaseMetadata {
  return {
    title: result.ogTitle || result.twitterTitle || result.dcTitle || '',
    description:
      result.ogDescription ||
      result.twitterDescription ||
      result.dcDescription ||
      '',
    image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '',
    siteName: result.ogSiteName || '',
    favicon: result.favicon || `${new URL(url).origin}/favicon.ico`,
    url: result.ogUrl || url,
    type: result.ogType || '',
    author: result.author || '',
    publishedTime: result.articlePublishedTime || '',
    modifiedTime: result.articleModifiedTime || '',
    jsonLD: result.jsonLD || [],
  }
}

function extractGitHubMetadata(result: any, base: BaseMetadata): GitHubMetadata {
  const json = result.jsonLD?.[0] || {}
  return {
    ...base,
    stars: json.stargazerCount,
    forks: json.forkCount,
    language: json.programmingLanguage?.name,
    topics: json.keywords,
  }
}

function extractFigmaMetadata(result: any, base: BaseMetadata): FigmaMetadata {
  const json = result.jsonLD?.[0] || {}
  return {
    ...base,
    team: json.creator?.name || '',
    fileType: json.fileFormat || 'design',
  }
}

function extractNotionMetadata(result: any, base: BaseMetadata): NotionMetadata {
  const json = result.jsonLD?.[0] || {}
  return {
    ...base,
    workspace: json.isPartOf?.name || '',
    icon: json.image || '',
    lastEdited: json.dateModified || '',
    pageType: json['@type'] || 'page',
  }
}

async function fetchTwitterAPI(url: string) {
  const match = url.match(/\/status\/(\d+)/)
  const id = match ? match[1] : undefined

  if (!id) throw new Error('Failed to find tweet id')

  const tweet = await getTweet(id)
  if (!tweet) throw new Error('Failed to find tweet')

  return tweet
}

async function fetchYouTubeAPI(url: string) {
  const idMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
  const videoId = idMatch?.[1]

  if (!videoId || !YOUTUBE_API_KEY)
    throw new Error('Missing video ID or YouTube API key')

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)

  const data = await res.json()
  const video = data.items?.[0]
  if (!video) throw new Error('No video found')

  const s = video.snippet
  const st = video.statistics
  const c = video.contentDetails

  const durISO = c.duration || ''
  const match = durISO.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  const [, h, m, sec] = match || []
  const durationFmt = [h ? `${h}h` : '', m ? `${m}m` : '', sec ? `${sec}s` : '']
    .filter(Boolean)
    .join(' ')

  const metadata: YouTubeMetadata = {
    title: s.title,
    description: s.description,
    image: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || '',
    siteName: 'YouTube',
    favicon: 'https://www.youtube.com/s/desktop/a192c735/img/favicon.ico',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    type: 'video.other',
    author: s.channelTitle,
    publishedTime: s.publishedAt,
    modifiedTime: '',
    jsonLD: [],
    thumbnail: s.thumbnails?.high?.url || '',
    channelName: s.channelTitle,
    duration: durationFmt,
    views: Number(st.viewCount) || 0,
    likes: Number(st.likeCount) || 0,
    publishedAt: s.publishedAt,
    videoUrl: `https://www.youtube.com/embed/${videoId}`,
    videoDuration: c.duration,
    videoWidth: '',
    videoHeight: '',
  }

  return { success: true, metadata, nodeVariant: NodeVariants.YouTube }
}

async function fetchTikTokOEmbed(url: string) {
  const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
  const res = await fetch(oEmbedUrl)
  if (!res.ok) throw new Error(`TikTok oEmbed error: ${res.status}`)

  const data = await res.json()

  // Extract video ID from the URL
  const videoIdMatch = url.match(/\/video\/(\d+)/)
  const videoId = videoIdMatch?.[1] || ''

  const metadata: TikTokMetadata = {
    title: data.title || 'TikTok Video',
    description: data.title || '',
    image: data.thumbnail_url || '',
    siteName: 'TikTok',
    favicon: 'https://www.tiktok.com/favicon.ico',
    url: url,
    type: 'video.other',
    author: data.author_name || '',
    publishedTime: '',
    modifiedTime: '',
    jsonLD: [],
    authorUrl: data.author_url || '',
    videoId: videoId,
    thumbnailUrl: data.thumbnail_url || '',
    thumbnailWidth: data.thumbnail_width || 720,
    thumbnailHeight: data.thumbnail_height || 1280,
  }

  return { success: true, metadata, nodeVariant: NodeVariants.TikTok }
}

// ---------------------------------------------------------------------------
// MAIN EXTRACTOR
// ---------------------------------------------------------------------------

async function extractNodeVariantMetadata(
  result: any,
  url: string,
  nodeVariant: NodeVariants
): Promise<PlatformMetadata> {
  const base = extractBaseMetadata(result, url)
  switch (nodeVariant) {
    case NodeVariants.GitHub:
      return extractGitHubMetadata(result, base)
    case NodeVariants.Figma:
      return extractFigmaMetadata(result, base)
    case NodeVariants.Notion:
      return extractNotionMetadata(result, base)
    default:
      return base
  }
}

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url)
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const nodeVariant = detectNodeVariant(url)

    // Handle YouTube separately with API
    if (nodeVariant === NodeVariants.YouTube) {
      try {
        const yt = await fetchYouTubeAPI(url)
        return NextResponse.json(yt)
      } catch (err: any) {
        console.error('YouTube API failed:', err)
      }
    }

    // Handle Twitter separately with react-tweet/api
    if (nodeVariant === NodeVariants.Twitter) {
      try {
        const tweet = await fetchTwitterAPI(url)
        return NextResponse.json({
          success: true,
          metadata: tweet,
          nodeVariant,
        })
      } catch (err: any) {
        console.error('Twitter API failed:', err)
        throw err
      }
    }

    // Handle TikTok separately with oEmbed API
    if (nodeVariant === NodeVariants.TikTok) {
      try {
        const tiktok = await fetchTikTokOEmbed(url)
        return NextResponse.json(tiktok)
      } catch (err: any) {
        console.error('TikTok oEmbed failed:', err)
        // Fall through to Open Graph Scraper as fallback
      }
    }

    // Fallback to Open Graph Scraper
    const ogOptions = {
      url,
      timeout: 5000,
      retry: 2,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
    }

    const { error, result } = await ogs(ogOptions)

    console.log(result)

    if (error) {
      const fallback = extractBaseMetadata({}, url)
      fallback.title = new URL(url).hostname
      fallback.description = 'Unable to fetch metadata for this URL'
      return NextResponse.json({
        success: true,
        metadata: fallback,
        nodeVariant,
        fallback: true,
      })
    }

    const metadata = await extractNodeVariantMetadata(result, url, nodeVariant)

    return NextResponse.json({
      success: true,
      metadata,
      nodeVariant,
    })
  } catch (err: any) {
    console.error('API route error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

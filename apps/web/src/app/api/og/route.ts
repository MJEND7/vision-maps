import { NextRequest, NextResponse } from 'next/server'
import ogs from 'open-graph-scraper'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

interface BaseMetadata {
  title: string
  description: string
  image: string
  siteName: string
  favicon: string
  url: string
  type: string
  author: string
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

type PlatformMetadata =
  | BaseMetadata
  | GitHubMetadata
  | YouTubeMetadata
  | FigmaMetadata
  | NotionMetadata

function detectPlatformType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase()
  if (hostname.includes('github.com')) return 'github'
  if (hostname.includes('figma.com')) return 'figma'
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
    return 'youtube'
  if (hostname.includes('notion.so') || hostname.includes('notion.com'))
    return 'notion'
  if (hostname.includes('instagram.com')) return 'instagram'
  if (hostname.includes('tiktok.com')) return 'tiktok'
  if (hostname.includes('spotify.com')) return 'spotify'
  return 'website'
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

function extractYouTubeMetadataOG(result: any, base: BaseMetadata): YouTubeMetadata {
  const json = result.jsonLD?.[0] || {}
  return {
    ...base,
    thumbnail: json?.thumbnailUrl || result.ogImage?.[0]?.url || '',
    channelName: json.author?.name || result.twitterCreator || '',
    duration: json.duration || '',
    views: json.interactionStatistic?.find((s: any) =>
      s.interactionType?.includes('WatchAction')
    )?.userInteractionCount,
    likes: json.interactionStatistic?.find((s: any) =>
      s.interactionType?.includes('LikeAction')
    )?.userInteractionCount,
    publishedAt: json.uploadDate || json.datePublished || '',
    videoUrl: result.ogVideo?.[0]?.url || '',
    videoDuration: result.ogVideo?.[0]?.duration || '',
    videoWidth: result.ogVideo?.[0]?.width || '',
    videoHeight: result.ogVideo?.[0]?.height || '',
  }
}

function extractFigmaMetadata(result: any, base: BaseMetadata): FigmaMetadata {
  const json = result.jsonLD?.[0] || {}
  return { ...base, team: json.creator?.name || '', fileType: json.fileFormat || 'design' }
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
  const [_, h, m, sec] = match || []
  const d = [h ? `${h}h` : '', m ? `${m}m` : '', sec ? `${sec}s` : '']
    .filter(Boolean)
    .join(' ')
  return {
    success: true,
    metadata: {
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
      duration: d,
      views: Number(st.viewCount) || 0,
      likes: Number(st.likeCount) || 0,
      publishedAt: s.publishedAt,
      videoUrl: `https://www.youtube.com/embed/${videoId}`,
      videoDuration: c.duration,
      videoWidth: '',
      videoHeight: '',
    },
    platformType: 'youtube',
  }
}

async function extractPlatformMetadata(
  result: any,
  url: string,
  platform: string
): Promise<PlatformMetadata> {
  const base = extractBaseMetadata(result, url)
  switch (platform) {
    case 'github':
      return extractGitHubMetadata(result, base)
    case 'youtube':
      return extractYouTubeMetadataOG(result, base)
    case 'figma':
      return extractFigmaMetadata(result, base)
    case 'notion':
      return extractNotionMetadata(result, base)
    default:
      return base
  }
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const platformType = detectPlatformType(url)

    if (platformType === 'youtube') {
      try {
        const yt = await fetchYouTubeAPI(url)
        return NextResponse.json(yt)
      } catch (err: any) {
        console.error('YouTube API failed:', err)
      }
    }

    const options = {
      url,
      timeout: 5000,
      retry: 2,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
    }

    const { error, result } = await ogs(options)

    if (error) {
      const fallback = extractBaseMetadata({}, url)
      fallback.title = new URL(url).hostname
      fallback.description = 'Unable to fetch metadata for this URL'
      return NextResponse.json({
        success: true,
        metadata: fallback,
        platformType,
        fallback: true,
      })
    }

    const metadata = await extractPlatformMetadata(result, url, platformType)
    return NextResponse.json({ success: true, metadata, platformType })
  } catch (err: any) {
    console.error('API route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  )
}

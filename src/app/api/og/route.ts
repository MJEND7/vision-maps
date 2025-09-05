import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

// Define types for the metadata extraction
interface BaseMetadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
  url: string;
  type: string;
  author: string;
  publishedTime: string;
  modifiedTime: string;
  jsonLD: any[];
}

interface GitHubMetadata extends BaseMetadata {
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
}

interface YouTubeMetadata extends BaseMetadata {
  thumbnail?: string; 
  channelName?: string;
  duration?: string;
  views?: number;
  likes?: number;
  publishedAt?: string;
  videoUrl?: string;
  videoDuration?: string;
  videoWidth?: string;
  videoHeight?: string;
}

interface TwitterMetadata extends BaseMetadata {
  twitterCreator?: string;
  twitterSite?: string;
  username?: string;
  avatar?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  twitterType?: "tweet" | "profile" | "media";
  tweetId?: string;
}

interface FigmaMetadata extends BaseMetadata {
  team?: string;
  fileType?: string;
}

interface NotionMetadata extends BaseMetadata {
  workspace?: string;
  icon?: string;
  lastEdited?: string;
  pageType?: string;
}

type PlatformMetadata = BaseMetadata | GitHubMetadata | YouTubeMetadata | TwitterMetadata | FigmaMetadata | NotionMetadata;

function detectPlatformType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('github.com')) return 'github';
  if (hostname.includes('figma.com')) return 'figma';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  if (hostname.includes('notion.so') || hostname.includes('notion.com')) return 'notion';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('spotify.com')) return 'spotify';
  
  return 'website';
}

function extractBaseMetadata(result: any, url: string): BaseMetadata {
  return {
    title: result.ogTitle || result.twitterTitle || result.dcTitle || '',
    description: result.ogDescription || result.twitterDescription || result.dcDescription || '',
    image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '',
    siteName: result.ogSiteName || '',
    favicon: result.favicon || `${new URL(url).origin}/favicon.ico`,
    url: result.ogUrl || url,
    type: result.ogType || '',
    author: result.author || '',
    publishedTime: result.articlePublishedTime || '',
    modifiedTime: result.articleModifiedTime || '',
    jsonLD: result.jsonLD || [],
  };
}

function extractGitHubMetadata(result: any, baseMetadata: BaseMetadata): GitHubMetadata {
  const jsonLD = result.jsonLD?.[0] || {};
  
  return {
    ...baseMetadata,
    stars: jsonLD.stargazerCount || undefined,
    forks: jsonLD.forkCount || undefined,
    language: jsonLD.programmingLanguage?.name || undefined,
    topics: jsonLD.keywords || undefined,
  };
}

function extractYouTubeMetadata(result: any, baseMetadata: BaseMetadata): YouTubeMetadata {
  const jsonLD = result.jsonLD?.[0] || {};
  
  return {
    ...baseMetadata,
    thumbnail: jsonLD?.thumbnailUrl || result.ogImage?.[0]?.url || '',
    channelName: jsonLD.author?.name || result.twitterCreator || '',
    duration: jsonLD.duration || '',
    views: jsonLD.interactionStatistic?.find((stat: any) => 
      stat.interactionType?.includes('WatchAction'))?.userInteractionCount || undefined,
    likes: jsonLD.interactionStatistic?.find((stat: any) => 
      stat.interactionType?.includes('LikeAction'))?.userInteractionCount || undefined,
    publishedAt: jsonLD.uploadDate || jsonLD.datePublished || '',
    videoUrl: result.ogVideo?.[0]?.url || '',
    videoDuration: result.ogVideo?.[0]?.duration || '',
    videoWidth: result.ogVideo?.[0]?.width || '',
    videoHeight: result.ogVideo?.[0]?.height || '',
  };
}

function extractTwitterMetadata(result: any, baseMetadata: BaseMetadata, url: string): TwitterMetadata {
  const jsonLD = result.jsonLD?.[0] || {};
  const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/);
  const tweetIdMatch = url.match(/\/status\/(\d+)/);
  
  // Determine tweet type
  let twitterType: "tweet" | "profile" | "media" = 'profile';
  if (url.includes('/status/')) twitterType = 'tweet';
  if (url.includes('/media') || url.includes('photo/')) twitterType = 'media';
  
  return {
    ...baseMetadata,
    twitterCreator: result.twitterCreator || '',
    twitterSite: result.twitterSite || '',
    username: usernameMatch?.[1] || '',
    avatar: jsonLD.author?.image || '',
    //publishedAt: jsonLD.datePublished || result.articlePublishedTime || '',
    likes: jsonLD.interactionStatistic?.find((stat: any) => 
      stat.interactionType?.includes('LikeAction'))?.userInteractionCount || undefined,
    retweets: jsonLD.interactionStatistic?.find((stat: any) => 
      stat.interactionType?.includes('ShareAction'))?.userInteractionCount || undefined,
    replies: jsonLD.interactionStatistic?.find((stat: any) => 
      stat.interactionType?.includes('CommentAction'))?.userInteractionCount || undefined,
    twitterType,
    tweetId: tweetIdMatch?.[1] || undefined,
  };
}

function extractFigmaMetadata(result: any, baseMetadata: BaseMetadata): FigmaMetadata {
  const jsonLD = result.jsonLD?.[0] || {};
  
  return {
    ...baseMetadata,
    team: jsonLD.creator?.name || '',
    fileType: jsonLD.fileFormat || 'design',
  };
}

function extractNotionMetadata(result: any, baseMetadata: BaseMetadata): NotionMetadata {
  const jsonLD = result.jsonLD?.[0] || {};
  
  return {
    ...baseMetadata,
    workspace: jsonLD.isPartOf?.name || '',
    icon: jsonLD.image || '',
    lastEdited: jsonLD.dateModified || '',
    pageType: jsonLD['@type'] || 'page',
  };
}

function extractPlatformSpecificMetadata(result: any, url: string, platformType: string): PlatformMetadata {
  const baseMetadata = extractBaseMetadata(result, url);
  
  switch (platformType) {
    case 'github':
      return extractGitHubMetadata(result, baseMetadata);
      
    case 'youtube':
      return extractYouTubeMetadata(result, baseMetadata);
      
    case 'twitter':
      return extractTwitterMetadata(result, baseMetadata, url);
      
    case 'figma':
      return extractFigmaMetadata(result, baseMetadata);
      
    case 'notion':
      return extractNotionMetadata(result, baseMetadata);
      
    case 'instagram':
    case 'tiktok':
    case 'spotify':
      // For platforms we detect but don't have specific extraction logic yet
      return baseMetadata;
      
    case 'website':
    default:
      return baseMetadata;
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    const platformType = detectPlatformType(url);

    const options = {
      url,
      timeout: 1000,
      retry: 2,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com) Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)'
      }
    };

    const { error, result } = await ogs(options);

    if (error) {
      console.error('Open Graph scraper error:', error);
      
      // Return fallback metadata instead of error for soft failure
      const fallbackMetadata = extractBaseMetadata({}, url);
      fallbackMetadata.title = new URL(url).hostname;
      fallbackMetadata.description = 'Unable to fetch metadata for this URL';
      
      return NextResponse.json({ 
        success: true, 
        metadata: fallbackMetadata,
        platformType,
        fallback: true 
      });
    }

    // Extract platform-specific metadata using switch statement
    const metadata = extractPlatformSpecificMetadata(result, url, platformType);

    return NextResponse.json({ 
      success: true, 
      metadata,
      platformType 
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405 }
  );
}

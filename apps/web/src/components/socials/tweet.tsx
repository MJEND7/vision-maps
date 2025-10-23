'use client'

import Image from 'next/image'
import {
    AlertTriangle,
    CheckCircle,
} from 'lucide-react'
import { XLogo } from '@/icons/Xlogo'

export interface TweetUser {
    name: string
    screen_name: string
    profile_image_url_https: string
    verified?: boolean 
}

export interface MediaDetail {
    type: 'photo' | 'video'
    media_url_https: string
    video_info?: {
        variants?: { src?: string; type?: string }[]
        aspect_ratio?: [number, number]
    }
}

export interface Tweet {
    id_str: string
    text: string
    created_at: string
    favorite_count: number
    retweet_count: number
    reply_count?: number
    user: TweetUser
    mediaDetails?: MediaDetail[]
    in_reply_to_screen_name?: string
    entities?: {
        hashtags?: { text: string }[]
        user_mentions?: { screen_name: string }[]
        urls?: { url: string; expanded_url: string }[]
    }
}

// --------------- LINKIFY TWEET TEXT ----------------
const linkifyTweetText = (text: string) => {
    const cleaned = text.replace(/\s*https:\/\/t\.co\/[A-Za-z0-9]+$/g, '').trim()

    const parts = cleaned.split(/(\s+)/)
    return parts.map((part, i) => {
        if (part.startsWith('http')) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {part}
                </a>
            )
        }
        if (part.startsWith('@')) {
            const name = part.slice(1)
            return (
                <a
                    key={i}
                    href={`https://x.com/${name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {part}
                </a>
            )
        }
        if (part.startsWith('#')) {
            const tag = part.slice(1)
            return (
                <a
                    key={i}
                    href={`https://x.com/hashtag/${tag}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {part}
                </a>
            )
        }
        return part
    })
}

// ---------------- COMPONENTS ----------------
const TweetWrapper = ({
    children,
}: {
    children: React.ReactNode
}) => (
    <div className="relative border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 bg-white dark:bg-zinc-900 max-w-lg w-full shadow-sm">
        {children}
    </div>
)

const TweetHeader = ({
    user,
    permalink,
}: {
    user: TweetUser
    permalink: string
}) => (
    <div className="flex items-center gap-3 mb-2">
        <Image
            src={user.profile_image_url_https}
            alt={user.name}
            width={40}
            height={40}
            className="rounded-full"
        />
        <div className="w-full flex items-center justify-between">
            <span className="flex h-full items-center gap-5">
                <div className="flex flex-col -space-y-0.5">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        {user.name}
                        {user.verified && (
                            <CheckCircle
                                size={16}
                                className="text-sky-500"
                                aria-label="Verified account"
                            />
                        )}
                    </span>
                    <span className="text-gray-500 text-sm">@{user.screen_name}</span>
                </div>
            </span>
            <a
                href={permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-black dark:hover:text-white transition"
                aria-label="View on X"
            >
                <XLogo size={25} />
            </a>
        </div>
    </div>
)

const TweetBody = ({ text }: { text: string }) => (
    <p className="text-gray-800 dark:text-gray-200 text-[15px] whitespace-pre-line leading-relaxed mb-3">
        {linkifyTweetText(text)}
    </p>
)

const TweetMedia = ({ media }: { media?: MediaDetail[] }) => {
    if (!media?.length) return null
    if (media.length > 1)
        return (
            <div className="grid grid-cols-2 gap-2 mb-2">
                {media.map((m, i) => (
                    <Image
                        key={i}
                        src={m.media_url_https}
                        alt=""
                        width={300}
                        height={200}
                        className="object-cover w-full rounded-lg border border-gray-300 dark:border-gray-700"
                    />
                ))}
            </div>
        )

    const m = media[0]
    return (
        <div className="mb-2">
            <Image
                src={m.media_url_https}
                alt=""
                width={600}
                height={400}
                className="object-cover w-full h-auto max-h-[500px] rounded-lg border border-gray-300 dark:border-gray-700"
            />
        </div>
    )
}

export const TweetSkeleton = () => (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 animate-pulse max-w-lg w-full space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="flex flex-col space-y-1">
                <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
        </div>

        {/* Tweet text skeleton */}
        <div className="space-y-2 mt-2">
            <div className="h-3 w-11/12 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-3 w-4/5 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-3 w-2/3 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>

        {/* Optional media/image skeleton */}
        <div className="mt-3">
            <div className="w-full h-52 bg-gray-300 dark:bg-gray-700 rounded-lg" />
        </div>
    </div>
)

const TweetError = () => (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 text-center">
        <AlertTriangle className="inline w-5 h-5 mb-1" /> Tweet not found.
    </div>
)

// ---------------- TWEET MAIN ----------------
interface TweetProps {
    tweet?: Tweet;
}

export const Tweet = ({ tweet }: TweetProps) => {
    
    if(!tweet) {
        return <TweetError/>
    }

    const permalink = `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`

    return (
        <TweetWrapper>
            <TweetHeader permalink={permalink} user={tweet.user} />
            {tweet.in_reply_to_screen_name && (
                <p className="text-xs text-gray-500 mb-1">
                    Replying to @{tweet.in_reply_to_screen_name}
                </p>
            )}
            <TweetBody text={tweet.text} />
            <TweetMedia media={tweet.mediaDetails} />
        </TweetWrapper>
    )
}

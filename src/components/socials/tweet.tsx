'use client'
import { type Tweet as ITweet } from 'react-tweet/api'
import {
    type TwitterComponents,
    TweetContainer,
    TweetHeader,
    TweetInReplyTo,
    TweetBody,
    TweetMedia,
    enrichTweet,
    TweetProps,
    TweetNotFound,
    TweetSkeleton,
} from 'react-tweet'
import { useEffect, useState } from 'react'
import Image from 'next/image'

type Props = {
    tweet: ITweet
    components?: TwitterComponents
}

export const MyTweet = ({ tweet: t, components }: Props) => {
    const tweet = enrichTweet(t)
    return (
        <TweetContainer>
            <div className="text-sm">
                <TweetHeader tweet={tweet} components={components} />
                {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
                    <TweetBody tweet={tweet} />
                {tweet.mediaDetails?.length ? (
                    <div>
                        {tweet.mediaDetails.length <= 1 ? (
                            <div className="h-[312px] w-full flex gap-3 items-end">
                                <Image className='w-auto max-h-[300px] rounded-md' src={tweet.mediaDetails[0].media_url_https} alt="" width={400} height={300} />
                            </div>
                        ) : (
                            <TweetMedia tweet={tweet} components={components} />
                        )}
                    </div>
                ) : null}
            </div>
        </TweetContainer>
    )
}

export const Tweet = ({ id, components, onError }: TweetProps) => {
    const [tweet, setTweet] = useState<ITweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!id) return

        fetch(`/api/tweet/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch tweet')
                return res.json()
            })
            .then((data) => {
                setTweet(data)
                setLoading(false)
            })
            .catch((err) => {
                setError(err)
                setLoading(false)
                if (onError) onError(err)
            })
    }, [id, onError])

    if (loading) return <TweetSkeleton />
    if (error || !tweet) {
        const NotFound = components?.TweetNotFound || TweetNotFound
        return <NotFound />
    }

    return <MyTweet tweet={tweet} components={components} />
}


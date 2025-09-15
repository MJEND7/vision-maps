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

// Global cache for tweet data to prevent duplicate requests
const tweetCache = new Map<string, {
    data: ITweet | null;
    error: Error | null;
    loading: boolean;
    promise?: Promise<ITweet>;
}>();

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

// Cached fetch function to prevent duplicate requests
const fetchTweetCached = async (id: string): Promise<ITweet> => {
    const cached = tweetCache.get(id);
    
    // If we have cached data, return it
    if (cached && !cached.loading && cached.data) {
        console.log(`Tweet ${id}: Using cached data`);
        return cached.data;
    }
    
    // If we have a cached error, throw it
    if (cached && !cached.loading && cached.error) {
        console.log(`Tweet ${id}: Using cached error`);
        throw cached.error;
    }
    
    // If we're already loading, wait for the existing promise
    if (cached && cached.loading && cached.promise) {
        console.log(`Tweet ${id}: Waiting for existing request`);
        return cached.promise;
    }
    
    console.log(`Tweet ${id}: Making new API request`);
    
    // Create new fetch promise
    const promise = fetch(`/api/tweet/${id}`)
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch tweet')
            return res.json()
        })
        .then((data: ITweet) => {
            console.log(`Tweet ${id}: Successfully cached`);
            tweetCache.set(id, { data, error: null, loading: false });
            return data;
        })
        .catch((err: Error) => {
            console.log(`Tweet ${id}: Cached error`);
            tweetCache.set(id, { data: null, error: err, loading: false });
            throw err;
        });
    
    // Cache the loading state and promise
    tweetCache.set(id, { data: null, error: null, loading: true, promise });
    
    return promise;
};

export const Tweet = ({ id, components, onError }: TweetProps) => {
    const [tweet, setTweet] = useState<ITweet | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!id) return

        // Check cache first
        const cached = tweetCache.get(id);
        if (cached && !cached.loading) {
            if (cached.data) {
                setTweet(cached.data);
                setLoading(false);
                return;
            }
            if (cached.error) {
                setError(cached.error);
                setLoading(false);
                if (onError) onError(cached.error);
                return;
            }
        }

        // Use cached fetch
        fetchTweetCached(id)
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


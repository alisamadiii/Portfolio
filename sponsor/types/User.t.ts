export type UserTypes = {
  name: string;
  username: string;
  display_URL: string;
  display_banner: string;
  id: number;
  location: string;
  url: string;
  description: string;
  joined: string;
  verified: boolean;
  followers: number;
  following: number;
  tweets: TweetType[];
};

export type TweetType = {
  author_id: number;
  id: number;
  text: string;
  created_at: number;
  media: string[];
  likes: number;
  retweets: number;
  comments: number;
  impressions: number;
  pinned: boolean;
};

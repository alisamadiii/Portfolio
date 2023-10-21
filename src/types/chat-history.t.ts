interface MessageValue {
  id: string;
  message: string;
  user_uid: number;
  reply: string;
  files: string[];
}

interface SingleUser {
  id: string;
  created_at: string;
  full_name: string;
  avatar_url: string;
  email: string;
  provider_id: string;
}

export type { MessageValue, SingleUser };

type MessageValue = {
  id: string;
  message: string;
  user_uid: number;
  reply: string;
};

type SingleUser = {
  id: string;
  created_at: string;
  full_name: string;
  avatar_url: string;
  email: string;
  provider_id: string;
};

export type { MessageValue, SingleUser };

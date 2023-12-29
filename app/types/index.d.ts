type Technology = "nextjs" | "supabase" | "tailwind";

interface PersonalProjectsTypes {
  projectId: number;
  name: string;
  description: string;
  domain: string | null;
  isWorking: boolean;
}

interface ClientProjectsTypes {
  projectId: number;
  name: string;
  clientName: string | null;
  description: string;
  period: string;
  domain: string | null;
  isDone: boolean;
}

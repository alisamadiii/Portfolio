import axios from "axios";

export const clickupApi = axios.create({
  baseURL: "https://api.clickup.com/api/v2",
  headers: {
    Authorization: process.env.CLICKUP_API_TOKEN!,
    "Content-Type": "application/json",
  },
});

export const ApiRoutes = (listId: string) => {
  return {
    tasks: {
      create: `/list/${listId}/task`,
    },
  };
};

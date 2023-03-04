// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  nameTesting: any;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { nameTesting } = req.body;
  res.status(200).json({ nameTesting: `${nameTesting} Samadi` });
}

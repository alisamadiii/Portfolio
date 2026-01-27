"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Book,
  Building,
  CopyIcon,
  ExternalLinkIcon,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";

import { getEnv } from "@workspace/auth/action";

import { Status } from "./status";

const envVariables = [
  {
    name: "VERCEL_PROJECT_PRODUCTION_URL",
    description:
      "Public URL for your application - No need to set this variable if you are using Vercel",
    component: () => (
      <Button
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText("http://localhost:3000");
          toast.success("http://localhost:3000 copied");
        }}
      >
        Copy Localhost URL
        <CopyIcon />
      </Button>
    ),
    isOptional: true,
  },
  {
    name: "DATABASE_URL",
    description: "Database connection string for your application",
    component: () => (
      <div className="flex flex-col items-start gap-2">
        <Link
          href="https://orm.drizzle.team/docs/get-started"
          className={buttonVariants({ variant: "outline" })}
          target="_blank"
        >
          Getting Started <ExternalLinkIcon />
        </Link>

        <Link
          href="https://console.neon.tech/app/"
          className={buttonVariants({ variant: "outline" })}
          target="_blank"
        >
          Create your first project on Neon <Building />
        </Link>
      </div>
    ),
  },
  {
    name: "BETTER_AUTH_SECRET",
    description: "Better Auth secret for your application",
    component: () => (
      <Link
        href={
          "https://www.better-auth.com/docs/installation#set-environment-variables"
        }
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        View Documentation <ExternalLinkIcon />
      </Link>
    ),
  },
  {
    name: "BETTER_AUTH_URL",
    description: "Better Auth URL for authentication service",
    component: () => (
      <Button
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText("http://localhost:3000");
          toast.success("http://localhost:3000 copied");
        }}
      >
        Copy Localhost URL
        <CopyIcon />
      </Button>
    ),
  },
  {
    name: "GOOGLE_CLIENT_ID",
    description: "Google OAuth 2.0 Client ID for authentication",
    component: () => (
      <Link
        href="https://console.cloud.google.com/apis/credentials"
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        View API Keys <ExternalLinkIcon />
      </Link>
    ),
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    description: "Google OAuth 2.0 Client Secret for authentication",
    component: () => (
      <Link
        href="https://console.cloud.google.com/apis/credentials"
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        View API Keys <ExternalLinkIcon />
      </Link>
    ),
  },
  {
    name: "NEXT_PUBLIC_DOMAIN",
    description:
      "Public domain and cross-domain cookie domain for client-side references (e.g. example.com)",
  },
  {
    name: "NEXT_PUBLIC_EMAIL_DOMAIN",
    description: "Public email domain for sending emails",
  },
  {
    name: "NEXT_PUBLIC_POLAR_URL",
    description:
      "Public Polar API base URL for client-side code - Important: You will use this URL to navigate to the Polar dashboard pages.",
    component: () => (
      <Link
        href="https://sandbox.polar.sh/dashboard"
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        View Dashboard <ExternalLinkIcon />
      </Link>
    ),
  },
  {
    name: "POLAR_ACCESS_TOKEN",
    description: "Polar API access token for integration",
    component: () => (
      <Link
        href={`${process.env.NEXT_PUBLIC_POLAR_URL}/settings`}
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        View Settings <ExternalLinkIcon />
      </Link>
    ),
  },
  {
    name: "POLAR_WEBHOOK_SECRET",
    description: "Polar webhook secret for verifying webhook authenticity",
    component: () => {
      const webhooks = [
        "customer.deleted",
        "order.created",
        "order.updated",
        "order.refunded",
        "subscription.created",
        "subscription.updated",
        "product.created",
        "product.updated",
      ];

      return (
        <>
          <Link
            href={`${process.env.NEXT_PUBLIC_POLAR_URL}/settings/webhooks`}
            className={buttonVariants({ variant: "outline" })}
            target="_blank"
          >
            View Webhooks <ExternalLinkIcon />
          </Link>

          <p className="text-muted-foreground mt-4 mb-2 text-sm">
            Enable the webhooks for the following events:
          </p>

          <ul className="space-y-2">
            {webhooks.map((webhook) => (
              <li key={webhook} className="flex items-center gap-2">
                <Checkbox checked />
                {webhook}
              </li>
            ))}
          </ul>

          <code className="text-muted-foreground mt-4 inline-block text-sm">
            https://&lt;your-domain&gt;.com/api/auth/polar/webhooks
          </code>
        </>
      );
    },
  },
  {
    name: "POLAR_SERVER",
    description: "Polar server for integration",
    component: () => (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText("sandbox");
            toast.success("sandbox copied");
          }}
        >
          Sandbox
          <CopyIcon />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText("production");
            toast.success("production copied");
          }}
        >
          Production
          <CopyIcon />
        </Button>
      </div>
    ),
  },
  {
    name: "AWS_ACCESS_KEY_VALUE",
    description: "AWS Access Key for S3 or related storage",
    component: () => (
      <>
        <Link
          href="https://www.youtube.com/watch?v=t-lhgq7Nfpc&t=478s"
          className={buttonVariants({ variant: "outline" })}
          target="_blank"
        >
          Watch Video Tutorial <Video />
        </Link>
        <div className="mt-4">
          <h3 className="mb-2 text-xl font-medium">Policy</h3>
          <div className="mb-2 rounded-xl border px-4 text-xs">
            <Pre>
              <code>{`{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPublicReadForPublicPrefix",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<bucket-name>/public/*"
        }
    ]
}`}</code>
            </Pre>
          </div>
          <p className="text-muted-foreground text-sm">
            Copy and paste the policy into your AWS S3 bucket permissions. This
            will allow public read access to the bucket only for the public
            files.
          </p>
          <strong className="text-muted-foreground text-sm">
            Make sure to disable the block public access settings for the bucket
            before pasting the policy.
          </strong>

          <h3 className="mt-4 mb-2 text-xl font-medium">CORS Policy</h3>
          <div className="mb-2 rounded-xl border px-4 text-xs">
            <Pre>
              <code>{`[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "GET"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://<your-domain>.com"
        ],
        "ExposeHeaders": [],
        "MaxAgeSeconds": 3000
    }
]`}</code>
            </Pre>
          </div>

          <h3 className="mt-4 mb-2 text-xl font-medium">IAM</h3>
          <div className="mb-2 rounded-xl border px-4 text-xs">
            <Pre>
              <code>
                {`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::<bucket-name>/*"
    },
    {
      "Sid": "AllowSESSend",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}`}
              </code>
            </Pre>
          </div>

          <strong className="text-muted-foreground text-sm">
            When you are creating policy for your user, select Third-party
            service.
          </strong>

          <p className="text-muted-foreground text-sm">
            Replace <code>&lt;bucket-name&gt;</code> with your bucket name.
          </p>
        </div>
      </>
    ),
  },
  {
    name: "AWS_SECRET_KEY_VALUE",
    description: "AWS Secret Key for S3 or related storage",
  },
  {
    name: "AWS_BUCKET_ORIGIN",
    description: "AWS S3 bucket origin/endpoint URL",
  },
  {
    name: "AWS_BUCKET_NAME",
    description: "AWS S3 bucket name for file storage",
  },
  {
    name: "NEXT_PUBLIC_AWS_URL",
    description: "Public AWS domain for accessing user-facing assets",
    component: () => (
      <Link
        href="/setup/docs/s3-bucket"
        className={buttonVariants({ variant: "outline" })}
        target="_blank"
      >
        Read Documentation <Book />
      </Link>
    ),
  },
];

export const SetupEnv = () => {
  const { data, isPending } = useQuery({
    queryKey: ["env"],
    queryFn: async () => {
      const entries = await Promise.all(
        envVariables.map(async (variable) => [
          variable.name,
          await getEnv(variable.name),
        ])
      );
      return Object.fromEntries(entries);
    },
    retry: false,
  });

  return (
    <>
      <h1>
        Environment Variables
        {Object.values(data ?? {}).some(
          (value, index) => value === false && !envVariables[index]?.isOptional
        ) && (
          <span className="mt-1 block text-sm font-normal tracking-normal text-red-500">
            (Some are missing)
          </span>
        )}
      </h1>
      <div className="space-y-2">
        {envVariables.map((variable) => (
          <Card key={variable.name}>
            <CardContent>
              <Status
                active={data?.[variable.name] ?? false}
                loading={isPending}
              />
              <code className="text-lg font-medium">{variable.name}</code>
              <p className="text-muted-foreground text-sm [&:has(+button,+a,+div)]:mb-4">
                {variable.description}
              </p>
              {variable.component && variable.component()}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent>
            <code className="text-lg font-medium">pnpm db:push</code>
            <p className="text-muted-foreground text-sm [&:has(+button,+a,+div)]:mb-4">
              Run this command to push the database schema to the database
            </p>
            <p className="text-muted-foreground text-sm [&:has(+button,+a,+div)]:mb-4">
              Make sure that you have the .env DATABASE_URL file in
              packages/drizzle/.env package.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText("pnpm db:push");
                toast.success("pnpm db:push copied");
              }}
            >
              Copy Command prompt to push the database schema
            </Button>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-8 text-center">
          You are all set up! You can now start developing your application.
        </p>
      </div>
    </>
  );
};

const Pre = ({ children }: { children: React.ReactNode }) => {
  return (
    <pre
      className="text-muted-foreground max-w-full cursor-pointer overflow-x-auto py-2 text-sm [&:has(+button,+a,+div)]:mb-4"
      onClick={() => {
        if (typeof children === "string") {
          navigator.clipboard.writeText(children);
        } else if (typeof children === "number") {
          navigator.clipboard.writeText(children.toString());
        } else if (
          children &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          typeof (children as any).props?.children === "string"
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigator.clipboard.writeText((children as any).props.children);
        } else {
          // fallback: attempt to serialize
          navigator.clipboard.writeText(children?.toString() || "");
        }
        toast.success("Copied to clipboard");
      }}
    >
      {children}
    </pre>
  );
};

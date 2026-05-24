"use client";

import { useMutation } from "@tanstack/react-query";

import { agency } from "@/lib/agency";

export default function TestSDKPage() {
  const { mutate, data, error, isPending } = useMutation({
    mutationFn: (input: { name: string; email: string; message: string }) =>
      agency.contact({
        name: input.name,
        email: input.email,
        subject: "SDK Test",
        message: input.message,
      }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    mutate({
      name: form.get("name") as string,
      email: form.get("email") as string,
      message: form.get("message") as string,
    });
  }

  return (
    <div style={{ maxWidth: 500, margin: "100px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Test SDK Contact</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          name="name"
          placeholder="Name"
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <textarea
          name="message"
          placeholder="Message"
          required
          rows={4}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "10px 20px",
            borderRadius: 6,
            background: isPending ? "#999" : "#333",
            color: "#fff",
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Sending..." : "Send via SDK"}
        </button>
      </form>
      {data && (
        <pre
          style={{
            marginTop: 20,
            padding: 12,
            background: data.success ? "#f0fdf4" : "#fef2f2",
            borderRadius: 6,
            fontSize: 13,
            overflow: "auto",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      {error && (
        <pre
          style={{
            marginTop: 20,
            padding: 12,
            background: "#fef2f2",
            borderRadius: 6,
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          {error.message}
        </pre>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to EverMed.ai</h1>
      <p className="text-neutral-700">Manage your medical documents, get clear AI explanations, and chat with context.</p>
      <div className="flex gap-3">
        <a className="button" href="/vault">Go to Vault</a>
        <a className="button" href="/upload">Upload a Document</a>
        <a className="button" href="/chat">Open Chat</a>
      </div>
    </div>
  )
}


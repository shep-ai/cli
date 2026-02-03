import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Shep AI</h1>
        <p className="text-muted-foreground mt-4 text-lg">Autonomous AI Native SDLC Platform</p>
        <p className="text-muted-foreground mt-2 text-sm">Web UI Component Library</p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/version">View Version</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

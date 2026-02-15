import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Shep AI</h1>
        <p className="mt-4 text-lg text-muted-foreground">Autonomous AI Native SDLC Platform</p>
        <p className="mt-2 text-sm text-muted-foreground">Web UI Component Library</p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/version">View Version</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

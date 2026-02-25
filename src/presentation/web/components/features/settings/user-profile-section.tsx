'use client';

import { useState, useTransition } from 'react';
import type { UserProfile } from '@shepai/core/domain/generated/output';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface UserProfileSectionProps {
  data: UserProfile;
  onSave: (data: UserProfile) => Promise<boolean>;
}

export function UserProfileSection({ data, onSave }: UserProfileSectionProps) {
  const [name, setName] = useState(data.name ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [githubUsername, setGithubUsername] = useState(data.githubUsername ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave({ name, email, githubUsername });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name</Label>
          <Input
            id="user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-github">GitHub Username</Label>
          <Input
            id="user-github"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="your-github-username"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}

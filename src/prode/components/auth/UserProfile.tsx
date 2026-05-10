import React from 'react';
import { Button } from '../ui/Button';

interface UserProfileProps {
  user: any;
  onLogout: () => void;
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  const email = user?.email ?? '';
  const name = user?.user_metadata?.full_name ?? email;
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <div className="flex items-center gap-3">
      {avatar && (
        <img
          src={avatar}
          alt={name}
          className="w-8 h-8 rounded-full border border-accent/30"
        />
      )}
      <div className="hidden md:block">
        <p className="text-textLight text-sm font-medium">{name}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout}>
        Salir
      </Button>
    </div>
  );
}

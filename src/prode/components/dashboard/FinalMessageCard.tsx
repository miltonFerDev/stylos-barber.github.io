import React from 'react';
import { Card } from '../ui/Card';

interface FinalMessageCardProps {
  message: string;
}

export function FinalMessageCard({ message }: FinalMessageCardProps) {
  return (
    <Card borderTopColor="cupYellow" className="p-6 sm:p-8 text-center">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-full bg-cupYellow/15 flex items-center justify-center">
          <span className="text-2xl" role="img" aria-label="Trofeo">
            🏆
          </span>
        </div>
      </div>
      <p className="text-textLight text-base sm:text-lg font-semibold leading-relaxed">
        {message}
      </p>
    </Card>
  );
}
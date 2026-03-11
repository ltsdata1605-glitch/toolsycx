import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * A wrapper component for Lucide icons that uses the lucide-react library.
 * This replaces the previous approach of using global lucide.createIcons().
 */
export const Icon: React.FC<IconProps> = ({ name, className = '', size = 5 }) => {
  // Convert kebab-case (e.g., 'settings-2') to PascalCase (e.g., 'Settings2')
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as any)[pascalName];

  if (!IconComponent) {
    console.warn(`Icon "${name}" (PascalCase: "${pascalName}") not found in lucide-react.`);
    return <span className={`inline-block w-${size} h-${size} bg-slate-200 rounded-sm ${className}`} />;
  }

  // Tailwind w-X and h-X classes don't work well with dynamic values if not safelisted.
  // We use inline styles for the size to ensure it works reliably.
  const sizeInPx = size * 4; // Tailwind 1 unit = 4px

  return (
    <IconComponent 
      className={className} 
      style={{ width: `${sizeInPx}px`, height: `${sizeInPx}px` }}
    />
  );
};

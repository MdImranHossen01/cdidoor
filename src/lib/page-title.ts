export function getPageTitle(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Home';
  
  const last = parts[parts.length - 1];
  
  // Handle /new and /edit
  if (last === 'new' && parts.length > 1) {
    const parent = parts[parts.length - 2];
    return `Add ${formatWord(parent)}`;
  }
  if (last === 'edit' && parts.length > 2) {
    const parent = parts[parts.length - 3];
    return `Edit ${formatWord(parent)}`;
  }
  
  // Default fallback
  return formatWord(last);
}

function formatWord(word: string): string {
  if (!word) return '';
  return word.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

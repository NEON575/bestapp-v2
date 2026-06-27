import { Search } from 'lucide-react';
import { Input } from '@bestapp/ui';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({ value, onChange, placeholder = 'Поиск' }: SearchInputProps) {
  return (
    <div className="relative w-full min-w-[220px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="pl-11"
      />
    </div>
  );
}

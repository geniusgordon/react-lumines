import { Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/Button';

interface ReplayImportProps {
  onFileImport: (file: File) => Promise<void>;
  importMessage: string | null;
}

export const ReplayImport: React.FC<ReplayImportProps> = ({
  onFileImport,
  importMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onFileImport(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="mb-6 flex w-full">
        <Button
          onClick={handleImportClick}
          variant="secondary"
          icon={Upload}
          fullWidth
        >
          Import Replay
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {importMessage && (
        <div
          className={`mb-4 rounded-lg p-3 text-center text-sm ${
            importMessage.includes('success')
              ? 'border border-green-700/50 bg-green-900/50 text-green-300'
              : 'border border-red-700/50 bg-red-900/50 text-red-300'
          }`}
        >
          {importMessage}
        </div>
      )}
    </>
  );
};

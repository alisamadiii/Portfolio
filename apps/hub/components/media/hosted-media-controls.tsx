"use client";

import { FolderOpen } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";

import { useMediaLibrary } from "@/components/media/media-library-context";
import { UrlPopover } from "@/components/media/url-popover";

/**
 * Hosted-media (ImageKit) add-controls for image/file fields. Two ways in, side
 * by side:
 *  - "Media library" → opens the global media dialog; Insert feeds the URLs.
 *  - "Link" → a popover to paste an absolute CDN URL directly.
 */
const HostedMediaControls = ({
  maxSelected,
  onSelected,
  submitLabel,
  placeholder,
}: {
  maxSelected?: number;
  onSelected: (urls: string[]) => void;
  submitLabel: string;
  placeholder: string;
}) => {
  const { open } = useMediaLibrary();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => open({ onInsert: onSelected, maxSelected })}
      >
        <FolderOpen />
        Media library
      </Button>
      <UrlPopover
        submitLabel={submitLabel}
        placeholder={placeholder}
        onSubmit={(url) => onSelected([url])}
      />
    </div>
  );
};

export { HostedMediaControls };

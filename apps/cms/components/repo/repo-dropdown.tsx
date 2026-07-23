"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { ArrowUpRight, ChevronsUpDown } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { RepoBranches } from "./repo-branches";

export function RepoDropdown({ onClick }: { onClick?: () => void }) {
  const router = useRouter();
  const { owner, repo, branches, defaultBranch } = useRepo();
  const { config } = useConfig();

  const displayBranches = useMemo(() => {
    let branchesToDisplay: string[] = [];
    if (config) {
      if (branches && branches.length > 0) {
        if (branches.includes(config.branch))
          branchesToDisplay.push(config.branch);
        if (defaultBranch && config.branch !== defaultBranch)
          branchesToDisplay.push(defaultBranch);
        branchesToDisplay = branchesToDisplay.concat(
          branches
            .filter(
              (branch) => branch !== config.branch && branch !== defaultBranch
            )
            .slice(0, 5 - branchesToDisplay.length)
        );
      }
    }
    return branchesToDisplay;
  }, [branches, config, defaultBranch]);

  const branchesCount = useMemo(() => {
    if (branches && branches.length > 5) return `5/${branches.length}`;
    return null;
  }, [branches]);

  const handleBranchChange = (branch: string) => {
    router.push(`/${owner}/${repo}/${encodeURIComponent(branch)}`);
  };

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="h-15 w-full justify-start px-3"
            >
              <img
                className="h-10 w-10 rounded-lg"
                src={`https://github.com/${owner}.png`}
                alt="Picture of the author"
              />
              <div className="ml-3 overflow-hidden text-left">
                <div className="truncate font-medium">{repo}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {config?.branch}
                </div>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                onClick={onClick}
              >
                View on GitHub
                <ArrowUpRight className="text-muted-foreground ml-auto size-3" />
              </a>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground w-40 text-xs font-medium">
              Branches{branchesCount && ` (${branchesCount})`}
            </DropdownMenuLabel>
            {displayBranches.length > 0 && (
              <>
                <DropdownMenuRadioGroup
                  value={config?.branch}
                  onValueChange={handleBranchChange}
                >
                  {displayBranches.map((branch: string) => (
                    <DropdownMenuRadioItem
                      key={branch}
                      value={branch}
                      className="max-w-64"
                      onClick={onClick}
                    >
                      <span className="truncate">{branch}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
          </DropdownMenuGroup>
          {displayBranches.length > 0 && <DropdownMenuSeparator />}
          <DialogTrigger
            render={
              <DropdownMenuItem onClick={onClick}>
                Manage branches
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage branches</DialogTitle>
          </DialogHeader>
          <RepoBranches />
        </DialogContent>
      </DropdownMenu>
    </Dialog>
  );
}

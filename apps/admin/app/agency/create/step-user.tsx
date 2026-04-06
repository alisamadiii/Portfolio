import { Button } from "@workspace/ui/components/button";

import { SelectUser } from "./select-user";

type StepUserProps = {
  userId: string;
  updateState: boolean;
  onSelect: (data: { id: string; email: string; name: string }) => void;
  onNext: () => void;
};

export const StepUser = ({
  userId,
  updateState,
  onSelect,
  onNext,
}: StepUserProps) => {
  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <SelectUser
        userId={userId}
        updateState={updateState}
        onSelect={onSelect}
      />

      <Button
        type="button"
        onClick={onNext}
        disabled={!userId}
        className="w-full"
      >
        Next
      </Button>
    </div>
  );
};

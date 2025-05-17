import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import Image from "next/image";

interface LoadingMessageProps {
  message?: string;
}

export function LoadingMessage({ message }: LoadingMessageProps) {
  return (
    <div className={cn("flex items-start gap-3")}>
      <Avatar
        className={cn(
          "h-10 w-10 mt-0.5 flex items-center justify-center",
          "bg-muted"
        )}
      >
        <Image
          src="/ai.dark.svg"
          width={32}
          height={32}
          className="h-8 w-8 dark:block hidden"
          alt="AI icon dark"
        />
        <Image
          src="/ai.light.svg"
          width={32}
          height={32}
          className="h-8 w-8 dark:hidden block"
          alt="AI icon light"
        />
      </Avatar>

      <div
        className={cn("flex flex-col max-w-[80%] rounded-lg p-4", "bg-muted")}
      >
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" />
        </div>
        {message && (
          <p className="mt-2 text-sm text-foreground/80">{message}</p>
        )}
      </div>
    </div>
  );
}

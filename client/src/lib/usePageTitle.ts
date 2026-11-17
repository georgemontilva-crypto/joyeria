import { useEffect } from "react";

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — Madison D’Or` : "Madison D’Or — Fine gold jewelry";
  }, [title]);
}

import Workspace from "@/components/workspace";
export default function Page() {
  return (
    <Workspace configured={!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} />
  );
}
